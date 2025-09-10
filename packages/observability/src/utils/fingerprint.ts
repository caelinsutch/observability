import FingerprintJS from '@fingerprintjs/fingerprintjs';

export class FingerprintManager {
  private static instance: FingerprintManager;
  private fpPromise: Promise<any> | null = null;
  private visitorId: string | null = null;
  private sessionId: string | null = null;
  private sessionStartTime: number | null = null;
  
  private readonly SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes
  private readonly SESSION_KEY = 'obs_session_id';
  private readonly SESSION_START_KEY = 'obs_session_start';
  
  private constructor() {}
  
  static getInstance(): FingerprintManager {
    if (!FingerprintManager.instance) {
      FingerprintManager.instance = new FingerprintManager();
    }
    return FingerprintManager.instance;
  }
  
  async initialize(): Promise<void> {
    if (!this.fpPromise) {
      this.fpPromise = FingerprintJS.load();
    }
    
    const fp = await this.fpPromise;
    const result = await fp.get();
    this.visitorId = result.visitorId;
    
    this.loadOrCreateSession();
  }
  
  private loadOrCreateSession(): void {
    const storedSessionId = sessionStorage.getItem(this.SESSION_KEY);
    const storedSessionStart = sessionStorage.getItem(this.SESSION_START_KEY);
    
    if (storedSessionId && storedSessionStart) {
      const sessionStart = parseInt(storedSessionStart, 10);
      const now = Date.now();
      
      if (now - sessionStart < this.SESSION_TIMEOUT) {
        this.sessionId = storedSessionId;
        this.sessionStartTime = sessionStart;
        return;
      }
    }
    
    this.createNewSession();
  }
  
  private createNewSession(): void {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 15);
    this.sessionId = `${this.visitorId}_${timestamp}_${random}`;
    this.sessionStartTime = timestamp;
    
    sessionStorage.setItem(this.SESSION_KEY, this.sessionId);
    sessionStorage.setItem(this.SESSION_START_KEY, timestamp.toString());
  }
  
  getVisitorId(): string {
    if (!this.visitorId) {
      throw new Error('Fingerprint not initialized. Call initialize() first.');
    }
    return this.visitorId;
  }
  
  getSessionId(): string {
    if (!this.sessionId) {
      throw new Error('Session not initialized. Call initialize() first.');
    }
    
    // Check if session has expired
    if (this.sessionStartTime && Date.now() - this.sessionStartTime > this.SESSION_TIMEOUT) {
      this.createNewSession();
    }
    
    return this.sessionId;
  }
  
  refreshSession(): void {
    // Update last activity time to extend session
    if (this.sessionStartTime) {
      const now = Date.now();
      if (now - this.sessionStartTime < this.SESSION_TIMEOUT) {
        // Session is still valid, just update activity
        return;
      }
    }
    
    // Session expired, create new one
    this.createNewSession();
  }
  
  getSessionData() {
    return {
      sessionId: this.getSessionId(),
      visitorId: this.getVisitorId(),
      sessionStart: this.sessionStartTime,
      lastActivity: Date.now(),
    };
  }
}