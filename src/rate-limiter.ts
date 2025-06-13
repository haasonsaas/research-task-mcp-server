export class RateLimiter {
  private requestTimes: number[] = [];
  private readonly maxRequests: number;
  private readonly windowMs: number;

  constructor(maxRequests: number = 10, windowMs: number = 60000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }

  async waitIfNeeded(): Promise<void> {
    const now = Date.now();
    
    // Remove old requests outside the window
    this.requestTimes = this.requestTimes.filter(
      time => now - time < this.windowMs
    );

    if (this.requestTimes.length >= this.maxRequests) {
      // Calculate wait time until the oldest request expires
      const oldestRequest = this.requestTimes[0];
      const waitTime = this.windowMs - (now - oldestRequest) + 100; // Add 100ms buffer
      
      console.log(`Rate limit reached. Waiting ${waitTime}ms...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
      
      // Recursive call to ensure we're within limits
      return this.waitIfNeeded();
    }

    // Record this request
    this.requestTimes.push(now);
  }

  getRequestsRemaining(): number {
    const now = Date.now();
    this.requestTimes = this.requestTimes.filter(
      time => now - time < this.windowMs
    );
    return Math.max(0, this.maxRequests - this.requestTimes.length);
  }
}