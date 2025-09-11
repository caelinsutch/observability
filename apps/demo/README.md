# Observability Demo Application

Next.js demo application showcasing the Observability SDK integration. This app demonstrates tracking of user interactions, performance metrics, and error monitoring in a real-world React application.

## 🎯 Purpose

This demo application serves as:
- **Integration Example**: Shows how to integrate the Observability SDK in a Next.js app
- **Testing Platform**: Live testing environment for SDK features
- **Event Showcase**: Demonstrates all types of tracked events
- **Performance Testing**: Real-world performance impact assessment

## 🚀 Features

- **Automatic Tracking**: Page views, clicks, scrolls, and form submissions
- **Performance Monitoring**: Web Vitals and resource timing
- **Error Tracking**: JavaScript errors and unhandled promise rejections
- **Custom Events**: Examples of business-specific event tracking
- **Real-time Dashboard**: View events as they're captured
- **Interactive Elements**: Buttons, forms, and navigation to generate events

## 📦 Prerequisites

- Node.js 18+
- pnpm package manager
- Observability platform running (Worker + Server)

## 🛠️ Setup

### 1. Install Dependencies

```bash
cd apps/demo
pnpm install
```

### 2. Environment Configuration

Create `.env.local` file:

```env
# Observability SDK Configuration
NEXT_PUBLIC_OBSERVABILITY_ENDPOINT=http://localhost:8787/ingest
NEXT_PUBLIC_OBSERVABILITY_API_KEY=demo-api-key
NEXT_PUBLIC_OBSERVABILITY_DEBUG=true
NEXT_PUBLIC_OBSERVABILITY_ENVIRONMENT=development
```

### 3. Start the Demo App

```bash
# Development mode with hot reload
pnpm dev

# App runs on http://localhost:3000
```

## 🎮 Usage

### Viewing the Demo

1. Open http://localhost:3000 in your browser
2. Open browser DevTools Console to see SDK debug logs
3. Interact with the demo elements to generate events
4. Check the server logs to see events being processed

### Demo Features

#### Interactive Elements
- **Buttons**: Click tracking with element details
- **Forms**: Form submission tracking
- **Navigation**: Page view and navigation timing
- **Scroll Areas**: Scroll depth tracking
- **Error Triggers**: Buttons to generate test errors

#### Event Types Demonstrated
- Page views with navigation timing
- Click events with element context
- Scroll tracking with depth percentages
- Form interactions and submissions
- JavaScript errors with stack traces
- Custom business events

## 📁 Project Structure

```
apps/demo/
├── app/
│   ├── layout.tsx          # Root layout with SDK initialization
│   ├── page.tsx            # Home page with demo elements
│   ├── dashboard/
│   │   └── page.tsx        # Event dashboard
│   ├── test/
│   │   ├── errors/         # Error testing pages
│   │   ├── performance/    # Performance testing
│   │   └── interactions/   # Interaction testing
│   └── providers/
│       └── observability.tsx # SDK provider component
├── components/
│   ├── EventTrigger.tsx    # Interactive event triggers
│   ├── EventViewer.tsx     # Real-time event display
│   └── PerformancePanel.tsx # Performance metrics display
├── lib/
│   └── observability.ts    # SDK configuration and setup
└── public/
    └── test-assets/        # Large assets for performance testing
```

## 🔧 SDK Integration

### Basic Setup

```typescript
// app/layout.tsx
import { ObservabilityProvider } from './providers/observability';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <ObservabilityProvider>
          {children}
        </ObservabilityProvider>
      </body>
    </html>
  );
}
```

### Provider Implementation

```typescript
// app/providers/observability.tsx
'use client';

import { useEffect } from 'react';
import { Observability } from '@observability/observability';

export function ObservabilityProvider({ 
  children 
}: { 
  children: React.ReactNode 
}) {
  useEffect(() => {
    const obs = Observability.init({
      endpoint: process.env.NEXT_PUBLIC_OBSERVABILITY_ENDPOINT!,
      apiKey: process.env.NEXT_PUBLIC_OBSERVABILITY_API_KEY,
      debug: process.env.NEXT_PUBLIC_OBSERVABILITY_DEBUG === 'true',
      environment: process.env.NEXT_PUBLIC_OBSERVABILITY_ENVIRONMENT
    });

    // Track initial page view
    obs.page();

    return () => {
      obs.destroy();
    };
  }, []);

  return <>{children}</>;
}
```

### Custom Event Tracking

```typescript
// Example: Track user actions
import { getObservability } from '@/lib/observability';

function ProductPage() {
  const handleAddToCart = (productId: string) => {
    const obs = getObservability();
    
    obs.track('add_to_cart', {
      product_id: productId,
      quantity: 1,
      price: 99.99
    });
    
    // Your business logic
  };
  
  return (
    <button onClick={() => handleAddToCart('SKU-123')}>
      Add to Cart
    </button>
  );
}
```

## 📊 Event Examples

### Page View Event
```json
{
  "event_type": "pageview",
  "page_url": "http://localhost:3000/dashboard",
  "page_title": "Dashboard | Observability Demo",
  "referrer": "http://localhost:3000/",
  "timestamp": "2024-01-15T10:00:00.000Z"
}
```

### Click Event
```json
{
  "event_type": "click",
  "element_id": "submit-button",
  "element_text": "Submit Form",
  "element_tag": "button",
  "page_url": "http://localhost:3000/",
  "timestamp": "2024-01-15T10:00:01.000Z"
}
```

### Error Event
```json
{
  "event_type": "error",
  "error_message": "Cannot read property 'value' of null",
  "error_stack": "TypeError: Cannot read property...",
  "error_filename": "http://localhost:3000/_next/static/chunks/main.js",
  "error_lineno": 123,
  "timestamp": "2024-01-15T10:00:02.000Z"
}
```

## 🧪 Testing

### Manual Testing

1. **Click Tracking**: Click various buttons and links
2. **Scroll Tracking**: Scroll through long pages
3. **Form Tracking**: Fill and submit forms
4. **Error Tracking**: Click "Trigger Error" buttons
5. **Performance**: Check Web Vitals in the performance panel

### Automated Testing

```bash
# Run tests
pnpm test

# E2E tests with Playwright
pnpm test:e2e
```

## 🚢 Deployment

### Build for Production

```bash
# Create production build
pnpm build

# Start production server
pnpm start
```

### Deploy to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Set environment variables in Vercel dashboard
```

### Deploy with Docker

```dockerfile
FROM node:18-alpine
WORKDIR /app

COPY package*.json ./
RUN npm install -g pnpm && pnpm install --frozen-lockfile

COPY . .
RUN pnpm build

EXPOSE 3000
CMD ["pnpm", "start"]
```

## 🎯 Demo Scenarios

### 1. E-commerce Flow
- Browse products (page views)
- Click product images (click tracking)
- Add to cart (custom event)
- Checkout process (form tracking)
- Purchase completion (conversion event)

### 2. Content Site
- Article reading (scroll depth)
- Video playback (custom events)
- Social sharing (click tracking)
- Comment submission (form tracking)

### 3. SaaS Application
- User signup (form tracking)
- Feature usage (custom events)
- Error scenarios (error tracking)
- Performance monitoring (Web Vitals)

## 🐛 Troubleshooting

### Events Not Appearing

1. Check browser console for SDK errors
2. Verify endpoint URL in `.env.local`
3. Ensure worker is running (`pnpm --filter @observability/ingestion dev`)
4. Check network tab for failed requests

### CORS Issues

Ensure the demo URL is added to allowed origins:
```bash
wrangler kv:key put --namespace-id=your-kv-id "http://localhost:3000" "active"
```

### Performance Impact

Monitor the SDK's impact:
- Check browser DevTools Performance tab
- View memory usage in Task Manager
- Monitor network requests

## 📚 Resources

- [Observability SDK Documentation](../../packages/observability/README.md)
- [Next.js Documentation](https://nextjs.org/docs)
- [Web Vitals Guide](https://web.dev/vitals/)
