import { 
  PerformanceEvent, 
  ResourceTimingEvent, 
  EventType, 
  PerformanceMetric,
  ResourceType 
} from '../types/events';
import { FingerprintManager } from '../utils/fingerprint';
import { generateEventId } from '../utils/helpers';

export class PerformanceMonitor {
  private fingerprintManager: FingerprintManager;
  private performanceObserver: PerformanceObserver | null = null;
  private resourceObserver: PerformanceObserver | null = null;
  private eventQueue: (PerformanceEvent | ResourceTimingEvent)[] = [];
  private observedResources = new Set<string>();
  
  constructor(fingerprintManager: FingerprintManager) {
    this.fingerprintManager = fingerprintManager;
  }
  
  private createPerformanceEvent(metricName: PerformanceMetric, value: number): PerformanceEvent {
    return {
      timestamp: Date.now(),
      session_id: this.fingerprintManager.getSessionId(),
      user_fingerprint: this.fingerprintManager.getVisitorId(),
      event_id: generateEventId(),
      event_type: EventType.PERFORMANCE,
      page_url: window.location.href,
      page_title: document.title,
      referrer: document.referrer,
      user_agent: navigator.userAgent,
      screen_width: window.screen.width,
      screen_height: window.screen.height,
      viewport_width: window.innerWidth,
      viewport_height: window.innerHeight,
      device_pixel_ratio: window.devicePixelRatio || 1,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      language: navigator.language,
      metric_name: metricName,
      metric_value: value,
      metric_unit: 'ms',
    };
  }
  
  private createResourceTimingEvent(entry: PerformanceResourceTiming): ResourceTimingEvent {
    const resourceType = this.getResourceType(entry);
    
    return {
      timestamp: Date.now(),
      session_id: this.fingerprintManager.getSessionId(),
      user_fingerprint: this.fingerprintManager.getVisitorId(),
      event_id: generateEventId(),
      event_type: EventType.RESOURCE_TIMING,
      page_url: window.location.href,
      page_title: document.title,
      referrer: document.referrer,
      user_agent: navigator.userAgent,
      screen_width: window.screen.width,
      screen_height: window.screen.height,
      viewport_width: window.innerWidth,
      viewport_height: window.innerHeight,
      device_pixel_ratio: window.devicePixelRatio || 1,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      language: navigator.language,
      resource_url: entry.name,
      resource_type: resourceType,
      resource_size: entry.decodedBodySize || 0,
      duration: entry.duration,
      dns_lookup: entry.domainLookupEnd - entry.domainLookupStart,
      tcp_connection: entry.connectEnd - entry.connectStart,
      secure_connection: entry.secureConnectionStart > 0 ? entry.connectEnd - entry.secureConnectionStart : 0,
      response_time: entry.responseEnd - entry.responseStart,
      transfer_size: entry.transferSize,
      encoded_size: entry.encodedBodySize,
      decoded_size: entry.decodedBodySize,
      cache_hit: entry.transferSize === 0 && entry.decodedBodySize > 0,
    };
  }
  
  private getResourceType(entry: PerformanceResourceTiming): ResourceType {
    const initiatorType = entry.initiatorType;
    const url = entry.name.toLowerCase();
    
    if (initiatorType === 'img' || /\.(jpg|jpeg|png|gif|webp|svg|ico)$/i.test(url)) {
      return ResourceType.IMAGE;
    }
    if (initiatorType === 'video' || /\.(mp4|webm|ogg|mov|avi)$/i.test(url)) {
      return ResourceType.VIDEO;
    }
    if (initiatorType === 'script' || /\.js$/i.test(url)) {
      return ResourceType.SCRIPT;
    }
    if (initiatorType === 'css' || /\.css$/i.test(url)) {
      return ResourceType.STYLESHEET;
    }
    if (/\.(woff|woff2|ttf|otf|eot)$/i.test(url)) {
      return ResourceType.FONT;
    }
    if (initiatorType === 'navigation') {
      return ResourceType.DOCUMENT;
    }
    if (initiatorType === 'fetch') {
      return ResourceType.FETCH;
    }
    if (initiatorType === 'xmlhttprequest') {
      return ResourceType.XHR;
    }
    
    return ResourceType.OTHER;
  }
  
  startMonitoring(): void {
    // Monitor Core Web Vitals
    this.observeWebVitals();
    
    // Monitor Navigation Timing
    this.observeNavigationTiming();
    
    // Monitor Resource Timing (images, videos, etc.)
    this.observeResourceTiming();
  }
  
  private observeWebVitals(): void {
    if ('PerformanceObserver' in window) {
      // Observe LCP
      try {
        const lcpObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1] as any;
          if (lastEntry && lastEntry.renderTime) {
            const lcpValue = lastEntry.renderTime || lastEntry.loadTime;
            this.eventQueue.push(this.createPerformanceEvent(PerformanceMetric.LCP, lcpValue));
          }
        });
        lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
      } catch (e) {
        console.warn('LCP observation not supported');
      }
      
      // Observe FID
      try {
        const fidObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach((entry: any) => {
            if (entry.processingStart && entry.startTime) {
              const fidValue = entry.processingStart - entry.startTime;
              this.eventQueue.push(this.createPerformanceEvent(PerformanceMetric.FID, fidValue));
            }
          });
        });
        fidObserver.observe({ entryTypes: ['first-input'] });
      } catch (e) {
        console.warn('FID observation not supported');
      }
      
      // Observe CLS
      let clsValue = 0;
      let clsEntries: any[] = [];
      
      try {
        const clsObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach((entry: any) => {
            if (!entry.hadRecentInput) {
              clsEntries.push(entry);
              clsValue += entry.value;
            }
          });
          
          // Report CLS when page is hidden
          if (document.visibilityState === 'hidden') {
            this.eventQueue.push(this.createPerformanceEvent(PerformanceMetric.CLS, clsValue * 1000));
          }
        });
        clsObserver.observe({ entryTypes: ['layout-shift'] });
      } catch (e) {
        console.warn('CLS observation not supported');
      }
      
      // Observe FCP
      try {
        const fcpObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach((entry) => {
            if (entry.name === 'first-contentful-paint') {
              this.eventQueue.push(this.createPerformanceEvent(PerformanceMetric.FCP, entry.startTime));
            }
          });
        });
        fcpObserver.observe({ entryTypes: ['paint'] });
      } catch (e) {
        console.warn('FCP observation not supported');
      }
    }
  }
  
  private observeNavigationTiming(): void {
    if (window.performance && window.performance.timing) {
      const timing = window.performance.timing;
      
      // Wait for page load to complete
      if (document.readyState === 'complete') {
        this.captureNavigationMetrics();
      } else {
        window.addEventListener('load', () => {
          setTimeout(() => this.captureNavigationMetrics(), 0);
        });
      }
    }
  }
  
  private captureNavigationMetrics(): void {
    const timing = window.performance.timing;
    
    if (timing.responseStart > 0 && timing.navigationStart > 0) {
      const ttfb = timing.responseStart - timing.navigationStart;
      this.eventQueue.push(this.createPerformanceEvent(PerformanceMetric.TTFB, ttfb));
    }
    
    if (timing.domInteractive > 0 && timing.navigationStart > 0) {
      const domInteractive = timing.domInteractive - timing.navigationStart;
      this.eventQueue.push(this.createPerformanceEvent(PerformanceMetric.DOM_INTERACTIVE, domInteractive));
    }
    
    if (timing.domComplete > 0 && timing.navigationStart > 0) {
      const domComplete = timing.domComplete - timing.navigationStart;
      this.eventQueue.push(this.createPerformanceEvent(PerformanceMetric.DOM_COMPLETE, domComplete));
    }
    
    if (timing.loadEventEnd > 0 && timing.navigationStart > 0) {
      const loadComplete = timing.loadEventEnd - timing.navigationStart;
      this.eventQueue.push(this.createPerformanceEvent(PerformanceMetric.LOAD_COMPLETE, loadComplete));
    }
  }
  
  private observeResourceTiming(): void {
    if ('PerformanceObserver' in window) {
      this.resourceObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries() as PerformanceResourceTiming[];
        
        entries.forEach((entry) => {
          // Avoid duplicate entries
          const resourceKey = `${entry.name}_${entry.startTime}`;
          if (!this.observedResources.has(resourceKey)) {
            this.observedResources.add(resourceKey);
            
            const resourceType = this.getResourceType(entry);
            
            // Only track images and videos for now, but can be extended
            if (resourceType === ResourceType.IMAGE || 
                resourceType === ResourceType.VIDEO ||
                resourceType === ResourceType.SCRIPT ||
                resourceType === ResourceType.STYLESHEET) {
              this.eventQueue.push(this.createResourceTimingEvent(entry));
            }
          }
        });
      });
      
      try {
        this.resourceObserver.observe({ entryTypes: ['resource'] });
      } catch (e) {
        console.warn('Resource timing observation not supported');
      }
    }
    
    // Also capture existing resource timings
    if (window.performance && window.performance.getEntriesByType) {
      const resources = window.performance.getEntriesByType('resource') as PerformanceResourceTiming[];
      resources.forEach((entry) => {
        const resourceKey = `${entry.name}_${entry.startTime}`;
        if (!this.observedResources.has(resourceKey)) {
          this.observedResources.add(resourceKey);
          
          const resourceType = this.getResourceType(entry);
          if (resourceType === ResourceType.IMAGE || 
              resourceType === ResourceType.VIDEO ||
              resourceType === ResourceType.SCRIPT ||
              resourceType === ResourceType.STYLESHEET) {
            this.eventQueue.push(this.createResourceTimingEvent(entry));
          }
        }
      });
    }
  }
  
  stopMonitoring(): void {
    if (this.performanceObserver) {
      this.performanceObserver.disconnect();
      this.performanceObserver = null;
    }
    
    if (this.resourceObserver) {
      this.resourceObserver.disconnect();
      this.resourceObserver = null;
    }
  }
  
  getAndClearQueue(): (PerformanceEvent | ResourceTimingEvent)[] {
    const events = [...this.eventQueue];
    this.eventQueue = [];
    return events;
  }
  
  getQueueSize(): number {
    return this.eventQueue.length;
  }
}