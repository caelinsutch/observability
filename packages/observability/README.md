# Observability Client SDK

A lightweight, privacy-focused browser SDK for comprehensive web application monitoring. Capture user interactions, performance metrics, errors, and custom events with minimal overhead.

## 🎯 Features

- **Lightweight**: < 10KB gzipped with zero dependencies
- **Performance Monitoring**: Web Vitals (LCP, FID, CLS), resource timing, paint metrics
- **User Interaction Tracking**: Clicks, scrolls, form submissions, navigation
- **Error Tracking**: JavaScript errors, console errors, unhandled promise rejections
- **Custom Events**: Flexible API for business-specific tracking
- **Smart Batching**: Automatic event batching with compression
- **Privacy First**: Built-in PII detection and removal
- **Session Management**: Automatic session tracking with configurable timeout
- **Network Resilience**: Retry logic with exponential backoff

## 📦 Installation

### NPM/Yarn/PNPM

```bash
# pnpm
pnpm add @observability/observability
```

### CDN

```html
<script src="https://cdn.jsdelivr.net/npm/@observability/observability@latest/dist/cdn.min.js"></script>
<script>
  window.Observability.init({
    endpoint: 'https://your-ingestion-endpoint.workers.dev'
  });
</script>
```

## 🚀 Quick Start

### Basic Setup

```typescript
import { Observability } from '@observability/observability';

// Initialize the SDK
const observability = await Observability.init({
  apiKey: 'your-api-key',
  endpoint: 'https://your-ingestion-endpoint.workers.dev',
  environment: 'production'
});

// SDK automatically tracks:
// - Page views
// - Web Vitals
// - Clicks
// - Errors
// - Console errors
```

### Custom Event Tracking

```typescript
// Track custom events
observability.track('purchase_completed', {
  productId: 'SKU-123',
  amount: 99.99,
  currency: 'USD',
  quantity: 2
});

// Track user actions
observability.track('feature_used', {
  feature: 'dark_mode',
  enabled: true
});

// Track conversion funnel
observability.track('checkout_step', {
  step: 2,
  stepName: 'shipping_info'
});
```

### User Identification

```typescript
// Identify logged-in users
observability.identify('user-123', {
  email: 'user@example.com',
  plan: 'premium',
  signupDate: '2024-01-15'
});

// Track page views
observability.page('Product Page', {
  product_id: 'prod-456',
  category: 'Electronics'
});
```

## ⚙️ Configuration

### Full Configuration Options

```typescript
interface ObservabilityConfig {
  // Required
  endpoint: string;                      // Ingestion endpoint URL
  apiKey?: string;                       // API key for authentication
  
  // Environment
  environment?: string;                  // Environment name
  debug?: boolean;                       // Enable debug logging
  
  // Batching
  batchSize?: number;                    // Max events per batch (default: 50)
  flushInterval?: number;                // Auto-flush interval in ms (default: 5000)
  maxRetries?: number;                   // Max retry attempts (default: 3)
  retryDelay?: number;                   // Initial retry delay in ms (default: 1000)
  
  // Tracking Options
  enableClickTracking?: boolean;         // Track click events (default: true)
  enableScrollTracking?: boolean;        // Track scroll events (default: true)
  enableErrorTracking?: boolean;         // Track JavaScript errors (default: true)
  enableConsoleErrorTracking?: boolean;  // Track console errors (default: true)
  enablePerformanceTracking?: boolean;   // Track performance metrics (default: true)
  
  // Privacy
  respectDoNotTrack?: boolean;           // Respect DNT header (default: true)
  excludeBots?: boolean;                 // Exclude bot traffic (default: true)
  sanitizePii?: boolean;                 // Remove PII from data (default: true)
  
  // Session
  sessionTimeout?: number;               // Session timeout in ms (default: 30 min)
  
  // Custom
  customHeaders?: Record<string, string>; // Additional HTTP headers
  onError?: (error: Error) => void;      // Error callback
  onEvent?: (event: ObservabilityEvent) => void; // Event callback
  beforeSend?: (event: ObservabilityEvent) => ObservabilityEvent | null; // Transform events
}
```

### Environment-Specific Configuration

```typescript
const config = {
  endpoint: process.env.OBSERVABILITY_ENDPOINT,
  apiKey: process.env.OBSERVABILITY_API_KEY,
  environment: process.env.NODE_ENV,
  debug: process.env.NODE_ENV === 'development',
  batchSize: process.env.NODE_ENV === 'production' ? 100 : 10
};

const observability = await Observability.init(config);
```

## 📊 Event Schema

### Base Event Fields

All events include these common fields:

```typescript
{
  timestamp: string;           // ISO 8601 timestamp
  session_id: string;         // Unique session identifier
  user_fingerprint: string;   // Browser fingerprint
  event_id: string;          // Unique event identifier
  event_type: string;        // Type of event
  page_url: string;          // Current page URL
  page_title: string;        // Page title
  referrer: string;          // Referrer URL
  user_agent: string;        // User agent string
  screen_width: number;      // Screen width
  screen_height: number;     // Screen height
  viewport_width: number;    // Viewport width
  viewport_height: number;   // Viewport height
  device_pixel_ratio: number; // Device pixel ratio
  timezone: string;          // User timezone
  language: string;          // Browser language
}
```

### Event Types

#### Click Event
```typescript
{
  event_type: 'click',
  element_tag: 'button',
  element_id: 'submit-btn',
  element_classes: ['btn', 'btn-primary'],
  element_text: 'Submit',
  element_href: null,
  x_position: 150,
  y_position: 300
}
```

#### Error Event
```typescript
{
  event_type: 'error',
  error_message: 'Cannot read property of undefined',
  error_stack: '...',
  error_filename: 'app.js',
  error_lineno: 42,
  error_colno: 15
}
```

#### Performance Event
```typescript
{
  event_type: 'performance',
  lcp: 2500,      // Largest Contentful Paint
  fid: 100,       // First Input Delay
  cls: 0.1,       // Cumulative Layout Shift
  fcp: 1800,      // First Contentful Paint
  ttfb: 200       // Time to First Byte
}
```

## 🔧 API Reference

### Core Methods

#### `init(config: ObservabilityConfig)`
Initialize the SDK with configuration.

```typescript
const obs = await Observability.init({
  endpoint: 'https://ingestion.example.com',
  apiKey: 'your-api-key'
});
```

#### `track(eventName: string, properties?: Record<string, any>)`
Track custom events with optional properties.

```typescript
observability.track('video_played', {
  videoId: 'abc123',
  duration: 120,
  quality: '1080p'
});
```

#### `identify(userId: string, traits?: Record<string, any>)`
Identify users and set user properties.

```typescript
observability.identify('user-456', {
  email: 'user@example.com',
  plan: 'enterprise'
});
```

#### `page(pageName?: string, properties?: Record<string, any>)`
Track page views with optional properties.

```typescript
observability.page('Checkout', {
  step: 2,
  items: 3
});
```

#### `flush()`
Manually flush the event queue.

```typescript
await observability.flush();
```

#### `destroy()`
Clean up and stop all tracking.

```typescript
observability.destroy();
```

#### `getSessionId()`
Get the current session ID.

```typescript
const sessionId = observability.getSessionId();
```

#### `getUserFingerprint()`
Get the user's browser fingerprint.

```typescript
const fingerprint = observability.getUserFingerprint();
```

## 🎯 Best Practices

### 1. Initialize Early
```typescript
// Initialize as early as possible in your app
import { Observability } from '@observability/observability';

const obs = await Observability.init(config);
export default obs;
```

### 2. Track Business Metrics
```typescript
// Track key business events
obs.track('trial_started', { plan: 'pro' });
obs.track('feature_adopted', { feature: 'api_keys' });
obs.track('subscription_upgraded', { 
  from: 'basic', 
  to: 'premium' 
});
```

### 3. Handle Sensitive Data
```typescript
// Use beforeSend to filter sensitive data
const obs = await Observability.init({
  beforeSend: (event) => {
    // Remove sensitive fields
    delete event.properties?.creditCard;
    delete event.properties?.ssn;
    return event;
  }
});
```

### 4. Optimize for Performance
```typescript
// Adjust batching for high-traffic sites
const obs = await Observability.init({
  batchSize: 100,        // Larger batches
  flushInterval: 10000,  // Less frequent flushes
});
```

## 🔐 Privacy & Security

### PII Detection
The SDK automatically detects and removes common PII patterns:
- Email addresses
- Phone numbers
- Credit card numbers
- Social Security numbers

### GDPR Compliance
```typescript
// Respect user privacy choices
const obs = await Observability.init({
  respectDoNotTrack: true,
  beforeSend: (event) => {
    if (!hasUserConsent()) {
      return null; // Drop event
    }
    return event;
  }
});
```

### Content Security Policy
Add to your CSP if using the CDN version:
```
script-src 'self' https://cdn.jsdelivr.net;
connect-src 'self' https://your-ingestion-endpoint.workers.dev;
```

## 🧪 Testing

### Unit Tests
```bash
# Run tests
pnpm test

# Run with coverage
pnpm test:coverage

# Run in watch mode
pnpm test:watch

# Run with UI
pnpm test:ui
```

### Mocking in Tests
```typescript
// Mock the SDK in tests
import { Observability } from '@observability/observability';

jest.mock('@observability/observability');

// Verify events were tracked
expect(Observability.track).toHaveBeenCalledWith('button_clicked', {
  button_id: 'submit'
});
```

## 📈 Performance

### Bundle Size
- **Minified**: ~25KB
- **Gzipped**: < 10KB
- **Zero dependencies**

### Runtime Performance
- **CPU**: < 1% impact on main thread
- **Memory**: < 1MB heap usage
- **Network**: Batched requests every 5s

## 🐛 Troubleshooting

### Events Not Sending
```typescript
// Enable debug mode
const obs = await Observability.init({
  debug: true, // Logs all events to console
  // ... other config
});

// Check queue status
console.log('Queue size:', obs.getQueueSize());

// Force flush
await obs.flush();
```

### Session Issues
```typescript
// Check session status
console.log('Session ID:', obs.getSessionId());
console.log('Session active:', obs.isSessionActive());

// Reset session
obs.resetSession();
```

## 📚 Framework Integration

### React
```tsx
import { useEffect } from 'react';
import { Observability } from '@observability/observability';

const obs = await Observability.init(config);

function App() {
  useEffect(() => {
    obs.page(document.title);
  }, [location]);
  
  return <YourApp />;
}
```

### Vue
```javascript
import { Observability } from '@observability/observability';

const obs = await Observability.init(config);

// Vue 3 plugin
app.config.globalProperties.$obs = obs;

// Track route changes
router.afterEach((to) => {
  obs.page(to.name, { path: to.path });
});
```

### Next.js
```typescript
// _app.tsx
import { Observability } from '@observability/observability';

const obs = await Observability.init(config);

export default function App({ Component, pageProps }) {
  useEffect(() => {
    const handleRouteChange = (url) => {
      obs.page(url);
    };
    
    router.events.on('routeChangeComplete', handleRouteChange);
    return () => {
      router.events.off('routeChangeComplete', handleRouteChange);
    };
  }, []);
  
  return <Component {...pageProps} />;
}
```