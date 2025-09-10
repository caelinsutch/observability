import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { FingerprintManager } from '../fingerprint';

// Mock FingerprintJS
vi.mock('@fingerprintjs/fingerprintjs', () => ({
  default: {
    load: vi.fn(() => Promise.resolve({
      get: vi.fn(() => Promise.resolve({
        visitorId: 'test-visitor-id-123',
        components: {},
        confidence: { score: 0.995 },
      })),
    })),
  },
}));

describe('FingerprintManager', () => {
  let fingerprintManager: FingerprintManager;

  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    // Reset singleton instance
    (FingerprintManager as any).instance = null;
    fingerprintManager = FingerprintManager.getInstance();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('getInstance', () => {
    it('should return the same instance (singleton)', () => {
      const instance1 = FingerprintManager.getInstance();
      const instance2 = FingerprintManager.getInstance();
      
      expect(instance1).toBe(instance2);
    });
  });

  describe('initialize', () => {
    it('should initialize fingerprint and create session', async () => {
      await fingerprintManager.initialize();
      
      const visitorId = fingerprintManager.getVisitorId();
      const sessionId = fingerprintManager.getSessionId();
      
      expect(visitorId).toBe('test-visitor-id-123');
      expect(sessionId).toContain('test-visitor-id-123');
    });

    it('should only initialize once', async () => {
      await fingerprintManager.initialize();
      await fingerprintManager.initialize();
      
      // FingerprintJS.load should only be called once
      const FingerprintJS = await import('@fingerprintjs/fingerprintjs');
      expect(FingerprintJS.default.load).toHaveBeenCalledTimes(1);
    });
  });

  describe('session management', () => {
    beforeEach(async () => {
      await fingerprintManager.initialize();
    });

    it('should create a new session ID', () => {
      const sessionId = fingerprintManager.getSessionId();
      
      expect(sessionId).toBeTruthy();
      expect(sessionId).toContain('test-visitor-id-123');
      expect(sessionId.split('_')).toHaveLength(3);
    });

    it('should store session in sessionStorage', async () => {
      await fingerprintManager.initialize();
      
      const storedSessionId = sessionStorage.getItem('obs_session_id');
      const storedSessionStart = sessionStorage.getItem('obs_session_start');
      
      expect(storedSessionId).toBeTruthy();
      expect(storedSessionStart).toBeTruthy();
    });

    it('should reuse existing valid session', async () => {
      const firstSessionId = fingerprintManager.getSessionId();
      
      // Create a new instance
      (FingerprintManager as any).instance = null;
      const newManager = FingerprintManager.getInstance();
      await newManager.initialize();
      
      const secondSessionId = newManager.getSessionId();
      
      expect(secondSessionId).toBe(firstSessionId);
    });

    it('should create new session if expired', async () => {
      vi.useFakeTimers();
      const initialTime = Date.now();
      vi.setSystemTime(initialTime);

      await fingerprintManager.initialize();
      const firstSessionId = fingerprintManager.getSessionId();
      
      // Advance time beyond session timeout (30 minutes)
      vi.setSystemTime(initialTime + 31 * 60 * 1000);
      
      // Create a new instance
      (FingerprintManager as any).instance = null;
      const newManager = FingerprintManager.getInstance();
      await newManager.initialize();
      
      const secondSessionId = newManager.getSessionId();
      
      expect(secondSessionId).not.toBe(firstSessionId);
    });

    it('should refresh expired session on getSessionId', () => {
      vi.useFakeTimers();
      const initialTime = Date.now();
      vi.setSystemTime(initialTime);

      const firstSessionId = fingerprintManager.getSessionId();
      
      // Advance time beyond session timeout
      vi.setSystemTime(initialTime + 31 * 60 * 1000);
      
      const secondSessionId = fingerprintManager.getSessionId();
      
      expect(secondSessionId).not.toBe(firstSessionId);
    });
  });

  describe('refreshSession', () => {
    beforeEach(async () => {
      await fingerprintManager.initialize();
    });

    it('should not create new session if current is valid', () => {
      const sessionIdBefore = fingerprintManager.getSessionId();
      
      fingerprintManager.refreshSession();
      
      const sessionIdAfter = fingerprintManager.getSessionId();
      
      expect(sessionIdAfter).toBe(sessionIdBefore);
    });

    it('should create new session if expired', () => {
      vi.useFakeTimers();
      const initialTime = Date.now();
      vi.setSystemTime(initialTime);

      const sessionIdBefore = fingerprintManager.getSessionId();
      
      // Advance time beyond session timeout
      vi.setSystemTime(initialTime + 31 * 60 * 1000);
      
      fingerprintManager.refreshSession();
      
      const sessionIdAfter = fingerprintManager.getSessionId();
      
      expect(sessionIdAfter).not.toBe(sessionIdBefore);
    });
  });

  describe('getSessionData', () => {
    beforeEach(async () => {
      await fingerprintManager.initialize();
    });

    it('should return complete session data', () => {
      const sessionData = fingerprintManager.getSessionData();
      
      expect(sessionData).toHaveProperty('sessionId');
      expect(sessionData).toHaveProperty('visitorId');
      expect(sessionData).toHaveProperty('sessionStart');
      expect(sessionData).toHaveProperty('lastActivity');
      
      expect(sessionData.visitorId).toBe('test-visitor-id-123');
      expect(sessionData.sessionId).toContain('test-visitor-id-123');
      expect(typeof sessionData.sessionStart).toBe('number');
      expect(typeof sessionData.lastActivity).toBe('number');
    });
  });

  describe('error handling', () => {
    it('should throw error if getVisitorId called before initialization', () => {
      (FingerprintManager as any).instance = null;
      const uninitializedManager = FingerprintManager.getInstance();
      
      expect(() => uninitializedManager.getVisitorId()).toThrow(
        'Fingerprint not initialized. Call initialize() first.'
      );
    });

    it('should throw error if getSessionId called before initialization', () => {
      (FingerprintManager as any).instance = null;
      const uninitializedManager = FingerprintManager.getInstance();
      
      expect(() => uninitializedManager.getSessionId()).toThrow(
        'Session not initialized. Call initialize() first.'
      );
    });
  });
});