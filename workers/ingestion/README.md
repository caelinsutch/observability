# Observability Ingestion Worker

High-performance Cloudflare Worker for ingesting observability events at the edge. Provides global low-latency event collection with built-in validation, rate limiting, and queue management.

## 🚀 Features

- **Edge Deployment**: Global presence with < 50ms latency worldwide
- **High Throughput**: Handle 100,000+ events/second per worker
- **Origin Validation**: KV-based allowlist for authorized domains
- **Rate Limiting**: Session-ID based rate limiting to prevent abuse
- **Queue Integration**: Cloudflare Queue for reliable event buffering
- **Compression Support**: Accept gzipped payloads for bandwidth efficiency
- **CORS Handling**: Proper CORS headers for browser compatibility
- **Error Recovery**: Automatic retries with exponential backoff

## 📦 Prerequisites

- Cloudflare account (free tier works for development)
- Wrangler CLI installed (`npm install -g wrangler`)
- Node.js 18+

## 🛠️ Setup

### 1. Install Dependencies

```bash
cd workers/ingestion
pnpm install
```

### 2. Configure Wrangler

Create or update `wrangler.toml`:

```toml
name = "observability-ingestion"
main = "src/index.ts"
compatibility_date = "2024-01-01"

# KV Namespace for allowed origins
[[kv_namespaces]]
binding = "ALLOWED_ORIGINS"
id = "your-kv-namespace-id"
preview_id = "your-preview-kv-id"

# Queue for event buffering
[[queues.producers]]
binding = "EVENT_QUEUE"
queue = "observability-events"

# Environment variables
[vars]
ENVIRONMENT = "production"
MAX_BATCH_SIZE = "1000"
RATE_LIMIT_PER_MINUTE = "10000"

# Development environment
[env.development]
vars = { ENVIRONMENT = "development", DEBUG = "true" }

# Staging environment
[env.staging]
vars = { ENVIRONMENT = "staging" }
```

### 3. Create KV Namespace

```bash
# Create production namespace
wrangler kv:namespace create "ALLOWED_ORIGINS"

# Create preview namespace for development
wrangler kv:namespace create "ALLOWED_ORIGINS" --preview

# Add the returned IDs to wrangler.toml
```

### 4. Configure Allowed Origins

```bash
# Add allowed origins to KV
wrangler kv:key put --namespace-id=your-kv-id "https://example.com" "active"
wrangler kv:key put --namespace-id=your-kv-id "https://app.example.com" "active"
wrangler kv:key put --namespace-id=your-kv-id "http://localhost:3000" "active" --env=development
```

## 🚀 Development

### Local Development

```bash
# Start local development server
pnpm dev

# The worker will be available at http://localhost:8787
```

### Testing Locally

```bash
# Send a test event
curl -X POST http://localhost:8787/ingest \
  -H "Content-Type: application/json" \
  -H "Origin: http://localhost:3000" \
  -d '{
    "events": [{
      "type": "pageview",
      "url": "https://example.com",
      "timestamp": "2024-01-15T10:00:00Z"
    }]
  }'
```

### Run Tests

```bash
# Run unit tests
pnpm test

# Run with coverage
pnpm test:coverage
```

## 📡 API Endpoints

### POST `/ingest`

Main ingestion endpoint for receiving events.

#### Request Headers
```
Content-Type: application/json
Content-Encoding: gzip (optional)
Origin: https://yourdomain.com
X-API-Key: your-api-key (optional)
```

#### Request Body
```json
{
  "events": [
    {
      "type": "click",
      "timestamp": "2024-01-15T10:00:00Z",
      "session_id": "sess_123",
      "user_fingerprint": "fp_456",
      "page_url": "https://example.com/products",
      "element_id": "buy-button",
      "element_text": "Buy Now"
    }
  ],
  "metadata": {
    "sdk_version": "1.0.0",
    "environment": "production"
  }
}
```

#### Response
```json
{
  "success": true,
  "accepted": 1,
  "rejected": 0,
  "message": "Events queued successfully"
}
```

### GET `/health`

Health check endpoint.

```bash
curl https://your-worker.workers.dev/health
```

Response:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:00:00Z",
  "environment": "production",
  "version": "1.0.0"
}
```

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|  
| `ENVIRONMENT` | Environment name | `production` |
| `MAX_BATCH_SIZE` | Maximum events per batch | `1000` |
| `RATE_LIMIT_PER_MINUTE` | Max events per client/minute | `10000` |
| `DEBUG` | Enable debug logging | `false` |
| `COMPRESSION_THRESHOLD` | Min payload size for compression | `1024` |
| `QUEUE_BATCH_SIZE` | Events per queue message | `100` |

### KV Store Schema

The `ALLOWED_ORIGINS` KV namespace stores authorized domains:

```javascript
// Key: origin URL
// Value: status string ("active", "suspended", or "blocked")
```

## 🚢 Deployment

### Deploy to Production

```bash
# Deploy to Cloudflare
pnpm deploy

# Deploy to specific environment
pnpm deploy --env staging
```

### Verify Deployment

```bash
# Check worker status
wrangler tail

# View real-time logs
wrangler tail --format pretty

# Check KV namespace
wrangler kv:key list --namespace-id=your-kv-id
```

### Update Allowed Origins

```bash
# Add new origin
wrangler kv:key put --namespace-id=your-kv-id "https://new-app.example.com" "active"

# Remove origin
wrangler kv:key delete --namespace-id=your-kv-id "https://old-app.example.com"

# List all origins
wrangler kv:key list --namespace-id=your-kv-id
```

## 📊 Monitoring

### Metrics

Monitor worker performance in the Cloudflare dashboard:
- Request count and success rate
- CPU time and duration
- Exceptions and errors
- Queue message counts

### Logging

View logs with wrangler:
```bash
wrangler tail --format pretty
```

## 🔐 Security

### Origin Validation

Only requests from allowed origins are accepted. Origins are checked against the KV store.

### Rate Limiting

Built-in rate limiting prevents abuse:
- Per-origin limits
- Configurable thresholds
- Automatic blocking for violations

### API Key Authentication

Optional API key for enhanced security:
```javascript
headers: {
  'X-API-Key': 'your-secret-key'
}
```

## 🎯 Performance Optimization

### Compression

Enable gzip compression for large payloads:
```javascript
// Client-side
const compressed = pako.gzip(JSON.stringify(events));
fetch(endpoint, {
  headers: {
    'Content-Encoding': 'gzip'
  },
  body: compressed
});
```

### Batching

Optimize batch sizes:
- Larger batches = fewer requests
- Smaller batches = lower latency
- Find the right balance for your use case

## 🐛 Troubleshooting

### Common Issues

#### CORS Errors
Ensure your origin is in the KV allowlist:
```bash
wrangler kv:key get --namespace-id=your-kv-id "https://your-domain.com"
```

#### Rate Limiting
Check and adjust limits in `wrangler.toml`:
```toml
[vars]
RATE_LIMIT_PER_MINUTE = "20000"
```

#### Queue Errors
Verify queue configuration:
```bash
wrangler queues list
```