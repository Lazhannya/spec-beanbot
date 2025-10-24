/**
 * Discord Message Gateway Handler - Receives DM messages for reply-based acknowledgement
 * This endpoint receives MESSAGE_CREATE events from Discord Gateway via webhook
 * 
 * Alternative to button-based interactions - no Interactions Endpoint URL needed!
 */

import { Handlers } from "$fresh/server.ts";
import { DMListenerService } from "../../../discord-bot/lib/discord/dm-listener.ts";
import { ReminderService } from "../../../discord-bot/lib/reminder/service.ts";
import { ReminderRepository } from "../../../discord-bot/lib/reminder/repository.ts";

export const handler: Handlers = {
  /**
   * Handle incoming Discord MESSAGE_CREATE events
   */
  async POST(req) {
    try {
      const body = await req.json();
      
      console.log("=== DISCORD MESSAGE RECEIVED ===");
      console.log("Message data:", JSON.stringify(body, null, 2));

      // Verify this is a DM message
      if (body.channel_type !== 1) {
        console.log("Not a DM channel, ignoring");
        return new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      }

      // Ignore bot messages
      if (body.author?.bot) {
        console.log("Message from bot, ignoring");
        return new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      }

      // Get bot token from environment
      const botToken = Deno.env.get("DISCORD_BOT_TOKEN");
      if (!botToken) {
        console.error("DISCORD_BOT_TOKEN not configured");
        return new Response(JSON.stringify({ error: "Bot token not configured" }), {
          status: 500,
          headers: { "Content-Type": "application/json" }
        });
      }

      // Initialize services
      const kv = await Deno.openKv();
      const repository = new ReminderRepository(kv);
      const service = new ReminderService(repository);
      const dmListener = new DMListenerService(service, botToken);

      // Process the DM message
      const result = await dmListener.processDMMessage(
        body.author.id,
        body.content
      );

      console.log("DM processing result:", result);

      return new Response(JSON.stringify({ 
        ok: true,
        processed: result.success,
        action: result.action,
        reminderId: result.reminderId
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });

    } catch (error) {
      console.error("Error processing Discord message:", error);
      
      return new Response(JSON.stringify({ 
        ok: false,
        error: error instanceof Error ? error.message : "Unknown error"
      }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }
  },

  /**
   * GET request for health check
   */
  GET(_req) {
    return new Response(JSON.stringify({
      status: "ok",
      message: "Discord message gateway endpoint is accessible",
      timestamp: new Date().toISOString(),
      endpoint: "/api/gateway/discord-messages",
      note: "This endpoint receives MESSAGE_CREATE events for reply-based acknowledgement"
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  }
};
