import fs from 'fs/promises';
import path from 'path';
import readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(prompt: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function createMigration(): Promise<void> {
  const name = await question('Migration name: ');
  
  if (!name) {
    console.error('Migration name is required');
    process.exit(1);
  }
  
  const timestamp = new Date().toISOString().replace(/[-:T.]/g, '').slice(0, 14);
  const safeName = name.toLowerCase().replace(/[^a-z0-9]+/g, '_');
  const version = `${timestamp}_${safeName}`;
  
  const migrationsDir = path.join(__dirname, '..', 'migrations');
  
  // Ensure migrations directory exists
  await fs.mkdir(migrationsDir, { recursive: true });
  
  const upFile = path.join(migrationsDir, `${version}.up.sql`);
  const downFile = path.join(migrationsDir, `${version}.down.sql`);
  
  const upTemplate = `-- ${name}
-- Migration: ${version}
-- Created: ${new Date().toISOString()}

-- Add your UP migration SQL here
`;
  
  const downTemplate = `-- Rollback: ${name}
-- Migration: ${version}
-- Created: ${new Date().toISOString()}

-- Add your DOWN migration SQL here
`;
  
  await fs.writeFile(upFile, upTemplate);
  await fs.writeFile(downFile, downTemplate);
  
  console.log(`✓ Created migration: ${version}`);
  console.log(`  UP:   ${upFile}`);
  console.log(`  DOWN: ${downFile}`);
  
  rl.close();
}

createMigration().catch((error) => {
  console.error('Failed to create migration:', error);
  process.exit(1);
});