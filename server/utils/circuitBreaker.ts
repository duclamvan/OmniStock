/**
 * Circuit Breaker utility for external API calls
 * Prevents cascading failures by "opening" the circuit when failures exceed threshold
 */

export interface CircuitBreakerOptions {
  failureThreshold?: number;     // Number of failures before opening circuit
  resetTimeoutMs?: number;       // Time to wait before trying again (half-open state)
  requestTimeoutMs?: number;     // Timeout for individual requests
  onStateChange?: (state: CircuitState) => void;
  onTimeout?: (error: Error) => void;
}

export type CircuitState = 'closed' | 'open' | 'half-open';

const DEFAULT_OPTIONS: Required<Omit<CircuitBreakerOptions, 'onStateChange' | 'onTimeout'>> = {
  failureThreshold: 5,
  resetTimeoutMs: 30000,
  requestTimeoutMs: 5000,
};

/**
 * Create a timeout promise that rejects after specified milliseconds
 */
function createTimeoutPromise(ms: number): Promise<never> {
  return new Promise((_, reject) => {
    setTimeout(() => {
      reject(new Error(`Request timeout after ${ms}ms`));
    }, ms);
  });
}

/**
 * Wrap a promise with a timeout
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  errorMessage?: string
): Promise<T> {
  return Promise.race([
    promise,
    createTimeoutPromise(timeoutMs).catch(() => {
      throw new Error(errorMessage || `Operation timed out after ${timeoutMs}ms`);
    })
  ]);
}

/**
 * Circuit Breaker implementation
 */
export class CircuitBreaker {
  private state: CircuitState = 'closed';
  private failureCount = 0;
  private lastFailureTime = 0;
  private options: Required<Omit<CircuitBreakerOptions, 'onStateChange' | 'onTimeout'>>;
  private onStateChange?: (state: CircuitState) => void;
  private onTimeout?: (error: Error) => void;

  constructor(options: CircuitBreakerOptions = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
    this.onStateChange = options.onStateChange;
    this.onTimeout = options.onTimeout;
  }

  private setState(newState: CircuitState): void {
    if (this.state !== newState) {
      this.state = newState;
      if (this.onStateChange) {
        this.onStateChange(newState);
      }
    }
  }

  private recordSuccess(): void {
    this.failureCount = 0;
    this.setState('closed');
  }

  private recordFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    
    if (this.failureCount >= this.options.failureThreshold) {
      this.setState('open');
    }
  }

  private shouldAttempt(): boolean {
    if (this.state === 'closed') {
      return true;
    }

    if (this.state === 'open') {
      const timeSinceFailure = Date.now() - this.lastFailureTime;
      if (timeSinceFailure >= this.options.resetTimeoutMs) {
        this.setState('half-open');
        return true;
      }
      return false;
    }

    // half-open - allow one attempt
    return true;
  }

  /**
   * Execute a function through the circuit breaker
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (!this.shouldAttempt()) {
      throw new Error(`Circuit breaker is open. Retry after ${this.getRemainingResetTime()}ms`);
    }

    try {
      const result = await withTimeout(fn(), this.options.requestTimeoutMs);
      this.recordSuccess();
      return result;
    } catch (error: any) {
      this.recordFailure();
      
      if (error.message.includes('timeout')) {
        if (this.onTimeout) {
          this.onTimeout(error);
        }
      }
      
      throw error;
    }
  }

  /**
   * Get remaining time until circuit resets
   */
  getRemainingResetTime(): number {
    if (this.state !== 'open') return 0;
    const elapsed = Date.now() - this.lastFailureTime;
    return Math.max(0, this.options.resetTimeoutMs - elapsed);
  }

  /**
   * Get current circuit state
   */
  getState(): CircuitState {
    return this.state;
  }

  /**
   * Get failure count
   */
  getFailureCount(): number {
    return this.failureCount;
  }

  /**
   * Force circuit to closed state (use with caution)
   */
  reset(): void {
    this.failureCount = 0;
    this.lastFailureTime = 0;
    this.setState('closed');
  }
}

/**
 * Create a circuit breaker-wrapped version of an async function
 */
export function withCircuitBreaker<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  options: CircuitBreakerOptions = {}
): T & { circuitBreaker: CircuitBreaker } {
  const breaker = new CircuitBreaker(options);
  
  const wrapped = ((...args: Parameters<T>) => 
    breaker.execute(() => fn(...args))
  ) as T & { circuitBreaker: CircuitBreaker };
  
  wrapped.circuitBreaker = breaker;
  
  return wrapped;
}

/**
 * Global circuit breakers for different services
 */
const circuitBreakers = new Map<string, CircuitBreaker>();

export function getCircuitBreaker(serviceName: string, options?: CircuitBreakerOptions): CircuitBreaker {
  if (!circuitBreakers.has(serviceName)) {
    circuitBreakers.set(serviceName, new CircuitBreaker({
      ...options,
      onStateChange: (state) => {
        console.log(`[CircuitBreaker] ${serviceName}: state changed to ${state}`);
        options?.onStateChange?.(state);
      }
    }));
  }
  return circuitBreakers.get(serviceName)!;
}

/**
 * Reset all circuit breakers
 */
export function resetAllCircuitBreakers(): void {
  circuitBreakers.forEach(breaker => breaker.reset());
}
