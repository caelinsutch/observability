// Shared observability types used across the monorepo

export enum EventType {
  Log = 'log',
  Metric = 'metric',
  Trace = 'trace',
  Span = 'span',
}

export enum SeverityLevel {
  Trace = 'trace',
  Debug = 'debug',
  Info = 'info',
  Warn = 'warn',
  Error = 'error',
  Fatal = 'fatal',
}

// Events for observability data
export interface Event {
  id?: string;
  timestamp: Date | string;
  
  // Service info
  service_name: string;
  environment?: string;
  version?: string | null;
  
  // Trace context
  trace_id?: string | null;
  span_id?: string | null;
  parent_span_id?: string | null;
  
  // Event details
  event_type: EventType;
  severity_level: SeverityLevel;
  name: string;
  message?: string | null;
  duration_ns?: number | null;
  
  // Status
  status_code?: number | null;
  status_message?: string | null;
  
  // User context
  user_id?: string | null;
  session_id?: string | null;
  
  // Flexible attributes
  attributes: Record<string, any>;
  resource_attributes: Record<string, any>;
}