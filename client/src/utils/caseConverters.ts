/**
 * Convert camelCase string to snake_case
 * Handles acronyms (including trailing), normal camelCase, and already snake_case keys
 */
export function camelToSnake(str: string): string {
  // Return as-is if already snake_case (has underscore, no uppercase)
  if (str.includes('_') && str === str.toLowerCase()) {
    return str;
  }
  
  // Tokenize the string into segments
  const tokens = str.match(/[A-Z]{2,}(?=[A-Z][a-z]|\d|$)|[A-Z]?[a-z]+|[A-Z]|\d+/g);
  
  if (!tokens) {
    return str.toLowerCase();
  }
  
  // Join tokens with underscores and lowercase
  return tokens.map(token => token.toLowerCase()).join('_');
}

/**
 * Recursively convert all camelCase keys to snake_case in objects/arrays
 * Skips non-plain objects (Date, File, etc.)
 */
export function deepCamelToSnake(value: any): any {
  // Handle null/undefined
  if (value === null || value === undefined) {
    return value;
  }
  
  // Handle arrays
  if (Array.isArray(value)) {
    return value.map(item => deepCamelToSnake(item));
  }
  
  // Handle plain objects only (skip Date, File, etc.)
  if (typeof value === 'object' && value.constructor === Object) {
    const result: any = {};
    for (const [key, val] of Object.entries(value)) {
      result[camelToSnake(key)] = deepCamelToSnake(val);
    }
    return result;
  }
  
  // Return primitives as-is
  return value;
}
