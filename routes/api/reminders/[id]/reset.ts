/**
 * Reset Reminder to Pending API Endpoint
 * POST /api/reminders/[id]/reset
 * Resets a reminder back to pending status, allowing re-testing and editing
 */

import { HandlerContext } from "$fresh/server.ts";
import { ReminderService } from "../../../../discord-bot/lib/reminder/service.ts";
import { ReminderRepository } from "../../../../discord-bot/lib/reminder/repository.ts";
import { ReminderStatus } from "../../../../discord-bot/types/reminder.ts";

// Initialize services
let reminderService: ReminderService;

async function initializeServices() {
  if (!reminderService) {
    try {
      const kv = await Deno.openKv();
      const repository = new ReminderRepository(kv);
      reminderService = new ReminderService(repository);
    } catch (error) {
      console.error("Failed to initialize services:", error);
      throw new Error("Service initialization failed");
    }
  }
  return reminderService;
}

export const handler = {
  async POST(_req: Request, ctx: HandlerContext) {
    try {
      // Get reminder ID from URL parameters
      const reminderId = ctx.params.id;
      
      if (!reminderId) {
        return new Response(
          JSON.stringify({ error: "Missing reminder ID" }),
          { 
            status: 400,
            headers: { "Content-Type": "application/json" }
          }
        );
      }

      // Initialize services
      const service = await initializeServices();

      // Get the reminder
      const reminderResult = await service.getReminder(reminderId);
      if (!reminderResult.success) {
        return new Response(
          JSON.stringify({ error: "Reminder not found" }),
          { 
            status: 404,
            headers: { "Content-Type": "application/json" }
          }
        );
      }

      const reminder = reminderResult.data;

      // Don't allow resetting reminders that have been acknowledged or declined
      if (reminder.status === ReminderStatus.ACKNOWLEDGED || 
          reminder.status === ReminderStatus.DECLINED) {
        return new Response(
          JSON.stringify({ 
            error: `Cannot reset reminder with status "${reminder.status}". Acknowledged or declined reminders should not be reset.` 
          }),
          { 
            status: 400,
            headers: { "Content-Type": "application/json" }
          }
        );
      }

      // Reset to pending status
      console.log(`Resetting reminder ${reminderId} to pending status`);
      
      // Use repository to update status directly
      const kv = await Deno.openKv();
      const repository = new ReminderRepository(kv);
      
      await repository.update(reminderId, {
        status: ReminderStatus.PENDING,
        updatedAt: new Date()
      });

      console.log(`Successfully reset reminder ${reminderId} to pending`);

      return new Response(
        JSON.stringify({
          success: true,
          message: "Reminder reset to pending status",
          reminder: {
            id: reminderId,
            status: ReminderStatus.PENDING
          }
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" }
        }
      );

    } catch (error) {
      console.error("Error in reset reminder endpoint:", error);
      return new Response(
        JSON.stringify({ 
          error: "Internal server error",
          details: error instanceof Error ? error.message : "Unknown error"
        }),
        { 
          status: 500,
          headers: { "Content-Type": "application/json" }
        }
      );
    }
  }
};
