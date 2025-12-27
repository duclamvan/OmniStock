import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Parse a decimal string that may use either '.' or ',' as the decimal separator.
 * Converts the input to a number, handling both European (,) and US (.) decimal formats.
 * @param value - The string value to parse
 * @returns The parsed number, or 0 if parsing fails
 */
export function parseDecimal(value: string): number {
  if (!value || value === '') return 0;
  // Replace comma with dot for consistent parsing
  const normalized = value.replace(',', '.');
  const parsed = parseFloat(normalized);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Handle keydown events for decimal inputs to allow both '.' and ',' as decimal separators.
 * When user types ',', it's converted to '.' in the input value.
 * @param e - The keyboard event
 */
export function handleDecimalKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
  if (e.key === ',') {
    e.preventDefault();
    const input = e.currentTarget;
    const value = input.value;
    
    // Only add decimal point if there isn't one already
    if (!value.includes('.')) {
      try {
        const start = input.selectionStart || 0;
        const end = input.selectionEnd || 0;
        const newValue = value.slice(0, start) + '.' + value.slice(end);
        input.value = newValue;
        input.setSelectionRange(start + 1, start + 1);
      } catch {
        // For number inputs that don't support selection, append at end
        input.value = value + '.';
      }
      // Trigger change event
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }
}
