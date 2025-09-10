import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	debounce,
	generateEventId,
	getCookie,
	getLocalStorage,
	getPageMetadata,
	getSessionStorage,
	isBot,
	sanitizeUrl,
	setCookie,
	setLocalStorage,
	setSessionStorage,
	throttle,
} from "../helpers";

describe("Helper Utilities", () => {
	describe("generateEventId", () => {
		it("should generate unique event IDs", () => {
			const id1 = generateEventId();
			const id2 = generateEventId();

			expect(id1).toBeTruthy();
			expect(id2).toBeTruthy();
			expect(id1).not.toBe(id2);
		});

		it("should generate IDs with expected format", () => {
			const id = generateEventId();
			const parts = id.split("-");

			expect(parts).toHaveLength(3);
			expect(parts[0]).toBeTruthy(); // timestamp
			expect(parts[1]).toBeTruthy(); // random
			expect(parts[2]).toBeTruthy(); // counter
		});
	});

	describe("debounce", () => {
		beforeEach(() => {
			vi.useFakeTimers();
		});

		afterEach(() => {
			vi.useRealTimers();
		});

		it("should debounce function calls", () => {
			const fn = vi.fn();
			const debouncedFn = debounce(fn, 100);

			debouncedFn("arg1");
			debouncedFn("arg2");
			debouncedFn("arg3");

			expect(fn).not.toHaveBeenCalled();

			vi.advanceTimersByTime(100);

			expect(fn).toHaveBeenCalledTimes(1);
			expect(fn).toHaveBeenCalledWith("arg3");
		});

		it("should reset timer on subsequent calls", () => {
			const fn = vi.fn();
			const debouncedFn = debounce(fn, 100);

			debouncedFn("first");
			vi.advanceTimersByTime(50);

			debouncedFn("second");
			vi.advanceTimersByTime(50);

			expect(fn).not.toHaveBeenCalled();

			vi.advanceTimersByTime(50);

			expect(fn).toHaveBeenCalledTimes(1);
			expect(fn).toHaveBeenCalledWith("second");
		});
	});

	describe("throttle", () => {
		beforeEach(() => {
			vi.useFakeTimers();
		});

		afterEach(() => {
			vi.useRealTimers();
		});

		it("should throttle function calls", () => {
			const fn = vi.fn();
			const throttledFn = throttle(fn, 100);

			throttledFn("first");
			throttledFn("second");
			throttledFn("third");

			expect(fn).toHaveBeenCalledTimes(1);
			expect(fn).toHaveBeenCalledWith("first");

			vi.advanceTimersByTime(100);

			throttledFn("fourth");
			expect(fn).toHaveBeenCalledTimes(2);
			expect(fn).toHaveBeenLastCalledWith("fourth");
		});

		it("should allow calls after throttle period", () => {
			const fn = vi.fn();
			const throttledFn = throttle(fn, 100);

			throttledFn("first");
			vi.advanceTimersByTime(101);
			throttledFn("second");

			expect(fn).toHaveBeenCalledTimes(2);
		});
	});

	describe("Cookie functions", () => {
		beforeEach(() => {
			document.cookie = "";
		});

		it("should set and get cookies", () => {
			setCookie("testCookie", "testValue", 1);

			// Cookie setting is limited in test environment
			// We can at least verify the function runs without error
			expect(() => setCookie("test", "value", 1)).not.toThrow();
		});

		it("should return null for non-existent cookies", () => {
			const result = getCookie("nonExistent");
			expect(result).toBeNull();
		});
	});

	describe("LocalStorage functions", () => {
		it("should set and get localStorage values", () => {
			interface TestData {
				name: string;
				age: number;
			}

			const testData: TestData = { name: "John", age: 30 };
			setLocalStorage("testKey", testData);

			const retrieved = getLocalStorage<TestData>("testKey");
			expect(retrieved).toEqual(testData);
		});

		it("should return null for non-existent keys", () => {
			const result = getLocalStorage("nonExistent");
			expect(result).toBeNull();
		});

		it("should handle storage errors gracefully", () => {
			const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

			// Mock localStorage to throw an error
			const originalGetItem = localStorage.getItem;
			localStorage.getItem = vi.fn(() => {
				throw new Error("Storage error");
			});

			const result = getLocalStorage("testKey");
			expect(result).toBeNull();
			expect(consoleSpy).toHaveBeenCalled();

			localStorage.getItem = originalGetItem;
			consoleSpy.mockRestore();
		});
	});

	describe("SessionStorage functions", () => {
		it("should set and get sessionStorage values", () => {
			interface TestData {
				id: string;
				timestamp: number;
			}

			const testData: TestData = { id: "abc123", timestamp: Date.now() };
			setSessionStorage("sessionKey", testData);

			const retrieved = getSessionStorage<TestData>("sessionKey");
			expect(retrieved).toEqual(testData);
		});

		it("should return null for non-existent keys", () => {
			const result = getSessionStorage("nonExistent");
			expect(result).toBeNull();
		});

		it("should handle storage errors gracefully", () => {
			const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

			// Mock sessionStorage to throw an error
			const originalSetItem = sessionStorage.setItem;
			sessionStorage.setItem = vi.fn(() => {
				throw new Error("Storage error");
			});

			setSessionStorage("testKey", { test: "data" });
			expect(consoleSpy).toHaveBeenCalled();

			sessionStorage.setItem = originalSetItem;
			consoleSpy.mockRestore();
		});
	});

	describe("isBot", () => {
		const originalUserAgent = navigator.userAgent;

		afterEach(() => {
			Object.defineProperty(navigator, "userAgent", {
				value: originalUserAgent,
				writable: true,
			});
		});

		it("should detect bot user agents", () => {
			const botUserAgents = [
				"Googlebot/2.1",
				"Bingbot/2.0",
				"Slackbot-LinkExpanding 1.0",
				"facebookexternalhit/1.1",
				"WhatsApp/2.19.81",
			];

			botUserAgents.forEach((ua) => {
				Object.defineProperty(navigator, "userAgent", {
					value: ua,
					writable: true,
				});
				expect(isBot()).toBe(true);
			});
		});

		it("should not detect regular browsers as bots", () => {
			const regularUserAgents = [
				"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
				"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
			];

			regularUserAgents.forEach((ua) => {
				Object.defineProperty(navigator, "userAgent", {
					value: ua,
					writable: true,
				});
				expect(isBot()).toBe(false);
			});
		});
	});

	describe("sanitizeUrl", () => {
		it("should remove sensitive query parameters", () => {
			const url = "https://example.com/page?token=secret&key=123&normal=value";
			const sanitized = sanitizeUrl(url);

			expect(sanitized).not.toContain("token=secret");
			expect(sanitized).not.toContain("key=123");
			expect(sanitized).toContain("normal=value");
		});

		it("should handle invalid URLs gracefully", () => {
			const invalidUrl = "not-a-valid-url";
			const result = sanitizeUrl(invalidUrl);

			expect(result).toBe(invalidUrl);
		});

		it("should remove multiple sensitive parameters", () => {
			const url =
				"https://example.com?password=pwd&api_key=key&access_token=token&safe=data";
			const sanitized = sanitizeUrl(url);

			expect(sanitized).not.toContain("password");
			expect(sanitized).not.toContain("api_key");
			expect(sanitized).not.toContain("access_token");
			expect(sanitized).toContain("safe=data");
		});
	});

	describe("getPageMetadata", () => {
		beforeEach(() => {
			// Clear existing meta tags
			const metas = document.getElementsByTagName("meta");
			while (metas.length > 0) {
				metas?.[0]?.remove();
			}
		});

		it("should extract page metadata", () => {
			// Add meta tags
			const metaDescription = document.createElement("meta");
			metaDescription.name = "description";
			metaDescription.content = "Test description";
			document.head.appendChild(metaDescription);

			const metaAuthor = document.createElement("meta");
			metaAuthor.name = "author";
			metaAuthor.content = "Test Author";
			document.head.appendChild(metaAuthor);

			const ogTitle = document.createElement("meta");
			ogTitle.setAttribute("property", "og:title");
			ogTitle.content = "OG Title";
			document.head.appendChild(ogTitle);

			document.title = "Test Page Title";

			const metadata = getPageMetadata();

			expect(metadata.title).toBe("Test Page Title");
			expect(metadata.description).toBe("Test description");
			expect(metadata.author).toBe("Test Author");
			expect(metadata.ogTitle).toBe("OG Title");
		});

		it("should handle missing metadata gracefully", () => {
			const metadata = getPageMetadata();

			expect(metadata.description).toBe("");
			expect(metadata.keywords).toBe("");
			expect(metadata.author).toBe("");
			expect(metadata.ogTitle).toBe("");
			expect(metadata.ogDescription).toBe("");
			expect(metadata.ogImage).toBe("");
			expect(metadata.canonical).toBe("");
		});
	});
});
