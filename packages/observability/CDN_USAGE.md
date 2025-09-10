# Observability SDK - CDN Usage

## Building for CDN

To build a single, self-contained JavaScript file for CDN hosting:

```bash
cd apps/observability
pnpm build:cdn
```

This creates a minified bundle at `dist-cdn/index.min.js` (~57KB) that includes all dependencies.

## CDN Integration

### 1. Host the File

Upload `dist-cdn/index.min.js` to your CDN or static hosting service.

### 2. Include in HTML

```html
<script src="https://your-cdn.com/observability.min.js"></script>
```

### 3. Initialize the SDK

```html
<script>
  // Option 1: Auto-initialization with global config
  window.ObservabilityConfig = {
    endpoint: 'https://your-api.com/events',
    apiKey: 'your-api-key',
    debug: true
  };
</script>
<script src="https://your-cdn.com/observability.min.js"></script>
```

Or initialize manually:

```html
<script src="https://your-cdn.com/observability.min.js"></script>
<script>
  ObservabilitySDK.Observability.init({
    endpoint: 'https://your-api.com/events',
    apiKey: 'your-api-key',
    batchSize: 50,
    flushInterval: 5000,
    enableClickTracking: true,
    enableScrollTracking: true,
    enableErrorTracking: true,
    enablePerformanceTracking: true,
    debug: false
  }).then(obs => {
    // SDK is ready
    console.log('Observability SDK initialized');
    
    // Track custom events
    obs.track('page_loaded', {
      url: window.location.href
    });
    
    // Identify users
    obs.identify('user-123', {
      email: 'user@example.com'
    });
  });
</script>
```

## Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `endpoint` | string | required | API endpoint for sending events |
| `apiKey` | string | '' | API key for authentication |
| `batchSize` | number | 50 | Number of events to batch before sending |
| `flushInterval` | number | 5000 | Milliseconds between batch sends |
| `enableClickTracking` | boolean | true | Track click events |
| `enableScrollTracking` | boolean | true | Track scroll events |
| `enableErrorTracking` | boolean | true | Track JavaScript errors |
| `enablePerformanceTracking` | boolean | true | Track performance metrics |
| `enableConsoleErrorTracking` | boolean | true | Track console.error calls |
| `debug` | boolean | false | Enable debug logging |
| `respectDoNotTrack` | boolean | true | Respect browser DNT setting |
| `excludeBots` | boolean | true | Don't track bot traffic |
| `customHeaders` | object | {} | Additional headers for API requests |
| `onError` | function | - | Callback for SDK errors |
| `onEvent` | function | - | Callback for tracked events |

## API Methods

### `track(eventName, eventData)`
Track custom events:
```javascript
obs.track('button_clicked', {
  button_id: 'submit',
  form_name: 'signup'
});
```

### `identify(userId, traits)`
Identify users:
```javascript
obs.identify('user-123', {
  email: 'user@example.com',
  plan: 'premium'
});
```

### `page(name, properties)`
Track page views:
```javascript
obs.page('Product Page', {
  product_id: '123',
  category: 'electronics'
});
```

### `flush()`
Force send all queued events:
```javascript
await obs.flush();
```

### `getSessionId()`
Get current session ID:
```javascript
const sessionId = obs.getSessionId();
```

### `getUserFingerprint()`
Get user fingerprint:
```javascript
const fingerprint = obs.getUserFingerprint();
```

### `destroy()`
Clean up and destroy the SDK instance:
```javascript
obs.destroy();
```

## Bundle Details

The CDN bundle:
- Format: IIFE (Immediately Invoked Function Expression)
- Global name: `ObservabilitySDK`
- Size: ~57KB minified
- Includes: All dependencies (including FingerprintJS)
- Target: ES2020 browsers
- No external dependencies required

## Testing

Use the included `example-cdn.html` file to test the CDN bundle locally:

```bash
cd apps/observability
open example-cdn.html
```

## Browser Support

The SDK targets ES2020 and supports:
- Chrome 80+
- Firefox 72+
- Safari 13.1+
- Edge 80+

## Security Notes

1. Always use HTTPS for hosting the SDK
2. Keep your API key secure (consider using a public key for client-side)
3. Implement proper CORS headers on your API endpoint
4. Consider implementing rate limiting on your API