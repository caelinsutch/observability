-- Initial schema setup
-- Creates the events table for all observability data

-- Create database if not exists
CREATE DATABASE IF NOT EXISTS observability;

-- Events table for storing all observability events
CREATE TABLE IF NOT EXISTS observability.events (
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
    event_type Enum16('log' = 1, 'metric' = 2, 'trace' = 3, 'span' = 4, 'error' = 5, 'console_error' = 6, 'page_view' = 7, 'click' = 8, 'scroll' = 9, 'form_submit' = 10, 'performance' = 11, 'resource_timing' = 12, 'custom' = 13),
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
    user_fingerprint Nullable(String),
    
    -- Web analytics context
    page_url Nullable(String),
    page_title Nullable(String),
    referrer Nullable(String),
    user_agent Nullable(String),
    screen_width Nullable(UInt32),
    screen_height Nullable(UInt32),
    viewport_width Nullable(UInt32),
    viewport_height Nullable(UInt32),
    device_pixel_ratio Nullable(Float32),
    timezone Nullable(String),
    language Nullable(String),
    
    -- Click event specific
    element_tag Nullable(String),
    element_id Nullable(String),
    element_classes Nullable(String), -- JSON array stored as string
    element_text Nullable(String),
    element_href Nullable(String),
    element_xpath Nullable(String),
    click_x Nullable(Float32),
    click_y Nullable(Float32),
    
    -- Scroll event specific
    scroll_depth Nullable(Float32),
    scroll_percentage Nullable(Float32),
    scroll_y Nullable(Float32),
    max_scroll_depth Nullable(Float32),
    
    -- Form event specific
    form_id Nullable(String),
    form_name Nullable(String),
    form_action Nullable(String),
    form_method Nullable(String),
    form_fields Nullable(String), -- JSON array stored as string
    
    -- Error event specific
    error_message Nullable(String),
    error_stack Nullable(String),
    error_filename Nullable(String),
    error_line Nullable(UInt32),
    error_column Nullable(UInt32),
    error_type Nullable(String),
    
    -- Performance event specific
    metric_name Nullable(String),
    metric_value Nullable(Float64),
    metric_unit Nullable(String),
    
    -- Resource timing specific
    resource_url Nullable(String),
    resource_type Nullable(String),
    resource_size Nullable(UInt64),
    duration Nullable(Float64),
    dns_lookup Nullable(Float64),
    tcp_connection Nullable(Float64),
    secure_connection Nullable(Float64),
    response_time Nullable(Float64),
    transfer_size Nullable(UInt64),
    encoded_size Nullable(UInt64),
    decoded_size Nullable(UInt64),
    cache_hit Nullable(UInt8),
    
    -- Custom event specific
    event_name Nullable(String),
    event_data Nullable(String), -- JSON object stored as string
    
    -- Flexible attributes as JSON
    attributes String,
    resource_attributes String,
    
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
TTL toDateTime(timestamp) + INTERVAL 30 DAY
SETTINGS index_granularity = 8192;