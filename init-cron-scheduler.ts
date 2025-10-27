/**
 * Deno.cron Scheduler Initialization
 * 
 * Registers Deno.cron jobs for automatic reminder delivery.
 * These jobs run automatically on Deno Deploy without requiring user traffic.
 */

import { ReminderRepository } from "./discord-bot/lib/reminder/repository.ts";
import { ReminderService } from "./discord-bot/lib/reminder/service.ts";
import { CronReminderScheduler } from "./discord-bot/lib/reminder/cron-scheduler.ts";
import { DiscordDeliveryService } from "./discord-bot/lib/discord/delivery.ts";

export async function initializeCronScheduler() {
  try {
    console.log("Initializing Deno.cron reminder scheduler...");

    // Get Discord bot token from environment
    const botToken = Deno.env.get("DISCORD_TOKEN");
    if (!botToken) {
      console.error("❌ DISCORD_TOKEN not found in environment variables!");
      console.log("Scheduler will not start without a valid Discord bot token");
      return null;
    }

    // Initialize Discord delivery service
    const deliveryService = new DiscordDeliveryService(botToken);
    console.log("✅ Discord delivery service initialized");

    // Initialize KV store and reminder service
    let kv;
    try {
      kv = await Deno.openKv();
      console.log("✅ Deno KV database connected");
    } catch (kvError) {
      console.error("❌ Deno KV not available:", kvError);
      console.log("Scheduler requires KV database for storing reminders");
      return null;
    }

    const repository = new ReminderRepository(kv);
    const reminderService = new ReminderService(repository);
    console.log("✅ Reminder service initialized");

    // Create and register cron scheduler
    const scheduler = new CronReminderScheduler(reminderService, deliveryService);
    scheduler.registerCronJobs();
    
    console.log("");
    console.log("🎉 Deno.cron scheduler initialized successfully!");
    console.log("📅 Reminders will be delivered automatically at their scheduled times");
    console.log("🚀 No user traffic required - Deno Deploy handles everything");
    console.log("");
    
    return scheduler;

  } catch (error) {
    console.error("❌ Failed to initialize Deno.cron scheduler:", error);
    console.log("The application will continue without automatic reminder delivery");
    console.log("Reminders can still be created and tested manually");
    return null;
  }
}
