# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an observability platform built as a monorepo using pnpm workspaces and Turbo. It consists of:
- **Client SDK** (`packages/observability`): Lightweight browser tracking library for capturing user interactions and performance metrics
- **Ingestion Worker** (`workers/ingestion`): Cloudflare Worker for high-throughput event ingestion
- **Server** (`apps/server`): Fastify API server for processing and storing events
- **Demo App** (`apps/demo`): Next.js demo application for testing the SDK
- **ClickHouse Package** (`packages/clickhouse`): Database client and migration management

## Key Commands

### Development
```bash
# Install dependencies (uses pnpm)
pnpm install

# Run all dev servers concurrently
pnpm dev

# Run specific app/package in dev mode
pnpm --filter @observability/demo dev       # Demo Next.js app on port 3000
pnpm --filter @observability/server dev      # Fastify server
pnpm --filter @observability/ingestion dev   # Cloudflare Worker
```

### Building & Testing
```bash
# Build all packages
pnpm build

# Run type checking
pnpm typecheck

# Run linting
pnpm lint

# Run tests
pnpm test

# Run tests for specific package
pnpm --filter @observability/observability test
pnpm --filter @observability/observability test:ui       # With Vitest UI
pnpm --filter @observability/observability test:coverage # With coverage
```

### Database Management (ClickHouse)
```bash
# Navigate to clickhouse package first or use --filter
cd packages/clickhouse

# Database operations
pnpm migrate:up       # Run pending migrations
pnpm migrate:down     # Rollback last migration
pnpm migrate:create   # Create new migration file
pnpm seed            # Seed database with sample data

# ClickHouse service (requires sudo)
pnpm clickhouse:start
pnpm clickhouse:stop
```

### Cloudflare Worker Deployment
```bash
cd workers/ingestion
pnpm deploy    # Deploy to Cloudflare
pnpm typegen   # Generate TypeScript types for bindings
```

### SDK Building
```bash
cd packages/observability
pnpm build      # Build standard library
pnpm build:cdn  # Build CDN-distributable version
```

## Architecture & Data Flow

1. **Client SDK** (`packages/observability/src/index.ts`) captures events:
   - User interactions (clicks, scrolls, forms)
   - Performance metrics (Web Vitals, resource timing)
   - Errors (JavaScript errors, console errors, unhandled rejections)
   - Custom events via `track()` API
   - Events are batched and compressed before sending

2. **Ingestion Worker** receives events at the edge:
   - Validates origin against Cloudflare KV allowlist
   - Applies rate limiting per client
   - Writes to Cloudflare Queue for buffering
   - Returns immediate acknowledgment

3. **Fastify Server** (`apps/server`) processes queued events:
   - Consumes from Cloudflare Queue
   - Transforms and normalizes data
   - Batch writes to ClickHouse for long-term storage

4. **ClickHouse** stores analytical data:
   - Optimized schemas per event type
   - Materialized views for common aggregations
   - High-performance time-series queries

## Important Patterns

### Event Schema
All events follow the schema defined in `packages/schemas`. Events include:
- Common fields: timestamp, sessionId, visitorId, url
- Type-specific payloads (click data, error details, performance metrics)

### Batching Strategy
The SDK batches events (default: 50 events or 5 seconds) to reduce network overhead. See `packages/observability/src/core/batcher.ts`.

### Fingerprinting
User identification uses FingerprintJS for anonymous visitor tracking. See `packages/observability/src/utils/fingerprint.ts`.

### Environment Configuration
- ClickHouse requires `.env` file in `packages/clickhouse` (see `.env.example`)
- Cloudflare Worker uses `wrangler.toml` for configuration
- Server uses environment variables for API configuration

### Code Style
- Uses Biome for formatting (tab indentation, double quotes)
- TypeScript for all packages
- Monorepo with shared TypeScript configs (`packages/typescript-config`)
- Turbo for build orchestration and caching
- Use const function declaration
- Use types over interfaces