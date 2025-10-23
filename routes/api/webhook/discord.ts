/// <reference lib="deno.unstable" />

/**
 * Discord Interactions Webhook Endpoint
 * Handles button interactions (acknowledge/decline) from Discord
 */

import { Handlers } from "$fresh/server.ts";
import { verifyDiscordSignature } from "../../../discord-bot/lib/discord/verify.ts";
import { getConfig } from "../../../discord-bot/lib/config/env.ts";
import { DiscordDeliveryService } from "../../../discord-bot/lib/discord/delivery.ts";
import { ReminderService } from "../../../discord-bot/lib/reminder/service.ts";
import { ReminderRepository } from "../../../discord-bot/lib/reminder/repository.ts";

// Discord Interaction Types
const InteractionType = {
  PING: 1,
  APPLICATION_COMMAND: 2,
  MESSAGE_COMPONENT: 3,
  APPLICATION_COMMAND_AUTOCOMPLETE: 4,
  MODAL_SUBMIT: 5,
};

// Discord Interaction Response Types
const InteractionResponseType = {
  PONG: 1,
  CHANNEL_MESSAGE_WITH_SOURCE: 4,
  DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE: 5,
  DEFERRED_UPDATE_MESSAGE: 6,
  UPDATE_MESSAGE: 7,
};

export const handler: Handlers = {
  // GET endpoint for testing webhook accessibility
  GET(_req) {
    console.log("🔍 GET request to webhook endpoint (testing connectivity)");
    const config = getConfig();
    return new Response(
      JSON.stringify({
        status: "ok",
        message: "Discord webhook endpoint is accessible",
        timestamp: new Date().toISOString(),
        publicKeyConfigured: !!config.publicKey,
        publicKeyLength: config.publicKey?.length || 0,
        endpoint: "/api/webhook/discord",
        note: "This endpoint accepts POST requests from Discord for interaction callbacks"
      }, null, 2),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  },

  async POST(req) {
    console.log("=== DISCORD WEBHOOK RECEIVED ===");
    console.log("Request URL:", req.url);
    console.log("Request method:", req.method);
    
    try {
      // Get raw body for signature verification
      const body = await req.text();
      console.log("Body length:", body.length);
      console.log("Body preview:", body.substring(0, 200));
      
      const signature = req.headers.get("X-Signature-Ed25519");
      const timestamp = req.headers.get("X-Signature-Timestamp");
      
      console.log("Signature present:", !!signature);
      console.log("Timestamp present:", !!timestamp);
      console.log("Signature:", signature);
      console.log("Timestamp:", timestamp);

      if (!signature || !timestamp) {
        console.error("❌ Missing Discord signature headers");
        return new Response("Unauthorized", { status: 401 });
      }

      // Verify Discord signature
      const config = getConfig();
      console.log("Public key configured:", !!config.publicKey);
      console.log("Public key length:", config.publicKey?.length);
      console.log("Public key preview:", config.publicKey?.substring(0, 20) + "...");
      
      const isValid = await verifyDiscordSignature(
        body,
        signature,
        timestamp,
        config.publicKey
      );

      console.log("Signature verification result:", isValid);

      if (!isValid) {
        console.error("❌ Invalid Discord signature");
        console.error("This could mean:");
        console.error("1. PUBLIC_KEY in .env doesn't match Discord Developer Portal");
        console.error("2. Request is not from Discord");
        console.error("3. Request was modified in transit");
        return new Response("Invalid signature", { status: 401 });
      }

      // Parse interaction data
      const interaction = JSON.parse(body);
      console.log("✅ Interaction parsed successfully");
      console.log("Interaction type:", interaction.type);
      console.log("Interaction data:", JSON.stringify(interaction.data, null, 2));
      console.log("Custom ID:", interaction.data?.custom_id);

      // Handle PING (Discord verification)
      if (interaction.type === InteractionType.PING) {
        console.log("🏓 Responding to Discord PING verification");
        const response = {
          type: InteractionResponseType.PONG
        };
        console.log("PING response:", JSON.stringify(response));
        return new Response(
          JSON.stringify(response),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      // Handle button interactions
      if (interaction.type === InteractionType.MESSAGE_COMPONENT) {
        console.log("🔘 Button interaction detected");
        const customId = interaction.data?.custom_id;
        const userId = interaction.member?.user?.id || interaction.user?.id;

        console.log(`Button clicked - Custom ID: ${customId}, User: ${userId}`);

        // Parse custom_id to extract action and reminder ID
        // Format: "acknowledge_reminder_<id>" or "decline_reminder_<id>"
        const customIdMatch = customId?.match(/^(acknowledge|decline)_reminder(?:_(.+))?$/);
        
        console.log("Custom ID match result:", customIdMatch);
        
        if (customIdMatch) {
          const action = customIdMatch[1] as "acknowledge" | "decline";
          const reminderId = customIdMatch[2]; // May be undefined for old format
          
          console.log(`✅ Parsed - Action: ${action}, Reminder ID: ${reminderId || 'unknown'}, User: ${userId}`);
          
          // Respond immediately to Discord to prevent "interaction failed"
          const responseMessage = action === "acknowledge"
            ? "✅ **Reminder acknowledged!** Thank you for confirming."
            : "❌ **Reminder declined.** This has been noted.";

          const responsePayload = {
            type: InteractionResponseType.UPDATE_MESSAGE,
            data: {
              content: `${interaction.message.content}\n\n${responseMessage}`,
              components: [], // Remove buttons after interaction
            },
          };
          
          console.log("Sending response to Discord:", JSON.stringify(responsePayload, null, 2));

          // Send immediate response to update the message
          const response = new Response(
            JSON.stringify(responsePayload),
            {
              status: 200,
              headers: { "Content-Type": "application/json" },
            }
          );

          console.log("✅ Response sent successfully");

          // Process the response asynchronously (don't await)
          // This prevents blocking the Discord interaction response
          Promise.resolve().then(() => {
            processReminderResponse(userId, action, reminderId, interaction.message);
          }).catch((err: Error) => {
            console.error("⚠️ Error processing reminder response:", err);
          });

          return response;
        }
        
        console.warn("⚠️ Unknown custom_id format:", customId);

        // Unknown button
        return new Response(
          JSON.stringify({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
              content: "Unknown interaction",
              flags: 64, // Ephemeral
            },
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      // Unknown interaction type
      console.warn("⚠️ Unhandled interaction type:", interaction.type);
      console.log("Full interaction object:", JSON.stringify(interaction, null, 2));
      return new Response("OK", { status: 200 });
    } catch (error) {
      console.error("💥 FATAL ERROR handling Discord webhook:");
      console.error("Error type:", error?.constructor?.name);
      console.error("Error message:", error instanceof Error ? error.message : String(error));
      console.error("Error stack:", error instanceof Error ? error.stack : "No stack trace");
      return new Response("Internal server error", { status: 500 });
    }
  },
};

/**
 * Process reminder response asynchronously
 */
async function processReminderResponse(
  userId: string,
  action: "acknowledge" | "decline",
  reminderId: string | undefined,
  message: Record<string, unknown>
) {
  try {
    console.log(`Processing ${action} response from user ${userId} for reminder ${reminderId || 'unknown'}`);
    
    // Log the response
    console.log({
      reminderId,
      userId,
      action,
      timestamp: new Date().toISOString(),
      messageId: message.id,
    });
    
    // If reminder was declined, send escalation message
    if (action === "decline" && reminderId) {
      console.log(`🚨 Reminder ${reminderId} was declined, checking for escalation target...`);
      
      try {
        // Get the reminder from database
        const kv = await Deno.openKv();
        const repository = new ReminderRepository(kv);
        const reminderService = new ReminderService(repository);
        const reminderResult = await reminderService.getReminder(reminderId);
        
        if (!reminderResult.success || !reminderResult.data) {
          console.error(`❌ Reminder ${reminderId} not found in database`);
          return;
        }
        
        const reminder = reminderResult.data;
        console.log(`Found reminder: ${reminder.id}, has escalation: ${!!reminder.escalation}`);
        
        // Check if reminder has escalation configured
        if (reminder.escalation && reminder.escalation.isActive && reminder.escalation.secondaryUserId) {
          console.log(`📤 Sending escalation to user ${reminder.escalation.secondaryUserId}`);
          
          // Initialize Discord delivery service
          const config = getConfig();
          const deliveryService = new DiscordDeliveryService(config.discordToken);
          
          // Create escalation message
          const escalationMessage = `🚨 **Reminder Declined by User**\n\n` +
            `**Original Reminder:**\n${reminder.content}\n\n` +
            `**Status:** The reminder was manually declined by <@${userId}>\n` +
            `**Time:** ${new Date().toISOString()}\n\n` +
            `This reminder requires your attention as the escalation contact.`;
          
          // Send escalation message
          const result = await deliveryService.sendEscalation(reminder, escalationMessage);
          
          if (result.success) {
            console.log(`✅ Escalation message sent successfully to ${reminder.escalation.secondaryUserId}`);
            console.log(`Message ID: ${result.messageId}`);
          } else {
            console.error(`❌ Failed to send escalation message: ${result.error}`);
          }
        } else {
          console.log(`ℹ️ No escalation configured for reminder ${reminderId}`);
        }
      } catch (error) {
        console.error(`❌ Error processing declined reminder escalation:`, error);
        console.error(error instanceof Error ? error.stack : String(error));
      }
    } else if (action === "acknowledge") {
      console.log(`✅ Reminder ${reminderId} was acknowledged - no escalation needed`);
    }
    
  } catch (error) {
    console.error("Failed to process reminder response:", error);
    throw error;
  }
}
