import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { format } from "date-fns"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Safely format a date string, handling null/undefined/invalid values
 * and preventing timezone issues by normalizing to noon local time
 */
export function safeFormatDate(
  dateValue: string | Date | null | undefined,
  formatStr: string,
  fallback: string = 'N/A'
): string {
  if (!dateValue) return fallback;
  
  try {
    let dateStr = String(dateValue);
    
    // If it's a date-only string (YYYY-MM-DD), add time to prevent timezone shift
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      dateStr = dateStr + 'T12:00:00';
    } else if (dateStr.includes('T') || dateStr.includes(' ')) {
      // If it has a time component, extract the date part and normalize
      dateStr = dateStr.split('T')[0].split(' ')[0] + 'T12:00:00';
    }
    
    const date = new Date(dateStr);
    
    // Check if the date is valid
    if (isNaN(date.getTime())) {
      return fallback;
    }
    
    return format(date, formatStr);
  } catch (error) {
    console.error('Date formatting error:', error, 'Value:', dateValue);
    return fallback;
  }
}

export function formatCurrency(amount: number | string, currency: string = 'USD'): string {
  const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  
  if (isNaN(numericAmount)) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD'
    }).format(0);
  }
  
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency || 'USD'
  }).format(numericAmount);
}
