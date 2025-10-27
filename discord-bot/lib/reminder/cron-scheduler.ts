/**
 * Deno Cron-Based Reminder Scheduler
 * 
 * Uses Deno.cron() for automatic execution on Deno Deploy.
 * This runs independently without requiring HTTP traffic or user interaction.
 * 
 * Key Benefits:
 * - Works without web server or incoming requests
 * - Automatically detected and managed by Deno Deploy
 * - Non-overlapping execution (won't run twice if previous check still running)
 * - Zero configuration required
 */

import { ReminderService } from "./service.ts";
import { Reminder } from "../../types/reminder.ts";
import { DiscordDeliveryService } from "../discord/delivery.ts";
import { EscalationProcessor } from "./escalation.ts";

/**
 * Cron-based scheduler for automatic reminder delivery
 */
export class CronReminderScheduler {
  private service: ReminderService;
  private deliveryService: DiscordDeliveryService;
  private escalationProcessor: EscalationProcessor;

  constructor(service: ReminderService, deliveryService: DiscordDeliveryService) {
    this.service = service;
    this.deliveryService = deliveryService;
    this.escalationProcessor = new EscalationProcessor(deliveryService);
  }

  /**
   * Register cron jobs for automatic reminder processing
   * This is called at startup and Deno Deploy automatically manages the schedule
   */
  registerCronJobs(): void {
    console.log("Registering Deno.cron jobs for automatic reminder delivery...");

    // Check for due reminders every minute
    // Cron format: minute hour day month weekday
    // "* * * * *" = every minute
    Deno.cron("Check due reminders", "* * * * *", async () => {
      console.log("[CRON] Checking for due reminders...");
      await this.checkDueReminders();
    });

    // Check for timeout escalations every 2 minutes
    // "*/2 * * * *" = every 2 minutes
    Deno.cron("Check timeout escalations", "*/2 * * * *", async () => {
      console.log("[CRON] Checking for timeout escalations...");
      await this.checkTimeoutEscalations();
    });

    console.log("✅ Deno.cron jobs registered successfully!");
    console.log("   - Due reminders: Every minute");
    console.log("   - Timeout escalations: Every 2 minutes");
    console.log("   These will run automatically on Deno Deploy without user traffic");
  }

  /**
   * Check for reminders that are due for delivery
   */
  private async checkDueReminders(): Promise<void> {
    try {
      const result = await this.service.getDueReminders();
      if (!result.success) {
        console.error("[CRON] Failed to get due reminders:", result.error);
        return;
      }

      const dueReminders = result.data;
      if (dueReminders.length > 0) {
        console.log(`[CRON] Found ${dueReminders.length} due reminders`);
      }

      // Process each due reminder
      for (const reminder of dueReminders) {
        await this.processReminder(reminder);
      }
    } catch (error) {
      console.error("[CRON] Error checking due reminders:", error);
    }
  }

  /**
   * Process a single due reminder
   */
  private async processReminder(reminder: Reminder): Promise<void> {
    try {
      console.log(`[CRON] Processing reminder ${reminder.id} for user ${reminder.targetUserId}`);

      // Check if reminder is still pending (could have been cancelled)
      const currentResult = await this.service.getReminder(reminder.id);
      if (!currentResult.success) {
        console.error(`[CRON] Failed to get current reminder state for ${reminder.id}`);
        return;
      }

      const currentReminder = currentResult.data;
      if (currentReminder.status !== "pending") {
        console.log(`[CRON] Reminder ${reminder.id} is no longer pending, skipping`);
        return;
      }

      // Attempt delivery through Discord delivery service
      console.log(`[CRON] Attempting to send Discord message for reminder ${reminder.id}`);
      const discordResult = await this.deliveryService.sendReminder(currentReminder);
      
      if (!discordResult.success) {
        console.error(`[CRON] Failed to send Discord message for ${reminder.id}:`, discordResult.error);
        return;
      }
      
      console.log(`[CRON] Successfully sent Discord message for reminder ${reminder.id}, message ID: ${discordResult.messageId}`);
      
      // Mark as delivered after successful Discord send
      const deliveryResult = await this.service.markAsDelivered(reminder.id);
      
      if (deliveryResult.success) {
        console.log(`[CRON] Successfully marked reminder ${reminder.id} as delivered`);
        
        // Check if this is a repeat reminder and schedule next occurrence
        if (reminder.repeatRule && reminder.repeatRule.isActive) {
          console.log(`[CRON] Scheduling next occurrence for repeat reminder ${reminder.id}`);
          const nextOccurrenceResult = await this.service.scheduleNextRepeatOccurrence(reminder.id);
          
          if (nextOccurrenceResult.success && nextOccurrenceResult.data) {
            console.log(`[CRON] Successfully scheduled next occurrence: ${nextOccurrenceResult.data.id} at ${nextOccurrenceResult.data.scheduledTime}`);
          } else if (nextOccurrenceResult.success && !nextOccurrenceResult.data) {
            console.log(`[CRON] Repeat reminder ${reminder.id} has reached its end condition`);
          } else if (!nextOccurrenceResult.success) {
            console.error(`[CRON] Failed to schedule next occurrence for ${reminder.id}:`, nextOccurrenceResult.error);
          }
        }
      } else {
        console.error(`[CRON] Failed to mark reminder ${reminder.id} as delivered:`, deliveryResult.error);
      }

    } catch (error) {
      console.error(`[CRON] Error processing reminder ${reminder.id}:`, error);
    }
  }

  /**
   * Check for reminders that have timed out without response and need escalation
   */
  private async checkTimeoutEscalations(): Promise<void> {
    try {
      // Get all delivered reminders with escalation enabled
      const result = await this.service.getDeliveredRemindersWithEscalation();
      if (!result.success) {
        console.error("[CRON] Failed to get delivered reminders with escalation:", result.error);
        return;
      }

      const deliveredReminders = result.data;
      if (deliveredReminders.length > 0) {
        console.log(`[CRON] Found ${deliveredReminders.length} delivered reminders with escalation to check`);
      }

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
          console.log(`[CRON] Reminder ${reminder.id} has timed out, triggering escalation`);
          await this.processTimeoutEscalation(reminder);
        }
      }
    } catch (error) {
      console.error("[CRON] Error checking timeout escalations:", error);
    }
  }

  /**
   * Process timeout escalation for a reminder
   */
  private async processTimeoutEscalation(reminder: Reminder): Promise<void> {
    try {
      console.log(`[CRON] Processing timeout escalation for reminder ${reminder.id}`);
      
      // Trigger escalation through processor
      const escalationResult = await this.escalationProcessor.processEscalation(
        reminder,
        "timeout"
      );

      if (escalationResult.success) {
        console.log(`[CRON] Successfully sent timeout escalation for reminder ${reminder.id}`);
        
        // Mark escalation as triggered in the reminder
        const updateResult = await this.service.markEscalationTriggered(
          reminder.id,
          "timeout"
        );
        
        if (!updateResult.success) {
          console.error(
            `[CRON] Failed to mark escalation as triggered for ${reminder.id}:`,
            updateResult.error
          );
        }
      } else {
        console.error(
          `[CRON] Failed to send timeout escalation for ${reminder.id}:`,
          escalationResult.error
        );
      }
    } catch (error) {
      console.error(`[CRON] Error processing timeout escalation for ${reminder.id}:`, error);
    }
  }
}
