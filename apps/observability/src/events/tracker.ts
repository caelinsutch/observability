import { 
  BaseEvent, 
  ClickEvent, 
  ScrollEvent, 
  FormSubmitEvent, 
  ErrorEvent, 
  CustomEvent,
  EventType,
  ObservabilityEvent 
} from '../types/events';
import { FingerprintManager } from '../utils/fingerprint';
import { generateEventId } from '../utils/helpers';

export class EventTracker {
  private fingerprintManager: FingerprintManager;
  private eventQueue: ObservabilityEvent[] = [];
  private maxScrollDepth = 0;
  private lastScrollTime = 0;
  private scrollDebounceTimer: NodeJS.Timeout | null = null;
  
  constructor(fingerprintManager: FingerprintManager) {
    this.fingerprintManager = fingerprintManager;
  }
  
  private createBaseEvent(eventType: EventType): BaseEvent {
    return {
      timestamp: Date.now(),
      session_id: this.fingerprintManager.getSessionId(),
      user_fingerprint: this.fingerprintManager.getVisitorId(),
      event_id: generateEventId(),
      event_type: eventType,
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
    };
  }
  
  private getElementXPath(element: Element): string {
    if (element.id !== '') {
      return `//*[@id="${element.id}"]`;
    }
    
    if (element === document.body) {
      return '/html/body';
    }
    
    let ix = 0;
    const siblings = element.parentNode?.children;
    if (siblings) {
      for (let i = 0; i < siblings.length; i++) {
        const sibling = siblings[i];
        if (sibling === element) {
          return `${this.getElementXPath(element.parentElement!)}/${element.tagName.toLowerCase()}[${ix + 1}]`;
        }
        if (sibling.tagName === element.tagName) {
          ix++;
        }
      }
    }
    
    return '';
  }
  
  trackClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target) return;
    
    const clickEvent: ClickEvent = {
      ...this.createBaseEvent(EventType.CLICK),
      event_type: EventType.CLICK,
      element_tag: target.tagName.toLowerCase(),
      element_id: target.id || undefined,
      element_classes: target.className ? target.className.split(' ').filter(c => c) : undefined,
      element_text: target.textContent?.substring(0, 100) || undefined,
      element_href: (target as HTMLAnchorElement).href || undefined,
      element_xpath: this.getElementXPath(target),
      click_x: event.clientX,
      click_y: event.clientY,
    };
    
    this.eventQueue.push(clickEvent);
  }
  
  trackScroll(): void {
    if (this.scrollDebounceTimer) {
      clearTimeout(this.scrollDebounceTimer);
    }
    
    this.scrollDebounceTimer = setTimeout(() => {
      const scrollY = window.scrollY;
      const documentHeight = document.documentElement.scrollHeight - window.innerHeight;
      const scrollPercentage = documentHeight > 0 ? (scrollY / documentHeight) * 100 : 0;
      
      this.maxScrollDepth = Math.max(this.maxScrollDepth, scrollY);
      
      const scrollEvent: ScrollEvent = {
        ...this.createBaseEvent(EventType.SCROLL),
        event_type: EventType.SCROLL,
        scroll_depth: scrollY,
        scroll_percentage: Math.round(scrollPercentage),
        scroll_y: scrollY,
        max_scroll_depth: this.maxScrollDepth,
      };
      
      this.eventQueue.push(scrollEvent);
    }, 150); // Debounce scroll events
  }
  
  trackFormSubmit(event: Event): void {
    const form = event.target as HTMLFormElement;
    if (!form) return;
    
    const formFields = Array.from(form.elements)
      .filter(el => (el as HTMLInputElement).name)
      .map(el => (el as HTMLInputElement).name);
    
    const formEvent: FormSubmitEvent = {
      ...this.createBaseEvent(EventType.FORM_SUBMIT),
      event_type: EventType.FORM_SUBMIT,
      form_id: form.id || undefined,
      form_name: form.name || undefined,
      form_action: form.action || undefined,
      form_method: form.method || undefined,
      form_fields: formFields,
    };
    
    this.eventQueue.push(formEvent);
  }
  
  trackError(
    message: string, 
    filename?: string, 
    lineno?: number, 
    colno?: number, 
    error?: Error,
    isConsoleError = false
  ): void {
    const errorEvent: ErrorEvent = {
      ...this.createBaseEvent(isConsoleError ? EventType.CONSOLE_ERROR : EventType.ERROR),
      event_type: isConsoleError ? EventType.CONSOLE_ERROR : EventType.ERROR,
      error_message: message,
      error_stack: error?.stack,
      error_filename: filename,
      error_line: lineno,
      error_column: colno,
      error_type: error?.name,
    };
    
    this.eventQueue.push(errorEvent);
  }
  
  trackCustomEvent(eventName: string, eventData: Record<string, unknown>): void {
    const customEvent: CustomEvent = {
      ...this.createBaseEvent(EventType.CUSTOM),
      event_type: EventType.CUSTOM,
      event_name: eventName,
      event_data: eventData,
    };
    
    this.eventQueue.push(customEvent);
  }
  
  getAndClearQueue(): ObservabilityEvent[] {
    const events = [...this.eventQueue];
    this.eventQueue = [];
    return events;
  }
  
  getQueueSize(): number {
    return this.eventQueue.length;
  }
}