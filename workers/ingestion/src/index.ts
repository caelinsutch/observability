import type { EventBatch, ObservabilityEvent } from "@observability/schemas";

export default {
	// HTTP endpoint to receive event batches from the observability script
	async fetch(req, env, _ctx): Promise<Response> {
		// Handle CORS preflight requests
		if (req.method === "OPTIONS") {
			return new Response(null, {
				status: 200,
				headers: {
					"Access-Control-Allow-Origin": "*",
					"Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
					"Access-Control-Allow-Headers": "Content-Type, Authorization",
					"Access-Control-Max-Age": "86400",
				},
			});
		}

		// Add CORS headers to all responses
		const corsHeaders = {
			"Access-Control-Allow-Origin": "*",
			"Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
			"Access-Control-Allow-Headers": "Content-Type, Authorization",
		};

		try {
			const contentType = req.headers.get("Content-Type");

			if (contentType?.includes("application/json")) {
				// Receive EventBatch from the observability script
				const batch = (await req.json()) as EventBatch;

				// Add the entire batch to the queue
				await env.OBSERVABILITY_QUEUE.send(batch);

				return new Response(
					JSON.stringify({
						success: true,
						batch_id: batch.batch_id,
						count: batch.events.length,
					}),
					{
						status: 200,
						headers: {
							"Content-Type": "application/json",
							...corsHeaders,
						},
					},
				);
			} else {
				return new Response("Unsupported content type", {
					status: 415,
					headers: corsHeaders,
				});
			}
		} catch (error) {
			console.error("Error processing request:", error);
			return new Response(
				JSON.stringify({
					error: "Failed to process event batch",
				}),
				{
					status: 500,
					headers: {
						"Content-Type": "application/json",
						...corsHeaders,
					},
				},
			);
		}
	},

	// Queue handler processes EventBatch messages
	async queue(batch, env): Promise<void> {
		const allEvents: ObservabilityEvent[] = [];

		// Process each EventBatch message from the queue
		for (const message of batch.messages) {
			try {
				const eventBatch = message.body as EventBatch;

				// Extract events from this batch
				allEvents.push(...eventBatch.events);

				// Acknowledge the message
				message.ack();
			} catch (error) {
				console.error(`Failed to process message ${message.id}:`, error);
				// Retry the message
				message.retry();
			}
		}

		if (allEvents.length === 0) {
			return;
		}

		console.log(
			`Processing ${allEvents.length} events from ${batch.messages.length} batches`,
		);

		// Send aggregated events to server
		try {
			const serverUrl = env.SERVER_URL || "http://localhost:3000";
			const response = await fetch(`${serverUrl}/api/events/batch`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"X-Worker-Auth": env.WORKER_AUTH_TOKEN || "development",
				},
				body: JSON.stringify({
					events: allEvents,
					processedAt: new Date().toISOString(),
					workerInstance: "local",
				}),
			});

			if (!response.ok) {
				throw new Error(
					`Server responded with ${response.status}: ${await response.text()}`,
				);
			}

			const result = await response.json();
			console.log(
				`Successfully sent ${allEvents.length} events to server:`,
				result,
			);
		} catch (error) {
			console.error("Failed to send events to server:", error);
			// Could implement retry logic or dead letter queue here
			throw error;
		}
	},
} satisfies ExportedHandler<Env, EventBatch>;
