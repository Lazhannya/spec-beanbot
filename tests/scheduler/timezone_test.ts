/**
 * Test suite for timezone utilities
 * Validates timezone conversions, parsing, and display formatting
 */

import { assertEquals, assertThrows } from "$std/assert/mod.ts";
import {
  parseUserTimeToUTC,
  formatUTCForUser,
  isValidTimezone,
  getCurrentTimeInTimezone,
  calculateDeliveryTime,
  getPopularTimezones,
} from "../../discord-bot/lib/scheduler/timezone.ts";

Deno.test("Timezone utilities - parseUserTimeToUTC", async (t) => {
  await t.step("should parse valid datetime-local format", () => {
    const result = parseUserTimeToUTC("2024-01-15T10:30", "Europe/Berlin");
    // Berlin is UTC+1 in January (standard time)
    assertEquals(result.getUTCHours(), 9);
    assertEquals(result.getUTCMinutes(), 30);
  });

  await t.step("should handle DST transitions correctly", () => {
    // Summer time in Berlin (UTC+2)
    const summerResult = parseUserTimeToUTC("2024-07-15T10:30", "Europe/Berlin");
    assertEquals(summerResult.getUTCHours(), 8);
    
    // Winter time in Berlin (UTC+1)
    const winterResult = parseUserTimeToUTC("2024-01-15T10:30", "Europe/Berlin");
    assertEquals(winterResult.getUTCHours(), 9);
  });

  await t.step("should throw error for invalid datetime format", () => {
    assertThrows(
      () => parseUserTimeToUTC("invalid-date", "Europe/Berlin"),
      Error,
      "Failed to parse time"
    );
  });

  await t.step("should throw error for invalid timezone", () => {
    assertThrows(
      () => parseUserTimeToUTC("2024-01-15T10:30", "Invalid/Timezone"),
      Error,
      "Failed to parse time"
    );
  });
});

Deno.test("Timezone utilities - formatUTCForUser", async (t) => {
  await t.step("should format for datetime-local input", () => {
    const utcDate = new Date("2024-01-15T09:30:00.000Z");
    const result = formatUTCForUser(utcDate, "Europe/Berlin", "datetime-local");
    assertEquals(result, "2024-01-15T10:30");
  });

  await t.step("should format for display", () => {
    const utcDate = new Date("2024-01-15T09:30:00.000Z");
    const result = formatUTCForUser(utcDate, "Europe/Berlin", "display");
    assertEquals(result.includes("Jan 15, 2024"), true);
    assertEquals(result.includes("10:30"), true);
  });

  await t.step("should handle different timezones", () => {
    const utcDate = new Date("2024-01-15T12:00:00.000Z");
    
    const berlinResult = formatUTCForUser(utcDate, "Europe/Berlin", "datetime-local");
    assertEquals(berlinResult, "2024-01-15T13:00");
    
    const nyResult = formatUTCForUser(utcDate, "America/New_York", "datetime-local");
    assertEquals(nyResult, "2024-01-15T07:00");
  });

  await t.step("should throw error for invalid timezone", () => {
    const utcDate = new Date("2024-01-15T09:30:00.000Z");
    assertThrows(
      () => formatUTCForUser(utcDate, "Invalid/Timezone"),
      Error,
      "Failed to format UTC time"
    );
  });
});

Deno.test("Timezone utilities - isValidTimezone", async (t) => {
  await t.step("should validate correct IANA timezone identifiers", () => {
    assertEquals(isValidTimezone("Europe/Berlin"), true);
    assertEquals(isValidTimezone("America/New_York"), true);
    assertEquals(isValidTimezone("Asia/Tokyo"), true);
    assertEquals(isValidTimezone("UTC"), true);
  });

  await t.step("should reject invalid timezone identifiers", () => {
    assertEquals(isValidTimezone("Invalid/Timezone"), false);
    assertEquals(isValidTimezone("EST"), false);
    assertEquals(isValidTimezone(""), false);
    assertEquals(isValidTimezone("Europe/NonExistent"), false);
  });
});

Deno.test("Timezone utilities - getCurrentTimeInTimezone", async (t) => {
  await t.step("should return current time in specified timezone", () => {
    const berlinTime = getCurrentTimeInTimezone("Europe/Berlin");
    const utcTime = getCurrentTimeInTimezone("UTC");
    
    // Times should be within a few seconds of each other
    const timeDiff = Math.abs(berlinTime.getTime() - utcTime.getTime());
    assertEquals(timeDiff < 5000, true, "Times should be within 5 seconds");
  });

  await t.step("should handle different timezones", () => {
    const tokyoTime = getCurrentTimeInTimezone("Asia/Tokyo");
    const nyTime = getCurrentTimeInTimezone("America/New_York");
    
    // Both should be valid dates
    assertEquals(tokyoTime instanceof Date, true);
    assertEquals(nyTime instanceof Date, true);
    assertEquals(isNaN(tokyoTime.getTime()), false);
    assertEquals(isNaN(nyTime.getTime()), false);
  });
});

Deno.test("Timezone utilities - calculateDeliveryTime", async (t) => {
  await t.step("should calculate valid delivery time", () => {
    // Create a future date
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().slice(0, 16); // YYYY-MM-DDTHH:MM
    
    const result = calculateDeliveryTime(tomorrowStr, "Europe/Berlin");
    
    assertEquals(result.isValidTime, true);
    assertEquals(result.utcDeliveryTime instanceof Date, true);
    assertEquals(result.userDisplayTime, tomorrowStr);
    assertEquals(result.errors?.length, undefined);
  });

  await t.step("should detect past time", () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().slice(0, 16);
    
    const result = calculateDeliveryTime(yesterdayStr, "Europe/Berlin");
    
    assertEquals(result.isValidTime, false);
    assertEquals(result.errors?.includes("Scheduled time must be in the future"), true);
  });

  await t.step("should detect invalid timezone", () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().slice(0, 16);
    
    const result = calculateDeliveryTime(tomorrowStr, "Invalid/Timezone");
    
    assertEquals(result.isValidTime, false);
    assertEquals(result.errors?.some(e => e.includes("Invalid timezone")), true);
  });

  await t.step("should handle malformed datetime", () => {
    const result = calculateDeliveryTime("invalid-datetime", "Europe/Berlin");
    
    assertEquals(result.isValidTime, false);
    assertEquals(result.errors?.length, 1);
  });
});

Deno.test("Timezone utilities - getPopularTimezones", async (t) => {
  await t.step("should return list of popular timezones", () => {
    const timezones = getPopularTimezones();
    
    assertEquals(timezones.length >= 10, true);
    assertEquals(timezones.some(tz => tz.identifier === "UTC"), true);
    assertEquals(timezones.some(tz => tz.identifier === "Europe/Berlin"), true);
    assertEquals(timezones.some(tz => tz.identifier === "America/New_York"), true);
  });

  await t.step("should include required properties for each timezone", () => {
    const timezones = getPopularTimezones();
    
    for (const tz of timezones) {
      assertEquals(typeof tz.identifier, "string");
      assertEquals(typeof tz.displayName, "string");
      assertEquals(typeof tz.currentOffset, "string");
      assertEquals(tz.currentTime instanceof Date, true);
    }
  });

  await t.step("should have formatted display names", () => {
    const timezones = getPopularTimezones();
    const berlinTz = timezones.find(tz => tz.identifier === "Europe/Berlin");
    
    assertEquals(berlinTz?.displayName, "Europe/Berlin");
  });
});

Deno.test("Timezone utilities - round trip conversion", async (t) => {
  await t.step("should maintain accuracy in round trip conversion", () => {
    const originalTime = "2024-06-15T14:30"; // Summer time
    const timezone = "Europe/Berlin";
    
    // Convert to UTC and back
    const utcTime = parseUserTimeToUTC(originalTime, timezone);
    const backToUser = formatUTCForUser(utcTime, timezone, "datetime-local");
    
    assertEquals(backToUser, originalTime);
  });

  await t.step("should handle DST boundaries correctly", () => {
    // DST transition date in 2024 (March 31, 2024 in Europe)
    const springForward = "2024-03-31T03:30"; // This time doesn't exist in Berlin
    const timezone = "Europe/Berlin";
    
    const result = calculateDeliveryTime(springForward, timezone);
    // Should either be valid or have DST error
    assertEquals(typeof result.isValidTime, "boolean");
    
    if (!result.isValidTime) {
      assertEquals(
        result.errors?.some(e => e.includes("daylight saving")),
        true
      );
    }
  });
});