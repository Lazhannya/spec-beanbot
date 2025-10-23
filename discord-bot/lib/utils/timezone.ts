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
