import type { Event } from "@observability/schemas";

// Helper functions for converting between types

export function parseEventRecord(record: any): Event {
	return {
		...record,
	} as Event;
}

export function prepareEventForInsert(event: Event): any {
	return {
		// Required
		timestamp:
			typeof event.timestamp === "string" || typeof event.timestamp === "number"
				? new Date(event.timestamp).toISOString()
				: event.timestamp.toISOString(),

		service_name: event.service_name ?? "web",
		environment: event.environment ?? "production",
		version: event.version ?? null,

		trace_id: event.trace_id ?? null,
		span_id: event.span_id ?? null,
		parent_span_id: event.parent_span_id ?? null,

		event_type: event.event_type,
		severity_level: event.severity_level ?? "info",
		name: event.name ?? event.event_type,
		message: event.message ?? null,
		duration_ns: event.duration_ns ?? null,

		status_code: event.status_code ?? null,
		status_message: event.status_message ?? null,

		user_id: event.user_id ?? null,
		session_id: event.session_id ?? null,
		user_fingerprint: event.user_fingerprint ?? null,

		page_url: event.page_url ?? null,
		page_title: event.page_title ?? null,
		referrer: event.referrer ?? null,
		user_agent: event.user_agent ?? null,
		screen_width: event.screen_width ?? null,
		screen_height: event.screen_height ?? null,
		viewport_width: event.viewport_width ?? null,
		viewport_height: event.viewport_height ?? null,
		device_pixel_ratio: event.device_pixel_ratio ?? null,
		timezone: event.timezone ?? null,
		language: event.language ?? null,

		// Click event specifics
		element_tag: "element_tag" in event ? (event.element_tag ?? null) : null,
		element_id: "element_id" in event ? (event.element_id ?? null) : null,
		element_classes:
			"element_classes" in event && event.element_classes
				? JSON.stringify(event.element_classes)
				: null,
		element_text: "element_text" in event ? (event.element_text ?? null) : null,
		element_href: "element_href" in event ? (event.element_href ?? null) : null,
		element_xpath:
			"element_xpath" in event ? (event.element_xpath ?? null) : null,
		click_x: "click_x" in event ? (event.click_x ?? null) : null,
		click_y: "click_y" in event ? (event.click_y ?? null) : null,

		// Scroll event specifics
		scroll_depth: "scroll_depth" in event ? (event.scroll_depth ?? null) : null,
		scroll_percentage:
			"scroll_percentage" in event ? (event.scroll_percentage ?? null) : null,
		scroll_y: "scroll_y" in event ? (event.scroll_y ?? null) : null,
		max_scroll_depth:
			"max_scroll_depth" in event ? (event.max_scroll_depth ?? null) : null,

		// Form submit specifics
		form_id: "form_id" in event ? (event.form_id ?? null) : null,
		form_name: "form_name" in event ? (event.form_name ?? null) : null,
		form_action: "form_action" in event ? (event.form_action ?? null) : null,
		form_method: "form_method" in event ? (event.form_method ?? null) : null,
		form_fields:
			"form_fields" in event && event.form_fields
				? JSON.stringify(event.form_fields)
				: null,

		// Error specifics
		error_message:
			"error_message" in event ? (event.error_message ?? null) : null,
		error_stack: "error_stack" in event ? (event.error_stack ?? null) : null,
		error_filename:
			"error_filename" in event ? (event.error_filename ?? null) : null,
		error_line: "error_line" in event ? (event.error_line ?? null) : null,
		error_column: "error_column" in event ? (event.error_column ?? null) : null,
		error_type: "error_type" in event ? (event.error_type ?? null) : null,

		// Performance specifics
		metric_name: "metric_name" in event ? (event.metric_name ?? null) : null,
		metric_value: "metric_value" in event ? (event.metric_value ?? null) : null,
		metric_unit: "metric_unit" in event ? (event.metric_unit ?? null) : null,

		// Resource timing specifics
		resource_url: "resource_url" in event ? (event.resource_url ?? null) : null,
		resource_type:
			"resource_type" in event ? (event.resource_type ?? null) : null,
		resource_size:
			"resource_size" in event ? (event.resource_size ?? null) : null,
		duration: "duration" in event ? (event.duration ?? null) : null,
		dns_lookup: "dns_lookup" in event ? (event.dns_lookup ?? null) : null,
		tcp_connection:
			"tcp_connection" in event ? (event.tcp_connection ?? null) : null,
		secure_connection:
			"secure_connection" in event ? (event.secure_connection ?? null) : null,
		response_time:
			"response_time" in event ? (event.response_time ?? null) : null,
		transfer_size:
			"transfer_size" in event ? (event.transfer_size ?? null) : null,
		encoded_size: "encoded_size" in event ? (event.encoded_size ?? null) : null,
		decoded_size: "decoded_size" in event ? (event.decoded_size ?? null) : null,
		cache_hit: "cache_hit" in event ? (event.cache_hit ? 1 : 0) : null,

		// Custom events
		event_name: "event_name" in event ? (event.event_name ?? null) : null,
		event_data:
			"event_data" in event ? JSON.stringify(event.event_data ?? {}) : null,
	};
}

// Batch operations
export function prepareEventsForInsert(events: Event[]): any[] {
	return events.map(prepareEventForInsert);
}

export function parseEventRecords(records: any[]): Event[] {
	return records.map(parseEventRecord);
}
