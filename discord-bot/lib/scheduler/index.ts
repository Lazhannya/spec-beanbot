// Main scheduler initialization and integration
// This module sets up the reminder scheduler for the application

import { initializeScheduler, startScheduler, getSchedulerStats } from "./reminder-scheduler.ts";
import type { DeliveryCallback, SchedulerConfig } from "./reminder-scheduler.ts";
import { createDelivery, updateDeliveryStatus } from "../storage/reminders.ts";
import { sendReminderViaDiscord } from "../discord/messenger.ts";
import type { Reminder, ReminderDelivery } from "../types/reminders.ts";

/**
 * Application scheduler configuration
 */
const APP_SCHEDULER_CONFIG: Partial<SchedulerConfig> = {
  checkInterval: 60 * 1000, // Check every minute
  batchSize: 25, // Process 25 reminders at once
  defaultTimezone: "America/New_York",
  maxRetries: 3,
  retryDelayMs: 5000,
  maxConcurrentDeliveries: 5,
  enableDebugLogging: false, // Enable via environment variable in production
};

/**
 * Delivery callback for sending reminders via Discord
 */
const deliveryCallback: DeliveryCallback = async (reminder: Reminder) => {
  try {
    // Create delivery record
    const deliveryRecord: Omit<ReminderDelivery, "id"> = {
      reminderId: reminder.id,
      targetUser: reminder.targetUser,
      deliveredAt: new Date(),
      deliveryMethod: "dm", // Start with DM, could be configurable
      messageContent: formatReminderMessage(reminder),
      status: "pending",
      acknowledged: false,
      attemptCount: 1,
      lastAttemptAt: new Date(),
      isEscalation: false,
    };

    const deliveryId = await createDelivery(deliveryRecord);
    if (!deliveryId) {
      return {
        success: false,
        error: "Failed to create delivery record",
        shouldRetry: true,
      };
    }

    // Update delivery status to sending
    await updateDeliveryStatus(deliveryId, "sending");

    // Send reminder via Discord
    const deliveryResult = await sendReminderViaDiscord(reminder, "dm");

    if (deliveryResult.success) {
      await updateDeliveryStatus(deliveryId, "delivered");
      
      // Update delivery record with Discord message details
      if (deliveryResult.messageId && deliveryResult.channelId) {
        // TODO: Update delivery record with message ID and channel ID
        // This will be enhanced when we add more delivery tracking
      }
      
      return { success: true };
    } else {
      await updateDeliveryStatus(deliveryId, "failed", deliveryResult.error);
      return {
        success: false,
        error: deliveryResult.error,
        shouldRetry: deliveryResult.shouldRetry,
      };
    }

  } catch (error) {
    console.error("Error in delivery callback:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      shouldRetry: true,
    };
  }
};

/**
 * Format reminder message for delivery
 */
function formatReminderMessage(reminder: Reminder): string {
  let message = `🔔 **${reminder.title}**\n\n${reminder.message}`;
  
  // Add category emoji
  const categoryEmojis: Record<string, string> = {
    health: "🏥",
    medication: "💊",
    work: "💼",
    personal: "👤",
    appointment: "📅",
    task: "✅",
    custom: "📝",
  };
  
  const emoji = categoryEmojis[reminder.category] || "🔔";
  message = `${emoji} **${reminder.title}**\n\n${reminder.message}`;
  
  // Add custom fields if available
  if (reminder.customFields && Object.keys(reminder.customFields).length > 0) {
    message += "\n\n**Details:**";
    for (const [key, value] of Object.entries(reminder.customFields)) {
      message += `\n• ${key}: ${value}`;
    }
  }
  
  // Add acknowledgment instructions
  message += "\n\n*React with ✅ to acknowledge this reminder*";
  
  return message;
}

/**
 * Initialize the application scheduler
 */
export async function initializeAppScheduler(): Promise<void> {
  try {
    console.log("Initializing reminder scheduler...");
    
    // Initialize scheduler with delivery callback
    const _scheduler = initializeScheduler(deliveryCallback, APP_SCHEDULER_CONFIG);
    
    // Start the scheduler
    await startScheduler();
    
    console.log("✅ Reminder scheduler initialized and started");
    
    // Set up graceful shutdown
    setupGracefulShutdown();
    
  } catch (error) {
    console.error("❌ Failed to initialize scheduler:", error);
    throw error;
  }
}

/**
 * Setup graceful shutdown handlers
 */
function setupGracefulShutdown(): void {
  // Note: Signal handling would be implemented in the main application startup
  // This is a placeholder for graceful shutdown logic
  console.log("Graceful shutdown handlers would be set up here");
}

/**
 * Get scheduler health status for monitoring
 */
export function getSchedulerHealth(): {
  status: "healthy" | "unhealthy" | "degraded";
  stats: ReturnType<typeof getSchedulerStats>;
  message: string;
} {
  const stats = getSchedulerStats();
  
  if (!stats) {
    return {
      status: "unhealthy",
      stats: null,
      message: "Scheduler not initialized",
    };
  }
  
  if (!stats.isRunning) {
    return {
      status: "unhealthy",
      stats,
      message: "Scheduler is not running",
    };
  }
  
  // Check if last run was recent
  const timeSinceLastRun = Date.now() - stats.lastRunAt.getTime();
  const maxInterval = 5 * 60 * 1000; // 5 minutes
  
  if (timeSinceLastRun > maxInterval) {
    return {
      status: "degraded",
      stats,
      message: `Last run was ${Math.round(timeSinceLastRun / 60000)} minutes ago`,
    };
  }
  
  // Check failure rate
  const totalDeliveries = stats.successfulDeliveries + stats.failedDeliveries;
  if (totalDeliveries > 10) {
    const failureRate = stats.failedDeliveries / totalDeliveries;
    if (failureRate > 0.15) { // More than 15% failure rate
      return {
        status: "degraded",
        stats,
        message: `High failure rate: ${Math.round(failureRate * 100)}%`,
      };
    }
  }
  
  return {
    status: "healthy",
    stats,
    message: "Scheduler operating normally",
  };
}

/**
 * Force process due reminders (for manual triggering)
 */
export async function forceProcessReminders(): Promise<{
  success: boolean;
  processed: number;
  message: string;
}> {
  try {
    const scheduler = initializeScheduler(deliveryCallback, APP_SCHEDULER_CONFIG);
    const result = await scheduler.forceProcessDueReminders();
    
    return {
      success: true,
      processed: result.processed,
      message: `Processed ${result.processed} reminders (${result.successful} successful, ${result.failed} failed)`,
    };
  } catch (error) {
    return {
      success: false,
      processed: 0,
      message: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Update scheduler configuration
 */
export function updateSchedulerConfig(config: Partial<SchedulerConfig>): boolean {
  try {
    const scheduler = initializeScheduler(deliveryCallback, APP_SCHEDULER_CONFIG);
    scheduler.updateConfig(config);
    return true;
  } catch (error) {
    console.error("Failed to update scheduler config:", error);
    return false;
  }
}

/**
 * Export scheduler utilities
 */
export { getSchedulerStats, stopScheduler } from "./reminder-scheduler.ts";
export type { SchedulerStats, SchedulerConfig } from "./reminder-scheduler.ts";