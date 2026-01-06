/**
 * Retry utility with exponential backoff
 * Implements "safety valve" pattern to prevent infinite retry loops
 */

export interface RetryOptions {
  maxRetries?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  backoffMultiplier?: number;
  retryableErrors?: string[];
  onRetry?: (error: Error, attempt: number) => void;
}

const DEFAULT_OPTIONS: Required<Omit<RetryOptions, 'retryableErrors' | 'onRetry'>> = {
  maxRetries: 3,
  initialDelayMs: 1000,
  maxDelayMs: 10000,
  backoffMultiplier: 2,
};

/**
 * Sleep for a given number of milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Calculate delay with exponential backoff and jitter
 */
function calculateDelay(attempt: number, options: Required<Omit<RetryOptions, 'retryableErrors' | 'onRetry'>>): number {
  const exponentialDelay = options.initialDelayMs * Math.pow(options.backoffMultiplier, attempt - 1);
  const jitter = Math.random() * 0.3 * exponentialDelay; // Add up to 30% jitter
  return Math.min(exponentialDelay + jitter, options.maxDelayMs);
}

/**
 * Check if an error is retryable
 */
function isRetryableError(error: any, retryableErrors?: string[]): boolean {
  // Always retry on connection/network errors
  const defaultRetryable = [
    'ECONNRESET',
    'ECONNREFUSED',
    'ETIMEDOUT',
    'EPIPE',
    'ENOTFOUND',
    'ENETUNREACH',
    'EAI_AGAIN',
    'socket hang up',
    'connection reset',
    'too many connections',
    'Connection terminated',
    'timeout exceeded',
    'SQLITE_BUSY',
    '429', // Rate limit
    '503', // Service unavailable
    '502', // Bad gateway
    '504', // Gateway timeout
  ];

  const allRetryable = [...defaultRetryable, ...(retryableErrors || [])];
  
  const errorMessage = error?.message || error?.code || String(error);
  const statusCode = error?.response?.status || error?.status || error?.statusCode;
  
  return allRetryable.some(pattern => 
    errorMessage.toLowerCase().includes(pattern.toLowerCase()) ||
    String(statusCode) === pattern
  );
}

/**
 * Execute a function with automatic retry and exponential backoff
 * 
 * @example
 * const result = await withRetry(
 *   () => fetchFromDatabase(),
 *   { maxRetries: 3, initialDelayMs: 1000 }
 * );
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let lastError: Error;

  for (let attempt = 1; attempt <= opts.maxRetries + 1; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;

      // If we've exhausted all retries, throw
      if (attempt > opts.maxRetries) {
        throw new Error(`Failed after ${opts.maxRetries} retries: ${error.message}`);
      }

      // Check if error is retryable
      if (!isRetryableError(error, options.retryableErrors)) {
        throw error; // Non-retryable error, fail immediately
      }

      // Calculate delay and wait
      const delay = calculateDelay(attempt, opts);
      
      // Call onRetry callback if provided
      if (options.onRetry) {
        options.onRetry(error, attempt);
      } else {
        console.warn(`Retry attempt ${attempt}/${opts.maxRetries} after ${Math.round(delay)}ms: ${error.message}`);
      }

      await sleep(delay);
    }
  }

  throw lastError!;
}

/**
 * Create a retryable version of an async function
 */
export function createRetryable<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  options: RetryOptions = {}
): T {
  return ((...args: Parameters<T>) => withRetry(() => fn(...args), options)) as T;
}

/**
 * Batch retry - retry multiple operations with shared backoff
 * Useful for bulk operations where we want to pause all operations on error
 */
export async function withBatchRetry<T>(
  operations: Array<() => Promise<T>>,
  options: RetryOptions & { continueOnError?: boolean } = {}
): Promise<Array<{ success: boolean; result?: T; error?: Error }>> {
  const results: Array<{ success: boolean; result?: T; error?: Error }> = [];
  
  for (const operation of operations) {
    try {
      const result = await withRetry(operation, options);
      results.push({ success: true, result });
    } catch (error: any) {
      if (options.continueOnError) {
        results.push({ success: false, error });
      } else {
        throw error;
      }
    }
  }
  
  return results;
}
