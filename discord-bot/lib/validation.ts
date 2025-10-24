/**
 * Validation Utilities for Reminder Forms and API Security
 * Provides reusable validation functions, schemas, and input sanitization
 */

import { EscalationRule } from "../types/reminder.ts";
import { isSupportedTimezone, isValidTimezone } from "./utils/timezone.ts";

// XSS prevention patterns
const XSS_PATTERNS = [
  /<script[^>]*>.*?<\/script>/gi,
  /javascript:/gi,
  /on\w+\s*=/gi, // Event handlers like onclick=
  /<iframe/gi,
  /<object/gi,
  /<embed/gi,
];

/**
 * Sanitize string input to prevent XSS attacks
 */
export function sanitizeInput(input: string): string {
  if (!input) return "";
  
  let sanitized = input;
  
  // Remove dangerous patterns
  for (const pattern of XSS_PATTERNS) {
    sanitized = sanitized.replace(pattern, "");
  }
  
  // Encode HTML entities
  sanitized = sanitized
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .replace(/\//g, "&#x2F;");
  
  return sanitized.trim();
}

/**
 * Validate Discord snowflake ID (user, channel, guild, etc.)
 */
export function validateDiscordId(id: string, type: "user" | "channel" | "guild" | "message" = "user"): FieldValidation {
  if (!id || id.trim().length === 0) {
    return {
      isValid: false,
      message: `${type.charAt(0).toUpperCase() + type.slice(1)} ID is required`
    };
  }

  // Discord snowflakes are 17-19 digit numbers
  const snowflakePattern = /^\d{17,19}$/;
  if (!snowflakePattern.test(id.trim())) {
    return {
      isValid: false,
      message: `Invalid Discord ${type} ID format (should be 17-19 digits)`
    };
  }

  return { isValid: true };
}

/**
 * Validate URL format
 */
export function validateUrl(url: string, allowedProtocols: string[] = ["http", "https"]): FieldValidation {
  if (!url || url.trim().length === 0) {
    return {
      isValid: false,
      message: "URL is required"
    };
  }

  try {
    const parsedUrl = new URL(url);
    
    if (!allowedProtocols.includes(parsedUrl.protocol.replace(":", ""))) {
      return {
        isValid: false,
        message: `Protocol must be one of: ${allowedProtocols.join(", ")}`
      };
    }

    return { isValid: true };
  } catch (_error) {
    return {
      isValid: false,
      message: "Invalid URL format"
    };
  }
}

/**
 * Validate string length
 */
export function validateLength(
  value: string,
  min?: number,
  max?: number,
  fieldName: string = "Field"
): FieldValidation {
  if (!value) {
    return {
      isValid: false,
      message: `${fieldName} is required`
    };
  }

  const length = value.trim().length;

  if (min !== undefined && length < min) {
    return {
      isValid: false,
      message: `${fieldName} must be at least ${min} characters`
    };
  }

  if (max !== undefined && length > max) {
    return {
      isValid: false,
      message: `${fieldName} cannot exceed ${max} characters`
    };
  }

  return { isValid: true };
}

/**
 * Validate array length
 */
export function validateArrayLength<T>(
  array: T[],
  min?: number,
  max?: number,
  fieldName: string = "Array"
): FieldValidation {
  if (!array || !Array.isArray(array)) {
    return {
      isValid: false,
      message: `${fieldName} must be an array`
    };
  }

  const length = array.length;

  if (min !== undefined && length < min) {
    return {
      isValid: false,
      message: `${fieldName} must have at least ${min} item${min > 1 ? 's' : ''}`
    };
  }

  if (max !== undefined && length > max) {
    return {
      isValid: false,
      message: `${fieldName} cannot have more than ${max} item${max > 1 ? 's' : ''}`
    };
  }

  return { isValid: true };
}

/**
 * Validate ISO date string
 */
export function validateIsoDate(dateString: string): FieldValidation {
  if (!dateString || dateString.trim().length === 0) {
    return {
      isValid: false,
      message: "Date is required"
    };
  }

  const isoPattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/;
  if (!isoPattern.test(dateString)) {
    return {
      isValid: false,
      message: "Date must be in ISO 8601 format"
    };
  }

  const date = new Date(dateString);
  if (isNaN(date.getTime())) {
    return {
      isValid: false,
      message: "Invalid date value"
    };
  }

  return { isValid: true };
}

// Validation result type
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

// Individual field validation result
export interface FieldValidation {
  isValid: boolean;
  message?: string;
}

// Reminder form data structure
export interface ReminderFormData {
  content: string;
  targetUserId: string;
  scheduledTime: string; // ISO string
  escalationRules: EscalationRule[];
  timezone?: string;
}

/**
 * Validate reminder content
 */
export function validateContent(content: string): FieldValidation {
  if (!content || content.trim().length === 0) {
    return {
      isValid: false,
      message: "Reminder content is required"
    };
  }

  if (content.trim().length < 5) {
    return {
      isValid: false,
      message: "Reminder content must be at least 5 characters"
    };
  }

  if (content.length > 2000) {
    return {
      isValid: false,
      message: "Reminder content cannot exceed 2000 characters (Discord limit)"
    };
  }

  // Check for Discord mention patterns
  const mentionPattern = /@(everyone|here|&\d+|!?\d+)/g;
  const mentions = content.match(mentionPattern);
  if (mentions && mentions.length > 5) {
    return {
      isValid: false,
      message: "Too many mentions in reminder content (max 5)"
    };
  }

  return { isValid: true };
}

/**
 * Validate Discord user ID (uses generic validateDiscordId)
 */
export function validateTargetUserId(userId: string): FieldValidation {
  return validateDiscordId(userId, "user");
}

/**
 * Validate scheduled time
 */
export function validateScheduledTime(scheduledTime: string, _timezone?: string): FieldValidation {
  if (!scheduledTime || scheduledTime.trim().length === 0) {
    return {
      isValid: false,
      message: "Scheduled time is required"
    };
  }

  let date: Date;
  try {
    date = new Date(scheduledTime);
  } catch (_error) {
    return {
      isValid: false,
      message: "Invalid date format"
    };
  }

  if (isNaN(date.getTime())) {
    return {
      isValid: false,
      message: "Invalid date value"
    };
  }

  const now = new Date();
  const minTime = new Date(now.getTime() + 60 * 1000); // At least 1 minute in future

  if (date <= minTime) {
    return {
      isValid: false,
      message: "Scheduled time must be at least 1 minute in the future"
    };
  }

  const maxTime = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000); // Max 1 year
  if (date > maxTime) {
    return {
      isValid: false,
      message: "Scheduled time cannot be more than 1 year in the future"
    };
  }

  return { isValid: true };
}

/**
 * Validate timezone
 */
export function validateTimezone(timezone?: string): FieldValidation {
  if (!timezone) {
    return { isValid: true }; // Optional field
  }

  // First check if it's a valid IANA timezone
  if (!isValidTimezone(timezone)) {
    return {
      isValid: false,
      message: "Invalid timezone identifier"
    };
  }

  // Check if it's in our supported timezones list (optional warning)
  if (!isSupportedTimezone(timezone)) {
    return {
      isValid: true,
      message: "Timezone is valid but not in the recommended list"
    };
  }

  return { isValid: true };
}

/**
 * Validate escalation rules
 */
export function validateEscalationRules(rules: EscalationRule[]): FieldValidation {
  if (!rules || !Array.isArray(rules)) {
    return { isValid: true }; // Optional field
  }

  if (rules.length > 5) {
    return {
      isValid: false,
      message: "Maximum 5 escalation rules allowed"
    };
  }

  for (let i = 0; i < rules.length; i++) {
    const rule = rules[i];
    if (!rule) continue;
    
    // Validate timeout minutes
    if (!Number.isInteger(rule.timeoutMinutes) || rule.timeoutMinutes < 5) {
      return {
        isValid: false,
        message: `Escalation rule ${i + 1}: Timeout must be at least 5 minutes`
      };
    }

    if (rule.timeoutMinutes > 10080) { // 7 days
      return {
        isValid: false,
        message: `Escalation rule ${i + 1}: Timeout cannot exceed 7 days (10080 minutes)`
      };
    }

    // Validate trigger conditions
    if (!rule.triggerConditions || rule.triggerConditions.length === 0) {
      return {
        isValid: false,
        message: `Escalation rule ${i + 1}: At least one trigger condition is required`
      };
    }

    // Note: EscalationTrigger is an enum, validation happens at type level

    // Validate secondary user
    if (!rule.secondaryUserId || rule.secondaryUserId.trim().length === 0) {
      return {
        isValid: false,
        message: `Escalation rule ${i + 1}: Secondary user ID is required`
      };
    }

    const userValidation = validateTargetUserId(rule.secondaryUserId);
    if (!userValidation.isValid) {
      return {
        isValid: false,
        message: `Escalation rule ${i + 1}: ${userValidation.message}`
      };
    }

    // Validate escalation messages if provided
    if (rule.timeoutMessage) {
      const messageValidation = validateLength(rule.timeoutMessage, 1, 2000, "Timeout message");
      if (!messageValidation.isValid) {
        return {
          isValid: false,
          message: `Escalation rule ${i + 1}: ${messageValidation.message}`
        };
      }
    }

    if (rule.declineMessage) {
      const messageValidation = validateLength(rule.declineMessage, 1, 2000, "Decline message");
      if (!messageValidation.isValid) {
        return {
          isValid: false,
          message: `Escalation rule ${i + 1}: ${messageValidation.message}`
        };
      }
    }
  }

  // Check for duplicate timeouts
  const timeouts = rules.map(r => r.timeoutMinutes);
  const uniqueTimeouts = new Set(timeouts);
  if (timeouts.length !== uniqueTimeouts.size) {
    return {
      isValid: false,
      message: "Escalation rules cannot have duplicate timeout values"
    };
  }

  return { isValid: true };
}

/**
 * Validate complete reminder form
 */
export function validateReminderForm(data: ReminderFormData): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validate required fields
  const contentValidation = validateContent(data.content);
  if (!contentValidation.isValid) {
    errors.push(contentValidation.message!);
  }

  const userValidation = validateTargetUserId(data.targetUserId);
  if (!userValidation.isValid) {
    errors.push(userValidation.message!);
  }

  const timeValidation = validateScheduledTime(data.scheduledTime, data.timezone);
  if (!timeValidation.isValid) {
    errors.push(timeValidation.message!);
  }

  // Validate optional fields
  const timezoneValidation = validateTimezone(data.timezone);
  if (!timezoneValidation.isValid) {
    errors.push(timezoneValidation.message!);
  }

  const escalationValidation = validateEscalationRules(data.escalationRules);
  if (!escalationValidation.isValid) {
    errors.push(escalationValidation.message!);
  }

  // Generate warnings
  const scheduledDate = new Date(data.scheduledTime);
  const now = new Date();
  const timeDiff = scheduledDate.getTime() - now.getTime();
  
  // Warn if scheduled very far in future
  if (timeDiff > 30 * 24 * 60 * 60 * 1000) { // 30 days
    warnings.push("Reminder is scheduled more than 30 days in the future");
  }

  // Warn if no escalation rules for important reminders
  if (data.content.toLowerCase().includes('urgent') && (!data.escalationRules || data.escalationRules.length === 0)) {
    warnings.push("Consider adding escalation rules for urgent reminders");
  }

  // Warn about weekend scheduling
  const dayOfWeek = scheduledDate.getDay();
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    warnings.push("Reminder is scheduled for a weekend");
  }

  // Warn about late night/early morning scheduling
  const hour = scheduledDate.getHours();
  if (hour < 6 || hour > 22) {
    warnings.push("Reminder is scheduled for late night or early morning");
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Format validation errors for display
 */
export function formatValidationErrors(result: ValidationResult): string {
  if (result.isValid) {
    return "";
  }

  let message = "Please fix the following errors:\n";
  result.errors.forEach((error, index) => {
    message += `${index + 1}. ${error}\n`;
  });

  if (result.warnings.length > 0) {
    message += "\nWarnings:\n";
    result.warnings.forEach((warning) => {
      message += `• ${warning}\n`;
    });
  }

  return message.trim();
}

/**
 * Client-side validation helpers
 */
export const ValidationHelpers = {
  /**
   * Real-time content validation
   */
  validateContentLive(content: string): { isValid: boolean; message: string; charCount: number } {
    const validation = validateContent(content);
    return {
      isValid: validation.isValid,
      message: validation.message || "",
      charCount: content.length
    };
  },

  /**
   * Real-time user ID validation
   */
  validateUserIdLive(userId: string): { isValid: boolean; message: string } {
    const validation = validateTargetUserId(userId);
    return {
      isValid: validation.isValid,
      message: validation.message || ""
    };
  },

  /**
   * Real-time datetime validation
   */
  validateDateTimeLive(datetime: string): { isValid: boolean; message: string; timeFromNow?: string } {
    const validation = validateScheduledTime(datetime);
    
    let timeFromNow: string | undefined = undefined;
    if (validation.isValid) {
      const date = new Date(datetime);
      const now = new Date();
      const diff = date.getTime() - now.getTime();
      
      if (diff > 0) {
        const days = Math.floor(diff / (24 * 60 * 60 * 1000));
        const hours = Math.floor((diff % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
        const minutes = Math.floor((diff % (60 * 60 * 1000)) / (60 * 1000));
        
        if (days > 0) {
          timeFromNow = `${days} day${days > 1 ? 's' : ''}, ${hours} hour${hours > 1 ? 's' : ''} from now`;
        } else if (hours > 0) {
          timeFromNow = `${hours} hour${hours > 1 ? 's' : ''}, ${minutes} minute${minutes > 1 ? 's' : ''} from now`;
        } else {
          timeFromNow = `${minutes} minute${minutes > 1 ? 's' : ''} from now`;
        }
      }
    }

    return {
      isValid: validation.isValid,
      message: validation.message || "",
      ...(timeFromNow !== undefined && { timeFromNow })
    };
  }
};