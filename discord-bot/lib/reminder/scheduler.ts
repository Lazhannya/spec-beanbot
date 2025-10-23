/**
 * Reminder Scheduler - Handles reminder delivery timing and coordination
 * Monitors due reminders and coordinates with delivery service
 */

import { ReminderService } from "./service.ts";
import { Reminder } from "../../types/reminder.ts";
import { DiscordDeliveryService } from "../discord/delivery.ts";
import { EscalationProcessor } from "./escalation.ts";

/**
 * Scheduler for monitoring and triggering reminder deliveries
 */
export class ReminderScheduler {
  private service: ReminderService;
  private deliveryService: DiscordDeliveryService;
  private escalationProcessor: EscalationProcessor;
  private isRunning = false;
  private intervalId?: number | undefined;
  private readonly checkInterval = 30000; // Check every 30 seconds

  constructor(service: ReminderService, deliveryService: DiscordDeliveryService) {
    this.service = service;
    this.deliveryService = deliveryService;
    this.escalationProcessor = new EscalationProcessor(deliveryService);
  }

  /**
   * Start the scheduler to monitor for due reminders
   */
  start(): void {
    if (this.isRunning) {
      console.warn("Scheduler is already running");
      return;
    }

    this.isRunning = true;
    console.log("Starting reminder scheduler...");

    // Run initial check
    this.checkDueReminders();
    this.checkTimeoutEscalations();

    // Set up recurring check
    this.intervalId = setInterval(() => {
      this.checkDueReminders();
      this.checkTimeoutEscalations();
    }, this.checkInterval);
  }

  /**
   * Stop the scheduler
   */
  stop(): void {
    if (!this.isRunning) {
      console.warn("Scheduler is not running");
      return;
    }

    this.isRunning = false;
    
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }

    console.log("Reminder scheduler stopped");
  }

  /**
   * Check for reminders that are due for delivery
   */
  private async checkDueReminders(): Promise<void> {
    try {
      console.log("Checking for due reminders...");
      
      const result = await this.service.getDueReminders();
      if (!result.success) {
        console.error("Failed to get due reminders:", result.error);
        return;
      }

      const dueReminders = result.data;
      console.log(`Found ${dueReminders.length} due reminders`);

      // Process each due reminder
      for (const reminder of dueReminders) {
        await this.processReminder(reminder);
      }
    } catch (error) {
      console.error("Error checking due reminders:", error);
    }
  }

  /**
   * Process a single due reminder
   */
  private async processReminder(reminder: Reminder): Promise<void> {
    try {
      console.log(`Processing reminder ${reminder.id} for user ${reminder.targetUserId}`);

      // Check if reminder is still pending (could have been cancelled)
      const currentResult = await this.service.getReminder(reminder.id);
      if (!currentResult.success) {
        console.error(`Failed to get current reminder state for ${reminder.id}`);
        return;
      }

      const currentReminder = currentResult.data;
      if (currentReminder.status !== "pending") {
        console.log(`Reminder ${reminder.id} is no longer pending, skipping`);
        return;
      }

      // Attempt delivery through Discord delivery service
      console.log(`Attempting to send Discord message for reminder ${reminder.id}`);
      const discordResult = await this.deliveryService.sendReminder(currentReminder);
      
      if (!discordResult.success) {
        console.error(`Failed to send Discord message for ${reminder.id}:`, discordResult.error);
        // TODO: Mark as failed - need to add updateReminderStatus method to service
        return;
      }
      
      console.log(`Successfully sent Discord message for reminder ${reminder.id}, message ID: ${discordResult.messageId}`);
      
      // Mark as delivered after successful Discord send
      const deliveryResult = await this.service.markAsDelivered(reminder.id);
      
      if (deliveryResult.success) {
        console.log(`Successfully marked reminder ${reminder.id} as delivered`);
        
        // Check if this is a repeat reminder and schedule next occurrence
        if (reminder.repeatRule && reminder.repeatRule.isActive) {
          console.log(`Scheduling next occurrence for repeat reminder ${reminder.id}`);
          const nextOccurrenceResult = await this.service.scheduleNextRepeatOccurrence(reminder.id);
          
          if (nextOccurrenceResult.success && nextOccurrenceResult.data) {
            console.log(`Successfully scheduled next occurrence: ${nextOccurrenceResult.data.id} at ${nextOccurrenceResult.data.scheduledTime}`);
          } else if (nextOccurrenceResult.success && !nextOccurrenceResult.data) {
            console.log(`Repeat reminder ${reminder.id} has reached its end condition`);
          } else if (!nextOccurrenceResult.success) {
            console.error(`Failed to schedule next occurrence for ${reminder.id}:`, nextOccurrenceResult.error);
          }
        }
      } else {
        console.error(`Failed to mark reminder ${reminder.id} as delivered:`, deliveryResult.error);
      }

    } catch (error) {
      console.error(`Error processing reminder ${reminder.id}:`, error);
    }
  }

  /**
   * Check for reminders that have timed out without response and need escalation
   */
  private async checkTimeoutEscalations(): Promise<void> {
    try {
      console.log("Checking for timeout escalations...");
      
      // Get all delivered reminders with escalation enabled
      const result = await this.service.getDeliveredRemindersWithEscalation();
      if (!result.success) {
        console.error("Failed to get delivered reminders with escalation:", result.error);
        return;
      }

      const deliveredReminders = result.data;
      console.log(`Found ${deliveredReminders.length} delivered reminders with escalation`);

      const now = Date.now();
      
      // Check each reminder for timeout
      for (const reminder of deliveredReminders) {
        if (!reminder.escalation || !reminder.escalation.isActive) {
          continue;
        }

        if (!reminder.lastDeliveryAttempt) {
          continue; // Skip if no delivery timestamp
        }

        // Calculate timeout deadline
        const deliveredTime = new Date(reminder.lastDeliveryAttempt).getTime();
        const timeoutMs = reminder.escalation.timeoutMinutes * 60 * 1000;
        const timeoutDeadline = deliveredTime + timeoutMs;

        // Check if timeout has passed
        if (now >= timeoutDeadline) {
          console.log(`Reminder ${reminder.id} has timed out, triggering escalation`);
          await this.processTimeoutEscalation(reminder);
        }
      }
    } catch (error) {
      console.error("Error checking timeout escalations:", error);
    }
  }

  /**
   * Process timeout escalation for a reminder
   */
  private async processTimeoutEscalation(reminder: Reminder): Promise<void> {
    try {
      console.log(`Processing timeout escalation for reminder ${reminder.id}`);
      
      // Trigger escalation through processor
      const escalationResult = await this.escalationProcessor.processEscalation(
        reminder,
        "timeout"
      );

      if (escalationResult.success) {
        console.log(`Successfully sent timeout escalation for reminder ${reminder.id}`);
        
        // Mark escalation as triggered in the reminder
        const updateResult = await this.service.markEscalationTriggered(
          reminder.id,
          "timeout"
        );
        
        if (!updateResult.success) {
          console.error(
            `Failed to mark escalation as triggered for ${reminder.id}:`,
            updateResult.error
          );
        }
      } else {
        console.error(
          `Failed to send timeout escalation for ${reminder.id}:`,
          escalationResult.error
        );
      }
    } catch (error) {
      console.error(`Error processing timeout escalation for ${reminder.id}:`, error);
    }
  }

  /**
   * Get scheduler status
   */
  getStatus(): { isRunning: boolean; checkInterval: number } {
    return {
      isRunning: this.isRunning,
      checkInterval: this.checkInterval
    };
  }

  /**
   * Force an immediate check for due reminders (for testing)
   */
  async forceCheck(): Promise<void> {
    if (!this.isRunning) {
      console.warn("Scheduler is not running, starting force check anyway");
    }
    await this.checkDueReminders();
  }
}