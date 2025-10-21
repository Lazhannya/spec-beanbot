// Reminder validation utilities
// This module provides validation functions for reminder data

import type {
  CreateReminderInput,
  Reminder,
  ReminderCategory,
  ReminderPriority,
  ReminderStatus,
  ReminderValidationResult,
  ScheduleType,
  SupportedTimezone,
  UpdateReminderInput,
} from "../types/reminders.ts";

import {
  isValidReminderCategory,
  isValidReminderPriority,
  isValidReminderStatus,
  isValidScheduleType,
  isValidTimezone,
} from "../types/reminders.ts";

import { getTemplateById } from "../../data/reminder-templates.ts";

/**
 * Validate reminder creation input
 */
export function validateCreateReminderInput(
  input: CreateReminderInput,
): ReminderValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Required fields validation
  if (!input.title?.trim()) {
    errors.push("Title is required and cannot be empty");
  } else if (input.title.length > 200) {
    errors.push("Title cannot exceed 200 characters");
  }

  if (!input.message?.trim()) {
    errors.push("Message is required and cannot be empty");
  } else if (input.message.length > 2000) {
    errors.push("Message cannot exceed 2000 characters");
  }

  if (!input.targetUser?.trim()) {
    errors.push("Target user is required");
  } else if (!/^\d{17,19}$/.test(input.targetUser)) {
    errors.push("Target user must be a valid Discord user ID");
  }

  // Category validation
  if (!isValidReminderCategory(input.category)) {
    errors.push("Invalid reminder category");
  }

  // Priority validation
  if (input.priority && !isValidReminderPriority(input.priority)) {
    errors.push("Invalid reminder priority");
  }

  // Timezone validation
  if (!isValidTimezone(input.timezone)) {
    errors.push("Invalid or unsupported timezone");
  }

  // Schedule validation
  const scheduleValidation = validateSchedule(input.schedule);
  errors.push(...scheduleValidation.errors);
  warnings.push(...scheduleValidation.warnings);

  // Escalation validation
  const escalationValidation = validateEscalation(input.escalation);
  errors.push(...escalationValidation.errors);
  warnings.push(...escalationValidation.warnings);

  // Template validation
  if (input.templateId) {
    const template = getTemplateById(input.templateId);
    if (!template) {
      errors.push("Invalid template ID");
    } else {
      // Validate custom fields against template requirements
      const templateValidation = validateTemplateFields(
        template,
        input.customFields || {},
      );
      errors.push(...templateValidation.errors);
      warnings.push(...templateValidation.warnings);
    }
  }

  // Tags validation
  if (input.tags) {
    if (input.tags.length > 10) {
      warnings.push(
        "Consider using fewer than 10 tags for better organization",
      );
    }

    for (const tag of input.tags) {
      if (tag.length > 50) {
        errors.push("Tags cannot exceed 50 characters");
        break;
      }
      if (!/^[a-zA-Z0-9-_]+$/.test(tag)) {
        errors.push(
          "Tags can only contain letters, numbers, hyphens, and underscores",
        );
        break;
      }
    }
  }

  // Notes validation
  if (input.notes && input.notes.length > 1000) {
    errors.push("Notes cannot exceed 1000 characters");
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate reminder update input
 */
export function validateUpdateReminderInput(
  input: UpdateReminderInput,
): ReminderValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Title validation (if provided)
  if (input.title !== undefined) {
    if (!input.title?.trim()) {
      errors.push("Title cannot be empty");
    } else if (input.title.length > 200) {
      errors.push("Title cannot exceed 200 characters");
    }
  }

  // Message validation (if provided)
  if (input.message !== undefined) {
    if (!input.message?.trim()) {
      errors.push("Message cannot be empty");
    } else if (input.message.length > 2000) {
      errors.push("Message cannot exceed 2000 characters");
    }
  }

  // Category validation (if provided)
  if (input.category && !isValidReminderCategory(input.category)) {
    errors.push("Invalid reminder category");
  }

  // Priority validation (if provided)
  if (input.priority && !isValidReminderPriority(input.priority)) {
    errors.push("Invalid reminder priority");
  }

  // Status validation (if provided)
  if (input.status && !isValidReminderStatus(input.status)) {
    errors.push("Invalid reminder status");
  }

  // Timezone validation (if provided)
  if (input.timezone && !isValidTimezone(input.timezone)) {
    errors.push("Invalid or unsupported timezone");
  }

  // Schedule validation (if provided)
  if (input.schedule) {
    const scheduleValidation = validateScheduleUpdate(input.schedule);
    errors.push(...scheduleValidation.errors);
    warnings.push(...scheduleValidation.warnings);
  }

  // Escalation validation (if provided)
  if (input.escalation) {
    const escalationValidation = validateEscalationUpdate(input.escalation);
    errors.push(...escalationValidation.errors);
    warnings.push(...escalationValidation.warnings);
  }

  // Tags validation (if provided)
  if (input.tags) {
    if (input.tags.length > 10) {
      warnings.push(
        "Consider using fewer than 10 tags for better organization",
      );
    }

    for (const tag of input.tags) {
      if (tag.length > 50) {
        errors.push("Tags cannot exceed 50 characters");
        break;
      }
      if (!/^[a-zA-Z0-9-_]+$/.test(tag)) {
        errors.push(
          "Tags can only contain letters, numbers, hyphens, and underscores",
        );
        break;
      }
    }
  }

  // Notes validation (if provided)
  if (input.notes !== undefined && input.notes.length > 1000) {
    errors.push("Notes cannot exceed 1000 characters");
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate schedule configuration
 */
function validateSchedule(schedule: any): ReminderValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Type validation
  if (!isValidScheduleType(schedule.type)) {
    errors.push("Invalid schedule type");
    return { isValid: false, errors, warnings };
  }

  // Time format validation
  if (
    !schedule.time || !/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(schedule.time)
  ) {
    errors.push("Time must be in HH:MM format (24-hour)");
  }

  // Type-specific validations
  switch (schedule.type) {
    case "weekly":
      if (
        !schedule.daysOfWeek || !Array.isArray(schedule.daysOfWeek) ||
        schedule.daysOfWeek.length === 0
      ) {
        errors.push("Weekly schedule requires at least one day of week");
      } else {
        for (const day of schedule.daysOfWeek) {
          if (!Number.isInteger(day) || day < 0 || day > 6) {
            errors.push(
              "Days of week must be integers from 0 (Sunday) to 6 (Saturday)",
            );
            break;
          }
        }
      }
      break;

    case "monthly":
      if (schedule.dayOfMonth !== undefined) {
        if (
          !Number.isInteger(schedule.dayOfMonth) || schedule.dayOfMonth < 1 ||
          schedule.dayOfMonth > 31
        ) {
          errors.push("Day of month must be between 1 and 31");
        } else if (schedule.dayOfMonth > 28) {
          warnings.push("Day of month > 28 may not occur in all months");
        }
      }
      break;

    case "interval":
      if (
        !schedule.interval || !Number.isInteger(schedule.interval) ||
        schedule.interval < 1
      ) {
        errors.push("Interval must be a positive integer");
      } else if (schedule.interval > 365) {
        warnings.push("Very long intervals may not be practical");
      }
      break;

    case "custom":
      if (!schedule.cronExpression) {
        errors.push("Custom schedule requires a cron expression");
      } else {
        const cronValidation = validateCronExpression(schedule.cronExpression);
        if (!cronValidation.isValid) {
          errors.push("Invalid cron expression");
        }
      }
      break;
  }

  // Date boundaries validation
  if (schedule.startDate && schedule.endDate) {
    if (new Date(schedule.startDate) >= new Date(schedule.endDate)) {
      errors.push("End date must be after start date");
    }
  }

  if (schedule.maxOccurrences !== undefined) {
    if (
      !Number.isInteger(schedule.maxOccurrences) || schedule.maxOccurrences < 1
    ) {
      errors.push("Max occurrences must be a positive integer");
    } else if (schedule.maxOccurrences > 10000) {
      warnings.push("Very high max occurrences may impact performance");
    }
  }

  // Exclude dates validation
  if (schedule.excludeDates && Array.isArray(schedule.excludeDates)) {
    for (const date of schedule.excludeDates) {
      if (!(date instanceof Date) && isNaN(Date.parse(date))) {
        errors.push("Exclude dates must be valid dates");
        break;
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate schedule update (partial)
 */
function validateScheduleUpdate(schedule: any): ReminderValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Only validate provided fields
  if (schedule.type !== undefined && !isValidScheduleType(schedule.type)) {
    errors.push("Invalid schedule type");
  }

  if (
    schedule.time !== undefined &&
    !/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(schedule.time)
  ) {
    errors.push("Time must be in HH:MM format (24-hour)");
  }

  if (schedule.daysOfWeek !== undefined) {
    if (!Array.isArray(schedule.daysOfWeek)) {
      errors.push("Days of week must be an array");
    } else {
      for (const day of schedule.daysOfWeek) {
        if (!Number.isInteger(day) || day < 0 || day > 6) {
          errors.push(
            "Days of week must be integers from 0 (Sunday) to 6 (Saturday)",
          );
          break;
        }
      }
    }
  }

  if (schedule.dayOfMonth !== undefined) {
    if (
      !Number.isInteger(schedule.dayOfMonth) || schedule.dayOfMonth < 1 ||
      schedule.dayOfMonth > 31
    ) {
      errors.push("Day of month must be between 1 and 31");
    }
  }

  if (schedule.interval !== undefined) {
    if (!Number.isInteger(schedule.interval) || schedule.interval < 1) {
      errors.push("Interval must be a positive integer");
    }
  }

  if (schedule.maxOccurrences !== undefined) {
    if (
      !Number.isInteger(schedule.maxOccurrences) || schedule.maxOccurrences < 1
    ) {
      errors.push("Max occurrences must be a positive integer");
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate escalation configuration
 */
function validateEscalation(escalation: any): ReminderValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (escalation.enabled) {
    // Delay validation
    if (
      !Number.isInteger(escalation.delayMinutes) || escalation.delayMinutes < 1
    ) {
      errors.push("Escalation delay must be at least 1 minute");
    } else if (escalation.delayMinutes > 10080) { // 7 days
      warnings.push("Very long escalation delays may not be practical");
    }

    // Max escalations validation
    if (escalation.maxEscalations !== undefined) {
      if (
        !Number.isInteger(escalation.maxEscalations) ||
        escalation.maxEscalations < 1
      ) {
        errors.push("Max escalations must be at least 1");
      } else if (escalation.maxEscalations > 10) {
        warnings.push("Many escalations may be annoying to recipients");
      }
    }

    // Targets validation
    if (
      !escalation.escalationTargets ||
      !Array.isArray(escalation.escalationTargets) ||
      escalation.escalationTargets.length === 0
    ) {
      errors.push("Escalation requires at least one target user");
    } else {
      for (const target of escalation.escalationTargets) {
        if (!/^\d{17,19}$/.test(target)) {
          errors.push("Escalation targets must be valid Discord user IDs");
          break;
        }
      }
    }

    // Escalation interval validation
    if (escalation.escalationInterval !== undefined) {
      if (
        !Number.isInteger(escalation.escalationInterval) ||
        escalation.escalationInterval < 1
      ) {
        errors.push("Escalation interval must be at least 1 minute");
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate escalation update (partial)
 */
function validateEscalationUpdate(escalation: any): ReminderValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (escalation.delayMinutes !== undefined) {
    if (
      !Number.isInteger(escalation.delayMinutes) || escalation.delayMinutes < 1
    ) {
      errors.push("Escalation delay must be at least 1 minute");
    }
  }

  if (escalation.maxEscalations !== undefined) {
    if (
      !Number.isInteger(escalation.maxEscalations) ||
      escalation.maxEscalations < 1
    ) {
      errors.push("Max escalations must be at least 1");
    }
  }

  if (escalation.escalationTargets !== undefined) {
    if (!Array.isArray(escalation.escalationTargets)) {
      errors.push("Escalation targets must be an array");
    } else {
      for (const target of escalation.escalationTargets) {
        if (!/^\d{17,19}$/.test(target)) {
          errors.push("Escalation targets must be valid Discord user IDs");
          break;
        }
      }
    }
  }

  if (escalation.escalationInterval !== undefined) {
    if (
      !Number.isInteger(escalation.escalationInterval) ||
      escalation.escalationInterval < 1
    ) {
      errors.push("Escalation interval must be at least 1 minute");
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate template-specific custom fields
 */
function validateTemplateFields(
  template: any,
  customFields: Record<string, unknown>,
): ReminderValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check if template has required custom fields
  if (template.customFields) {
    for (const field of template.customFields) {
      if (field.required && !customFields[field.key]) {
        errors.push(`Template requires field: ${field.label}`);
      }

      const value = customFields[field.key];
      if (value !== undefined) {
        // Type validation based on field type
        switch (field.type) {
          case "number":
            if (typeof value !== "number") {
              errors.push(`Field ${field.label} must be a number`);
            }
            break;
          case "text":
            if (typeof value !== "string") {
              errors.push(`Field ${field.label} must be text`);
            }
            break;
          case "boolean":
            if (typeof value !== "boolean") {
              errors.push(`Field ${field.label} must be true/false`);
            }
            break;
          case "select":
            if (field.options && !field.options.includes(value as string)) {
              errors.push(
                `Field ${field.label} must be one of: ${
                  field.options.join(", ")
                }`,
              );
            }
            break;
        }
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Basic cron expression validation
 */
function validateCronExpression(expression: string): { isValid: boolean } {
  // Simple validation - real implementation would use a cron parser
  const parts = expression.trim().split(/\s+/);

  // Cron should have 5 or 6 parts (second is optional)
  if (parts.length < 5 || parts.length > 6) {
    return { isValid: false };
  }

  // Basic pattern check for each part
  const cronPattern = /^(\*|[0-9,-/]+)$/;
  for (const part of parts) {
    if (!cronPattern.test(part)) {
      return { isValid: false };
    }
  }

  return { isValid: true };
}

/**
 * Validate Discord user ID format
 */
export function isValidDiscordUserId(userId: string): boolean {
  return /^\d{17,19}$/.test(userId);
}

/**
 * Validate Discord channel ID format
 */
export function isValidDiscordChannelId(channelId: string): boolean {
  return /^\d{17,19}$/.test(channelId);
}

/**
 * Validate reminder title for safety
 */
export function sanitizeReminderTitle(title: string): string {
  return title.trim().substring(0, 200);
}

/**
 * Validate reminder message for safety
 */
export function sanitizeReminderMessage(message: string): string {
  return message.trim().substring(0, 2000);
}

/**
 * Check if a reminder can be edited
 */
export function canEditReminder(reminder: Reminder): boolean {
  return !["completed", "expired", "cancelled"].includes(reminder.status);
}

/**
 * Check if a reminder can be deleted
 */
export function canDeleteReminder(reminder: Reminder): boolean {
  return reminder.status !== "completed" ||
    (reminder.completedAt
      ? Date.now() - reminder.completedAt.getTime() < 24 * 60 * 60 * 1000
      : false);
}
