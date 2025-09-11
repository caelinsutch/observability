# ClickHouse Package

Database client, migration tools, and schema management for the observability platform's ClickHouse integration. Provides type-safe database operations and automated migration handling.

## 🚀 Features

- **Type-Safe Client**: Fully typed ClickHouse client with TypeScript support
- **Migration System**: Automated database migrations with rollback support
- **Optimized Schemas**: Tables optimized for time-series event data
- **Batch Operations**: Efficient batch inserts for high-throughput ingestion
- **Connection Pooling**: Built-in connection management
- **Data Transformation**: Utilities for preparing events for storage
- **Seed Data**: Sample data generation for testing

## 📦 Prerequisites

- ClickHouse server 23.0+
- Node.js 18+
- pnpm package manager

## 📁 Structure

```
packages/clickhouse/
├── src/
│   ├── client.ts        # ClickHouse client wrapper
│   ├── connection.ts    # Connection management
│   ├── migrations/      # Database migration files
│   ├── schemas/         # Table schemas
│   ├── seed.ts         # Data seeding utilities
│   └── utils.ts        # Helper functions
├── scripts/
│   ├── migrate.ts      # Migration runner
│   └── seed.ts        # Seed data script
└── migrations/         # SQL migration files

## 🛠️ Setup

### 1. Install ClickHouse

#### macOS
```bash
# Using Homebrew
brew install clickhouse

# Or using official installer
curl https://clickhouse.com/ | sh
```

#### Linux
```bash
# Ubuntu/Debian
sudo apt-get install clickhouse-server clickhouse-client

# Or using official installer
curl https://clickhouse.com/ | sh
```

#### Docker
```bash
docker run -d \
  --name clickhouse \
  -p 8123:8123 \
  -p 9000:9000 \
  clickhouse/clickhouse-server
```

### 2. Configure Environment

Create `.env` file in the package directory:

```env
CLICKHOUSE_HOST=localhost
CLICKHOUSE_PORT=8123
CLICKHOUSE_USER=default
CLICKHOUSE_PASSWORD=
CLICKHOUSE_DATABASE=observability
```

### 3. Install Dependencies

```bash
cd packages/clickhouse
pnpm install
```

### 4. Initialize Database

```bash
# Create database
pnpm clickhouse:create-db

# Run migrations
pnpm migrate:up

# Seed sample data (optional)
pnpm seed
```

## 🚀 Usage

### Basic Connection

```typescript
import { getClickHouseClient } from '@observability/clickhouse';

// Get client instance
const client = getClickHouseClient();

// Execute queries
const result = await client.query('SELECT 1');
```

### Inserting Events

```typescript
import { prepareEventsForInsert } from '@observability/clickhouse';
import type { ObservabilityEvent } from '@observability/schemas';

// Prepare events
const events: ObservabilityEvent[] = [
  {
    id: 'evt_123',
    timestamp: '2024-01-15T10:00:00.000Z',
    event_type: 'click',
    session_id: 'sess_456',
    visitor_id: 'visitor_789',
    page_url: 'https://example.com',
    page_title: 'Home Page',
    event_data: {
      element_id: 'button-cta',
      element_text: 'Get Started'
    }
  }
];

// Transform for ClickHouse
const prepared = prepareEventsForInsert(events);

// Insert into database
await client.insert('events', prepared);
```

### Querying Events

```typescript
// Simple query
const recentEvents = await client.query(
  'SELECT * FROM events ORDER BY timestamp DESC LIMIT 100',
  'JSONEachRow'
);

// Parameterized query for safety
const userEvents = await client.query(
  'SELECT * FROM events WHERE visitor_id = {visitor_id:String}',
  'JSONEachRow',
  { visitor_id: 'visitor_789' }
);

// Aggregation query
const stats = await client.query(`
  SELECT 
    event_type,
    count() as count,
    uniq(visitor_id) as unique_visitors
  FROM events
  WHERE timestamp > now() - INTERVAL 1 DAY
  GROUP BY event_type
`, 'JSONEachRow');
```

### Connection Management

```typescript
import { getClickHouseClient, closeClickHouse } from '@observability/clickhouse';

// Get singleton client
const client = getClickHouseClient();

// Use client for operations
await client.query('SELECT 1');

// Close when done (usually in shutdown handler)
await closeClickHouse();
```

## 📊 Database Schema

### Events Table

The main `events` table stores all observability data:

```sql
CREATE TABLE events (
  -- Identifiers
  id String,
  timestamp DateTime64(3),
  
  -- Event metadata
  event_type LowCardinality(String),
  session_id String,
  visitor_id String,
  
  -- Page context
  page_url String,
  page_title String,
  referrer Nullable(String),
  
  -- User context
  user_agent Nullable(String),
  user_id Nullable(String),
  
  -- Device info
  screen_width Nullable(UInt16),
  screen_height Nullable(UInt16),
  viewport_width Nullable(UInt16),
  viewport_height Nullable(UInt16),
  
  -- Event-specific data
  event_data Nullable(String), -- JSON
  
  -- Service metadata
  service_name LowCardinality(String) DEFAULT 'web',
  environment LowCardinality(String) DEFAULT 'production',
  
  -- Indexing
  INDEX idx_session (session_id) TYPE minmax GRANULARITY 1,
  INDEX idx_visitor (visitor_id) TYPE minmax GRANULARITY 1
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(timestamp)
ORDER BY (timestamp, event_type, session_id)
TTL timestamp + INTERVAL 90 DAY;
```

### Materialized Views

Optimized views for common queries:

```sql
-- Sessions aggregation
CREATE MATERIALIZED VIEW sessions_mv
ENGINE = AggregatingMergeTree()
ORDER BY (date, session_id)
AS SELECT
  toDate(timestamp) as date,
  session_id,
  visitor_id,
  min(timestamp) as session_start,
  max(timestamp) as session_end,
  count() as event_count,
  groupArray(event_type) as event_types
FROM events
GROUP BY date, session_id, visitor_id;
```

## 🔧 Commands

### Database Management

```bash
# Start ClickHouse service
pnpm clickhouse:start

# Stop ClickHouse service
pnpm clickhouse:stop

# Check ClickHouse status
pnpm clickhouse:status
```

### Migration Commands

```bash
# Run all pending migrations
pnpm migrate:up

# Rollback last migration
pnpm migrate:down

# Create new migration file
pnpm migrate:create my_new_migration

# Check migration status
pnpm migrate:status
```

### Development Commands

```bash
# Build TypeScript
pnpm build

# Watch mode
pnpm dev

# Type checking
pnpm typecheck

# Run tests
pnpm test
```

### Data Management

```bash
# Seed sample data
pnpm seed

# Clear all data (CAUTION!)
pnpm clear-data

# Export data
pnpm export --table events --format csv > events.csv
```

## ⚙️ Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `CLICKHOUSE_HOST` | ClickHouse server host | `localhost` |
| `CLICKHOUSE_PORT` | ClickHouse HTTP port | `8123` |
| `CLICKHOUSE_USER` | Database username | `default` |
| `CLICKHOUSE_PASSWORD` | Database password | (empty) |
| `CLICKHOUSE_DATABASE` | Database name | `observability` |
| `CLICKHOUSE_MAX_CONNECTIONS` | Connection pool size | `10` |
| `CLICKHOUSE_REQUEST_TIMEOUT` | Query timeout (ms) | `30000` |

### Connection Options

```typescript
// Custom connection configuration
import { createClickHouseClient } from '@observability/clickhouse';

const client = createClickHouseClient({
  host: 'clickhouse.example.com',
  port: 8443,
  protocol: 'https',
  username: 'analytics',
  password: 'secure-password',
  database: 'events',
  max_open_connections: 20,
  request_timeout: 60000
});
```

## 🎯 Performance Optimization

### Batch Inserts

```typescript
// Efficient batch insertion
const batchSize = 10000;
const events = generateLargeEventSet();

for (let i = 0; i < events.length; i += batchSize) {
  const batch = events.slice(i, i + batchSize);
  await client.insert('events', prepareEventsForInsert(batch));
}
```

### Query Optimization

```typescript
// Use appropriate formats
const largeResult = await client.query(
  'SELECT * FROM events',
  'JSONCompactEachRow' // More efficient for large results
);

// Use sampling for estimates
const sample = await client.query(
  'SELECT * FROM events SAMPLE 0.1', // 10% sample
  'JSONEachRow'
);
```

### Indexing Strategy

- Primary key: `(timestamp, event_type, session_id)`
- Secondary indices for visitor_id and session_id
- Bloom filters for string columns with high cardinality
- Materialized views for frequently accessed aggregations

## 🐛 Troubleshooting

### Connection Issues

```bash
# Test ClickHouse connection
curl http://localhost:8123/ping

# Check ClickHouse logs
sudo clickhouse-client --query "SELECT * FROM system.query_log ORDER BY event_time DESC LIMIT 10"
```

### Migration Issues

```bash
# Check migration history
pnpm migrate:status

# Manually run SQL
clickhouse-client --query "$(cat migrations/001_initial.sql)"
```

### Performance Issues

```bash
# Check table size
clickhouse-client --query "SELECT table, formatReadableSize(sum(bytes)) as size FROM system.parts WHERE database='observability' GROUP BY table"

# Optimize table
clickhouse-client --query "OPTIMIZE TABLE observability.events"
```

## 📚 Advanced Topics

### Distributed Setup

For high-scale deployments, use ClickHouse cluster:

```sql
-- Create distributed table
CREATE TABLE events_distributed AS events
ENGINE = Distributed(cluster, observability, events, rand());
```

### Data Retention

Configure TTL for automatic data cleanup:

```sql
ALTER TABLE events 
MODIFY TTL timestamp + INTERVAL 30 DAY DELETE;
```

### Backup & Restore

```bash
# Backup
clickhouse-backup create --table observability.events

# Restore
clickhouse-backup restore backup_name
```