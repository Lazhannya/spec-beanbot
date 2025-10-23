/**
 * Reminder Scheduler - Handles reminder delivery timing and coordination
 * Monitors due reminders and coordinates with delivery service
 */

import { ReminderService } from "./service.ts";
import { Reminder } from "../../types/reminder.ts";

/**
 * Scheduler for monitoring and triggering reminder deliveries
 */
export class ReminderScheduler {
  private service: ReminderService;
  private isRunning = false;
  private intervalId?: number | undefined;
  private readonly checkInterval = 30000; // Check every 30 seconds

  constructor(service: ReminderService) {
    this.service = service;
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

    // Set up recurring check
    this.intervalId = setInterval(() => {
      this.checkDueReminders();
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

      // Attempt delivery through external delivery service
      // For now, we'll just mark as delivered - the actual Discord delivery
      // will be handled by the delivery service in T020
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