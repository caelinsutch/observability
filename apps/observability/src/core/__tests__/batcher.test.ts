import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EventBatcher } from '../batcher';
import { EventType } from '../../types/events';

// Mock fetch
global.fetch = vi.fn();

describe('EventBatcher', () => {
  let batcher: EventBatcher;
  const mockEndpoint = 'https://api.example.com/events';
  const mockEvent = {
    timestamp: Date.now(),
    session_id: 'test-session',
    user_fingerprint: 'test-fingerprint',
    event_id: 'test-event-id',
    event_type: EventType.CUSTOM,
    page_url: 'https://example.com',
    page_title: 'Test Page',
    referrer: '',
    user_agent: 'Test Agent',
    screen_width: 1920,
    screen_height: 1080,
    viewport_width: 1920,
    viewport_height: 900,
    device_pixel_ratio: 1,
    timezone: 'UTC',
    language: 'en-US',
    event_name: 'test_event',
    event_data: {},
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    localStorage.clear();
    
    (global.fetch as any).mockResolvedValue({
      ok: true,
      status: 200,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    if (batcher) {
      batcher.destroy();
    }
  });

  describe('initialization', () => {
    it('should initialize with default config', () => {
      batcher = new EventBatcher({ endpoint: mockEndpoint });
      
      expect(batcher).toBeDefined();
    });

    it('should accept custom configuration', () => {
      const onError = vi.fn();
      const onSuccess = vi.fn();
      
      batcher = new EventBatcher({
        endpoint: mockEndpoint,
        batchSize: 10,
        flushInterval: 1000,
        maxRetries: 5,
        retryDelay: 500,
        headers: { 'X-Custom': 'Header' },
        onError,
        onSuccess,
      });
      
      expect(batcher).toBeDefined();
    });
  });

  describe('event batching', () => {
    beforeEach(() => {
      batcher = new EventBatcher({
        endpoint: mockEndpoint,
        batchSize: 3,
        flushInterval: 5000,
      });
    });

    it('should add events to buffer', () => {
      batcher.addEvent(mockEvent);
      
      // Event should be buffered, not sent immediately
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should flush when batch size is reached', async () => {
      batcher.addEvent(mockEvent);
      batcher.addEvent(mockEvent);
      
      expect(global.fetch).not.toHaveBeenCalled();
      
      // Third event should trigger flush
      batcher.addEvent(mockEvent);
      
      // Wait for async flush to complete
      await vi.waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(1);
      });
      
      const call = (global.fetch as any).mock.calls[0];
      const body = JSON.parse(call[1].body);
      
      expect(body.events).toHaveLength(3);
    });

    it('should flush on interval', async () => {
      batcher.addEvent(mockEvent);
      batcher.addEvent(mockEvent);
      
      expect(global.fetch).not.toHaveBeenCalled();
      
      // Advance time to trigger interval flush
      await vi.advanceTimersByTimeAsync(5000);
      
      expect(global.fetch).toHaveBeenCalledTimes(1);
      const call = (global.fetch as any).mock.calls[0];
      const body = JSON.parse(call[1].body);
      
      expect(body.events).toHaveLength(2);
    });

    it('should batch multiple events at once', () => {
      const events = [mockEvent, mockEvent, mockEvent, mockEvent];
      batcher.addEvents(events);
      
      // Should flush immediately since batch size is 3
      expect(global.fetch).toHaveBeenCalled();
    });
  });

  describe('manual flush', () => {
    beforeEach(() => {
      batcher = new EventBatcher({
        endpoint: mockEndpoint,
        batchSize: 50,
        flushInterval: 10000,
      });
    });

    it('should flush on demand', async () => {
      batcher.addEvent(mockEvent);
      
      await batcher.forceFlush();
      
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('should not flush if buffer is empty', async () => {
      await batcher.forceFlush();
      
      expect(global.fetch).not.toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should call onError callback on failure', async () => {
      const onError = vi.fn();
      
      (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));
      
      batcher = new EventBatcher({
        endpoint: mockEndpoint,
        onError,
      });
      
      batcher.addEvent(mockEvent);
      await batcher.forceFlush();
      
      expect(onError).toHaveBeenCalledWith(
        expect.any(Error),
        expect.arrayContaining([expect.objectContaining({ event_id: 'test-event-id' })])
      );
    });

    it('should call onSuccess callback on success', async () => {
      const onSuccess = vi.fn();
      
      batcher = new EventBatcher({
        endpoint: mockEndpoint,
        onSuccess,
      });
      
      batcher.addEvent(mockEvent);
      await batcher.forceFlush();
      
      expect(onSuccess).toHaveBeenCalledWith(
        expect.arrayContaining([expect.objectContaining({ event_id: 'test-event-id' })])
      );
    });

    it('should handle HTTP errors', async () => {
      const onError = vi.fn();
      
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 500,
      });
      
      batcher = new EventBatcher({
        endpoint: mockEndpoint,
        onError,
      });
      
      batcher.addEvent(mockEvent);
      await batcher.forceFlush();
      
      expect(onError).toHaveBeenCalled();
    });
  });

  describe('offline support', () => {
    it('should store events when offline', async () => {
      batcher = new EventBatcher({
        endpoint: mockEndpoint,
      });
      
      // Simulate offline
      Object.defineProperty(window, 'navigator', {
        value: { onLine: false },
        writable: true,
      });
      (batcher as any).isOnline = false;
      
      batcher.addEvent(mockEvent);
      await batcher.forceFlush();
      
      expect(global.fetch).not.toHaveBeenCalled();
      
      // Check localStorage for stored batch
      const stored = localStorage.getItem('obs_failed_batches');
      expect(stored).toBeTruthy();
      
      const batches = JSON.parse(stored!);
      expect(batches).toHaveLength(1);
      expect(batches[0].events).toHaveLength(1);
    });

    it('should retry failed batches when coming online', async () => {
      // Store a failed batch in localStorage
      const failedBatch = {
        batch_id: 'failed-batch',
        batch_timestamp: Date.now(),
        events: [mockEvent],
      };
      localStorage.setItem('obs_failed_batches', JSON.stringify([failedBatch]));
      
      batcher = new EventBatcher({
        endpoint: mockEndpoint,
      });
      
      // Manually trigger retry (normally triggered by online event)
      (batcher as any).isOnline = true;
      // Clear failedBatches to ensure we're loading from localStorage
      (batcher as any).failedBatches = [];
      
      // Call retryFailedBatches which should load from localStorage and send
      await (batcher as any).retryFailedBatches();
      
      expect(global.fetch).toHaveBeenCalledTimes(1);
      
      // Verify localStorage was cleared
      expect(localStorage.getItem('obs_failed_batches')).toBeNull();
    });
  });

  describe('beacon API', () => {
    it('should use beacon API when page unloads', async () => {
      // Mock sendBeacon
      const sendBeaconMock = vi.fn(() => true);
      Object.defineProperty(navigator, 'sendBeacon', {
        value: sendBeaconMock,
        writable: true,
        configurable: true,
      });
      
      batcher = new EventBatcher({
        endpoint: mockEndpoint,
      });
      
      batcher.addEvent(mockEvent);
      await (batcher as any).flush(true);
      
      expect(sendBeaconMock).toHaveBeenCalledTimes(1);
      expect(sendBeaconMock).toHaveBeenCalledWith(
        mockEndpoint,
        expect.any(Blob)
      );
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should fallback to fetch if beacon fails', async () => {
      // Mock sendBeacon to return false (indicating failure)
      const sendBeaconMock = vi.fn(() => false);
      Object.defineProperty(navigator, 'sendBeacon', {
        value: sendBeaconMock,
        writable: true,
        configurable: true,
      });
      
      batcher = new EventBatcher({
        endpoint: mockEndpoint,
      });
      
      batcher.addEvent(mockEvent);
      
      // When sendBeacon returns false, it should fallback to fetch
      await (batcher as any).flush(true);
      
      // Verify sendBeacon was attempted first
      expect(sendBeaconMock).toHaveBeenCalledTimes(1);
      
      // Verify it fell back to fetch
      expect(global.fetch).toHaveBeenCalledTimes(1);
      expect(global.fetch).toHaveBeenCalledWith(
        mockEndpoint,
        expect.objectContaining({
          method: 'POST',
          keepalive: true,
        })
      );
    });
  });

  describe('cleanup', () => {
    it('should flush and cleanup on destroy', () => {
      batcher = new EventBatcher({
        endpoint: mockEndpoint,
      });
      
      const flushSpy = vi.spyOn(batcher as any, 'flush');
      
      batcher.addEvent(mockEvent);
      batcher.destroy();
      
      expect(flushSpy).toHaveBeenCalledWith(true);
    });

    it('should clear timers on destroy', () => {
      batcher = new EventBatcher({
        endpoint: mockEndpoint,
        flushInterval: 1000,
      });
      
      const clearIntervalSpy = vi.spyOn(global, 'clearInterval');
      
      batcher.destroy();
      
      expect(clearIntervalSpy).toHaveBeenCalled();
    });
  });

  describe('headers', () => {
    it('should include custom headers in requests', async () => {
      batcher = new EventBatcher({
        endpoint: mockEndpoint,
        headers: {
          'Authorization': 'Bearer token123',
          'X-Custom': 'value',
        },
      });
      
      batcher.addEvent(mockEvent);
      await batcher.forceFlush();
      
      expect(global.fetch).toHaveBeenCalledWith(
        mockEndpoint,
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'Authorization': 'Bearer token123',
            'X-Custom': 'value',
          }),
        })
      );
    });
  });
});