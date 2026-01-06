/**
 * Data validation utilities
 * Prevents invalid data from being stored in the database
 */

/**
 * Detect if a string is Base64 encoded image data
 */
export function isBase64Image(str: string | null | undefined): boolean {
  if (!str || typeof str !== 'string') return false;
  
  // Check for data URL format
  if (str.startsWith('data:image/')) return true;
  
  // Check for raw Base64 image (common patterns)
  // Base64 images are typically very long (>1000 chars) and contain only valid Base64 chars
  if (str.length > 1000) {
    // Check if it looks like Base64 (only valid Base64 characters)
    const base64Regex = /^[A-Za-z0-9+/=]+$/;
    if (base64Regex.test(str)) {
      // Additional check: try to detect image magic bytes in decoded content
      try {
        const decoded = Buffer.from(str.slice(0, 100), 'base64').toString('hex');
        // PNG: 89504e47, JPEG: ffd8ff, GIF: 47494638, WebP: 52494646
        if (decoded.startsWith('89504e47') || 
            decoded.startsWith('ffd8ff') || 
            decoded.startsWith('47494638') ||
            decoded.startsWith('52494646')) {
          return true;
        }
      } catch {
        // If decoding fails, check length heuristic
        // Base64 images are usually very long
        if (str.length > 5000) return true;
      }
    }
  }
  
  return false;
}

/**
 * Validate image URL - reject Base64, accept valid URLs
 */
export function validateImageUrl(imageUrl: string | null | undefined): { 
  valid: boolean; 
  url: string | null;
  error?: string;
} {
  if (!imageUrl || imageUrl.trim() === '') {
    return { valid: true, url: null };
  }

  // Reject Base64 images
  if (isBase64Image(imageUrl)) {
    return { 
      valid: false, 
      url: null, 
      error: 'Base64 images are not allowed. Please provide a URL to an uploaded image.' 
    };
  }

  // Validate URL format
  try {
    const url = new URL(imageUrl);
    if (!['http:', 'https:'].includes(url.protocol)) {
      return { 
        valid: false, 
        url: null, 
        error: 'Image URL must use http or https protocol' 
      };
    }
    return { valid: true, url: imageUrl };
  } catch {
    // Not a valid URL - might be a relative path
    if (imageUrl.startsWith('/') || imageUrl.startsWith('./')) {
      return { valid: true, url: imageUrl };
    }
    return { 
      valid: false, 
      url: null, 
      error: 'Invalid image URL format' 
    };
  }
}

/**
 * Sanitize bulk import data
 */
export interface SanitizeResult<T> {
  valid: T[];
  invalid: Array<{ item: any; errors: string[] }>;
}

export function sanitizeBulkImportData<T extends Record<string, any>>(
  items: T[],
  imageFields: string[] = ['imageUrl', 'image', 'thumbnailUrl']
): SanitizeResult<T> {
  const valid: T[] = [];
  const invalid: Array<{ item: any; errors: string[] }> = [];

  for (const item of items) {
    const errors: string[] = [];
    const sanitizedItem = { ...item };

    // Check all image fields
    for (const field of imageFields) {
      if (field in sanitizedItem) {
        const validation = validateImageUrl(sanitizedItem[field]);
        if (!validation.valid) {
          errors.push(`${field}: ${validation.error}`);
          // Set to null instead of keeping Base64
          sanitizedItem[field] = null;
        }
      }
    }

    // Check for suspiciously large string fields (potential Base64 in wrong fields)
    for (const [key, value] of Object.entries(sanitizedItem)) {
      if (typeof value === 'string' && value.length > 10000 && !imageFields.includes(key)) {
        // This might be a Base64 image in the wrong field
        if (isBase64Image(value)) {
          errors.push(`${key}: Contains Base64 image data which is not allowed`);
          sanitizedItem[key] = null;
        }
      }
    }

    if (errors.length > 0) {
      invalid.push({ item: sanitizedItem, errors });
    }
    
    valid.push(sanitizedItem);
  }

  return { valid, invalid };
}

/**
 * Truncate strings to prevent database field overflow
 */
export function truncateString(str: string | null | undefined, maxLength: number): string | null {
  if (!str) return null;
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - 3) + '...';
}

/**
 * Validate and clean numeric values
 */
export function parseNumericValue(
  value: any, 
  options: { min?: number; max?: number; default?: number } = {}
): number | null {
  if (value === null || value === undefined || value === '') {
    return options.default ?? null;
  }

  const parsed = typeof value === 'number' ? value : parseFloat(String(value));
  
  if (isNaN(parsed)) {
    return options.default ?? null;
  }

  if (options.min !== undefined && parsed < options.min) {
    return options.min;
  }

  if (options.max !== undefined && parsed > options.max) {
    return options.max;
  }

  return parsed;
}
