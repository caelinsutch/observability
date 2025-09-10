import { z } from "zod";

// Core enum schemas
export const EventTypeSchema = z.enum(["log", "metric", "trace", "span"]);
export const SeverityLevelSchema = z.enum([
	"trace",
	"debug",
	"info",
	"warn",
	"error",
	"fatal",
]);

// Main Event schema - the core data model
export const EventSchema = z.object({
	id: z.string().optional(),
	timestamp: z.union([z.string(), z.date()]),

	// Service info
	service_name: z.string(),
	environment: z.string().optional(),
	version: z.string().nullable().optional(),

	// Trace context
	trace_id: z.string().nullable().optional(),
	span_id: z.string().nullable().optional(),
	parent_span_id: z.string().nullable().optional(),

	// Event details
	event_type: EventTypeSchema,
	severity_level: SeverityLevelSchema,
	name: z.string(),
	message: z.string().nullable().optional(),
	duration_ns: z.number().nullable().optional(),

	// Status
	status_code: z.number().nullable().optional(),
	status_message: z.string().nullable().optional(),

	// User context
	user_id: z.string().nullable().optional(),
	session_id: z.string().nullable().optional(),

	// Flexible attributes
	attributes: z.record(z.string(), z.any()),
	resource_attributes: z.record(z.string(), z.any()),
});

// Type exports using Zod inference
export type EventType = z.infer<typeof EventTypeSchema>;
export type SeverityLevel = z.infer<typeof SeverityLevelSchema>;
export type Event = z.infer<typeof EventSchema>;
