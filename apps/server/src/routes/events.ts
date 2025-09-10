import {
	getConnection,
	prepareEventsForInsert,
} from "@observability/clickhouse";
import {
	type BatchRequest,
	BatchRequestSchema,
	type EventQuery,
	EventQuerySchema,
	EventSchema,
	type ObservabilityEvent,
} from "@observability/schemas";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { env } from "../env";

export async function eventsRoutes(server: FastifyInstance) {
	// Health check for events API
	server.get("/api/events/health", async () => {
		return { status: "ok", timestamp: new Date().toISOString() };
	});

	// Batch endpoint to receive events from workers
	server.post(
		"/api/events/batch",
		async (
			request: FastifyRequest<{ Body: BatchRequest }>,
			reply: FastifyReply,
		) => {
			console.log(JSON.stringify(request.body.events));
			// Validate request body
			const parseResult = BatchRequestSchema.safeParse(request.body);
			if (!parseResult.success) {
				return reply.status(400).send({
					error: "Invalid request body",
					details: parseResult.error.issues,
				});
			}

			const { events, processedAt, workerInstance } = parseResult.data;

			// Validate worker authentication token
			const authToken = request.headers["x-worker-auth"];
			const expectedToken = env.WORKER_AUTH_TOKEN;

			if (authToken !== expectedToken) {
				return reply.status(401).send({ error: "Unauthorized" });
			}

			try {
				// Log batch receipt
				server.log.info({
					msg: "Received event batch",
					count: events.length,
					workerInstance,
					processedAt,
				});

				// Get ClickHouse connection
				const clickhouse = getConnection();

				// Prepare events for insertion
				const eventsToInsert = prepareEventsForInsert(events);

				// Insert events into ClickHouse
				await clickhouse.insert("events", eventsToInsert);

				server.log.info({
					msg: "Successfully inserted events into ClickHouse",
					count: events.length,
				});

				return {
					success: true,
					processed: events.length,
					timestamp: new Date().toISOString(),
				};
			} catch (error) {
				server.log.error({
					msg: "Failed to process event batch",
					error: error instanceof Error ? error.message : "Unknown error",
					stack: error instanceof Error ? error.stack : undefined,
				});

				return reply.status(500).send({
					error: "Failed to process events",
				});
			}
		},
	);

	// Single event endpoint (for direct submissions)
	server.post(
		"/api/events",
		async (
			request: FastifyRequest<{ Body: ObservabilityEvent }>,
			reply: FastifyReply,
		) => {
			// Validate request body
			const parseResult = EventSchema.safeParse(request.body);
			if (!parseResult.success) {
				return reply.status(400).send({
					error: "Invalid event",
					details: parseResult.error.issues,
				});
			}

			const event = parseResult.data;

			try {
				const clickhouse = getConnection();
				const eventsToInsert = prepareEventsForInsert([event]);
				await clickhouse.insert("events", eventsToInsert);

				return {
					success: true,
					id: event.id,
				};
			} catch (error) {
				server.log.error({
					msg: "Failed to insert single event",
					error: error instanceof Error ? error.message : "Unknown error",
				});

				return reply.status(500).send({
					error: "Failed to process event",
				});
			}
		},
	);

	// Query endpoint to retrieve events
	server.get(
		"/api/events",
		async (
			request: FastifyRequest<{ Querystring: EventQuery }>,
			reply: FastifyReply,
		) => {
			// Validate query parameters
			const parseResult = EventQuerySchema.safeParse(request.query);
			if (!parseResult.success) {
				return reply.status(400).send({
					error: "Invalid query parameters",
					details: parseResult.error.issues,
				});
			}

			const {
				service_name,
				environment,
				event_type,
				severity_level,
				limit = 100,
				offset = 0,
				start_time,
				end_time,
			} = parseResult.data;

			try {
				const clickhouse = getConnection();

				// Build query conditions (using parameterized queries for safety)
				const conditions: string[] = [];
				const params: Record<string, any> = {};

				if (service_name) {
					conditions.push("service_name = {service_name:String}");
					params.service_name = service_name;
				}
				if (environment) {
					conditions.push("environment = {environment:String}");
					params.environment = environment;
				}
				if (event_type) {
					conditions.push("event_type = {event_type:String}");
					params.event_type = event_type;
				}
				if (severity_level) {
					conditions.push("severity_level = {severity_level:String}");
					params.severity_level = severity_level;
				}
				if (start_time) {
					conditions.push("timestamp >= {start_time:DateTime}");
					params.start_time = start_time;
				}
				if (end_time) {
					conditions.push("timestamp <= {end_time:DateTime}");
					params.end_time = end_time;
				}

				const whereClause =
					conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

				const query = `
        SELECT * FROM events
        ${whereClause}
        ORDER BY timestamp DESC
        LIMIT {limit:UInt32}
        OFFSET {offset:UInt32}
      `;

				const events = await clickhouse.query(query, "JSONEachRow");

				return {
					success: true,
					events,
					count: events.length,
					limit,
					offset,
				};
			} catch (error) {
				server.log.error({
					msg: "Failed to query events",
					error: error instanceof Error ? error.message : "Unknown error",
				});

				return reply.status(500).send({
					error: "Failed to query events",
				});
			}
		},
	);
}
