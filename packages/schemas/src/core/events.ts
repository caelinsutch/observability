import { z } from "zod";

// Core enum schemas
export const EventTypeSchema = z.enum([
	// Observability events
	"log",
	"metric",
	"trace",
	"span",
	"error",
	"console_error",
	// Web analytics events
	"page_view",
	"click",
	"scroll",
	"form_submit",
	"performance",
	"resource_timing",
	"custom",
]);

export const SeverityLevelSchema = z.enum([
	"trace",
	"debug",
	"info",
	"warn",
	"error",
	"fatal",
]);

// Performance metrics enum
export const PerformanceMetricSchema = z.enum([
	"first_contentful_paint",
	"largest_contentful_paint",
	"first_input_delay",
	"cumulative_layout_shift",
	"time_to_first_byte",
	"dom_interactive",
	"dom_complete",
	"load_complete",
]);

// Resource types enum
export const ResourceTypeSchema = z.enum([
	"image",
	"video",
	"script",
	"stylesheet",
	"font",
	"document",
	"fetch",
	"xhr",
	"other",
]);

// Base event schema with common fields
export const BaseEventSchema = z.object({
	id: z.string().optional(),
	timestamp: z.union([z.string(), z.date(), z.number()]),
	event_type: EventTypeSchema,

	// Service info (for observability events)
	service_name: z.string().optional(),
	environment: z.string().optional(),
	version: z.string().nullable().optional(),

	// Trace context (for observability events)
	trace_id: z.string().nullable().optional(),
	span_id: z.string().nullable().optional(),
	parent_span_id: z.string().nullable().optional(),

	// Event details
	severity_level: SeverityLevelSchema.optional(),
	name: z.string().nullish(),
	message: z.string().nullish(),
	duration_ns: z.number().nullish(),

	// Status
	status_code: z.number().nullable().optional(),
	status_message: z.string().nullish(),

	// User context
	user_id: z.string().nullish(),
	session_id: z.string().nullish(),
	user_fingerprint: z.string().nullish(),

	// Web analytics context (for web events)
	page_url: z.string().nullish(),
	page_title: z.string().nullish(),
	referrer: z.string().nullish(),
	user_agent: z.string().nullish(),
	screen_width: z.number().nullish(),
	screen_height: z.number().nullish(),
	viewport_width: z.number().nullish(),
	viewport_height: z.number().nullish(),
	device_pixel_ratio: z.number().nullish(),
	timezone: z.string().nullish(),
	language: z.string().nullish(),

	// Flexible attributes
	attributes: z.record(z.string(), z.any()).optional(),
	resource_attributes: z.record(z.string(), z.any()).optional(),
});

// Specific event schemas for web analytics
export const ClickEventSchema = BaseEventSchema.extend({
	event_type: z.literal("click"),
	element_tag: z.string(),
	element_id: z.string().optional(),
	element_classes: z.array(z.string()).optional(),
	element_text: z.string().optional(),
	element_href: z.string().optional(),
	element_xpath: z.string(),
	click_x: z.number(),
	click_y: z.number(),
});

export const ScrollEventSchema = BaseEventSchema.extend({
	event_type: z.literal("scroll"),
	scroll_depth: z.number(),
	scroll_percentage: z.number(),
	scroll_y: z.number(),
	max_scroll_depth: z.number(),
});

export const FormSubmitEventSchema = BaseEventSchema.extend({
	event_type: z.literal("form_submit"),
	form_id: z.string().optional(),
	form_name: z.string().optional(),
	form_action: z.string().optional(),
	form_method: z.string().optional(),
	form_fields: z.array(z.string()),
});

export const ErrorEventSchema = BaseEventSchema.extend({
	event_type: z.union([z.literal("error"), z.literal("console_error")]),
	error_message: z.string(),
	error_stack: z.string().optional(),
	error_filename: z.string().optional(),
	error_line: z.number().optional(),
	error_column: z.number().optional(),
	error_type: z.string().optional(),
});

export const PerformanceEventSchema = BaseEventSchema.extend({
	event_type: z.literal("performance"),
	metric_name: PerformanceMetricSchema,
	metric_value: z.number(),
	metric_unit: z.enum(["ms", "bytes", "count"]),
});

export const ResourceTimingEventSchema = BaseEventSchema.extend({
	event_type: z.literal("resource_timing"),
	resource_url: z.string(),
	resource_type: ResourceTypeSchema,
	resource_size: z.number().optional(),
	duration: z.number(),
	dns_lookup: z.number(),
	tcp_connection: z.number(),
	secure_connection: z.number(),
	response_time: z.number(),
	transfer_size: z.number(),
	encoded_size: z.number(),
	decoded_size: z.number(),
	cache_hit: z.boolean(),
});

export const CustomEventSchema = BaseEventSchema.extend({
	event_type: z.literal("custom"),
	event_name: z.string(),
	event_data: z.record(z.string(), z.unknown()),
});

// Union of all event types
export const ObservabilityEventSchema = z.discriminatedUnion("event_type", [
	BaseEventSchema.extend({ event_type: z.literal("log") }),
	BaseEventSchema.extend({ event_type: z.literal("metric") }),
	BaseEventSchema.extend({ event_type: z.literal("trace") }),
	BaseEventSchema.extend({ event_type: z.literal("span") }),
	BaseEventSchema.extend({ event_type: z.literal("page_view") }),
	ClickEventSchema,
	ScrollEventSchema,
	FormSubmitEventSchema,
	ErrorEventSchema,
	PerformanceEventSchema,
	ResourceTimingEventSchema,
	CustomEventSchema,
]);

// Event batch schema
export const EventBatchSchema = z.object({
	batch_id: z.string(),
	batch_timestamp: z.number(),
	events: z.array(ObservabilityEventSchema),
});

// Session data schema
export const SessionDataSchema = z.object({
	session_id: z.string(),
	user_fingerprint: z.string(),
	session_start: z.number(),
	last_activity: z.number(),
	page_views: z.number(),
	total_events: z.number(),
});

// Type exports using Zod inference
export type EventType = z.infer<typeof EventTypeSchema>;
export type SeverityLevel = z.infer<typeof SeverityLevelSchema>;
export type PerformanceMetric = z.infer<typeof PerformanceMetricSchema>;
export type ResourceType = z.infer<typeof ResourceTypeSchema>;
export type BaseEvent = z.infer<typeof BaseEventSchema>;
export type ClickEvent = z.infer<typeof ClickEventSchema>;
export type ScrollEvent = z.infer<typeof ScrollEventSchema>;
export type FormSubmitEvent = z.infer<typeof FormSubmitEventSchema>;
export type ErrorEvent = z.infer<typeof ErrorEventSchema>;
export type PerformanceEvent = z.infer<typeof PerformanceEventSchema>;
export type ResourceTimingEvent = z.infer<typeof ResourceTimingEventSchema>;
export type CustomEvent = z.infer<typeof CustomEventSchema>;
export type ObservabilityEvent = z.infer<typeof ObservabilityEventSchema>;
export type EventBatch = z.infer<typeof EventBatchSchema>;
export type SessionData = z.infer<typeof SessionDataSchema>;

// Legacy alias for backward compatibility
export type Event = ObservabilityEvent;
export const EventSchema = ObservabilityEventSchema;
