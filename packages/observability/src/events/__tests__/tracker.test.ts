import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FingerprintManager } from "../../utils/fingerprint";
import { EventTracker } from "../tracker";

// Mock FingerprintManager
vi.mock("../../utils/fingerprint", () => ({
	FingerprintManager: {
		getInstance: vi.fn(() => ({
			getSessionId: vi.fn(() => "test-session-123"),
			getVisitorId: vi.fn(() => "test-visitor-456"),
		})),
	},
}));

describe("EventTracker", () => {
	let eventTracker: EventTracker;
	let mockFingerprintManager: any;

	beforeEach(() => {
		vi.clearAllMocks();
		mockFingerprintManager = FingerprintManager.getInstance();
		eventTracker = new EventTracker(mockFingerprintManager);
	});

	describe("trackClick", () => {
		it("should track click events", () => {
			const mockEvent = new MouseEvent("click", {
				clientX: 100,
				clientY: 200,
			});

			const mockElement = document.createElement("button");
			mockElement.id = "test-button";
			mockElement.className = "btn primary";
			mockElement.textContent = "Click me";
			Object.defineProperty(mockEvent, "target", {
				value: mockElement,
				writable: false,
			});

			eventTracker.trackClick(mockEvent);

			const queue = eventTracker.getAndClearQueue();
			expect(queue).toHaveLength(1);

			const clickEvent = queue[0];
			expect(clickEvent).toBeDefined();
			expect(clickEvent?.event_type).toBe("click");
			expect(clickEvent).toMatchObject({
				session_id: "test-session-123",
				user_fingerprint: "test-visitor-456",
				element_tag: "button",
				element_id: "test-button",
				element_classes: ["btn", "primary"],
				element_text: "Click me",
				click_x: 100,
				click_y: 200,
			});
		});

		it("should handle clicks on links", () => {
			const mockEvent = new MouseEvent("click");
			const mockLink = document.createElement("a");
			mockLink.href = "https://example.com";
			mockLink.textContent = "Link text";

			Object.defineProperty(mockEvent, "target", {
				value: mockLink,
				writable: false,
			});

			eventTracker.trackClick(mockEvent);

			const queue = eventTracker.getAndClearQueue();
			expect(queue[0]).toMatchObject({
				element_tag: "a",
				element_href: "https://example.com/",
			});
		});

		it("should not track if target is null", () => {
			const mockEvent = new MouseEvent("click");
			Object.defineProperty(mockEvent, "target", {
				value: null,
				writable: false,
			});

			eventTracker.trackClick(mockEvent);

			const queue = eventTracker.getAndClearQueue();
			expect(queue).toHaveLength(0);
		});
	});

	describe("trackScroll", () => {
		beforeEach(() => {
			vi.useFakeTimers();
		});

		afterEach(() => {
			vi.useRealTimers();
		});

		it("should debounce scroll events", () => {
			// Mock window properties
			Object.defineProperty(window, "scrollY", { value: 100, writable: true });
			Object.defineProperty(document.documentElement, "scrollHeight", {
				value: 2000,
				writable: true,
			});
			Object.defineProperty(window, "innerHeight", {
				value: 800,
				writable: true,
			});

			eventTracker.trackScroll();
			eventTracker.trackScroll();
			eventTracker.trackScroll();

			// No events should be added immediately
			expect(eventTracker.getQueueSize()).toBe(0);

			// Advance timers to trigger debounced function
			vi.advanceTimersByTime(150);

			const queue = eventTracker.getAndClearQueue();
			expect(queue).toHaveLength(1);

			const scrollEvent = queue[0];
			expect(scrollEvent).toBeDefined();
			expect(scrollEvent?.event_type).toBe("scroll");
			expect(scrollEvent).toMatchObject({
				scroll_depth: 100,
				scroll_y: 100,
			});
		});

		it("should calculate scroll percentage correctly", () => {
			Object.defineProperty(window, "scrollY", { value: 600, writable: true });
			Object.defineProperty(document.documentElement, "scrollHeight", {
				value: 2000,
				writable: true,
			});
			Object.defineProperty(window, "innerHeight", {
				value: 800,
				writable: true,
			});

			eventTracker.trackScroll();
			vi.advanceTimersByTime(150);

			const queue = eventTracker.getAndClearQueue();
			const scrollEvent = queue[0];

			// (600 / (2000 - 800)) * 100 = 50%
			expect(scrollEvent).toBeDefined();
			expect(scrollEvent!).toMatchObject({
				scroll_percentage: 50,
			});
		});

		it("should track max scroll depth", () => {
			Object.defineProperty(window, "scrollY", { value: 100, writable: true });
			eventTracker.trackScroll();
			vi.advanceTimersByTime(150);

			Object.defineProperty(window, "scrollY", { value: 200, writable: true });
			eventTracker.trackScroll();
			vi.advanceTimersByTime(150);

			Object.defineProperty(window, "scrollY", { value: 150, writable: true });
			eventTracker.trackScroll();
			vi.advanceTimersByTime(150);

			const queue = eventTracker.getAndClearQueue();

			// Check the last event's max_scroll_depth
			const lastEvent = queue[queue.length - 1];
			expect(lastEvent).toMatchObject({
				max_scroll_depth: 200,
				scroll_y: 150,
			});
		});
	});

	describe("trackFormSubmit", () => {
		it("should track form submission events", () => {
			const form = document.createElement("form");
			form.id = "test-form";
			form.name = "testForm";
			form.action = "/submit";
			form.method = "POST";

			const input1 = document.createElement("input");
			input1.name = "username";
			const input2 = document.createElement("input");
			input2.name = "email";
			const input3 = document.createElement("input"); // No name

			form.appendChild(input1);
			form.appendChild(input2);
			form.appendChild(input3);

			const mockEvent = new Event("submit");
			Object.defineProperty(mockEvent, "target", {
				value: form,
				writable: false,
			});

			eventTracker.trackFormSubmit(mockEvent);

			const queue = eventTracker.getAndClearQueue();
			expect(queue).toHaveLength(1);

			const formEvent = queue[0];
			expect(formEvent).toBeDefined();
			expect(formEvent?.event_type).toBe("form_submit");
			expect(formEvent).toMatchObject({
				form_id: "test-form",
				form_name: "testForm",
				form_action: "http://localhost:3000/submit",
				form_method: "POST",
				form_fields: ["username", "email"],
			});
		});

		it("should handle forms without target", () => {
			const mockEvent = new Event("submit");
			Object.defineProperty(mockEvent, "target", {
				value: null,
				writable: false,
			});

			eventTracker.trackFormSubmit(mockEvent);

			const queue = eventTracker.getAndClearQueue();
			expect(queue).toHaveLength(0);
		});
	});

	describe("trackError", () => {
		it("should track JavaScript errors", () => {
			const error = new Error("Test error");
			error.stack = "Error stack trace";

			eventTracker.trackError(
				"Test error message",
				"script.js",
				42,
				15,
				error,
				false,
			);

			const queue = eventTracker.getAndClearQueue();
			expect(queue).toHaveLength(1);

			const errorEvent = queue[0];
			expect(errorEvent).toBeDefined();
			expect(errorEvent?.event_type).toBe("error");
			expect(errorEvent).toMatchObject({
				error_message: "Test error message",
				error_stack: "Error stack trace",
				error_filename: "script.js",
				error_line: 42,
				error_column: 15,
				error_type: "Error",
			});
		});

		it("should track console errors", () => {
			eventTracker.trackError(
				"Console error message",
				undefined,
				undefined,
				undefined,
				undefined,
				true,
			);

			const queue = eventTracker.getAndClearQueue();
			expect(queue).toHaveLength(1);

			const errorEvent = queue[0];
			expect(errorEvent?.event_type).toBe("console_error");
			expect(errorEvent).toMatchObject({
				error_message: "Console error message",
			});
		});
	});

	describe("trackCustomEvent", () => {
		it("should track custom events", () => {
			const eventData = {
				button: "subscribe",
				plan: "premium",
				price: 9.99,
			};

			eventTracker.trackCustomEvent("subscription_clicked", eventData);

			const queue = eventTracker.getAndClearQueue();
			expect(queue).toHaveLength(1);

			const customEvent = queue[0];
			expect(customEvent).toBeDefined();
			expect(customEvent?.event_type).toBe("custom");
			expect(customEvent).toMatchObject({
				event_name: "subscription_clicked",
				event_data: eventData,
			});
		});

		it("should handle empty event data", () => {
			eventTracker.trackCustomEvent("simple_event", {});

			const queue = eventTracker.getAndClearQueue();
			expect(queue[0]).toMatchObject({
				event_name: "simple_event",
				event_data: {},
			});
		});
	});

	describe("queue management", () => {
		it("should clear queue after getAndClearQueue", () => {
			eventTracker.trackCustomEvent("event1", {});
			eventTracker.trackCustomEvent("event2", {});

			expect(eventTracker.getQueueSize()).toBe(2);

			const events = eventTracker.getAndClearQueue();
			expect(events).toHaveLength(2);
			expect(eventTracker.getQueueSize()).toBe(0);
		});

		it("should maintain queue order", () => {
			eventTracker.trackCustomEvent("first", { order: 1 });
			eventTracker.trackCustomEvent("second", { order: 2 });
			eventTracker.trackCustomEvent("third", { order: 3 });

			const queue = eventTracker.getAndClearQueue();
			expect(queue[0]).toBeDefined();
			expect(queue[1]).toBeDefined();
			expect(queue[2]).toBeDefined();
			expect((queue[0] as any).event_name).toBe("first");
			expect((queue[1] as any).event_name).toBe("second");
			expect((queue[2] as any).event_name).toBe("third");
		});
	});
});
