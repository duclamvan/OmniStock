import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { format, formatDistanceToNow, isToday, isYesterday, isThisWeek, parseISO } from "date-fns"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Formats a date string into a "smarter" relative time display.
 * - x minutes/hours ago (for very recent)
 * - "Today at HH:mm"
 * - "Yesterday at HH:mm"
 * - "Monday at HH:mm" (if within the last week)
 * - "MMM d, yyyy" (for older dates)
 */
export function formatRelativeTime(dateInput: string | Date | null | undefined): string {
  if (!dateInput) return "";
  
  const date = typeof dateInput === 'string' ? parseISO(dateInput) : dateInput;
  if (isNaN(date.getTime())) return "";

  const now = new Date();
  const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

  // Within the last hour: "x minutes ago"
  if (diffInMinutes < 60 && diffInMinutes >= 0) {
    if (diffInMinutes < 1) return "just now";
    return formatDistanceToNow(date, { addSuffix: true });
  }

  if (isToday(date)) {
    return `Today at ${format(date, 'HH:mm')}`;
  }

  if (isYesterday(date)) {
    return `Yesterday at ${format(date, 'HH:mm')}`;
  }

  if (isThisWeek(date)) {
    return format(date, 'EEEE @ HH:mm');
  }

  return format(date, 'MMM d, yyyy');
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
