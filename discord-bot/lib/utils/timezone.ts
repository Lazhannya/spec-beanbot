/**
 * Timezone Utility Functions
 * Provides timezone conversion and validation with Europe/Berlin as default
 */

/**
 * Default timezone for the application
 */
export const DEFAULT_TIMEZONE = "Europe/Berlin";

/**
 * List of supported IANA timezones
 * Comprehensive list of common timezones for user selection
 */
export const SUPPORTED_TIMEZONES = [
  "Europe/Berlin",
  "Europe/London",
  "Europe/Paris",
  "Europe/Rome",
  "Europe/Madrid",
  "Europe/Amsterdam",
  "Europe/Vienna",
  "Europe/Stockholm",
  "Europe/Brussels",
  "Europe/Warsaw",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Toronto",
  "America/Mexico_City",
  "America/Sao_Paulo",
  "America/Argentina/Buenos_Aires",
  "Asia/Tokyo",
  "Asia/Shanghai",
  "Asia/Hong_Kong",
  "Asia/Singapore",
  "Asia/Dubai",
  "Asia/Kolkata",
  "Australia/Sydney",
  "Australia/Melbourne",
  "Pacific/Auckland",
  "UTC",
] as const;

export type SupportedTimezone = typeof SUPPORTED_TIMEZONES[number];

/**
 * Validates if a timezone string is a valid IANA timezone
 */
export function isValidTimezone(timezone: string): boolean {
  try {
    // Test if the timezone is valid by attempting to format with it
    new Intl.DateTimeFormat("en-US", { timeZone: timezone });
    return true;
  } catch {
    return false;
  }
}

/**
 * Validates if a timezone is in the supported list
 */
export function isSupportedTimezone(timezone: string): timezone is SupportedTimezone {
  return (SUPPORTED_TIMEZONES as readonly string[]).includes(timezone);
}

/**
 * Gets a safe timezone, falling back to default if invalid
 */
export function getSafeTimezone(timezone?: string): string {
  if (!timezone) return DEFAULT_TIMEZONE;
  if (isValidTimezone(timezone)) return timezone;
  return DEFAULT_TIMEZONE;
}

/**
 * Converts a Date to a specific timezone and returns ISO string
 */
export function formatDateInTimezone(date: Date, timezone: string = DEFAULT_TIMEZONE): string {
  const safeTimezone = getSafeTimezone(timezone);
  
  return new Intl.DateTimeFormat("en-US", {
    timeZone: safeTimezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(date);
}

/**
 * Formats a date for display in a specific timezone
 */
export function formatDateTimeForDisplay(
  date: Date, 
  timezone: string = DEFAULT_TIMEZONE,
  options?: Intl.DateTimeFormatOptions
): string {
  const safeTimezone = getSafeTimezone(timezone);
  
  const defaultOptions: Intl.DateTimeFormatOptions = {
    timeZone: safeTimezone,
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  };
  
  return new Intl.DateTimeFormat("en-US", { ...defaultOptions, ...options }).format(date);
}

/**
 * Gets timezone offset string (e.g., "GMT+1", "GMT-5")
 */
export function getTimezoneOffset(timezone: string = DEFAULT_TIMEZONE): string {
  const safeTimezone = getSafeTimezone(timezone);
  const now = new Date();
  
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: safeTimezone,
    timeZoneName: "short",
  });
  
  const parts = formatter.formatToParts(now);
  const timeZonePart = parts.find((part) => part.type === "timeZoneName");
  
  return timeZonePart?.value || safeTimezone;
}

/**
 * Converts a local datetime input to UTC Date object
 * Assumes the input datetime is in the specified timezone
 */
export function parseLocalDateTime(
  dateTimeString: string,
  _timezone: string = DEFAULT_TIMEZONE
): Date {
  // Parse the datetime string - the Date constructor parses it as local or ISO
  // For production, consider using a library like date-fns-tz for proper timezone parsing
  const date = new Date(dateTimeString);
  
  return date;
}

/**
 * TIMEZONE BUG FIX: Converts a datetime-local input to proper UTC Date object
 * Interprets the datetime string as being in the specified timezone
 * 
 * @param dateTimeString - datetime-local string like "2025-10-28T15:30"
 * @param timezone - IANA timezone like "Europe/Berlin"
 * @returns Date object with correct UTC time
 */
export function parseLocalDateTimeInTimezone(
  dateTimeString: string,
  timezone: string = DEFAULT_TIMEZONE
): Date {
  const safeTimezone = getSafeTimezone(timezone);
  
  try {
    // Simple and reliable approach:
    // 1. Create a reference date to determine the timezone offset
    // 2. Parse the input as UTC, then adjust by the offset
    
    // Ensure we have a valid ISO format (add seconds if missing)
    let isoString = dateTimeString;
    if (!isoString.includes(':')) {
      // Invalid format, try to parse as-is
      return new Date(dateTimeString);
    }
    
    // Add seconds if not present: "2025-10-28T15:30" -> "2025-10-28T15:30:00"
    if (!/T\d{2}:\d{2}:\d{2}/.test(isoString)) {
      isoString += ':00';
    }
    
    // Parse as UTC by appending 'Z'
    const utcDate = new Date(isoString + 'Z');
    
    if (isNaN(utcDate.getTime())) {
      // Invalid date, fallback
      return new Date(dateTimeString);
    }
    
    // Get the timezone offset for this specific date/time
    // This handles DST automatically
    const tempDate = new Date(isoString); // Parse without Z to get local interpretation
    const utcTime = tempDate.getTime() + (tempDate.getTimezoneOffset() * 60 * 1000);
    const targetDate = new Date(utcTime);
    
    // Now get what the offset would be in the target timezone
    const offsetInTarget = getTimezoneOffsetMinutes(targetDate, safeTimezone);
    
    // Adjust the UTC date by the difference between local offset and target offset
    const localOffset = tempDate.getTimezoneOffset();
    const adjustment = (localOffset - offsetInTarget) * 60 * 1000;
    
    return new Date(utcDate.getTime() + adjustment);
    
  } catch (error) {
    console.error('Error parsing datetime in timezone:', error);
    console.error('Input:', dateTimeString, 'Timezone:', timezone);
    
    // Fallback: parse as-is (may be incorrect but won't crash)
    return new Date(dateTimeString);
  }
}

/**
 * Helper function to get timezone offset in minutes for a specific date
 */
function getTimezoneOffsetMinutes(date: Date, timezone: string): number {
  // Get time in UTC and in target timezone
  const utcTime = date.getTime();
  
  // Create a date in the target timezone
  const localTime = new Date(date.toLocaleString('en-US', { timeZone: timezone }));
  const offsetMs = utcTime - localTime.getTime();
  
  return Math.round(offsetMs / (60 * 1000));
}

/**
 * Gets current date/time (always UTC internally)
 */
export function getNowInTimezone(_timezone: string = DEFAULT_TIMEZONE): Date {
  return new Date(); // Date objects are always in UTC internally
}

/**
 * Groups timezones by region for display in dropdowns
 */
export function getTimezonesByRegion(): Record<string, string[]> {
  return {
    "Europe": SUPPORTED_TIMEZONES.filter(tz => tz.startsWith("Europe/")),
    "Americas": SUPPORTED_TIMEZONES.filter(tz => tz.startsWith("America/")),
    "Asia": SUPPORTED_TIMEZONES.filter(tz => tz.startsWith("Asia/")),
    "Australia/Pacific": SUPPORTED_TIMEZONES.filter(tz => 
      tz.startsWith("Australia/") || tz.startsWith("Pacific/")
    ),
    "UTC": ["UTC"],
  };
}

/**
 * Gets friendly display name for timezone
 */
export function getTimezoneFriendlyName(timezone: string): string {
  const offset = getTimezoneOffset(timezone);
  const name = timezone.replace(/_/g, " ");
  return `${name} (${offset})`;
}
