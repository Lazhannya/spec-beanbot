/**
 * Reminder Service - Business Logic Layer
 * Handles reminder operations, validation, and coordination between repository and external services
 */

import { Reminder, ReminderStatus, ResponseLog, ResponseType, TestExecution, TestType, RepeatFrequency, RepeatEndCondition, EscalationTrigger, TestResult } from "../../types/reminder.ts";
import { ReminderRepository } from "./repository.ts";

/**
 * Result type for operations that can fail
 */
export type Result<T, E = Error> = {
  success: true;
  data: T;
} | {
  success: false;
  error: E;
};

/**
 * Options for creating a new reminder
 */
export interface CreateReminderOptions {
  content: string;
  targetUserId: string;
  scheduledTime: Date;
  createdBy: string;
  escalation?: {
    secondaryUserId: string;
    timeoutMinutes: number;
  };
  repeatRule?: {
    frequency: RepeatFrequency;
    interval: number;
    endCondition: RepeatEndCondition;
    endDate?: Date;
    maxOccurrences?: number;
  };
}

/**
 * Service class handling reminder business logic
 */
export class ReminderService {
  private repository: ReminderRepository;

  constructor(repository: ReminderRepository) {
    this.repository = repository;
  }

  /**
   * Create a new reminder with validation
   */
  async createReminder(options: CreateReminderOptions): Promise<Result<Reminder>> {
    try {
      // Validate input
      const validation = this.validateReminderData(options);
      if (!validation.success) {
        return validation;
      }

      // Generate unique ID
      const id = crypto.randomUUID();
      const now = new Date();

      // Create reminder object
      const reminder: Reminder = {
        id,
        content: options.content,
        targetUserId: options.targetUserId,
        scheduledTime: options.scheduledTime,
        createdAt: now,
        updatedAt: now,
        status: ReminderStatus.PENDING,
        responses: [],
        testExecutions: [],
        createdBy: options.createdBy,
        deliveryAttempts: 0,
      };

      // Add escalation if provided
      if (options.escalation) {
        reminder.escalation = {
          id: crypto.randomUUID(),
          secondaryUserId: options.escalation.secondaryUserId,
          timeoutMinutes: options.escalation.timeoutMinutes,
          triggerConditions: [EscalationTrigger.TIMEOUT, EscalationTrigger.DECLINED], // Default triggers
          createdAt: now,
          isActive: true,
        };
      }

      // Add repeat rule if provided
      if (options.repeatRule) {
        const nextScheduledTime = this.calculateNextRepeatTime(
          options.scheduledTime,
          options.repeatRule.frequency,
          options.repeatRule.interval
        );

        reminder.repeatRule = {
          id: crypto.randomUUID(),
          frequency: options.repeatRule.frequency,
          interval: options.repeatRule.interval,
          endCondition: options.repeatRule.endCondition,
          ...(options.repeatRule.endDate && { endDate: options.repeatRule.endDate }),
          ...(options.repeatRule.maxOccurrences && { maxOccurrences: options.repeatRule.maxOccurrences }),
          currentOccurrence: 1, // This is the first occurrence
          nextScheduledTime,
          createdAt: now,
          isActive: true,
        };
      }

      // Save to repository
      const created = await this.repository.create(reminder);
      if (!created) {
        return {
          success: false,
          error: new Error("Failed to save reminder to database")
        };
      }

      return {
        success: true,
        data: reminder
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error("Unknown error occurred")
      };
    }
  }

  /**
   * Get reminder by ID
   */
  async getReminder(id: string): Promise<Result<Reminder>> {
    try {
      const reminder = await this.repository.getById(id);
      if (!reminder) {
        return {
          success: false,
          error: new Error("Reminder not found")
        };
      }

      return {
        success: true,
        data: reminder
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error("Failed to retrieve reminder")
      };
    }
  }

  /**
   * Update reminder content and schedule (only if pending)
   */
  async updateReminder(id: string, updates: Partial<Pick<Reminder, 'content' | 'scheduledTime' | 'escalation'>>): Promise<Result<Reminder>> {
    try {
      const current = await this.repository.getById(id);
      if (!current) {
        return {
          success: false,
          error: new Error("Reminder not found")
        };
      }

      // Only allow updates to pending reminders
      if (current.status !== ReminderStatus.PENDING) {
        return {
          success: false,
          error: new Error("Cannot modify reminder that has already been sent")
        };
      }

      // Validate updates
      if (updates.scheduledTime && updates.scheduledTime <= new Date()) {
        return {
          success: false,
          error: new Error("Scheduled time must be in the future")
        };
      }

      // Apply updates
      const success = await this.repository.update(id, updates);
      if (!success) {
        return {
          success: false,
          error: new Error("Failed to update reminder")
        };
      }

      // Retrieve updated reminder
      const updated = await this.repository.getById(id);
      if (!updated) {
        return {
          success: false,
          error: new Error("Failed to retrieve updated reminder")
        };
      }

      return {
        success: true,
        data: updated
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error("Unknown error occurred")
      };
    }
  }

  /**
   * Cancel a pending reminder
   */
  async cancelReminder(id: string): Promise<Result<void>> {
    try {
      const current = await this.repository.getById(id);
      if (!current) {
        return {
          success: false,
          error: new Error("Reminder not found")
        };
      }

      if (current.status !== ReminderStatus.PENDING) {
        return {
          success: false,
          error: new Error("Cannot cancel reminder that has already been sent")
        };
      }

      const success = await this.repository.updateStatus(id, ReminderStatus.CANCELLED);
      if (!success) {
        return {
          success: false,
          error: new Error("Failed to cancel reminder")
        };
      }

      return {
        success: true,
        data: undefined
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error("Unknown error occurred")
      };
    }
  }

  /**
   * Delete a pending reminder permanently
   * Removes the reminder and all its schedule indexes
   */
  async deleteReminder(id: string): Promise<Result<void>> {
    try {
      const current = await this.repository.getById(id);
      if (!current) {
        return {
          success: false,
          error: new Error("Reminder not found")
        };
      }

      // Only allow deleting pending reminders
      if (current.status !== ReminderStatus.PENDING) {
        return {
          success: false,
          error: new Error("Cannot delete reminder that has already been sent. Use cancel instead.")
        };
      }

      const success = await this.repository.delete(id);
      if (!success) {
        return {
          success: false,
          error: new Error("Failed to delete reminder")
        };
      }

      return {
        success: true,
        data: undefined
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error("Unknown error occurred")
      };
    }
  }

  /**
   * Mark reminder as delivered
   */
  async markAsDelivered(id: string): Promise<Result<void>> {
    try {
      const success = await this.repository.updateStatus(id, ReminderStatus.SENT);
      await this.repository.incrementDeliveryAttempts(id);
      
      if (!success) {
        return {
          success: false,
          error: new Error("Failed to mark reminder as delivered")
        };
      }

      // Log delivery action
      await this.addResponseLog(id, "system", ResponseType.DELIVERED);

      return {
        success: true,
        data: undefined
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error("Unknown error occurred")
      };
    }
  }

  /**
   * Record user response to reminder
   */
  async recordUserResponse(id: string, userId: string, action: ResponseType): Promise<Result<void>> {
    try {
      const reminder = await this.repository.getById(id);
      if (!reminder) {
        return {
          success: false,
          error: new Error("Reminder not found")
        };
      }

      // Update reminder status based on response
      let newStatus: ReminderStatus;
      switch (action) {
        case ResponseType.ACKNOWLEDGED:
          newStatus = reminder.status === ReminderStatus.ESCALATED 
            ? ReminderStatus.ESCALATED_ACK 
            : ReminderStatus.ACKNOWLEDGED;
          break;
        case ResponseType.DECLINED:
          newStatus = ReminderStatus.DECLINED;
          break;
        default:
          newStatus = reminder.status;
      }

      // Update status and add response log
      const success = await this.repository.updateStatus(id, newStatus);
      if (!success) {
        return {
          success: false,
          error: new Error("Failed to update reminder status")
        };
      }

      await this.addResponseLog(id, userId, action);

      return {
        success: true,
        data: undefined
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error("Unknown error occurred")
      };
    }
  }

  /**
   * Execute test delivery for reminder
   */
  async executeTest(id: string, testType: TestType, triggeredBy: string): Promise<Result<TestExecution>> {
    try {
      const reminder = await this.repository.getById(id);
      if (!reminder) {
        return {
          success: false,
          error: new Error("Reminder not found")
        };
      }

      const testExecution: TestExecution = {
        id: crypto.randomUUID(),
        reminderId: id,
        testType,
        executedBy: triggeredBy,
        executedAt: new Date(),
        result: TestResult.SUCCESS, // Assume success for now
        preservedSchedule: true, // Tests preserve original schedule
      };

      // Add test execution to reminder
      const updatedReminder = {
        ...reminder,
        testExecutions: [...reminder.testExecutions, testExecution],
        updatedAt: new Date()
      };

      const success = await this.repository.update(id, {
        testExecutions: updatedReminder.testExecutions,
        updatedAt: updatedReminder.updatedAt
      });

      if (!success) {
        return {
          success: false,
          error: new Error("Failed to record test execution")
        };
      }

      return {
        success: true,
        data: testExecution
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error("Unknown error occurred")
      };
    }
  }

  /**
   * Get reminders due for delivery
   */
  async getDueReminders(): Promise<Result<Reminder[]>> {
    try {
      const now = new Date();
      const reminders = await this.repository.getDueReminders(now);
      
      return {
        success: true,
        data: reminders
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error("Failed to get due reminders")
      };
    }
  }

  /**
   * Get reminders by status for dashboard
   */
  async getRemindersByStatus(status: ReminderStatus, limit = 50): Promise<Result<Reminder[]>> {
    try {
      const reminders = await this.repository.getByStatus(status, limit);
      
      return {
        success: true,
        data: reminders
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error("Failed to get reminders by status")
      };
    }
  }

  /**
   * Get all reminders with pagination
   */
  async getAllReminders(offset = 0, limit = 20): Promise<Result<Reminder[]>> {
    try {
      const reminders = await this.repository.getAll(offset, limit);
      
      return {
        success: true,
        data: reminders
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error("Failed to get reminders")
      };
    }
  }

  /**
   * Private helper to add response log entry
   */
  private async addResponseLog(reminderId: string, userId: string, action: ResponseType): Promise<void> {
    const reminder = await this.repository.getById(reminderId);
    if (!reminder) return;

    const logEntry: ResponseLog = {
      id: crypto.randomUUID(),
      reminderId,
      userId,
      responseType: action,
      timestamp: new Date(),
    };

    const updatedResponses = [...reminder.responses, logEntry];
    await this.repository.update(reminderId, { 
      responses: updatedResponses,
      updatedAt: new Date()
    });
  }

  /**
   * Private helper to validate reminder data
   */
  private validateReminderData(options: CreateReminderOptions): Result<void> {
    // Content validation
    if (!options.content || options.content.trim().length === 0) {
      return {
        success: false,
        error: new Error("Reminder content cannot be empty")
      };
    }

    if (options.content.length > 2000) {
      return {
        success: false,
        error: new Error("Reminder content cannot exceed 2000 characters")
      };
    }

    // User ID validation (Discord snowflake format)
    const userIdRegex = /^\d{17,19}$/;
    if (!userIdRegex.test(options.targetUserId)) {
      return {
        success: false,
        error: new Error("Invalid Discord user ID format")
      };
    }

    // Scheduled time validation
    if (options.scheduledTime <= new Date()) {
      return {
        success: false,
        error: new Error("Scheduled time must be in the future")
      };
    }

    // Max 1 year in future
    const maxFuture = new Date();
    maxFuture.setFullYear(maxFuture.getFullYear() + 1);
    if (options.scheduledTime > maxFuture) {
      return {
        success: false,
        error: new Error("Scheduled time cannot be more than 1 year in the future")
      };
    }

    // Escalation validation
    if (options.escalation) {
      if (!userIdRegex.test(options.escalation.secondaryUserId)) {
        return {
          success: false,
          error: new Error("Invalid escalation user ID format")
        };
      }

      if (options.escalation.secondaryUserId === options.targetUserId) {
        return {
          success: false,
          error: new Error("Escalation user cannot be the same as target user")
        };
      }

      if (options.escalation.timeoutMinutes < 1 || options.escalation.timeoutMinutes > 10080) {
        return {
          success: false,
          error: new Error("Timeout must be between 1 minute and 1 week")
        };
      }
    }

    return {
      success: true,
      data: undefined
    };
  }

  /**
   * Calculate the next scheduled time for a repeat reminder
   */
  private calculateNextRepeatTime(currentTime: Date, frequency: RepeatFrequency, interval: number): Date {
    const nextTime = new Date(currentTime);

    switch (frequency) {
      case RepeatFrequency.DAILY:
        nextTime.setDate(nextTime.getDate() + interval);
        break;
      case RepeatFrequency.WEEKLY:
        nextTime.setDate(nextTime.getDate() + (interval * 7));
        break;
      case RepeatFrequency.MONTHLY:
        nextTime.setMonth(nextTime.getMonth() + interval);
        break;
      case RepeatFrequency.YEARLY:
        nextTime.setFullYear(nextTime.getFullYear() + interval);
        break;
    }

    return nextTime;
  }

  /**
   * Schedule the next occurrence of a repeat reminder
   */
  async scheduleNextRepeatOccurrence(reminderId: string): Promise<Result<Reminder | null>> {
    try {
      const reminder = await this.repository.getById(reminderId);
      if (!reminder || !reminder.repeatRule || !reminder.repeatRule.isActive) {
        return {
          success: true,
          data: null // No repeat needed
        };
      }

      const repeatRule = reminder.repeatRule;

      // Check if we've reached the end condition
      if (repeatRule.endCondition === RepeatEndCondition.COUNT_BASED) {
        if (repeatRule.currentOccurrence >= (repeatRule.maxOccurrences || 1)) {
          return {
            success: true,
            data: null // Reached max occurrences
          };
        }
      }

      if (repeatRule.endCondition === RepeatEndCondition.DATE_BASED) {
        if (repeatRule.endDate && repeatRule.nextScheduledTime >= repeatRule.endDate) {
          return {
            success: true,
            data: null // Reached end date
          };
        }
      }

      // Calculate next occurrence time
      const nextTime = this.calculateNextRepeatTime(
        repeatRule.nextScheduledTime,
        repeatRule.frequency,
        repeatRule.interval
      );

      // Create new reminder for next occurrence
      const nextReminder: Reminder = {
        ...reminder,
        id: crypto.randomUUID(),
        scheduledTime: nextTime,
        createdAt: new Date(),
        updatedAt: new Date(),
        status: ReminderStatus.PENDING,
        responses: [],
        testExecutions: [],
        deliveryAttempts: 0,
        repeatRule: {
          ...repeatRule,
          currentOccurrence: repeatRule.currentOccurrence + 1,
          nextScheduledTime: this.calculateNextRepeatTime(nextTime, repeatRule.frequency, repeatRule.interval)
        }
      };

      // Save the new reminder
      const created = await this.repository.create(nextReminder);
      if (!created) {
        return {
          success: false,
          error: new Error("Failed to create next repeat reminder")
        };
      }

      return {
        success: true,
        data: nextReminder
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error("Unknown error occurred")
      };
    }
  }
}