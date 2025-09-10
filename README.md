# Observability Product

## Objective

Build a simple observability script & API for Nextjs, recording user actions such as button clicks, console errors, and keeping track of key performance KPIs, such as latency for images/videos to load/render in the browser. This should then be uploaded to an API endpoint, where it should be stored in a database and then be able to be served from a web dashboard which utilizes charts and tables to visualize the performance statistics and show errors.

## Packages

`apps/demo`

`apps/observability`


## System Architecture Overview

1. Data Collection Layer - CDN distributed script

Client SDK: Lightweight JavaScript library for instrumenting. Built with typescript and distributed through a cloudflare CDN script

- Identify client 
- Event collectors (clicks, errors, custom events)
- Performance observers (Web Vitals, resource timing, paint timing)
- Automatic session tracking and user identification
- Batching and compression logic
- Retry mechanisms with exponential backoff
- Sampling capabilities (to control data volume)
- Data Sanitization: Automatic PII removal (emails, credit cards, SSNs)

2. Ingestion Layer - Cloudflare worker deployed on the edge

Ingestion API: High-throughput endpoint to receive telemetry as a cloudflare worker.

- Check allowed origins - Cloudflare KV
- Rate limiting per client
- Request validation and sanitization
- Immediate write to cloudflare queue
- Return acknowledgment to client
- Queue sends batched data to fastify server

3. Processing Layer - Fastify Server

Stream Processor Service: Consumes batched data from Cloudflare queue

- Data transformation and normalization
- Batch writes to ClickHouse~

4. Storage Layer

Redis: Temporary buffer and real-time processing

- Streams for event queue
- Caching for API endpoints

ClickHouse: Long-term analytical storage

- Optimized table schemas for different event types
- Materialized views for common queries

5. Query & API Layer

Query API: Serves dashboard and external integrations

- Aggregation endpoints
- Time-series queries
- Error log retrieval
- Caching layer for expensive queries



## Tradeoffs
- Cloudflare workers, while fast, have a increased cost at scale compared to deploying multiple traditional servers. 
- Cloudflare queues and key value stores were used for compatibility with workers for the above reason, these could be swapped out for any other queue / key system (like Redis) if we wanted to move away from workers