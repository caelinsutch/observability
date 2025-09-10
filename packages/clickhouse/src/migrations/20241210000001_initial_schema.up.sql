-- Initial schema setup
-- Creates the base tables for observability data

-- Create database if not exists
CREATE DATABASE IF NOT EXISTS observability;

-- Events table for storing observability events
CREATE TABLE IF NOT EXISTS observability.events (
    -- Identifiers
    id UUID DEFAULT generateUUIDv4(),
    trace_id String,
    span_id String,
    parent_span_id Nullable(String),
    
    -- Timestamps
    timestamp DateTime64(9, 'UTC'),
    duration_ns UInt64,
    
    -- Event metadata
    service_name String,
    operation String,
    status_code UInt16,
    status_message Nullable(String),
    
    -- Event type and level
    event_type Enum8('log' = 1, 'metric' = 2, 'trace' = 3, 'span' = 4),
    severity_level Enum8('trace' = 1, 'debug' = 2, 'info' = 3, 'warn' = 4, 'error' = 5, 'fatal' = 6),
    
    -- Attributes as JSON
    attributes String,
    resource_attributes String,
    
    -- User and session
    user_id Nullable(String),
    session_id Nullable(String),
    
    -- Environment
    environment String DEFAULT 'production',
    version Nullable(String),
    
    -- Indexing
    INDEX idx_trace_id trace_id TYPE bloom_filter GRANULARITY 1,
    INDEX idx_span_id span_id TYPE bloom_filter GRANULARITY 1,
    INDEX idx_service_name service_name TYPE bloom_filter GRANULARITY 1,
    INDEX idx_user_id user_id TYPE bloom_filter GRANULARITY 1,
    INDEX idx_session_id session_id TYPE bloom_filter GRANULARITY 1
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(timestamp)
ORDER BY (service_name, toStartOfHour(timestamp), timestamp)
TTL timestamp + INTERVAL 30 DAY
SETTINGS index_granularity = 8192;

-- Metrics table for storing time-series metrics
CREATE TABLE IF NOT EXISTS observability.metrics (
    -- Identifiers
    id UUID DEFAULT generateUUIDv4(),
    metric_name String,
    
    -- Timestamps
    timestamp DateTime64(3, 'UTC'),
    
    -- Metric data
    value Float64,
    unit String,
    metric_type Enum8('counter' = 1, 'gauge' = 2, 'histogram' = 3, 'summary' = 4),
    
    -- Labels as JSON
    labels String,
    
    -- Service info
    service_name String,
    environment String DEFAULT 'production',
    
    -- Aggregation fields
    count UInt64 DEFAULT 1,
    sum Float64 DEFAULT 0,
    min Float64 DEFAULT 0,
    max Float64 DEFAULT 0,
    
    -- Indexing
    INDEX idx_metric_name metric_name TYPE bloom_filter GRANULARITY 1,
    INDEX idx_service_name service_name TYPE bloom_filter GRANULARITY 1
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(timestamp)
ORDER BY (service_name, metric_name, timestamp)
TTL timestamp + INTERVAL 90 DAY
SETTINGS index_granularity = 8192;

-- Logs table for storing application logs
CREATE TABLE IF NOT EXISTS observability.logs (
    -- Identifiers
    id UUID DEFAULT generateUUIDv4(),
    trace_id Nullable(String),
    span_id Nullable(String),
    
    -- Timestamps
    timestamp DateTime64(9, 'UTC'),
    
    -- Log data
    level Enum8('trace' = 1, 'debug' = 2, 'info' = 3, 'warn' = 4, 'error' = 5, 'fatal' = 6),
    message String,
    
    -- Source information
    service_name String,
    logger_name Nullable(String),
    thread_name Nullable(String),
    
    -- Code location
    file_name Nullable(String),
    line_number Nullable(UInt32),
    function_name Nullable(String),
    
    -- Context
    context String,
    
    -- User and session
    user_id Nullable(String),
    session_id Nullable(String),
    
    -- Environment
    environment String DEFAULT 'production',
    version Nullable(String),
    hostname Nullable(String),
    
    -- Error information
    error_type Nullable(String),
    error_message Nullable(String),
    error_stack Nullable(String),
    
    -- Indexing
    INDEX idx_trace_id trace_id TYPE bloom_filter GRANULARITY 1,
    INDEX idx_service_name service_name TYPE bloom_filter GRANULARITY 1,
    INDEX idx_level level TYPE minmax GRANULARITY 1,
    INDEX idx_user_id user_id TYPE bloom_filter GRANULARITY 1,
    INDEX idx_error_type error_type TYPE bloom_filter GRANULARITY 1
)
ENGINE = MergeTree()
PARTITION BY toYYYYMMDD(timestamp)
ORDER BY (service_name, level, timestamp)
TTL timestamp + INTERVAL 7 DAY
SETTINGS index_granularity = 8192;