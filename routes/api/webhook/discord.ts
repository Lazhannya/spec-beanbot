/**
 * Discord Interactions Webhook Endpoint
 * Handles button interactions (acknowledge/decline) from Discord
 */

import { Handlers } from "$fresh/server.ts";
import { verifyDiscordSignature } from "../../../discord-bot/lib/discord/verify.ts";
import { getConfig } from "../../../discord-bot/lib/config/env.ts";
import { ReminderService } from "../../../discord-bot/lib/reminder/service.ts";
import { ReminderRepository } from "../../../discord-bot/lib/reminder/repository.ts";
import { ResponseType } from "../../../discord-bot/types/reminder.ts";

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
    const startTime = Date.now();
    console.log("=== DISCORD WEBHOOK RECEIVED ===");
    console.log("Request URL:", req.url);
    console.log("Request method:", req.method);
    
    try {
      // Get raw body for signature verification
      const bodyStartTime = Date.now();
      const body = await req.text();
      console.log("Body read time:", Date.now() - bodyStartTime, "ms");
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
      
      const verifyStartTime = Date.now();
      const isValid = await verifyDiscordSignature(
        body,
        signature,
        timestamp,
        config.publicKey
      );
      console.log("Signature verification time:", Date.now() - verifyStartTime, "ms");
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
      const parseStartTime = Date.now();
      const interaction = JSON.parse(body);
      console.log("JSON parse time:", Date.now() - parseStartTime, "ms");
      console.log("✅ Interaction parsed successfully");
      console.log("Interaction type:", interaction.type);
      console.log("Interaction data:", JSON.stringify(interaction.data, null, 2));
      console.log("Custom ID:", interaction.data?.custom_id);
      console.log("Total time so far:", Date.now() - startTime, "ms");

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
          
          const responseStartTime = Date.now();
          
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
          
          console.log("Response payload prepared in:", Date.now() - responseStartTime, "ms");
          console.log("Total processing time before response:", Date.now() - startTime, "ms");
          console.log("Sending response to Discord:", JSON.stringify(responsePayload, null, 2));

          // Send immediate response to update the message
          const response = new Response(
            JSON.stringify(responsePayload),
            {
              status: 200,
              headers: { "Content-Type": "application/json" },
            }
          );

          console.log("✅ Response created, returning to Discord");
          console.log("Total response time:", Date.now() - startTime, "ms");

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
  _message: Record<string, unknown>
) {
  try {
    console.log(`Processing ${action} response from user ${userId} for reminder ${reminderId || 'unknown'}`);
    
    if (!reminderId) {
      console.warn("⚠️ No reminder ID provided, cannot update database");
      return;
    }

    // Initialize database connection and services
    const kv = await Deno.openKv();
    const repository = new ReminderRepository(kv);
    const service = new ReminderService(repository);
    
    // Map action to ResponseType
    const responseType = action === "acknowledge" 
      ? ResponseType.ACKNOWLEDGED 
      : ResponseType.DECLINED;
    
    // Record the user response
    const result = await service.recordUserResponse(reminderId, userId, responseType);
    
    if (result.success) {
      console.log(`✅ Successfully recorded ${action} response for reminder ${reminderId}`);
    } else {
      console.error(`❌ Failed to record response: ${result.error?.message}`);
    }
    
  } catch (error) {
    console.error("💥 Failed to process reminder response:", error);
    console.error("Error details:", error instanceof Error ? error.stack : String(error));
  }
}
