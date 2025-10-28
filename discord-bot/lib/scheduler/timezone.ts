/**
 * Timezone utilities for accurate reminder scheduling and display
 * Uses built-in Intl.DateTimeFormat for zero-dependency timezone handling
 */

export interface TimezoneInfo {
  identifier: string;
  displayName: string;
  currentOffset: string;
  currentTime: Date;
}

export interface TimezoneConversion {
  originalDateTime: string;
  originalTimezone: string;
  convertedDateTime: string;
  convertedTimezone: string;
  utcDateTime: Date;
  isValid: boolean;
}

/**
 * Convert user input time to UTC for storage
 * @param dateTimeString - Time in datetime-local format (YYYY-MM-DDTHH:MM)
 * @param userTimezone - IANA timezone identifier (e.g., "Europe/Berlin")
 * @returns UTC Date object
 */
export function parseUserTimeToUTC(
  dateTimeString: string,
  userTimezone: string,
): Date {
  try {
    // Create a date as if it were in UTC
    const inputDate = new Date(dateTimeString + ":00.000Z");
    
    // Get the timezone offset for the user's timezone at this date
    const formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: userTimezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
    
    const userDateParts = formatter.formatToParts(inputDate);
    const userDateString = `${userDateParts.find(p => p.type === "year")!.value}-${
      userDateParts.find(p => p.type === "month")!.value
    }-${userDateParts.find(p => p.type === "day")!.value}T${
      userDateParts.find(p => p.type === "hour")!.value
    }:${userDateParts.find(p => p.type === "minute")!.value}:${
      userDateParts.find(p => p.type === "second")!.value
    }.000Z`;
    
    const userDateInTimezone = new Date(userDateString);
    
    // Calculate the offset between what the user intended and what we got
    const offsetMs = inputDate.getTime() - userDateInTimezone.getTime();
    
    // Apply the offset to get the correct UTC time
    return new Date(inputDate.getTime() + offsetMs);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to parse time "${dateTimeString}" in timezone "${userTimezone}": ${errorMessage}`);
  }
}

/**
 * Convert UTC time to user timezone for display
 * @param utcDate - UTC Date object
 * @param userTimezone - IANA timezone identifier
 * @param format - Output format type
 * @returns Formatted time string
 */
export function formatUTCForUser(
  utcDate: Date,
  userTimezone: string,
  format: 'datetime-local' | 'display' = 'display',
): string {
  try {
    if (format === 'datetime-local') {
      // Format for HTML datetime-local input
      const formatter = new Intl.DateTimeFormat("en-CA", {
        timeZone: userTimezone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });
      
      const parts = formatter.formatToParts(utcDate);
      return `${parts.find(p => p.type === "year")!.value}-${
        parts.find(p => p.type === "month")!.value
      }-${parts.find(p => p.type === "day")!.value}T${
        parts.find(p => p.type === "hour")!.value
      }:${parts.find(p => p.type === "minute")!.value}`;
    } else {
      // Format for human display
      return new Intl.DateTimeFormat("en-US", {
        timeZone: userTimezone,
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        timeZoneName: "short",
      }).format(utcDate);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to format UTC time for timezone "${userTimezone}": ${errorMessage}`);
  }
}

/**
 * Validate IANA timezone identifier
 * @param timezone - Timezone to validate
 * @returns True if valid timezone
 */
export function isValidTimezone(timezone: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: timezone });
    return true;
  } catch {
    return false;
  }
}

/**
 * Get current time in specified timezone
 * @param timezone - IANA timezone identifier
 * @returns Current date in timezone
 */
export function getCurrentTimeInTimezone(timezone: string): Date {
  const now = new Date();
  const utcTime = now.getTime() + (now.getTimezoneOffset() * 60000);
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  
  const parts = formatter.formatToParts(new Date(utcTime));
  const timeString = `${parts.find(p => p.type === "month")!.value}/${
    parts.find(p => p.type === "day")!.value
  }/${parts.find(p => p.type === "year")!.value} ${
    parts.find(p => p.type === "hour")!.value
  }:${parts.find(p => p.type === "minute")!.value}:${
    parts.find(p => p.type === "second")!.value
  }`;
  
  return new Date(timeString);
}

/**
 * Calculate delivery time with timezone awareness and validation
 * @param userInputTime - Time string from user
 * @param userTimezone - User's timezone
 * @returns Delivery time calculation result
 */
export function calculateDeliveryTime(
  userInputTime: string,
  userTimezone: string,
): {
  utcDeliveryTime: Date;
  userDisplayTime: string;
  isValidTime: boolean;
  errors?: string[];
} {
  const errors: string[] = [];
  let isValidTime = true;
  let utcDeliveryTime: Date;
  const userDisplayTime = userInputTime;

  try {
    // Validate timezone
    if (!isValidTimezone(userTimezone)) {
      errors.push(`Invalid timezone: ${userTimezone}`);
      isValidTime = false;
    }

    // Parse and convert time
    utcDeliveryTime = parseUserTimeToUTC(userInputTime, userTimezone);
    
    // Check if time is in the future
    if (utcDeliveryTime <= new Date()) {
      errors.push("Scheduled time must be in the future");
      isValidTime = false;
    }

    // Validate the time exists (check for DST issues)
    const roundTrip = formatUTCForUser(utcDeliveryTime, userTimezone, 'datetime-local');
    if (Math.abs(new Date(roundTrip).getTime() - new Date(userInputTime).getTime()) > 60000) {
      errors.push("This time may not exist due to daylight saving time transitions");
      isValidTime = false;
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    errors.push(errorMessage);
    isValidTime = false;
    utcDeliveryTime = new Date(); // Fallback
  }

  return {
    utcDeliveryTime,
    userDisplayTime,
    isValidTime,
    ...(errors.length > 0 && { errors }),
  };
}

/**
 * Get list of popular timezones with current information
 * @returns Array of timezone info objects
 */
export function getPopularTimezones(): TimezoneInfo[] {
  const popularTimezones = [
    "UTC",
    "America/New_York",
    "America/Los_Angeles", 
    "America/Chicago",
    "Europe/London",
    "Europe/Berlin",
    "Europe/Paris",
    "Asia/Tokyo",
    "Asia/Shanghai",
    "Australia/Sydney",
  ];

  return popularTimezones.map(tz => {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      timeZoneName: "short",
    });
    
    const parts = formatter.formatToParts(now);
    const offset = parts.find(p => p.type === "timeZoneName")?.value || "";
    
    return {
      identifier: tz,
      displayName: tz.replace(/_/g, " "),
      currentOffset: offset,
      currentTime: getCurrentTimeInTimezone(tz),
    };
  });
}