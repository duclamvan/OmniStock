/**
 * Normalize phone number to canonical format for duplicate detection
 * Strips all non-digit characters, preserves leading +
 * Returns null if phone is invalid/empty
 */
export function normalizePhone(phone: string | null | undefined): string | null {
  if (!phone || typeof phone !== 'string') return null;
  
  // Remove all non-digit characters except leading +
  const normalized = phone.trim().replace(/[^\d+]/g, '');
  
  // Must have at least some digits
  if (!normalized || normalized.length < 5) return null;
  
  // Ensure only one + at the beginning
  const hasPlus = normalized.startsWith('+');
  const digitsOnly = normalized.replace(/\+/g, '');
  
  return hasPlus ? `+${digitsOnly}` : digitsOnly;
}
