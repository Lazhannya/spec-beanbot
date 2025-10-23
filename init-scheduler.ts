/**
 * Scheduler Initialization
 * Starts the reminder scheduler for automatic delivery
 */

import { ReminderRepository } from "./discord-bot/lib/reminder/repository.ts";
import { ReminderService } from "./discord-bot/lib/reminder/service.ts";
import { ReminderScheduler } from "./discord-bot/lib/reminder/scheduler.ts";
import { DiscordDeliveryService } from "./discord-bot/lib/discord/delivery.ts";

let scheduler: ReminderScheduler | null = null;

export async function initializeScheduler() {
  if (scheduler) {
    console.log("Scheduler already initialized");
    return scheduler;
  }

  try {
    console.log("Initializing reminder scheduler...");

    // Get Discord bot token from environment
    const botToken = Deno.env.get("DISCORD_TOKEN");
    if (!botToken) {
      console.error("DISCORD_TOKEN not found in environment variables!");
      console.log("Scheduler will not start without a valid Discord bot token");
      return null;
    }

    // Initialize Discord delivery service
    const deliveryService = new DiscordDeliveryService(botToken);
    console.log("Discord delivery service initialized");

    // Initialize KV store and reminder service
    let kv;
    try {
      kv = await Deno.openKv();
      console.log("Deno KV database connected");
    } catch (kvError) {
      console.warn("Deno KV not available, using in-memory mock");
      console.log("Note: Reminders will not persist across restarts");
      // Create a simple in-memory mock for development
      kv = null;
    }

    if (!kv) {
      console.log("⚠️  Scheduler not started: KV database required");
      console.log("Reminders can still be tested manually via the Test button");
      return null;
    }

    const repository = new ReminderRepository(kv);
    const reminderService = new ReminderService(repository);
    console.log("Reminder service initialized");

    // Create and start scheduler
    scheduler = new ReminderScheduler(reminderService, deliveryService);
    scheduler.start();
    
    console.log("✅ Reminder scheduler started successfully!");
    console.log("   Checking for due reminders every 30 seconds");
    return scheduler;

  } catch (error) {
    console.error("Failed to initialize scheduler:", error);
    console.log("The application will continue without automatic reminder delivery");
    console.log("Reminders can still be created and tested manually");
    return null;
  }
}

export function getScheduler(): ReminderScheduler | null {
  return scheduler;
}
