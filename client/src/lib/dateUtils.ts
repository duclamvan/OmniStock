import { format, isToday } from "date-fns";

/**
 * Formats a date to Czech format (DD.MM.YYYY) or "Today" if the date is today
 * @param date - The date to format (Date object, ISO string, or null)
 * @returns Formatted date string or "Today" or "—" for null/undefined
 */
export function formatCzechDate(date: Date | string | null | undefined): string {
  if (!date) return '—';
  
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    
    if (isToday(dateObj)) {
      return 'Today';
    }
    
    return format(dateObj, 'dd.MM.yyyy');
  } catch {
    return '—';
  }
}
