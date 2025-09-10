-- Events table for storing all observability events
CREATE TABLE IF NOT EXISTS events (
    -- Identifiers
    id UUID DEFAULT generateUUIDv4(),
    
    -- Timestamp
    timestamp DateTime64(9, 'UTC'),
    
    -- Service info
    service_name String,
    environment String DEFAULT 'production',
    version Nullable(String),
    
    -- Trace context
    trace_id Nullable(String),
    span_id Nullable(String),
    parent_span_id Nullable(String),
    
    -- Event details
    event_type Enum8('log' = 1, 'metric' = 2, 'trace' = 3, 'span' = 4),
    severity_level Enum8('trace' = 1, 'debug' = 2, 'info' = 3, 'warn' = 4, 'error' = 5, 'fatal' = 6),
    name String,
    message Nullable(String),
    duration_ns Nullable(UInt64),
    
    -- Status
    status_code Nullable(UInt16),
    status_message Nullable(String),
    
    -- User context
    user_id Nullable(String),
    session_id Nullable(String),
    
    -- Flexible attributes as JSON
    attributes String, -- JSON string for flexible attributes
    resource_attributes String, -- JSON string for resource attributes
    
    -- Indexing
    INDEX idx_trace_id trace_id TYPE bloom_filter GRANULARITY 1,
    INDEX idx_span_id span_id TYPE bloom_filter GRANULARITY 1,
    INDEX idx_service_name service_name TYPE bloom_filter GRANULARITY 1,
    INDEX idx_event_type event_type TYPE minmax GRANULARITY 1,
    INDEX idx_severity_level severity_level TYPE minmax GRANULARITY 1,
    INDEX idx_user_id user_id TYPE bloom_filter GRANULARITY 1,
    INDEX idx_session_id session_id TYPE bloom_filter GRANULARITY 1
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(timestamp)
ORDER BY (service_name, event_type, toStartOfHour(timestamp), timestamp)
TTL timestamp + INTERVAL 30 DAY
SETTINGS index_granularity = 8192;