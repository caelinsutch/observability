import { getConnection } from '../client';
import { prepareEventsForInsert, prepareMetricsForInsert, prepareLogsForInsert } from '../types/clickhouse';
import type { Event, Metric, Log, SeverityLevel, MetricType, EventType } from '@observability/types';

async function seed() {
  const connection = getConnection();
  
  try {
    // Check connection
    const isConnected = await connection.ping();
    if (!isConnected) {
      throw new Error('Failed to connect to ClickHouse');
    }
    
    console.log('Connected to ClickHouse, seeding sample data...');
    
    // Sample events
    const events: Event[] = [
      {
        trace_id: 'trace-001',
        span_id: 'span-001',
        parent_span_id: null,
        timestamp: new Date(),
        duration_ns: 1500000,
        service_name: 'api-gateway',
        operation: 'GET /api/users',
        status_code: 200,
        status_message: 'OK',
        event_type: 'span' as EventType,
        severity_level: 'info' as SeverityLevel,
        attributes: { method: 'GET', path: '/api/users' },
        resource_attributes: { host: 'api-01', region: 'us-west-2' },
        user_id: 'user-123',
        session_id: 'session-456',
        environment: 'production',
        version: '1.0.0'
      },
      {
        trace_id: 'trace-002',
        span_id: 'span-002',
        parent_span_id: null,
        timestamp: new Date(),
        duration_ns: 3500000,
        service_name: 'user-service',
        operation: 'database.query',
        status_code: 200,
        status_message: 'OK',
        event_type: 'span' as EventType,
        severity_level: 'info' as SeverityLevel,
        attributes: { query: 'SELECT * FROM users', rows_returned: 42 },
        resource_attributes: { host: 'db-01', region: 'us-west-2' },
        environment: 'production',
        version: '1.0.0'
      }
    ];
    
    // Sample metrics
    const metrics: Metric[] = [
      {
        metric_name: 'http_requests_total',
        timestamp: new Date(),
        value: 1234,
        unit: 'requests',
        metric_type: 'counter' as MetricType,
        labels: { method: 'GET', endpoint: '/api/users', status: '200' },
        service_name: 'api-gateway',
        environment: 'production',
        count: 1,
        sum: 1234
      },
      {
        metric_name: 'memory_usage_bytes',
        timestamp: new Date(),
        value: 536870912,
        unit: 'bytes',
        metric_type: 'gauge' as MetricType,
        labels: { host: 'api-01', process: 'node' },
        service_name: 'api-gateway',
        environment: 'production'
      },
      {
        metric_name: 'request_duration_ms',
        timestamp: new Date(),
        value: 45.5,
        unit: 'milliseconds',
        metric_type: 'histogram' as MetricType,
        labels: { method: 'GET', endpoint: '/api/users' },
        service_name: 'api-gateway',
        environment: 'production',
        count: 100,
        sum: 4550,
        min: 12,
        max: 234
      }
    ];
    
    // Sample logs
    const logs: Log[] = [
      {
        timestamp: new Date(),
        level: 'info' as SeverityLevel,
        message: 'Application started successfully',
        service_name: 'api-gateway',
        logger_name: 'startup',
        context: { port: 3000, workers: 4 },
        environment: 'production',
        version: '1.0.0',
        hostname: 'api-01'
      },
      {
        trace_id: 'trace-001',
        span_id: 'span-001',
        timestamp: new Date(),
        level: 'info' as SeverityLevel,
        message: 'Processing user request',
        service_name: 'api-gateway',
        logger_name: 'http',
        context: { method: 'GET', path: '/api/users', user_agent: 'Mozilla/5.0' },
        user_id: 'user-123',
        session_id: 'session-456',
        environment: 'production',
        version: '1.0.0',
        hostname: 'api-01'
      },
      {
        timestamp: new Date(),
        level: 'error' as SeverityLevel,
        message: 'Database connection failed',
        service_name: 'user-service',
        logger_name: 'database',
        context: { attempt: 3, max_retries: 3 },
        environment: 'production',
        version: '1.0.0',
        hostname: 'user-01',
        error_type: 'ConnectionError',
        error_message: 'ECONNREFUSED',
        error_stack: 'Error: connect ECONNREFUSED 127.0.0.1:5432\n    at TCPConnectWrap.afterConnect'
      }
    ];
    
    // Insert data
    console.log('Inserting events...');
    await connection.insert('observability.events', prepareEventsForInsert(events));
    console.log(`✓ Inserted ${events.length} events`);
    
    console.log('Inserting metrics...');
    await connection.insert('observability.metrics', prepareMetricsForInsert(metrics));
    console.log(`✓ Inserted ${metrics.length} metrics`);
    
    console.log('Inserting logs...');
    await connection.insert('observability.logs', prepareLogsForInsert(logs));
    console.log(`✓ Inserted ${logs.length} logs`);
    
    // Verify data
    console.log('\nVerifying data...');
    
    const eventCount = await connection.query<{ count: number }>(
      'SELECT count() as count FROM observability.events'
    );
    console.log(`Events in database: ${eventCount[0].count}`);
    
    const metricCount = await connection.query<{ count: number }>(
      'SELECT count() as count FROM observability.metrics'
    );
    console.log(`Metrics in database: ${metricCount[0].count}`);
    
    const logCount = await connection.query<{ count: number }>(
      'SELECT count() as count FROM observability.logs'
    );
    console.log(`Logs in database: ${logCount[0].count}`);
    
    console.log('\n✅ Seeding completed successfully!');
    
  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  } finally {
    await connection.close();
  }
}

seed();