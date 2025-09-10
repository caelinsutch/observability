import { z } from 'zod';
import { EventSchema, EventTypeSchema, SeverityLevelSchema } from '../core/events';

// Worker -> Server batch request
export const BatchRequestSchema = z.object({
  events: z.array(EventSchema),
  processedAt: z.string(),
  workerInstance: z.string().optional(),
});

// API query parameters for GET /api/events
export const EventQuerySchema = z.object({
  service_name: z.string().optional(),
  environment: z.string().optional(),
  event_type: EventTypeSchema.optional(),
  severity_level: SeverityLevelSchema.optional(),
  limit: z.coerce.number().min(1).max(1000).default(100),
  offset: z.coerce.number().min(0).default(0),
  start_time: z.string().optional(),
  end_time: z.string().optional(),
});

// API response schemas
export const BatchResponseSchema = z.object({
  success: z.boolean(),
  processed: z.number(),
  timestamp: z.string(),
});

export const SingleEventResponseSchema = z.object({
  success: z.boolean(),
  id: z.string().optional(),
});

export const EventQueryResponseSchema = z.object({
  success: z.boolean(),
  events: z.array(EventSchema),
  count: z.number(),
  limit: z.number(),
  offset: z.number(),
});

export const ErrorResponseSchema = z.object({
  error: z.string(),
  details: z.any().optional(),
});

// Type exports
export type BatchRequest = z.infer<typeof BatchRequestSchema>;
export type EventQuery = z.infer<typeof EventQuerySchema>;
export type BatchResponse = z.infer<typeof BatchResponseSchema>;
export type SingleEventResponse = z.infer<typeof SingleEventResponseSchema>;
export type EventQueryResponse = z.infer<typeof EventQueryResponseSchema>;
export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;