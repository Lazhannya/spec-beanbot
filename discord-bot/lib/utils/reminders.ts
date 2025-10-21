// Reminder utility functions
// This module provides helper functions for reminder operations

import type {
  CreateReminderInput,
  Reminder,
  ReminderSchedule,
  ReminderStats,
} from "../types/reminders.ts";

import type { ReminderTemplate } from "../../data/reminder-templates.ts";

/**
 * Generate a unique ID for reminders
 */
export function generateReminderId(): string {
  return crypto.randomUUID();
}

/**
 * Generate current timestamp
 */
export function getCurrentTimestamp(): Date {
  return new Date();
}

/**
 * Create a new reminder from input data
 */
export function createReminderFromInput(
  input: CreateReminderInput,
  createdBy: string,
): Reminder {
  const now = getCurrentTimestamp();
  const id = generateReminderId();

  // Calculate next delivery time
  const scheduleWithDefaults: ReminderSchedule = {
    ...input.schedule,
    occurrenceCount: 0,
    lastOccurrence: undefined,
    nextOccurrence: undefined,
  };
  const nextDeliveryAt = calculateNextDelivery(
    scheduleWithDefaults,
    input.timezone,
  );

  const reminder: Reminder = {
    id,
    createdBy,
    targetUser: input.targetUser,
    title: input.title.trim(),
    message: input.message.trim(),
    category: input.category,
    templateId: input.templateId,
    customFields: input.customFields || {},

    schedule: {
      ...input.schedule,
      occurrenceCount: 0,
      lastOccurrence: undefined,
      nextOccurrence: nextDeliveryAt,
    },
    timezone: input.timezone,

    status: "active",
    isActive: true,

    escalation: {
      ...input.escalation,
      escalationCount: 0,
      lastEscalationAt: undefined,
    },

    createdAt: now,
    updatedAt: now,
    lastDeliveredAt: undefined,
    nextDeliveryAt,
    completedAt: undefined,

    tags: input.tags || [],
    notes: input.notes || "",
    priority: input.priority || "normal",
  };

  return reminder;
}

/**
 * Calculate the next delivery time for a reminder
 */
export function calculateNextDelivery(
  schedule: ReminderSchedule,
  timezone: string,
  fromDate?: Date,
): Date | undefined {
  const baseDate = fromDate || new Date();

  // Convert to target timezone for calculation
  const targetDate = new Date(
    baseDate.toLocaleString("en-US", { timeZone: timezone }),
  );

  switch (schedule.type) {
    case "once":
      return calculateOnceDelivery(schedule, targetDate);

    case "daily":
      return calculateDailyDelivery(schedule, targetDate);

    case "weekly":
      return calculateWeeklyDelivery(schedule, targetDate);

    case "monthly":
      return calculateMonthlyDelivery(schedule, targetDate);

    case "yearly":
      return calculateYearlyDelivery(schedule, targetDate);

    case "interval":
      return calculateIntervalDelivery(schedule, targetDate);

    case "custom":
      return calculateCustomDelivery(schedule, targetDate);

    default:
      return undefined;
  }
}

/**
 * Calculate one-time delivery
 */
function calculateOnceDelivery(
  schedule: ReminderSchedule,
  baseDate: Date,
): Date | undefined {
  if (schedule.startDate) {
    const startDate = new Date(schedule.startDate);
    const [hours, minutes] = schedule.time.split(":").map(Number);

    startDate.setHours(hours, minutes, 0, 0);

    if (startDate > baseDate) {
      return startDate;
    }
  }

  return undefined;
}

/**
 * Calculate daily delivery
 */
function calculateDailyDelivery(
  schedule: ReminderSchedule,
  baseDate: Date,
): Date | undefined {
  const [hours, minutes] = schedule.time.split(":").map(Number);
  const nextDate = new Date(baseDate);

  nextDate.setHours(hours, minutes, 0, 0);

  // If time has passed today, move to tomorrow
  if (nextDate <= baseDate) {
    nextDate.setDate(nextDate.getDate() + 1);
  }

  // Check end date constraint
  if (schedule.endDate && nextDate > new Date(schedule.endDate)) {
    return undefined;
  }

  // Check max occurrences constraint
  if (
    schedule.maxOccurrences &&
    schedule.occurrenceCount >= schedule.maxOccurrences
  ) {
    return undefined;
  }

  return nextDate;
}

/**
 * Calculate weekly delivery
 */
function calculateWeeklyDelivery(
  schedule: ReminderSchedule,
  baseDate: Date,
): Date | undefined {
  if (!schedule.daysOfWeek || schedule.daysOfWeek.length === 0) {
    return undefined;
  }

  const [hours, minutes] = schedule.time.split(":").map(Number);
  const currentDay = baseDate.getDay();
  const currentTime = baseDate.getHours() * 60 + baseDate.getMinutes();
  const targetTime = hours * 60 + minutes;

  // Sort days for easier processing
  const sortedDays = [...schedule.daysOfWeek].sort((a, b) => a - b);

  // Find next occurrence
  for (const day of sortedDays) {
    const nextDate = new Date(baseDate);
    let daysToAdd = day - currentDay;

    if (daysToAdd < 0) {
      daysToAdd += 7; // Next week
    } else if (daysToAdd === 0 && targetTime <= currentTime) {
      daysToAdd = 7; // Same day but time passed, next week
    }

    nextDate.setDate(nextDate.getDate() + daysToAdd);
    nextDate.setHours(hours, minutes, 0, 0);

    // Check constraints
    if (schedule.endDate && nextDate > new Date(schedule.endDate)) {
      continue;
    }

    if (
      schedule.maxOccurrences &&
      schedule.occurrenceCount >= schedule.maxOccurrences
    ) {
      return undefined;
    }

    return nextDate;
  }

  return undefined;
}

/**
 * Calculate monthly delivery
 */
function calculateMonthlyDelivery(
  schedule: ReminderSchedule,
  baseDate: Date,
): Date | undefined {
  const [hours, minutes] = schedule.time.split(":").map(Number);
  const targetDay = schedule.dayOfMonth || baseDate.getDate();

  const nextDate = new Date(baseDate);
  nextDate.setDate(targetDay);
  nextDate.setHours(hours, minutes, 0, 0);

  // If target day has passed this month, move to next month
  if (nextDate <= baseDate) {
    nextDate.setMonth(nextDate.getMonth() + 1);
    nextDate.setDate(targetDay);
  }

  // Handle invalid dates (e.g., Feb 31 -> Feb 28/29)
  if (nextDate.getDate() !== targetDay) {
    nextDate.setDate(0); // Last day of previous month
  }

  // Check constraints
  if (schedule.endDate && nextDate > new Date(schedule.endDate)) {
    return undefined;
  }

  if (
    schedule.maxOccurrences &&
    schedule.occurrenceCount >= schedule.maxOccurrences
  ) {
    return undefined;
  }

  return nextDate;
}

/**
 * Calculate yearly delivery
 */
function calculateYearlyDelivery(
  schedule: ReminderSchedule,
  baseDate: Date,
): Date | undefined {
  const [hours, minutes] = schedule.time.split(":").map(Number);

  const nextDate = new Date(baseDate);
  nextDate.setHours(hours, minutes, 0, 0);

  // If this year's date has passed, move to next year
  if (nextDate <= baseDate) {
    nextDate.setFullYear(nextDate.getFullYear() + 1);
  }

  // Check constraints
  if (schedule.endDate && nextDate > new Date(schedule.endDate)) {
    return undefined;
  }

  if (
    schedule.maxOccurrences &&
    schedule.occurrenceCount >= schedule.maxOccurrences
  ) {
    return undefined;
  }

  return nextDate;
}

/**
 * Calculate interval-based delivery
 */
function calculateIntervalDelivery(
  schedule: ReminderSchedule,
  baseDate: Date,
): Date | undefined {
  if (!schedule.interval) {
    return undefined;
  }

  const [hours, minutes] = schedule.time.split(":").map(Number);
  const nextDate = new Date(baseDate);

  if (schedule.lastOccurrence) {
    // Add interval to last occurrence
    nextDate.setTime(schedule.lastOccurrence.getTime());
    nextDate.setDate(nextDate.getDate() + schedule.interval);
  } else {
    // First occurrence
    nextDate.setHours(hours, minutes, 0, 0);
    if (nextDate <= baseDate) {
      nextDate.setDate(nextDate.getDate() + schedule.interval);
    }
  }

  // Check constraints
  if (schedule.endDate && nextDate > new Date(schedule.endDate)) {
    return undefined;
  }

  if (
    schedule.maxOccurrences &&
    schedule.occurrenceCount >= schedule.maxOccurrences
  ) {
    return undefined;
  }

  return nextDate;
}

/**
 * Calculate custom cron-based delivery
 */
function calculateCustomDelivery(
  _schedule: ReminderSchedule,
  _baseDate: Date,
): Date | undefined {
  // This would require a proper cron parser library
  // For now, return undefined and implement in a future version
  console.warn("Custom cron scheduling not yet implemented");
  return undefined;
}

/**
 * Update reminder after delivery
 */
export function updateReminderAfterDelivery(reminder: Reminder): Reminder {
  const now = getCurrentTimestamp();
  const updatedSchedule = { ...reminder.schedule };

  // Update occurrence tracking
  updatedSchedule.occurrenceCount += 1;
  updatedSchedule.lastOccurrence = now;

  // Calculate next delivery
  const nextDelivery = calculateNextDelivery(
    updatedSchedule,
    reminder.timezone,
    now,
  );
  updatedSchedule.nextOccurrence = nextDelivery;

  // Update reminder status if no more deliveries
  let status = reminder.status;
  if (!nextDelivery) {
    status = "completed";
  }

  return {
    ...reminder,
    schedule: updatedSchedule,
    status,
    lastDeliveredAt: now,
    nextDeliveryAt: nextDelivery,
    updatedAt: now,
    completedAt: status === "completed" ? now : reminder.completedAt,
  };
}

/**
 * Format reminder for display
 */
export function formatReminderForDisplay(reminder: Reminder): string {
  const scheduleText = formatScheduleText(reminder.schedule);
  const timeZoneText = reminder.timezone !== "UTC"
    ? ` (${reminder.timezone})`
    : "";

  return `**${reminder.title}**\n${reminder.message}\n\n📅 ${scheduleText}${timeZoneText}`;
}

/**
 * Format schedule as human-readable text
 */
export function formatScheduleText(schedule: ReminderSchedule): string {
  const time = schedule.time;

  switch (schedule.type) {
    case "once":
      return schedule.startDate
        ? `Once on ${
          new Date(schedule.startDate).toLocaleDateString()
        } at ${time}`
        : `Once at ${time}`;

    case "daily":
      return `Daily at ${time}`;

    case "weekly":
      if (schedule.daysOfWeek && schedule.daysOfWeek.length > 0) {
        const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        const days = schedule.daysOfWeek.map((d) => dayNames[d]).join(", ");
        return `Weekly on ${days} at ${time}`;
      }
      return `Weekly at ${time}`;

    case "monthly": {
      const dayText = schedule.dayOfMonth
        ? `${schedule.dayOfMonth}`
        : "same day";
      return `Monthly on the ${dayText} at ${time}`;
    }

    case "yearly":
      return `Yearly at ${time}`;

    case "interval": {
      const intervalText = schedule.interval === 1
        ? "day"
        : `${schedule.interval} days`;
      return `Every ${intervalText} at ${time}`;
    }

    case "custom":
      return schedule.cronExpression || "Custom schedule";

    default:
      return "Unknown schedule";
  }
}

/**
 * Check if a reminder should escalate
 */
export function shouldEscalateReminder(
  reminder: Reminder,
  lastDelivery: Date,
  acknowledged: boolean,
): boolean {
  if (acknowledged || !reminder.escalation.enabled) {
    return false;
  }

  const now = Date.now();
  const deliveryTime = lastDelivery.getTime();
  const delayMs = reminder.escalation.delayMinutes * 60 * 1000;

  return (now - deliveryTime) >= delayMs;
}

/**
 * Generate reminder statistics for a user
 */
export function calculateReminderStats(
  reminders: Reminder[],
  userId: string,
  periodStart: Date,
  periodEnd: Date,
): ReminderStats {
  const userReminders = reminders.filter((r) =>
    r.createdBy === userId || r.targetUser === userId
  );

  const stats: ReminderStats = {
    userId,
    totalReminders: userReminders.length,
    activeReminders: userReminders.filter((r) => r.status === "active").length,
    completedReminders:
      userReminders.filter((r) => r.status === "completed").length,

    totalDeliveries: 0,
    successfulDeliveries: 0,
    failedDeliveries: 0,
    acknowledgmentRate: 0,

    averageAcknowledgmentTime: 0,
    fastestAcknowledgment: 0,
    slowestAcknowledgment: 0,

    categoryBreakdown: {
      health: 0,
      medication: 0,
      work: 0,
      personal: 0,
      appointment: 0,
      task: 0,
      custom: 0,
    },
    templateUsage: {},

    lastUpdated: new Date(),
    periodStart,
    periodEnd,
  };

  // Calculate category breakdown
  for (const reminder of userReminders) {
    stats.categoryBreakdown[reminder.category]++;

    if (reminder.templateId) {
      stats.templateUsage[reminder.templateId] =
        (stats.templateUsage[reminder.templateId] || 0) + 1;
    }
  }

  return stats;
}

/**
 * Apply template to create reminder input
 */
export function applyTemplateToInput(
  template: ReminderTemplate,
  customFields: Record<string, unknown> = {},
): Partial<CreateReminderInput> {
  return {
    title: template.name,
    message: template.defaultMessage,
    category: template.category,
    templateId: template.id,
    customFields,
    priority: "normal",
    schedule: {
      type: template.defaultSchedule.type,
      time: template.defaultSchedule.time || "09:00",
      daysOfWeek: template.defaultSchedule.daysOfWeek,
      dayOfMonth: template.defaultSchedule.dayOfMonth,
      cronExpression: template.defaultSchedule.cronExpression,
    },
    timezone: template.defaultSchedule.timezone || "America/New_York",
    escalation: {
      enabled: template.escalation.enabled,
      delayMinutes: template.escalation.delayMinutes,
      maxEscalations: template.escalation.maxAttempts || 3,
      escalationTargets: template.escalation.escalationTargets,
      escalationMessage: template.escalation.escalationMessage,
      stopOnAcknowledgment: true,
    },
    tags: [],
  };
}

/**
 * Convert timezone-aware date to UTC
 */
export function convertToUTC(date: Date, timezone: string): Date {
  const utcDate = new Date(date.toLocaleString("en-US", { timeZone: "UTC" }));
  const tzDate = new Date(date.toLocaleString("en-US", { timeZone: timezone }));
  const offset = utcDate.getTime() - tzDate.getTime();

  return new Date(date.getTime() + offset);
}

/**
 * Convert UTC date to timezone-aware date
 */
export function convertFromUTC(date: Date, timezone: string): Date {
  const utcDate = new Date(date.toLocaleString("en-US", { timeZone: "UTC" }));
  const tzDate = new Date(date.toLocaleString("en-US", { timeZone: timezone }));
  const offset = tzDate.getTime() - utcDate.getTime();

  return new Date(date.getTime() + offset);
}

/**
 * Check if two reminders conflict
 */
export function checkReminderConflict(
  reminder1: Reminder,
  reminder2: Reminder,
): boolean {
  // Same user and overlapping delivery times
  if (reminder1.targetUser !== reminder2.targetUser) {
    return false;
  }

  // Check if delivery times are within 5 minutes of each other
  if (reminder1.nextDeliveryAt && reminder2.nextDeliveryAt) {
    const timeDiff = Math.abs(
      reminder1.nextDeliveryAt.getTime() - reminder2.nextDeliveryAt.getTime(),
    );
    return timeDiff < 5 * 60 * 1000; // 5 minutes
  }

  return false;
}
