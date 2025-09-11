# Observability Server

Fastify-based API server for processing and storing observability events in ClickHouse. Receives events from the ingestion worker and provides query APIs for data retrieval.

## =€ Features

- **Fastify Framework**: High-performance Node.js web server
- **ClickHouse Integration**: Direct integration with ClickHouse for event storage
- **Batch Processing**: Efficient batch event ingestion
- **Event Validation**: Zod-based schema validation for all events
- **Query API**: Flexible event querying with filters
- **Worker Authentication**: Token-based authentication for worker endpoints
- **Structured Logging**: Pino logger with pretty printing in development

## =æ Prerequisites

- Node.js 18+
- ClickHouse server running locally or remotely
- pnpm package manager

## =à Setup

### 1. Install Dependencies

```bash
cd apps/server
pnpm install
```

### 2. Environment Configuration

Create `.env` file in the server directory:

```env
# Server Configuration
PORT=3001
HOST=0.0.0.0
NODE_ENV=development
LOG_LEVEL=info

# ClickHouse Configuration
CLICKHOUSE_HOST=localhost
CLICKHOUSE_PORT=8123
CLICKHOUSE_USER=default
CLICKHOUSE_PASSWORD=
CLICKHOUSE_DATABASE=observability

# Worker Authentication
WORKER_AUTH_TOKEN=your-secure-worker-token
```

### 3. Database Setup

Ensure ClickHouse is running and migrations are applied:

```bash
# Start ClickHouse (if not running)
pnpm --filter @observability/clickhouse clickhouse:start

# Run migrations
pnpm --filter @observability/clickhouse migrate:up
```

## =€ Development

### Start Development Server

```bash
# Start with hot reload and pretty logging
pnpm dev

# Server runs on http://localhost:3001
```

### Run Tests

```bash
# Run tests
pnpm test

# Run with coverage
pnpm test:coverage
```

## =á API Endpoints

### GET `/`

Basic endpoint returning hello world.

```bash
curl http://localhost:3001/
```

Response:
```json
{
  "hello": "world"
}
```

### GET `/health`

Health check endpoint for monitoring.

```bash
curl http://localhost:3001/health
```

Response:
```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:00:00.000Z",
  "environment": "development"
}
```

### GET `/api/events/health`

Events API health check.

```bash
curl http://localhost:3001/api/events/health
```

Response:
```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:00:00.000Z"
}
```

### POST `/api/events/batch`

Batch endpoint for receiving events from workers. Requires authentication.

```bash
curl -X POST http://localhost:3001/api/events/batch \
  -H "Content-Type: application/json" \
  -H "X-Worker-Auth: your-secure-worker-token" \
  -d '{
    "events": [
      {
        "id": "evt_123",
        "timestamp": "2024-01-15T10:00:00.000Z",
        "event_type": "click",
        "session_id": "sess_456",
        "visitor_id": "visitor_789",
        "page_url": "https://example.com",
        "page_title": "Example Page",
        "event_data": {
          "element_id": "button-submit",
          "element_text": "Submit"
        }
      }
    ],
    "processedAt": "2024-01-15T10:00:00.000Z",
    "workerInstance": "worker-1"
  }'
```

Response:
```json
{
  "success": true,
  "processed": 1,
  "timestamp": "2024-01-15T10:00:00.000Z"
}
```

### POST `/api/events`

Single event endpoint for direct submissions.

```bash
curl -X POST http://localhost:3001/api/events \
  -H "Content-Type: application/json" \
  -d '{
    "id": "evt_123",
    "timestamp": "2024-01-15T10:00:00.000Z",
    "event_type": "pageview",
    "session_id": "sess_456",
    "visitor_id": "visitor_789",
    "page_url": "https://example.com",
    "page_title": "Home Page"
  }'
```

Response:
```json
{
  "success": true,
  "id": "evt_123"
}
```

### GET `/api/events`

Query endpoint to retrieve events with filtering options.

```bash
# Basic query
curl "http://localhost:3001/api/events?limit=10"

# With filters
curl "http://localhost:3001/api/events?event_type=click&environment=production&limit=20&offset=0"

# With time range
curl "http://localhost:3001/api/events?start_time=2024-01-15T00:00:00Z&end_time=2024-01-15T23:59:59Z"
```

Query Parameters:
- `service_name` - Filter by service name
- `environment` - Filter by environment (development, staging, production)
- `event_type` - Filter by event type (click, pageview, error, etc.)
- `severity_level` - Filter by severity level
- `limit` - Maximum number of results (default: 100)
- `offset` - Pagination offset (default: 0)
- `start_time` - Start time for time range filter (ISO 8601)
- `end_time` - End time for time range filter (ISO 8601)

Response:
```json
{
  "success": true,
  "events": [...],
  "count": 10,
  "limit": 100,
  "offset": 0
}
```

## =' Configuration

### Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `PORT` | Server port | `3001` | No |
| `HOST` | Server host | `0.0.0.0` | No |
| `NODE_ENV` | Environment mode | `development` | No |
| `LOG_LEVEL` | Logging level | `info` | No |
| `CLICKHOUSE_HOST` | ClickHouse host | `localhost` | Yes |
| `CLICKHOUSE_PORT` | ClickHouse port | `8123` | No |
| `CLICKHOUSE_USER` | ClickHouse username | `default` | No |
| `CLICKHOUSE_PASSWORD` | ClickHouse password | - | No |
| `CLICKHOUSE_DATABASE` | ClickHouse database | `observability` | Yes |
| `WORKER_AUTH_TOKEN` | Authentication token for workers | - | Yes |

## <× Architecture

### Components

1. **Fastify Server** (`src/index.ts`)
   - Main server setup with logging configuration
   - Health check endpoints
   - Graceful shutdown handling
   - ClickHouse client decoration

2. **Event Routes** (`src/routes/events.ts`)
   - Batch event ingestion from workers
   - Single event submission
   - Event querying with filters
   - Request validation using Zod schemas

3. **ClickHouse Client** (`src/clickhouse.ts`)
   - Connection management
   - Query execution
   - Connection pooling

4. **Environment Config** (`src/env.ts`)
   - Environment variable validation
   - Type-safe configuration

## =Ê Data Schema

Events are stored in ClickHouse with the following structure:

```typescript
interface ObservabilityEvent {
  id: string;
  timestamp: string;
  event_type: string;
  session_id: string;
  visitor_id: string;
  page_url: string;
  page_title: string;
  referrer?: string;
  user_agent?: string;
  // Event-specific data
  event_data?: Record<string, any>;
  // Optional fields
  service_name?: string;
  environment?: string;
  severity_level?: string;
}
```

## =¢ Deployment

### Production Build

```bash
# Build the server
pnpm build

# Start production server
NODE_ENV=production pnpm start
```

### Docker Deployment

```dockerfile
FROM node:18-alpine
WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install --frozen-lockfile --prod

# Copy source
COPY . .

# Build
RUN pnpm build

# Expose port
EXPOSE 3001

# Start server
CMD ["pnpm", "start"]
```

### PM2 Deployment

```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'observability-server',
    script: './dist/index.js',
    instances: 2,
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3001
    }
  }]
};
```

## =Ê Monitoring

### Logging

The server uses Pino for structured logging:

- Development: Pretty-printed logs with colors
- Production: JSON structured logs for log aggregation

### Health Monitoring

Use the `/health` endpoint for monitoring:

```bash
# Simple health check
curl http://localhost:3001/health

# Events API health
curl http://localhost:3001/api/events/health
```

## = Troubleshooting

### Common Issues

#### ClickHouse Connection Errors

```bash
# Check ClickHouse is running
curl http://localhost:8123/ping

# Verify connection settings in .env
cat .env | grep CLICKHOUSE
```

#### Worker Authentication Failures

Ensure the `WORKER_AUTH_TOKEN` matches between the server and worker:

```bash
# In server .env
WORKER_AUTH_TOKEN=your-secure-token

# In worker requests
curl -H "X-Worker-Auth: your-secure-token" ...
```

#### Port Already in Use

```bash
# Find process using port 3001
lsof -i :3001

# Kill the process or use different port
PORT=3002 pnpm dev
```

### Debug Mode

Enable debug logging:

```bash
LOG_LEVEL=debug pnpm dev
```

## <¯ Performance Tips

1. **Batch Processing**: Use the batch endpoint for multiple events to reduce overhead
2. **Connection Pooling**: The ClickHouse client maintains a connection pool
3. **Query Optimization**: Use time range filters to limit query scope
4. **Monitoring**: Watch server logs for slow queries or errors

## =Ú Related Documentation

- [ClickHouse Package](../../packages/clickhouse/README.md)
- [Schemas Package](../../packages/schemas/README.md)
- [Ingestion Worker](../../workers/ingestion/README.md)