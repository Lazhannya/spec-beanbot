/**
 * Top-Level Deno.cron Job Definitions
 * 
 * CRITICAL: Deno.cron() MUST be called at top-level module scope for Deno Deploy.
 * Any nested definitions (inside functions, classes, etc.) are ignored.
 * 
 * This file defines all cron jobs at the module top-level as required.
 */

import { ReminderRepository } from "./discord-bot/lib/reminder/repository.ts";
import { ReminderService } from "./discord-bot/lib/reminder/service.ts";
import { DiscordDeliveryService } from "./discord-bot/lib/discord/delivery.ts";
import { EscalationProcessor } from "./discord-bot/lib/reminder/escalation.ts";
import { Reminder, ReminderStatus } from "./discord-bot/types/reminder.ts";
import { DeliveryQueue } from "./discord-bot/lib/scheduler/queue.ts";
import { logger } from "./discord-bot/lib/utils/logger.ts";

// Initialize services for cron job execution
// These are initialized once when the module is loaded
let reminderService: ReminderService | null = null;
let deliveryService: DiscordDeliveryService | null = null;
let escalationProcessor: EscalationProcessor | null = null;
let deliveryQueue: DeliveryQueue | null = null;

/**
 * Initialize services for cron job execution
 */
async function initializeCronServices() {
  if (reminderService) return; // Already initialized
  
  try {
    console.log("[CRON-INIT] Initializing services for cron jobs...");

    // Get Discord bot token from environment
    const botToken = Deno.env.get("DISCORD_TOKEN");
    if (!botToken) {
      console.error("[CRON-INIT] ❌ DISCORD_TOKEN not found in environment variables!");
      return;
    }

    // Initialize Discord delivery service
    deliveryService = new DiscordDeliveryService(botToken);
    console.log("[CRON-INIT] ✅ Discord delivery service initialized");

    // Initialize KV store and reminder service
    let kv;
    try {
      kv = await Deno.openKv();
      console.log("[CRON-INIT] ✅ Deno KV database connected");
    } catch (kvError) {
      console.error("[CRON-INIT] ❌ Deno KV not available:", kvError);
      return;
    }

    const repository = new ReminderRepository(kv);
    deliveryQueue = new DeliveryQueue(kv);
    reminderService = new ReminderService(repository, deliveryQueue);
    escalationProcessor = new EscalationProcessor(deliveryService);
    console.log("[CRON-INIT] ✅ Reminder service initialized");
    
    console.log("[CRON-INIT] 🎉 All cron services initialized successfully!");
    
  } catch (error) {
    console.error("[CRON-INIT] ❌ Failed to initialize cron services:", error);
  }
}

/**
 * Check for reminders that are due for delivery
 */
async function checkDueReminders(): Promise<void> {
  try {
    console.log("[CRON-DEBUG] Starting due reminders check...");
    
    if (!reminderService) {
      console.log("[CRON-DEBUG] Reminder service not initialized, initializing...");
      await initializeCronServices();
      if (!reminderService) {
        console.error("[CRON] Reminder service not available, skipping due reminders check");
        return;
      }
    }

    console.log("[CRON-DEBUG] Calling getDueReminders()...");
    const result = await reminderService.getDueReminders();
    if (!result.success) {
      console.error("[CRON] Failed to get due reminders:", result.error);
      return;
    }

    const dueReminders = result.data;
    console.log(`[CRON-DEBUG] Query returned ${dueReminders.length} due reminders`);
    
    if (dueReminders.length > 0) {
      console.log(`[CRON] Found ${dueReminders.length} due reminders to process:`);
      dueReminders.forEach((reminder, i) => {
        console.log(`[CRON-DEBUG] Reminder ${i + 1}: ID=${reminder.id}, scheduled=${new Date(reminder.scheduledTime).toISOString()}, status=${reminder.status}`);
      });
    } else {
      console.log("[CRON-DEBUG] No due reminders found. Current time:", new Date().toISOString());
    }

    // Process each due reminder
    for (const reminder of dueReminders) {
      await processReminder(reminder);
    }
  } catch (error) {
    console.error("[CRON] Error checking due reminders:", error);
    console.error("[CRON] Error details:", error instanceof Error ? error.stack : error);
  }
}

/**
 * Process a single due reminder
 */
async function processReminder(reminder: Reminder): Promise<void> {
  try {
    console.log(`[CRON] Processing reminder ${reminder.id} for user ${reminder.targetUserId}`);

    if (!reminderService || !deliveryService) {
      console.error("[CRON] Services not initialized");
      return;
    }

    // Check if reminder is still pending (could have been cancelled)
    const currentResult = await reminderService.getReminder(reminder.id);
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
    const discordResult = await deliveryService.sendReminder(currentReminder);
    
    if (!discordResult.success) {
      console.error(`[CRON] Failed to send Discord message for ${reminder.id}:`, discordResult.error);
      return;
    }
    
    console.log(`[CRON] Successfully sent Discord message for reminder ${reminder.id}, message ID: ${discordResult.messageId}`);
    
    // Mark as delivered after successful Discord send
    const deliveryResult = await reminderService.markAsDelivered(reminder.id);
    
    if (deliveryResult.success) {
      console.log(`[CRON] Successfully marked reminder ${reminder.id} as delivered`);
      
      // Check if this is a repeat reminder and schedule next occurrence
      if (reminder.repeatRule && reminder.repeatRule.isActive) {
        console.log(`[CRON] Scheduling next occurrence for repeat reminder ${reminder.id}`);
        const nextOccurrenceResult = await reminderService.scheduleNextRepeatOccurrence(reminder.id);
        
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
async function checkTimeoutEscalations(): Promise<void> {
  try {
    if (!reminderService || !escalationProcessor) {
      await initializeCronServices();
      if (!reminderService || !escalationProcessor) {
        console.error("[CRON] Services not available, skipping escalations check");
        return;
      }
    }

    // Get all delivered reminders with escalation enabled
    const result = await reminderService.getDeliveredRemindersWithEscalation();
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
        await processTimeoutEscalation(reminder);
      }
    }
  } catch (error) {
    console.error("[CRON] Error checking timeout escalations:", error);
  }
}

/**
 * Process timeout escalation for a reminder
 */
async function processTimeoutEscalation(reminder: Reminder): Promise<void> {
  try {
    console.log(`[CRON] Processing timeout escalation for reminder ${reminder.id}`);
    
    if (!reminderService || !escalationProcessor) {
      console.error("[CRON] Services not initialized");
      return;
    }
    
    // Trigger escalation through processor
    const escalationResult = await escalationProcessor.processEscalation(
      reminder,
      "timeout"
    );

    if (escalationResult.success) {
      console.log(`[CRON] Successfully sent timeout escalation for reminder ${reminder.id}`);
      
      // Mark escalation as triggered in the reminder
      const updateResult = await reminderService.markEscalationTriggered(
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

// ====================================================================
// TOP-LEVEL DENO.CRON DEFINITIONS - REQUIRED FOR DENO DEPLOY
// ====================================================================
// These MUST be at module top-level or Deno Deploy will ignore them

console.log("[CRON-REGISTER] Registering Deno.cron jobs at top-level module scope...");

// Check for due reminders every minute
// Cron format: minute hour day month weekday
// "* * * * *" = every minute
Deno.cron("Check due reminders", "* * * * *", async () => {
  // Skip execution only during build process
  if (Deno.args.includes("build")) {
    console.log("[CRON] Skipping cron execution during build");
    return;
  }
  
  console.log("[CRON] ⏰ Checking for due reminders...");
  console.log("[CRON] Current time:", new Date().toISOString());
  await checkDueReminders();
});

// Check for timeout escalations every 2 minutes
// "*/2 * * * *" = every 2 minutes
Deno.cron("Check timeout escalations", "*/2 * * * *", async () => {
  // Skip execution only during build process
  if (Deno.args.includes("build")) {
    console.log("[CRON] Skipping escalation check during build");
    return;
  }
  
  console.log("[CRON] ⏰ Checking for timeout escalations...");
  console.log("[CRON] Current time:", new Date().toISOString());
  await checkTimeoutEscalations();
});

// Enhanced delivery queue processing - runs every 30 seconds for more accurate delivery
// "*/30 * * * * *" format not supported, using every minute
Deno.cron("Enhanced delivery queue", "* * * * *", async () => {
  // Skip execution only during build process
  if (Deno.args.includes("build")) {
    console.log("[CRON] Skipping enhanced delivery queue during build");
    return;
  }
  
  console.log("[CRON] ⏰ Processing enhanced delivery queue...");
  await processDeliveryQueue();
});

/**
 * Process the enhanced delivery queue with timezone-aware scheduling
 */
async function processDeliveryQueue(): Promise<void> {
  try {
    if (!deliveryQueue || !deliveryService) {
      await initializeCronServices();
      if (!deliveryQueue || !deliveryService) {
        console.error("[CRON] Enhanced delivery services not available, skipping queue processing");
        return;
      }
    }

    // Get reminders due for delivery
    const dueResult = await deliveryQueue.getDueReminders();
    if (!dueResult.success) {
      logger.error("Failed to get due reminders from queue", { 
        operation: "queue_processing", 
        error: {
          name: dueResult.error.name,
          message: dueResult.error.message,
          ...(dueResult.error.stack && { stack: dueResult.error.stack })
        }
      });
      return;
    }

    const dueItems = dueResult.data;
    if (dueItems.length === 0) {
      logger.debug("No reminders due for delivery", { operation: "queue_processing" });
      return;
    }

    logger.info(`Processing ${dueItems.length} due reminders from queue`, { 
      operation: "queue_processing",
      context: { count: dueItems.length }
    });

    // Process each due reminder
    for (const item of dueItems) {
      try {
        logger.info("Processing queue item", {
          operation: "queue_item_processing",
          reminderId: item.reminderId,
          context: { 
            attempt: item.attempt + 1,
            maxAttempts: item.maxAttempts,
            scheduledUtc: item.scheduledUtc.toISOString()
          }
        });

        // Create a proper reminder object for the delivery service
        const tempReminder: Reminder = {
          id: item.reminderId,
          targetUserId: item.userId,
          content: item.messageContent,
          status: ReminderStatus.PENDING,
          scheduledTime: item.scheduledUtc,
          timezone: item.scheduledTimezone,
          scheduledTimezone: item.scheduledTimezone,
          userDisplayTime: item.userDisplayTime,
          utcScheduledTime: item.scheduledUtc,
          createdAt: item.createdAt,
          updatedAt: item.updatedAt,
          createdBy: "system",
          deliveryAttempts: item.attempt,
          responses: [],
          testExecutions: []
        };

        // Attempt delivery through Discord
        const deliveryResult = await deliveryService.sendReminder(tempReminder);

        if (deliveryResult.success) {
          // Mark as delivered in the queue
          const markResult = await deliveryQueue.markDelivered(item.id);
          if (markResult.success) {
            logger.info("Successfully delivered reminder from queue", {
              operation: "queue_delivery_success",
              reminderId: item.reminderId,
              userId: item.userId
            });
          } else {
            logger.error("Failed to mark reminder as delivered in queue", {
              operation: "queue_mark_delivered_error",
              reminderId: item.reminderId,
              error: {
                name: markResult.error.name,
                message: markResult.error.message,
                ...(markResult.error.stack && { stack: markResult.error.stack })
              }
            });
          }
        } else {
          // Mark as failed and schedule retry if possible
          const errorMessage = deliveryResult.error || "Unknown delivery error";
          const failResult = await deliveryQueue.markFailed(item.id, errorMessage);
          if (failResult.success) {
            const { willRetry, nextRetry } = failResult.data;
            if (willRetry && nextRetry) {
              logger.warn("Delivery failed, retry scheduled", {
                operation: "queue_delivery_retry",
                reminderId: item.reminderId,
                context: { 
                  nextRetry: nextRetry.toISOString(),
                  attempt: item.attempt + 1
                }
              });
            } else {
              logger.error("Delivery permanently failed", {
                operation: "queue_delivery_permanent_failure",
                reminderId: item.reminderId,
                context: { finalAttempt: item.attempt + 1 }
              });
            }
          } else {
            logger.error("Failed to mark delivery as failed in queue", {
              operation: "queue_mark_failed_error",
              reminderId: item.reminderId,
              error: {
                name: failResult.error.name,
                message: failResult.error.message,
                ...(failResult.error.stack && { stack: failResult.error.stack })
              }
            });
          }
        }
      } catch (error) {
        const errorObj = error instanceof Error ? error : new Error(String(error));
        logger.error("Error processing queue item", {
          operation: "queue_item_error",
          reminderId: item.reminderId,
          error: {
            name: errorObj.name,
            message: errorObj.message,
            ...(errorObj.stack && { stack: errorObj.stack })
          }
        });
      }
    }

    // Log queue statistics periodically
    const statsResult = await deliveryQueue.getQueueStats();
    if (statsResult.success) {
      logger.info("Delivery queue statistics", {
        operation: "queue_stats",
        context: { ...statsResult.data }
      });
    }

  } catch (error) {
    const errorObj = error instanceof Error ? error : new Error(String(error));
    logger.error("Error in delivery queue processing", {
      operation: "queue_processing_error",
      error: {
        name: errorObj.name,
        message: errorObj.message,
        ...(errorObj.stack && { stack: errorObj.stack })
      }
    });
  }
}

console.log("[CRON-REGISTER] ✅ Deno.cron jobs registered successfully!");
console.log("[CRON-REGISTER]    - Due reminders: Every minute (* * * * *)");
console.log("[CRON-REGISTER]    - Timeout escalations: Every 2 minutes (*/2 * * * *)");
console.log("[CRON-REGISTER]    - Enhanced delivery queue: Every minute (* * * * *)");
console.log("[CRON-REGISTER] 🚀 These will run automatically on Deno Deploy without user traffic");