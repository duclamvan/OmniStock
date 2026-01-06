/**
 * Safe bulk import utilities
 * Wraps bulk operations with concurrency control, retry logic, and validation
 */

import { processBatch, type BatchResult } from './concurrency';
import { withRetry } from './retry';
import { sanitizeBulkImportData, validateImageUrl } from './validation';

export interface SafeImportOptions {
  concurrency?: number;           // Max parallel operations (default: 5)
  maxRetries?: number;            // Max retries per item (default: 3)
  continueOnError?: boolean;      // Continue processing on individual item errors (default: true)
  onProgress?: (completed: number, total: number) => void;
}

export interface ImportResult<T> {
  success: boolean;
  imported: T[];
  errors: string[];
  stats: {
    total: number;
    created: number;
    updated: number;
    failed: number;
    durationMs: number;
  };
}

/**
 * Process bulk import with safety measures:
 * - Concurrency limiting (default: 5 parallel operations)
 * - Retry with exponential backoff
 * - Base64 image detection and rejection
 * - Progress tracking
 */
export async function safeBulkImport<T, R>(
  items: T[],
  processor: (item: T, index: number) => Promise<R>,
  options: SafeImportOptions = {}
): Promise<BatchResult<R>[]> {
  const {
    concurrency = 5,
    maxRetries = 3,
    continueOnError = true,
    onProgress
  } = options;

  // Wrap each item processor with retry logic
  const retryableProcessor = async (item: T, index: number): Promise<R> => {
    return withRetry(
      () => processor(item, index),
      {
        maxRetries,
        initialDelayMs: 500,
        maxDelayMs: 5000,
        onRetry: (error, attempt) => {
          console.warn(`[BulkImport] Retry ${attempt}/${maxRetries} for item ${index}: ${error.message}`);
        }
      }
    );
  };

  // Process with concurrency control
  return processBatch(items, retryableProcessor, {
    concurrency,
    onProgress,
    onError: (error, item, index) => {
      console.error(`[BulkImport] Failed to process item ${index}:`, error.message);
      return continueOnError ? 'continue' : 'stop';
    }
  });
}

/**
 * Validate and sanitize product import data
 */
export function validateProductImport(items: any[]): {
  valid: any[];
  errors: string[];
} {
  const errors: string[] = [];
  const valid: any[] = [];

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const itemErrors: string[] = [];

    // Required fields
    if (!item.name || !item.sku) {
      itemErrors.push('Missing required fields: name and sku');
    }

    // Validate image URL
    if (item.imageUrl) {
      const imageValidation = validateImageUrl(item.imageUrl);
      if (!imageValidation.valid) {
        itemErrors.push(`imageUrl: ${imageValidation.error}`);
        item.imageUrl = null; // Clear invalid image
      }
    }

    // Check for Base64 in any field
    for (const [key, value] of Object.entries(item)) {
      if (typeof value === 'string' && value.length > 10000 && value.startsWith('data:')) {
        itemErrors.push(`${key}: Base64 data not allowed. Upload image to storage first.`);
        item[key] = null;
      }
    }

    if (itemErrors.length > 0) {
      errors.push(`Item ${i + 1} (${item.name || item.sku || 'unknown'}): ${itemErrors.join(', ')}`);
    }

    valid.push(item);
  }

  return { valid, errors };
}

/**
 * Validate and sanitize customer import data
 */
export function validateCustomerImport(items: any[]): {
  valid: any[];
  errors: string[];
} {
  const errors: string[] = [];
  const valid: any[] = [];

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const itemErrors: string[] = [];

    // Required fields
    if (!item.name) {
      itemErrors.push('Missing required field: name');
    }

    // Validate image URL if present
    if (item.imageUrl) {
      const imageValidation = validateImageUrl(item.imageUrl);
      if (!imageValidation.valid) {
        itemErrors.push(`imageUrl: ${imageValidation.error}`);
        item.imageUrl = null;
      }
    }

    if (itemErrors.length > 0) {
      errors.push(`Item ${i + 1} (${item.name || 'unknown'}): ${itemErrors.join(', ')}`);
    }

    valid.push(item);
  }

  return { valid, errors };
}

/**
 * Validate and sanitize supplier import data
 */
export function validateSupplierImport(items: any[]): {
  valid: any[];
  errors: string[];
} {
  const errors: string[] = [];
  const valid: any[] = [];

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const itemErrors: string[] = [];

    // Required fields
    if (!item.name) {
      itemErrors.push('Missing required field: name');
    }

    if (itemErrors.length > 0) {
      errors.push(`Item ${i + 1} (${item.name || 'unknown'}): ${itemErrors.join(', ')}`);
    }

    valid.push(item);
  }

  return { valid, errors };
}

/**
 * Format import results for API response
 */
export function formatImportResponse<T>(
  results: BatchResult<T>[],
  validationErrors: string[] = [],
  startTime: number
): ImportResult<T> {
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);

  const created = successful.filter(r => (r.result as any)?.action === 'created');
  const updated = successful.filter(r => (r.result as any)?.action === 'updated');

  const allErrors = [
    ...validationErrors,
    ...failed.map(r => `Item ${r.index + 1}: ${r.error?.message || 'Unknown error'}`)
  ];

  return {
    success: failed.length === 0,
    imported: successful.map(r => r.result!),
    errors: allErrors,
    stats: {
      total: results.length,
      created: created.length,
      updated: updated.length,
      failed: failed.length,
      durationMs: Date.now() - startTime
    }
  };
}
