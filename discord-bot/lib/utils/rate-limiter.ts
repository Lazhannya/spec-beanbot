/**
 * Rate Limiter for Discord API Calls
 * Implements token bucket algorithm with per-route rate limiting
 */

interface RateLimitBucket {
  remaining: number;
  resetAt: number;
  limit: number;
}

/**
 * Rate limiter using token bucket algorithm
 */
export class RateLimiter {
  private buckets: Map<string, RateLimitBucket> = new Map();
  private globalRateLimit: RateLimitBucket | null = null;

  constructor(
    private defaultLimit = 50, // Default requests per window
    private defaultWindow = 1000 // Default window in milliseconds
  ) {}

  /**
   * Check if request can proceed
   */
  checkRateLimit(route: string): {
    allowed: boolean;
    retryAfter?: number;
  } {
    const now = Date.now();

    // Check global rate limit first
    if (this.globalRateLimit && this.globalRateLimit.resetAt > now) {
      if (this.globalRateLimit.remaining <= 0) {
        return {
          allowed: false,
          retryAfter: this.globalRateLimit.resetAt - now,
        };
      }
    }

    // Check route-specific rate limit
    let bucket = this.buckets.get(route);

    if (!bucket) {
      // Initialize new bucket
      bucket = {
        remaining: this.defaultLimit,
        resetAt: now + this.defaultWindow,
        limit: this.defaultLimit,
      };
      this.buckets.set(route, bucket);
    }

    // Reset bucket if window has passed
    if (bucket.resetAt <= now) {
      bucket.remaining = bucket.limit;
      bucket.resetAt = now + this.defaultWindow;
    }

    // Check if request allowed
    if (bucket.remaining <= 0) {
      return {
        allowed: false,
        retryAfter: bucket.resetAt - now,
      };
    }

    // Consume token
    bucket.remaining--;
    
    return { allowed: true };
  }

  /**
   * Update rate limit info from Discord headers
   */
  updateFromHeaders(route: string, headers: Headers): void {
    const limit = parseInt(headers.get("x-ratelimit-limit") || "50");
    const remaining = parseInt(headers.get("x-ratelimit-remaining") || "0");
    const resetAfter = parseFloat(headers.get("x-ratelimit-reset-after") || "1");
    const isGlobal = headers.get("x-ratelimit-global") === "true";

    const now = Date.now();
    const resetAt = now + (resetAfter * 1000);

    const bucket: RateLimitBucket = {
      remaining,
      resetAt,
      limit,
    };

    if (isGlobal) {
      this.globalRateLimit = bucket;
    } else {
      this.buckets.set(route, bucket);
    }
  }

  /**
   * Wait for rate limit to reset
   */
  async waitForRateLimit(retryAfter: number): Promise<void> {
    // Add small buffer to ensure reset has occurred
    const waitTime = retryAfter + 100;
    console.log(`[RateLimiter] Waiting ${waitTime}ms for rate limit reset`);
    await new Promise((resolve) => setTimeout(resolve, waitTime));
  }

  /**
   * Clear all buckets (for testing)
   */
  clear(): void {
    this.buckets.clear();
    this.globalRateLimit = null;
  }

  /**
   * Get bucket status for monitoring
   */
  getStatus(route?: string): Record<string, unknown> {
    if (route) {
      const bucket = this.buckets.get(route);
      return bucket ? { route, ...bucket } : { route, status: "no bucket" };
    }

    return {
      global: this.globalRateLimit,
      routes: Array.from(this.buckets.entries()).map(([route, bucket]) => ({
        route,
        ...bucket,
      })),
    };
  }
}

/**
 * Exponential backoff helper
 */
export class ExponentialBackoff {
  constructor(
    private baseDelay = 1000, // Start with 1 second
    private maxDelay = 32000, // Max 32 seconds
    private maxRetries = 5
  ) {}

  /**
   * Calculate delay for retry attempt
   */
  getDelay(attempt: number): number {
    if (attempt >= this.maxRetries) {
      throw new Error(`Maximum retry attempts (${this.maxRetries}) exceeded`);
    }

    // Exponential backoff: baseDelay * 2^attempt
    const delay = Math.min(
      this.baseDelay * Math.pow(2, attempt),
      this.maxDelay
    );

    // Add jitter (±25%)
    const jitter = delay * 0.25 * (Math.random() * 2 - 1);
    
    return Math.floor(delay + jitter);
  }

  /**
   * Wait with backoff
   */
  async wait(attempt: number): Promise<void> {
    const delay = this.getDelay(attempt);
    console.log(`[ExponentialBackoff] Waiting ${delay}ms before retry ${attempt + 1}`);
    await new Promise((resolve) => setTimeout(resolve, delay));
  }

  /**
   * Execute with retry and backoff
   */
  async execute<T>(
    fn: () => Promise<T>,
    shouldRetry: (error: unknown) => boolean = () => true
  ): Promise<T> {
    let lastError: unknown;

    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          await this.wait(attempt - 1);
        }
        return await fn();
      } catch (error) {
        lastError = error;
        
        if (!shouldRetry(error)) {
          throw error;
        }

        if (attempt === this.maxRetries - 1) {
          console.error(`[ExponentialBackoff] All ${this.maxRetries} attempts failed`);
          throw error;
        }

        console.warn(`[ExponentialBackoff] Attempt ${attempt + 1} failed:`, error);
      }
    }

    throw lastError;
  }
}

/**
 * Global rate limiter instance
 */
const globalRateLimiter = new RateLimiter();

export function getRateLimiter(): RateLimiter {
  return globalRateLimiter;
}
