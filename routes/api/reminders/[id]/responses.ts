/**
 * Response History API Endpoint
 * GET /api/reminders/[id]/responses
 */

import { Handlers } from "$fresh/server.ts";
import { ReminderRepository } from "../../../../discord-bot/lib/reminder/repository.ts";

export const handler: Handlers = {
  /**
   * GET /api/reminders/[id]/responses
   * Retrieve response history for a specific reminder
   */
  async GET(_req, ctx) {
    const { id } = ctx.params;

    if (!id) {
      return new Response(
        JSON.stringify({ error: "Reminder ID is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    try {
      // Get KV connection and initialize repository
      const kv = await Deno.openKv();
      const repository = new ReminderRepository(kv);

      // Fetch reminder
      const reminder = await repository.getById(id);

      if (!reminder) {
        return new Response(
          JSON.stringify({ error: "Reminder not found" }),
          { status: 404, headers: { "Content-Type": "application/json" } }
        );
      }

      // Return response history
      return new Response(
        JSON.stringify({
          success: true,
          reminderId: id,
          responses: reminder.responses || [],
          totalResponses: reminder.responses?.length || 0
        }),
        { 
          status: 200, 
          headers: { "Content-Type": "application/json" } 
        }
      );

    } catch (error) {
      console.error(`Error fetching responses for reminder ${id}:`, error);
      
      return new Response(
        JSON.stringify({ 
          error: "Failed to fetch response history",
          details: error instanceof Error ? error.message : "Unknown error"
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  }
};
