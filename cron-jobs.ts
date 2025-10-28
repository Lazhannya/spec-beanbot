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
import { Reminder } from "./discord-bot/types/reminder.ts";

// Initialize services for cron job execution
// These are initialized once when the module is loaded
let reminderService: ReminderService | null = null;
let deliveryService: DiscordDeliveryService | null = null;
let escalationProcessor: EscalationProcessor | null = null;

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
    reminderService = new ReminderService(repository);
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
    if (!reminderService) {
      await initializeCronServices();
      if (!reminderService) {
        console.error("[CRON] Reminder service not available, skipping due reminders check");
        return;
      }
    }

    const result = await reminderService.getDueReminders();
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
      await processReminder(reminder);
    }
  } catch (error) {
    console.error("[CRON] Error checking due reminders:", error);
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
  // Skip execution during build or development
  if (Deno.args.includes("build") || !Deno.env.get("DENO_DEPLOYMENT_ID")) {
    return; // Exit immediately, don't execute cron logic
  }
  
  console.log("[CRON] ⏰ Checking for due reminders...");
  await checkDueReminders();
});

// Check for timeout escalations every 2 minutes
// "*/2 * * * *" = every 2 minutes
Deno.cron("Check timeout escalations", "*/2 * * * *", async () => {
  // Skip execution during build or development
  if (Deno.args.includes("build") || !Deno.env.get("DENO_DEPLOYMENT_ID")) {
    return; // Exit immediately, don't execute cron logic
  }
  
  console.log("[CRON] ⏰ Checking for timeout escalations...");
  await checkTimeoutEscalations();
});

console.log("[CRON-REGISTER] ✅ Deno.cron jobs registered successfully!");
console.log("[CRON-REGISTER]    - Due reminders: Every minute (* * * * *)");
console.log("[CRON-REGISTER]    - Timeout escalations: Every 2 minutes (*/2 * * * *)");
console.log("[CRON-REGISTER] 🚀 These will run automatically on Deno Deploy without user traffic");