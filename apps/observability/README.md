# Observability Package

A comprehensive browser observability and analytics tracking library designed for ClickHouse compatibility.

## Features

- **User Action Tracking**: Button clicks, form submissions, scroll events
- **Performance Monitoring**: Core Web Vitals (LCP, FID, CLS, TTFB), resource timing for images/videos
- **Error Tracking**: JavaScript errors, unhandled promise rejections, console errors
- **Session Management**: Browser fingerprinting-based session IDs with automatic expiration
- **Event Batching**: Efficient event batching with offline support and retry mechanisms
- **ClickHouse Ready**: All events are structured for optimal ClickHouse ingestion

## Installation

```bash
npm install @observability/observability
```

## Usage

### Basic Setup

```typescript
import { Observability } from '@observability/observability';

// Initialize the library
const observability = await Observability.init({
  endpoint: 'https://your-analytics-endpoint.com/events',
  apiKey: 'your-api-key', // Optional
  batchSize: 50, // Events per batch
  flushInterval: 5000, // Flush interval in ms
  debug: true, // Enable debug logging
});
```

### Configuration Options

```typescript
interface ObservabilityConfig {
  endpoint: string;                    // Required: Your analytics endpoint
  apiKey?: string;                     // Optional: API authentication
  batchSize?: number;                  // Default: 50
  flushInterval?: number;              // Default: 5000ms
  enableClickTracking?: boolean;       // Default: true
  enableScrollTracking?: boolean;      // Default: true
  enableErrorTracking?: boolean;       // Default: true
  enablePerformanceTracking?: boolean; // Default: true
  enableConsoleErrorTracking?: boolean;// Default: true
  debug?: boolean;                     // Default: false
  respectDoNotTrack?: boolean;         // Default: true
  excludeBots?: boolean;               // Default: true
  customHeaders?: Record<string, string>;
  onError?: (error: Error) => void;
  onEvent?: (event: ObservabilityEvent) => void;
}
```

### Custom Event Tracking

```typescript
// Track custom events
observability.track('button_clicked', {
  button_id: 'submit-form',
  button_text: 'Submit',
  form_name: 'contact',
});

// Identify users
observability.identify('user-123', {
  email: 'user@example.com',
  plan: 'premium',
});

// Track page views
observability.page('Product Page', {
  product_id: 'prod-456',
  category: 'Electronics',
});
```

### Manual Control

```typescript
// Get session information
const sessionId = observability.getSessionId();
const userFingerprint = observability.getUserFingerprint();

// Force flush events
await observability.flush();

// Clean up
observability.destroy();
```

## Event Types

All events include base fields for session tracking and page context:

### Base Event Fields
- `timestamp`: Event timestamp
- `session_id`: Unique session identifier
- `user_fingerprint`: Browser fingerprint
- `event_id`: Unique event identifier
- `event_type`: Type of event
- `page_url`: Current page URL
- `page_title`: Page title
- `referrer`: Referrer URL
- `user_agent`: User agent string
- `screen_width/height`: Screen dimensions
- `viewport_width/height`: Viewport dimensions
- `device_pixel_ratio`: Device pixel ratio
- `timezone`: User timezone
- `language`: Browser language

### Event Types
- `page_view`: Page view events
- `click`: Click events with element details
- `scroll`: Scroll tracking with depth metrics
- `form_submit`: Form submission tracking
- `error`: JavaScript errors
- `console_error`: Console error tracking
- `performance`: Performance metrics (Web Vitals)
- `resource_timing`: Resource load timing (images, videos, scripts)
- `custom`: Custom tracked events

## ClickHouse Schema

Example ClickHouse table schema for storing events:

```sql
CREATE TABLE events (
    timestamp DateTime64(3),
    session_id String,
    user_fingerprint String,
    event_id String,
    event_type LowCardinality(String),
    page_url String,
    page_title String,
    referrer String,
    user_agent String,
    screen_width UInt16,
    screen_height UInt16,
    viewport_width UInt16,
    viewport_height UInt16,
    device_pixel_ratio Float32,
    timezone String,
    language LowCardinality(String),
    
    -- Event-specific fields (stored as JSON)
    event_data String,
    
    -- Indexes
    INDEX idx_session_id session_id TYPE minmax GRANULARITY 1,
    INDEX idx_fingerprint user_fingerprint TYPE minmax GRANULARITY 1,
    INDEX idx_timestamp timestamp TYPE minmax GRANULARITY 1
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(timestamp)
ORDER BY (timestamp, session_id, event_type);
```

## Privacy & Compliance

- Respects Do Not Track browser settings by default
- Automatically excludes bot traffic
- No PII is collected by default
- Session IDs expire after 30 minutes of inactivity
- All URLs are sanitized to remove sensitive parameters

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

Requires support for:
- Performance Observer API
- Navigation Timing API
- FingerprintJS library