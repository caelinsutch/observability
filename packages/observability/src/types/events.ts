export interface BaseEvent {
  timestamp: number;
  session_id: string;
  user_fingerprint: string;
  event_id: string;
  event_type: EventType;
  page_url: string;
  page_title: string;
  referrer: string;
  user_agent: string;
  screen_width: number;
  screen_height: number;
  viewport_width: number;
  viewport_height: number;
  device_pixel_ratio: number;
  timezone: string;
  language: string;
}

export enum EventType {
  PAGE_VIEW = 'page_view',
  CLICK = 'click',
  SCROLL = 'scroll',
  FORM_SUBMIT = 'form_submit',
  ERROR = 'error',
  CONSOLE_ERROR = 'console_error',
  PERFORMANCE = 'performance',
  RESOURCE_TIMING = 'resource_timing',
  CUSTOM = 'custom',
}

export interface ClickEvent extends BaseEvent {
  event_type: EventType.CLICK;
  element_tag: string;
  element_id?: string;
  element_classes?: string[];
  element_text?: string;
  element_href?: string;
  element_xpath: string;
  click_x: number;
  click_y: number;
}

export interface ScrollEvent extends BaseEvent {
  event_type: EventType.SCROLL;
  scroll_depth: number;
  scroll_percentage: number;
  scroll_y: number;
  max_scroll_depth: number;
}

export interface FormSubmitEvent extends BaseEvent {
  event_type: EventType.FORM_SUBMIT;
  form_id?: string;
  form_name?: string;
  form_action?: string;
  form_method?: string;
  form_fields: string[];
}

export interface ErrorEvent extends BaseEvent {
  event_type: EventType.ERROR | EventType.CONSOLE_ERROR;
  error_message: string;
  error_stack?: string;
  error_filename?: string;
  error_line?: number;
  error_column?: number;
  error_type?: string;
}

export interface PerformanceEvent extends BaseEvent {
  event_type: EventType.PERFORMANCE;
  metric_name: PerformanceMetric;
  metric_value: number;
  metric_unit: 'ms' | 'bytes' | 'count';
}

export enum PerformanceMetric {
  FCP = 'first_contentful_paint',
  LCP = 'largest_contentful_paint',
  FID = 'first_input_delay',
  CLS = 'cumulative_layout_shift',
  TTFB = 'time_to_first_byte',
  DOM_INTERACTIVE = 'dom_interactive',
  DOM_COMPLETE = 'dom_complete',
  LOAD_COMPLETE = 'load_complete',
}

export interface ResourceTimingEvent extends BaseEvent {
  event_type: EventType.RESOURCE_TIMING;
  resource_url: string;
  resource_type: ResourceType;
  resource_size?: number;
  duration: number;
  dns_lookup: number;
  tcp_connection: number;
  secure_connection: number;
  response_time: number;
  transfer_size: number;
  encoded_size: number;
  decoded_size: number;
  cache_hit: boolean;
}

export enum ResourceType {
  IMAGE = 'image',
  VIDEO = 'video',
  SCRIPT = 'script',
  STYLESHEET = 'stylesheet',
  FONT = 'font',
  DOCUMENT = 'document',
  FETCH = 'fetch',
  XHR = 'xhr',
  OTHER = 'other',
}

export interface CustomEvent extends BaseEvent {
  event_type: EventType.CUSTOM;
  event_name: string;
  event_data: Record<string, unknown>;
}

export type ObservabilityEvent = 
  | ClickEvent 
  | ScrollEvent 
  | FormSubmitEvent 
  | ErrorEvent 
  | PerformanceEvent 
  | ResourceTimingEvent 
  | CustomEvent;

export interface EventBatch {
  batch_id: string;
  batch_timestamp: number;
  events: ObservabilityEvent[];
}

export interface SessionData {
  session_id: string;
  user_fingerprint: string;
  session_start: number;
  last_activity: number;
  page_views: number;
  total_events: number;
}