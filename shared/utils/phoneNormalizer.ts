/**
 * Normalize phone number to canonical format for duplicate detection
 * Strips all non-digit characters, preserves leading +
 * Optionally adds country code prefix for CZ/DE numbers
 * Returns null if phone is invalid/empty
 */
export function normalizePhone(phone: string | null | undefined, countryCode?: string): string | null {
  if (!phone || typeof phone !== 'string') return null;
  
  // Remove all spaces, dashes, and parentheses
  let cleaned = phone.trim().replace(/[\s\-\(\)]/g, '');
  
  // Handle Czech numbers
  if (countryCode === 'CZ' || countryCode === 'Czech Republic') {
    // Remove leading 00420 or 420 prefix if present
    if (cleaned.startsWith('00420')) {
      cleaned = cleaned.substring(5);
    } else if (cleaned.startsWith('+420')) {
      cleaned = cleaned.substring(4);
    } else if (cleaned.startsWith('420') && cleaned.length > 9) {
      cleaned = cleaned.substring(3);
    }
    // Add +420 prefix if it's a valid Czech number (9 digits)
    if (cleaned.length === 9 && /^\d+$/.test(cleaned)) {
      return '+420' + cleaned;
    }
    // If it's longer, might already have country code embedded differently
    if (cleaned.length > 9 && /^\d+$/.test(cleaned)) {
      // Check if it starts with 420
      if (cleaned.startsWith('420')) {
        return '+' + cleaned;
      }
      return '+420' + cleaned.slice(-9);
    }
  }
  
  // Handle German numbers
  if (countryCode === 'DE' || countryCode === 'Germany') {
    // Remove leading 0049 or 49 prefix if present
    if (cleaned.startsWith('0049')) {
      cleaned = cleaned.substring(4);
    } else if (cleaned.startsWith('+49')) {
      cleaned = cleaned.substring(3);
    } else if (cleaned.startsWith('49') && cleaned.length > 10) {
      cleaned = cleaned.substring(2);
    }
    // Add +49 prefix for German numbers
    if (!cleaned.startsWith('+')) {
      // Remove leading 0 if present (German local format)
      if (cleaned.startsWith('0')) {
        cleaned = cleaned.substring(1);
      }
      return '+49' + cleaned;
    }
  }
  
  // For other countries, just clean and return with + if starts with 00
  if (!cleaned.startsWith('+') && cleaned.length > 0) {
    if (cleaned.startsWith('00')) {
      return '+' + cleaned.substring(2);
    }
  }
  
  // Remove all non-digit characters except leading +
  const normalized = cleaned.replace(/[^\d+]/g, '');
  
  // Must have at least some digits
  if (!normalized || normalized.length < 5) return null;
  
  // Ensure only one + at the beginning
  const hasPlus = normalized.startsWith('+');
  const digitsOnly = normalized.replace(/\+/g, '');
  
  return hasPlus ? `+${digitsOnly}` : digitsOnly;
}
