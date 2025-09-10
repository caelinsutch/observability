import type { Event, EventType, SeverityLevel } from "@observability/types";
import { getConnection } from "../client";
import { prepareEventsForInsert } from "../types/clickhouse";

async function seed() {
	const connection = getConnection();

	try {
		// Check connection
		const isConnected = await connection.ping();
		if (!isConnected) {
			throw new Error("Failed to connect to ClickHouse");
		}

		console.log("Connected to ClickHouse, seeding sample events...");

		// Sample events covering different event types
		const events: Event[] = [
			// Span events
			{
				timestamp: new Date(),
				service_name: "api-gateway",
				environment: "production",
				version: "1.0.0",
				trace_id: "trace-001",
				span_id: "span-001",
				parent_span_id: null,
				event_type: "span" as EventType,
				severity_level: "info" as SeverityLevel,
				name: "GET /api/users",
				message: "HTTP request processed",
				duration_ns: 1500000,
				status_code: 200,
				status_message: "OK",
				user_id: "user-123",
				session_id: "session-456",
				attributes: {
					method: "GET",
					path: "/api/users",
					response_size: 2048,
				},
				resource_attributes: {
					host: "api-01",
					region: "us-west-2",
					cluster: "prod-cluster-1",
				},
			},
			{
				timestamp: new Date(),
				service_name: "user-service",
				environment: "production",
				version: "1.0.0",
				trace_id: "trace-001",
				span_id: "span-002",
				parent_span_id: "span-001",
				event_type: "span" as EventType,
				severity_level: "info" as SeverityLevel,
				name: "database.query",
				message: "Database query executed",
				duration_ns: 350000,
				status_code: 200,
				attributes: {
					query: "SELECT * FROM users WHERE active = true",
					rows_returned: 42,
					database: "users_db",
				},
				resource_attributes: {
					host: "db-01",
					region: "us-west-2",
				},
			},

			// Log events
			{
				timestamp: new Date(),
				service_name: "api-gateway",
				environment: "production",
				version: "1.0.0",
				event_type: "log" as EventType,
				severity_level: "info" as SeverityLevel,
				name: "application.startup",
				message: "Application started successfully",
				attributes: {
					port: 3000,
					workers: 4,
					mode: "cluster",
				},
				resource_attributes: {
					host: "api-01",
					pid: 12345,
				},
			},
			{
				timestamp: new Date(),
				service_name: "user-service",
				environment: "production",
				version: "1.0.0",
				trace_id: "trace-002",
				event_type: "log" as EventType,
				severity_level: "error" as SeverityLevel,
				name: "database.error",
				message: "Database connection failed after 3 retries",
				attributes: {
					error_type: "ConnectionError",
					error_code: "ECONNREFUSED",
					attempts: 3,
					max_retries: 3,
				},
				resource_attributes: {
					host: "user-01",
					region: "us-west-2",
				},
			},

			// Metric events
			{
				timestamp: new Date(),
				service_name: "api-gateway",
				environment: "production",
				version: "1.0.0",
				event_type: "metric" as EventType,
				severity_level: "info" as SeverityLevel,
				name: "http_requests_total",
				message: "Total HTTP requests counter",
				attributes: {
					value: 1234,
					unit: "requests",
					metric_type: "counter",
					method: "GET",
					endpoint: "/api/users",
					status: "200",
				},
				resource_attributes: {
					host: "api-01",
					region: "us-west-2",
				},
			},
			{
				timestamp: new Date(),
				service_name: "api-gateway",
				environment: "production",
				version: "1.0.0",
				event_type: "metric" as EventType,
				severity_level: "info" as SeverityLevel,
				name: "memory_usage_bytes",
				message: "Current memory usage",
				attributes: {
					value: 536870912,
					unit: "bytes",
					metric_type: "gauge",
					process: "node",
				},
				resource_attributes: {
					host: "api-01",
					region: "us-west-2",
				},
			},

			// Trace event
			{
				timestamp: new Date(),
				service_name: "api-gateway",
				environment: "production",
				version: "1.0.0",
				trace_id: "trace-003",
				event_type: "trace" as EventType,
				severity_level: "info" as SeverityLevel,
				name: "user.login",
				message: "User login flow completed",
				duration_ns: 5000000,
				status_code: 200,
				user_id: "user-789",
				session_id: "session-xyz",
				attributes: {
					login_method: "oauth",
					provider: "google",
					first_login: false,
				},
				resource_attributes: {
					host: "api-02",
					region: "us-east-1",
				},
			},
		];

		// Insert events
		console.log(`Inserting ${events.length} sample events...`);
		await connection.insert(
			"observability.events",
			prepareEventsForInsert(events),
		);
		console.log(`✓ Inserted ${events.length} events`);

		// Verify data
		console.log("\nVerifying data...");

		const eventCount = await connection.query<{ count: number }>(
			"SELECT count() as count FROM observability.events",
		);
		console.log(`Total events in database: ${eventCount[0].count}`);

		const eventsByType = await connection.query<{
			event_type: string;
			count: number;
		}>(
			"SELECT event_type, count() as count FROM observability.events GROUP BY event_type ORDER BY event_type",
		);
		console.log("\nEvents by type:");
		eventsByType.forEach((row) => {
			console.log(`  ${row.event_type}: ${row.count}`);
		});

		const eventsByService = await connection.query<{
			service_name: string;
			count: number;
		}>(
			"SELECT service_name, count() as count FROM observability.events GROUP BY service_name ORDER BY service_name",
		);
		console.log("\nEvents by service:");
		eventsByService.forEach((row) => {
			console.log(`  ${row.service_name}: ${row.count}`);
		});

		console.log("\n✅ Seeding completed successfully!");
	} catch (error) {
		console.error("Seeding failed:", error);
		process.exit(1);
	} finally {
		await connection.close();
	}
}

seed();
