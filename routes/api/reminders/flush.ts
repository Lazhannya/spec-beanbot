/// <reference lib="deno.unstable" />

/**
 * Flush All Reminders API Endpoint
 * DELETE /api/reminders/flush - Delete all reminders from KV database
 * 
 * DANGEROUS: This permanently removes all reminders without recovery
 * Should only be used for testing/development or complete data reset
 */

import { Handlers } from "$fresh/server.ts";
import { ReminderService } from "../../../discord-bot/lib/reminder/service.ts";
import { ReminderRepository } from "../../../discord-bot/lib/reminder/repository.ts";

export const handler: Handlers = {
  /**
   * DELETE /api/reminders/flush
   * Delete all reminders from the database
   * 
   * WARNING: This is a destructive operation with no undo
   */
  async DELETE(_req) {
    try {
      console.log("⚠️  FLUSH ALL REMINDERS requested");

      // Initialize service
      const kv = await Deno.openKv();
      const repository = new ReminderRepository(kv);
      const service = new ReminderService(repository);

      // Get all reminders (with high limit to get everything)
      const reminders = await repository.getAll(0, 10000);
      console.log(`Found ${reminders.length} reminders to delete`);

      // Delete each reminder
      let successCount = 0;
      let failCount = 0;
      const errors: string[] = [];

      for (const reminder of reminders) {
        console.log(`Deleting reminder ${reminder.id}...`);
        const deleteResult = await service.deleteReminder(reminder.id);
        
        if (deleteResult.success) {
          successCount++;
        } else {
          failCount++;
          errors.push(`${reminder.id}: ${deleteResult.error.message}`);
          console.error(`Failed to delete reminder ${reminder.id}:`, deleteResult.error);
        }
      }

      console.log(`✅ Flush complete: ${successCount} deleted, ${failCount} failed`);

      return new Response(
        JSON.stringify({
          success: true,
          message: `Flushed ${successCount} reminders from database`,
          details: {
            total: reminders.length,
            deleted: successCount,
            failed: failCount,
            errors: errors.length > 0 ? errors : undefined
          }
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" }
        }
      );

    } catch (error) {
      console.error("Error flushing reminders:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      
      return new Response(
        JSON.stringify({ 
          error: "Failed to flush reminders",
          details: errorMessage 
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  },
};
