import { createClient } from '@clickhouse/client';
import * as dotenv from 'dotenv';
import fs from 'fs/promises';
import path from 'path';

// Load environment variables from .env file
dotenv.config();

interface Migration {
  version: string;
  name: string;
  up: string;
  down: string;
}

const client = createClient({
  url: process.env.CLICKHOUSE_URL || 'http://localhost:8123',
  username: process.env.CLICKHOUSE_USER || 'default',
  password: process.env.CLICKHOUSE_PASSWORD || '',
});

const DATABASE_NAME = process.env.CLICKHOUSE_DATABASE || 'observability';

async function ensureDatabase(): Promise<void> {
  await client.exec({
    query: `CREATE DATABASE IF NOT EXISTS ${DATABASE_NAME}`,
  });
}

async function ensureMigrationsTable(): Promise<void> {
  await client.exec({
    query: `
      CREATE TABLE IF NOT EXISTS ${DATABASE_NAME}._migrations (
        version String,
        name String,
        applied_at DateTime DEFAULT now()
      )
      ENGINE = MergeTree()
      ORDER BY version
    `,
  });
}

async function getAppliedMigrations(): Promise<Set<string>> {
  const result = await client.query({
    query: `SELECT version FROM ${DATABASE_NAME}._migrations`,
    format: 'JSONEachRow',
  });
  
  const rows = await result.json<{ version: string }>();
  return new Set(rows.map(row => row.version));
}

async function loadMigrations(): Promise<Migration[]> {
  const migrationsDir = path.join(__dirname, '..', 'migrations');
  const files = await fs.readdir(migrationsDir);
  
  const migrations: Migration[] = [];
  
  for (const file of files) {
    if (file.endsWith('.up.sql')) {
      const version = file.replace('.up.sql', '');
      const downFile = `${version}.down.sql`;
      
      if (!files.includes(downFile)) {
        console.warn(`Warning: No down migration found for ${version}`);
      }
      
      const upPath = path.join(migrationsDir, file);
      const downPath = path.join(migrationsDir, downFile);
      
      const up = await fs.readFile(upPath, 'utf-8');
      const down = files.includes(downFile) 
        ? await fs.readFile(downPath, 'utf-8')
        : '';
      
      // Parse name from first comment line if present
      const nameMatch = up.match(/^-- (.+)$/m);
      const name = nameMatch ? nameMatch[1] : version;
      
      migrations.push({ version, name, up, down });
    }
  }
  
  return migrations.sort((a, b) => a.version.localeCompare(b.version));
}

async function runMigration(migration: Migration, direction: 'up' | 'down'): Promise<void> {
  const query = direction === 'up' ? migration.up : migration.down;
  
  if (!query) {
    console.warn(`No ${direction} migration for ${migration.version}`);
    return;
  }
  
  console.log(`Running ${direction} migration: ${migration.version} - ${migration.name}`);
  
  // Split by semicolon to handle multiple statements
  const statements = query
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0);
  
  for (const statement of statements) {
    await client.exec({ query: statement });
  }
  
  if (direction === 'up') {
    await client.insert({
      table: `${DATABASE_NAME}._migrations`,
      values: [{ version: migration.version, name: migration.name }],
      format: 'JSONEachRow',
    });
  } else {
    await client.exec({
      query: `DELETE FROM ${DATABASE_NAME}._migrations WHERE version = '${migration.version}'`,
    });
  }
  
  console.log(`✓ Migration ${migration.version} completed`);
}

async function migrateUp(): Promise<void> {
  await ensureDatabase();
  await ensureMigrationsTable();
  
  const applied = await getAppliedMigrations();
  const migrations = await loadMigrations();
  
  const pending = migrations.filter(m => !applied.has(m.version));
  
  if (pending.length === 0) {
    console.log('No pending migrations');
    return;
  }
  
  console.log(`Found ${pending.length} pending migration(s)`);
  
  for (const migration of pending) {
    await runMigration(migration, 'up');
  }
  
  console.log('All migrations completed');
}

async function migrateDown(steps: number = 1): Promise<void> {
  await ensureDatabase();
  await ensureMigrationsTable();
  
  const applied = await getAppliedMigrations();
  const migrations = await loadMigrations();
  
  const appliedMigrations = migrations
    .filter(m => applied.has(m.version))
    .reverse();
  
  if (appliedMigrations.length === 0) {
    console.log('No applied migrations to rollback');
    return;
  }
  
  const toRollback = appliedMigrations.slice(0, steps);
  
  console.log(`Rolling back ${toRollback.length} migration(s)`);
  
  for (const migration of toRollback) {
    await runMigration(migration, 'down');
  }
  
  console.log('Rollback completed');
}

async function main(): Promise<void> {
  const command = process.argv[2];
  
  try {
    switch (command) {
      case 'up':
        await migrateUp();
        break;
      case 'down':
        const steps = parseInt(process.argv[3] || '1', 10);
        await migrateDown(steps);
        break;
      default:
        console.error('Usage: migrate.ts [up|down] [steps]');
        process.exit(1);
    }
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await client.close();
  }
}

main();