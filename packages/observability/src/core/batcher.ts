import type { EventBatch, ObservabilityEvent } from "@observability/schemas";
import { generateEventId } from "../utils/helpers";

export interface BatcherConfig {
	endpoint: string;
	batchSize?: number;
	flushInterval?: number;
	maxRetries?: number;
	retryDelay?: number;
	headers?: Record<string, string>;
	onError?: (error: Error, events: ObservabilityEvent[]) => void;
	onSuccess?: (events: ObservabilityEvent[]) => void;
}

export class EventBatcher {
	private config: Required<BatcherConfig>;
	private eventBuffer: ObservabilityEvent[] = [];
	private flushTimer: NodeJS.Timeout | null = null;
	private isOnline = true;
	private failedBatches: EventBatch[] = [];
	private retryTimer: NodeJS.Timeout | null = null;

	constructor(config: BatcherConfig) {
		this.config = {
			endpoint: config.endpoint,
			batchSize: config.batchSize || 50,
			flushInterval: config.flushInterval || 5000,
			maxRetries: config.maxRetries || 3,
			retryDelay: config.retryDelay || 1000,
			headers: config.headers || {},
			onError: config.onError || (() => {}),
			onSuccess: config.onSuccess || (() => {}),
		};

		this.setupEventListeners();
		this.startFlushTimer();
	}

	private setupEventListeners(): void {
		// Listen for online/offline events
		window.addEventListener("online", () => {
			this.isOnline = true;
			this.retryFailedBatches();
		});

		window.addEventListener("offline", () => {
			this.isOnline = false;
		});

		// Flush events before page unload
		window.addEventListener("beforeunload", () => {
			this.flush(true);
		});

		// Flush events when page becomes hidden
		document.addEventListener("visibilitychange", () => {
			if (document.visibilityState === "hidden") {
				this.flush(true);
			}
		});
	}

	private startFlushTimer(): void {
		if (this.flushTimer) {
			clearInterval(this.flushTimer);
		}

		this.flushTimer = setInterval(() => {
			this.flush();
		}, this.config.flushInterval);
	}

	addEvent(event: ObservabilityEvent): void {
		this.eventBuffer.push(event);

		// Flush immediately if buffer is full
		if (this.eventBuffer.length >= this.config.batchSize) {
			this.flush();
		}
	}

	addEvents(events: ObservabilityEvent[]): void {
		this.eventBuffer.push(...events);

		// Flush immediately if buffer is full
		if (this.eventBuffer.length >= this.config.batchSize) {
			this.flush();
		}
	}

	private async flush(useBeacon = false): Promise<void> {
		if (this.eventBuffer.length === 0) {
			return;
		}

		if (!this.isOnline) {
			// Store events for later retry
			this.storeFailedBatch(this.eventBuffer);
			this.eventBuffer = [];
			return;
		}

		const events = [...this.eventBuffer];
		this.eventBuffer = [];

		const batch: EventBatch = {
			batch_id: generateEventId(),
			batch_timestamp: Date.now(),
			events: events,
		};

		try {
			await this.sendBatch(batch, useBeacon);
			this.config.onSuccess(events);
		} catch (error) {
			console.error("Failed to send event batch:", error);
			this.config.onError(error as Error, events);
			this.storeFailedBatch(events);
		}
	}

	private async sendBatch(batch: EventBatch, useBeacon = false): Promise<void> {
		const payload = JSON.stringify(batch);

		// Use Beacon API for reliability when page is unloading
		if (useBeacon && navigator.sendBeacon) {
			const blob = new Blob([payload], { type: "application/json" });
			const sent = navigator.sendBeacon(this.config.endpoint, blob);
			if (sent) {
				return; // Successfully sent via beacon
			}
			// If beacon fails, fall back to fetch
		}

		// Use Fetch API for normal sends or when beacon fails
		const response = await fetch(this.config.endpoint, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				...this.config.headers,
			},
			body: payload,
			keepalive: true, // Keep request alive even if page unloads
		});

		if (!response.ok) {
			throw new Error(`HTTP error! status: ${response.status}`);
		}
	}

	private storeFailedBatch(events: ObservabilityEvent[]): void {
		const batch: EventBatch = {
			batch_id: generateEventId(),
			batch_timestamp: Date.now(),
			events: events,
		};

		this.failedBatches.push(batch);

		// Store in localStorage for persistence
		try {
			const storedBatches = localStorage.getItem("obs_failed_batches");
			const existingBatches = storedBatches ? JSON.parse(storedBatches) : [];
			existingBatches.push(batch);

			// Keep only last 100 batches to prevent localStorage overflow
			const trimmedBatches = existingBatches.slice(-100);
			localStorage.setItem(
				"obs_failed_batches",
				JSON.stringify(trimmedBatches),
			);
		} catch (e) {
			console.warn("Failed to store batch in localStorage:", e);
		}
	}

	private async retryFailedBatches(): Promise<void> {
		if (!this.isOnline) {
			return;
		}

		// Load any persisted failed batches
		try {
			const storedBatches = localStorage.getItem("obs_failed_batches");
			if (storedBatches) {
				const batches = JSON.parse(storedBatches) as EventBatch[];
				this.failedBatches.push(...batches);
				localStorage.removeItem("obs_failed_batches");
			}
		} catch (e) {
			console.warn("Failed to load batches from localStorage:", e);
		}

		// Check if there are any batches to retry after loading from storage
		if (this.failedBatches.length === 0) {
			return;
		}

		const batchesToRetry = [...this.failedBatches];
		this.failedBatches = [];

		for (const batch of batchesToRetry) {
			try {
				await this.sendBatch(batch);
				this.config.onSuccess(batch.events);
			} catch (error) {
				console.error("Failed to retry batch:", error);
				this.config.onError(error as Error, batch.events);

				// Re-add to failed batches if still failing
				this.failedBatches.push(batch);
			}
		}

		// Schedule another retry if there are still failed batches
		if (this.failedBatches.length > 0) {
			if (this.retryTimer) {
				clearTimeout(this.retryTimer);
			}

			this.retryTimer = setTimeout(() => {
				this.retryFailedBatches();
			}, this.config.retryDelay * Math.min(this.failedBatches.length, 10));
		}
	}

	forceFlush(): Promise<void> {
		return this.flush();
	}

	destroy(): void {
		if (this.flushTimer) {
			clearInterval(this.flushTimer);
			this.flushTimer = null;
		}

		if (this.retryTimer) {
			clearTimeout(this.retryTimer);
			this.retryTimer = null;
		}

		// Final flush
		this.flush(true);
	}
}
