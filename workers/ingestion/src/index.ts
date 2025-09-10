import type { Event } from '@observability/schemas';

export default {
	// HTTP endpoint to receive events from the observability script
	async fetch(req, env, _ctx): Promise<Response> {
		if (req.method !== 'POST') {
			return new Response('Method not allowed', { status: 405 });
		}

		try {
			const contentType = req.headers.get('content-type');
			
			if (contentType?.includes('application/json')) {
				// Single event or array of events
				const data = await req.json() as Event | Event[];
				const events = Array.isArray(data) ? data : [data];
				
				// Add each event to the queue
				for (const event of events) {
					await env.OBSERVABILITY_QUEUE.send(event);
				}
				
				return new Response(JSON.stringify({ 
					success: true, 
					count: events.length 
				}), {
					status: 200,
					headers: { 'Content-Type': 'application/json' }
				});
			} else {
				return new Response('Unsupported content type', { status: 415 });
			}
		} catch (error) {
			console.error('Error processing request:', error);
			return new Response(JSON.stringify({ 
				error: 'Failed to process events' 
			}), { 
				status: 500,
				headers: { 'Content-Type': 'application/json' }
			});
		}
	},
	
	// Queue handler processes events in batches
	async queue(batch, env): Promise<void> {
		const events: Event[] = [];
		
		// Collect all events from the batch
		for (const message of batch.messages) {
			try {
				const event = message.body as Event;
				events.push(event);
				
				// Acknowledge the message
				message.ack();
			} catch (error) {
				console.error(`Failed to process message ${message.id}:`, error);
				// Retry the message
				message.retry();
			}
		}
		
		if (events.length === 0) {
			return;
		}
		
		// Send batch to server
		try {
			const serverUrl = env.SERVER_URL || 'http://localhost:3000';
			const response = await fetch(`${serverUrl}/api/events/batch`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'X-Worker-Auth': env.WORKER_AUTH_TOKEN || 'development'
				},
				body: JSON.stringify({
					events,
					processedAt: new Date().toISOString(),
					workerInstance: env.CF_INSTANCE_ID || 'local',
				}),
			});
			
			if (!response.ok) {
				throw new Error(`Server responded with ${response.status}: ${await response.text()}`);
			}
			
			const result = await response.json();
			console.log(`Successfully sent batch of ${events.length} events:`, result);
		} catch (error) {
			console.error('Failed to send batch to server:', error);
			// Could implement retry logic or dead letter queue here
			throw error;
		}
	},
} satisfies ExportedHandler<Env, Error>;
