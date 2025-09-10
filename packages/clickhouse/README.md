# @observability/clickhouse

ClickHouse package for centralized observability event storage.

## Structure

```
packages/clickhouse/
├── src/
│   ├── client/          # ClickHouse client connection
│   ├── schemas/         # SQL table definitions
│   ├── migrations/      # Database migrations
│   ├── scripts/         # Utility scripts
│   └── types/           # ClickHouse-specific TypeScript types
```

## Setup

### Install ClickHouse locally

```bash
# Install ClickHouse (macOS/Linux)
curl https://clickhouse.com/ | sh

# Start ClickHouse
sudo clickhouse start

# Stop ClickHouse
sudo clickhouse stop
```

### Install dependencies

```bash
pnpm install
```

### Run migrations

```bash
# Run all pending migrations
pnpm run migrate:up

# Rollback last migration
pnpm run migrate:down

# Create a new migration
pnpm run migrate:create
```

### Seed sample data

```bash
pnpm run seed
```

## Usage

```typescript
import { getConnection } from '@observability/clickhouse';
import { prepareEventsForInsert } from '@observability/clickhouse';
import type { Event } from '@observability/schemas';

// Get connection
const connection = getConnection();

// Insert events
const events: Event[] = [
  {
    timestamp: new Date(),
    service_name: 'api-gateway',
    event_type: 'log',
    severity_level: 'info',
    name: 'application.startup',
    message: 'Application started',
    attributes: { port: 3000 },
    resource_attributes: { host: 'api-01' },
    environment: 'production'
  }
];

await connection.insert('observability.events', prepareEventsForInsert(events));

// Query data
const results = await connection.query<EventRecord>(
  'SELECT * FROM observability.events WHERE severity_level = {level:String}',
  { level: 'error' }
);

// Close connection when done
await connection.close();
```

## Environment Variables

- `CLICKHOUSE_URL` - ClickHouse server URL (default: `http://localhost:8123`)
- `CLICKHOUSE_USER` - Username (default: `default`)
- `CLICKHOUSE_PASSWORD` - Password (default: empty)
- `CLICKHOUSE_DATABASE` - Database name (default: `observability`)

## Scripts

- `pnpm run build` - Build TypeScript files
- `pnpm run dev` - Watch mode for development
- `pnpm run check-types` - Type checking
- `pnpm run migrate:up` - Run pending migrations
- `pnpm run migrate:down` - Rollback migrations
- `pnpm run migrate:create` - Create new migration
- `pnpm run clickhouse:start` - Start ClickHouse server
- `pnpm run clickhouse:stop` - Stop ClickHouse server
- `pnpm run seed` - Seed sample data

## Events Table

The unified `events` table stores all observability data with the following capabilities:

- **Event Types**: Supports logs, metrics, traces, and spans
- **Trace Context**: Full distributed tracing support with trace/span IDs
- **Flexible Attributes**: JSON fields for custom attributes
- **User Context**: Track user and session information
- **Optimized Indexing**: Bloom filters for efficient querying
- **Data Retention**: 30-day TTL with automatic cleanup

## Event Types

- **log**: Application logs with severity levels
- **metric**: Time-series metrics (stored as events with metric data in attributes)
- **trace**: Complete trace information
- **span**: Individual spans within traces