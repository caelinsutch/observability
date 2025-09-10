import type { ObservabilityEvent } from "@observability/schemas";
import { EventBatcher } from "./core/batcher";
import { EventTracker } from "./events/tracker";
import { PerformanceMonitor } from "./performance/monitor";
import { FingerprintManager } from "./utils/fingerprint";
import { isBot } from "./utils/helpers";

export interface ObservabilityConfig {
	endpoint: string;
	batchSize?: number;
	flushInterval?: number;
	enableClickTracking?: boolean;
	enableScrollTracking?: boolean;
	enableErrorTracking?: boolean;
	enablePerformanceTracking?: boolean;
	enableConsoleErrorTracking?: boolean;
	debug?: boolean;
	respectDoNotTrack?: boolean;
	excludeBots?: boolean;
	customHeaders?: Record<string, string>;
	onError?: (error: Error) => void;
	onEvent?: (event: ObservabilityEvent) => void;
}

export class Observability {
	private static instance: Observability | null = null;
	private config: Required<ObservabilityConfig>;
	private fingerprintManager: FingerprintManager;
	private eventTracker: EventTracker;
	private performanceMonitor: PerformanceMonitor;
	private batcher: EventBatcher;
	private initialized = false;
	private originalConsoleError: typeof console.error;

	private constructor(config: ObservabilityConfig) {
		this.config = {
			endpoint: config.endpoint,
			batchSize: config.batchSize || 50,
			flushInterval: config.flushInterval || 5000,
			enableClickTracking: config.enableClickTracking !== false,
			enableScrollTracking: config.enableScrollTracking !== false,
			enableErrorTracking: config.enableErrorTracking !== false,
			enablePerformanceTracking: config.enablePerformanceTracking !== false,
			enableConsoleErrorTracking: config.enableConsoleErrorTracking !== false,
			debug: config.debug || false,
			respectDoNotTrack: config.respectDoNotTrack !== false,
			excludeBots: config.excludeBots !== false,
			customHeaders: config.customHeaders || {},
			onError:
				config.onError ||
				((error) => console.error("Observability error:", error)),
			onEvent: config.onEvent || (() => {}),
		};

		this.fingerprintManager = FingerprintManager.getInstance();
		this.eventTracker = new EventTracker(this.fingerprintManager);
		this.performanceMonitor = new PerformanceMonitor(this.fingerprintManager);
		this.originalConsoleError = console.error;

		const headers: Record<string, string> = {
			...this.config.customHeaders,
		};

		this.batcher = new EventBatcher({
			endpoint: this.config.endpoint,
			batchSize: this.config.batchSize,
			flushInterval: this.config.flushInterval,
			headers,
			onError: (error, events) => {
				if (this.config.debug) {
					console.error("Failed to send events:", error, events);
				}
				this.config.onError(error);
			},
			onSuccess: (events) => {
				if (this.config.debug) {
					console.log("Successfully sent events:", events);
				}
			},
		});
	}

	static async init(config: ObservabilityConfig): Promise<Observability> {
		if (Observability.instance) {
			console.warn("Observability already initialized");
			return Observability.instance;
		}

		const instance = new Observability(config);
		await instance.initialize();
		Observability.instance = instance;

		return instance;
	}

	static getInstance(): Observability | null {
		return Observability.instance;
	}

	private async initialize(): Promise<void> {
		if (this.initialized) {
			return;
		}

		// Check Do Not Track
		if (this.config.respectDoNotTrack && navigator.doNotTrack === "1") {
			if (this.config.debug) {
				console.log("Observability disabled: Do Not Track is enabled");
			}
			return;
		}

		// Check if bot
		if (this.config.excludeBots && isBot()) {
			if (this.config.debug) {
				console.log("Observability disabled: Bot detected");
			}
			return;
		}

		try {
			// Initialize fingerprinting
			await this.fingerprintManager.initialize();

			// Set up event listeners
			this.setupEventListeners();

			// Start performance monitoring
			if (this.config.enablePerformanceTracking) {
				this.performanceMonitor.startMonitoring();
			}

			// Track initial page view
			this.trackPageView();

			// Start collecting events
			this.startEventCollection();

			this.initialized = true;

			if (this.config.debug) {
				console.log("Observability initialized successfully");
			}
		} catch (error) {
			console.error("Failed to initialize Observability:", error);
			this.config.onError(error as Error);
		}
	}

	private setupEventListeners(): void {
		// Click tracking
		if (this.config.enableClickTracking) {
			document.addEventListener(
				"click",
				(event) => {
					this.eventTracker.trackClick(event);
				},
				true,
			);
		}

		// Scroll tracking
		if (this.config.enableScrollTracking) {
			window.addEventListener(
				"scroll",
				() => {
					this.eventTracker.trackScroll();
				},
				{ passive: true },
			);
		}

		// Form submission tracking
		document.addEventListener(
			"submit",
			(event) => {
				this.eventTracker.trackFormSubmit(event);
			},
			true,
		);

		// Error tracking
		if (this.config.enableErrorTracking) {
			window.addEventListener("error", (event) => {
				this.eventTracker.trackError(
					event.message,
					event.filename,
					event.lineno,
					event.colno,
					event.error,
				);
			});

			window.addEventListener("unhandledrejection", (event) => {
				this.eventTracker.trackError(
					`Unhandled Promise Rejection: ${event.reason}`,
					undefined,
					undefined,
					undefined,
					new Error(event.reason),
				);
			});
		}

		// Console error tracking
		if (this.config.enableConsoleErrorTracking) {
			console.error = (...args) => {
				const message = args
					.map((arg) => {
						if (typeof arg === "object") {
							try {
								return JSON.stringify(arg);
							} catch {
								return String(arg);
							}
						}
						return String(arg);
					})
					.join(" ");

				this.eventTracker.trackError(
					message,
					undefined,
					undefined,
					undefined,
					undefined,
					true,
				);
				this.originalConsoleError.apply(console, args);
			};
		}

		// Page visibility change
		document.addEventListener("visibilitychange", () => {
			if (document.visibilityState === "hidden") {
				this.flush();
			}
		});
	}

	private startEventCollection(): void {
		// Periodically collect events from trackers and send to batcher
		setInterval(() => {
			const events: ObservabilityEvent[] = [
				...this.eventTracker.getAndClearQueue(),
				...this.performanceMonitor.getAndClearQueue(),
			];

			events.forEach((event) => {
				this.config.onEvent(event);
				this.batcher.addEvent(event);
			});
		}, 1000);
	}

	private trackPageView(): void {
		this.eventTracker.trackCustomEvent("page_view", {
			url: window.location.href,
			title: document.title,
			referrer: document.referrer,
		});
	}

	// Public API

	track(eventName: string, eventData?: Record<string, unknown>): void {
		if (!this.initialized) {
			console.warn("Observability not initialized");
			return;
		}

		this.eventTracker.trackCustomEvent(eventName, eventData || {});
	}

	identify(userId: string, traits?: Record<string, unknown>): void {
		if (!this.initialized) {
			console.warn("Observability not initialized");
			return;
		}

		this.track("identify", {
			user_id: userId,
			traits: traits || {},
		});
	}

	page(name?: string, properties?: Record<string, unknown>): void {
		if (!this.initialized) {
			console.warn("Observability not initialized");
			return;
		}

		this.trackPageView();

		if (name || properties) {
			this.track("page", {
				name: name || document.title,
				...properties,
			});
		}
	}

	flush(): Promise<void> {
		return this.batcher.forceFlush();
	}

	getSessionId(): string {
		return this.fingerprintManager.getSessionId();
	}

	getUserFingerprint(): string {
		return this.fingerprintManager.getVisitorId();
	}

	destroy(): void {
		if (this.config.enableConsoleErrorTracking) {
			console.error = this.originalConsoleError;
		}

		this.performanceMonitor.stopMonitoring();
		this.batcher.destroy();

		Observability.instance = null;
		this.initialized = false;
	}
}

// Auto-initialization for script tag usage
interface WindowWithConfig extends Window {
	ObservabilityConfig?: ObservabilityConfig;
}

if (typeof window !== "undefined") {
	const windowWithConfig = window as WindowWithConfig;
	if (windowWithConfig.ObservabilityConfig) {
		Observability.init(windowWithConfig.ObservabilityConfig);
	}
}
