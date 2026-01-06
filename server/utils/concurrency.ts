/**
 * Concurrency control utility
 * Prevents overwhelming the database with too many parallel operations
 */

/**
 * Simple promise-based concurrency limiter (p-limit pattern)
 */
export function createConcurrencyLimiter(concurrency: number) {
  const queue: Array<{
    fn: () => Promise<any>;
    resolve: (value: any) => void;
    reject: (error: any) => void;
  }> = [];
  let activeCount = 0;

  const next = async () => {
    if (activeCount >= concurrency || queue.length === 0) {
      return;
    }

    activeCount++;
    const { fn, resolve, reject } = queue.shift()!;

    try {
      const result = await fn();
      resolve(result);
    } catch (error) {
      reject(error);
    } finally {
      activeCount--;
      next();
    }
  };

  const limit = <T>(fn: () => Promise<T>): Promise<T> => {
    return new Promise<T>((resolve, reject) => {
      queue.push({ fn, resolve, reject });
      next();
    });
  };

  return {
    limit,
    get activeCount() { return activeCount; },
    get pendingCount() { return queue.length; },
  };
}

/**
 * Process items in batches with concurrency control
 * 
 * @example
 * const results = await processBatch(
 *   items,
 *   async (item) => await saveToDatabase(item),
 *   { concurrency: 5, onProgress: (done, total) => console.log(`${done}/${total}`) }
 * );
 */
export interface BatchOptions<T, R> {
  concurrency?: number;
  onProgress?: (completed: number, total: number, item: T) => void;
  onError?: (error: Error, item: T, index: number) => 'continue' | 'stop';
  abortSignal?: AbortSignal;
}

export interface BatchResult<R> {
  success: boolean;
  result?: R;
  error?: Error;
  index: number;
}

export async function processBatch<T, R>(
  items: T[],
  processor: (item: T, index: number) => Promise<R>,
  options: BatchOptions<T, R> = {}
): Promise<BatchResult<R>[]> {
  const { 
    concurrency = 5, 
    onProgress, 
    onError,
    abortSignal 
  } = options;

  const limiter = createConcurrencyLimiter(concurrency);
  const results: BatchResult<R>[] = [];
  let completed = 0;
  let shouldStop = false;

  const processItem = async (item: T, index: number): Promise<BatchResult<R>> => {
    if (shouldStop || abortSignal?.aborted) {
      return { success: false, error: new Error('Operation aborted'), index };
    }

    try {
      const result = await processor(item, index);
      completed++;
      
      if (onProgress) {
        onProgress(completed, items.length, item);
      }
      
      return { success: true, result, index };
    } catch (error: any) {
      completed++;
      
      if (onError) {
        const action = onError(error, item, index);
        if (action === 'stop') {
          shouldStop = true;
        }
      }
      
      if (onProgress) {
        onProgress(completed, items.length, item);
      }
      
      return { success: false, error, index };
    }
  };

  // Queue all items with concurrency control
  const promises = items.map((item, index) => 
    limiter.limit(() => processItem(item, index))
  );

  // Wait for all to complete
  const rawResults = await Promise.all(promises);
  
  // Sort by original index
  return rawResults.sort((a, b) => a.index - b.index);
}

/**
 * Chunk an array into smaller arrays
 */
export function chunk<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

/**
 * Process items in sequential chunks
 * Useful when you want batch commits to the database
 */
export async function processInChunks<T, R>(
  items: T[],
  chunkSize: number,
  processor: (chunk: T[], chunkIndex: number) => Promise<R[]>,
  options: { onChunkComplete?: (chunkIndex: number, totalChunks: number) => void } = {}
): Promise<R[]> {
  const chunks = chunk(items, chunkSize);
  const results: R[] = [];

  for (let i = 0; i < chunks.length; i++) {
    const chunkResults = await processor(chunks[i], i);
    results.push(...chunkResults);
    
    if (options.onChunkComplete) {
      options.onChunkComplete(i + 1, chunks.length);
    }
  }

  return results;
}
