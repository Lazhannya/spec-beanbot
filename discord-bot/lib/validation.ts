/**
 * Validation Utilities for Reminder Forms
 * Provides reusable validation functions and schemas
 */

import { EscalationRule } from "../types/reminder.ts";

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
 * Validate Discord user ID
 */
export function validateTargetUserId(userId: string): FieldValidation {
  if (!userId || userId.trim().length === 0) {
    return {
      isValid: false,
      message: "Target user ID is required"
    };
  }

  // Discord user IDs are 17-19 digit snowflakes
  const snowflakePattern = /^\d{17,19}$/;
  if (!snowflakePattern.test(userId.trim())) {
    return {
      isValid: false,
      message: "Invalid Discord user ID format (should be 17-19 digits)"
    };
  }

  return { isValid: true };
}

/**
 * Validate scheduled time
 */
export function validateScheduledTime(scheduledTime: string, timezone?: string): FieldValidation {
  if (!scheduledTime || scheduledTime.trim().length === 0) {
    return {
      isValid: false,
      message: "Scheduled time is required"
    };
  }

  let date: Date;
  try {
    date = new Date(scheduledTime);
  } catch (error) {
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

  try {
    // Test if timezone is valid by creating a date formatter
    new Intl.DateTimeFormat('en-US', { timeZone: timezone });
    return { isValid: true };
  } catch (error) {
    return {
      isValid: false,
      message: "Invalid timezone identifier"
    };
  }
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
    
    // Validate delay
    if (!Number.isInteger(rule.delayMinutes) || rule.delayMinutes < 5) {
      return {
        isValid: false,
        message: `Escalation rule ${i + 1}: Delay must be at least 5 minutes`
      };
    }

    if (rule.delayMinutes > 10080) { // 7 days
      return {
        isValid: false,
        message: `Escalation rule ${i + 1}: Delay cannot exceed 7 days (10080 minutes)`
      };
    }

    // Validate trigger conditions
    if (!rule.triggerConditions || rule.triggerConditions.length === 0) {
      return {
        isValid: false,
        message: `Escalation rule ${i + 1}: At least one trigger condition is required`
      };
    }

    const validConditions = ['no_response', 'declined'];
    for (const condition of rule.triggerConditions) {
      if (!validConditions.includes(condition)) {
        return {
          isValid: false,
          message: `Escalation rule ${i + 1}: Invalid trigger condition '${condition}'`
        };
      }
    }

    // Validate target users
    if (!rule.targetUserIds || rule.targetUserIds.length === 0) {
      return {
        isValid: false,
        message: `Escalation rule ${i + 1}: At least one target user is required`
      };
    }

    if (rule.targetUserIds.length > 10) {
      return {
        isValid: false,
        message: `Escalation rule ${i + 1}: Maximum 10 target users allowed`
      };
    }

    // Validate each target user ID
    for (const userId of rule.targetUserIds) {
      const userValidation = validateTargetUserId(userId);
      if (!userValidation.isValid) {
        return {
          isValid: false,
          message: `Escalation rule ${i + 1}: ${userValidation.message}`
        };
      }
    }

    // Validate escalation message
    if (rule.escalationMessage) {
      const messageValidation = validateContent(rule.escalationMessage);
      if (!messageValidation.isValid) {
        return {
          isValid: false,
          message: `Escalation rule ${i + 1}: ${messageValidation.message}`
        };
      }
    }
  }

  // Check for duplicate delays
  const delays = rules.map(r => r.delayMinutes);
  const uniqueDelays = new Set(delays);
  if (delays.length !== uniqueDelays.size) {
    return {
      isValid: false,
      message: "Escalation rules cannot have duplicate delay times"
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
    result.warnings.forEach((warning, index) => {
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
    
    let timeFromNow: string | undefined;
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
      timeFromNow
    };
  }
};