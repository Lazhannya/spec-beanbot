/**
 * Discord Interactions Webhook Endpoint
 * Handles button interactions (acknowledge/decline) from Discord
 */

import { Handlers } from "$fresh/server.ts";
import { verifyDiscordSignature } from "../../../discord-bot/lib/discord/verify.ts";
import { getConfig } from "../../../discord-bot/lib/config/env.ts";

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
  async POST(req) {
    try {
      // Get raw body for signature verification
      const body = await req.text();
      const signature = req.headers.get("X-Signature-Ed25519");
      const timestamp = req.headers.get("X-Signature-Timestamp");

      if (!signature || !timestamp) {
        console.error("Missing Discord signature headers");
        return new Response("Unauthorized", { status: 401 });
      }

      // Verify Discord signature
      const config = getConfig();
      const isValid = await verifyDiscordSignature(
        body,
        signature,
        timestamp,
        config.publicKey
      );

      if (!isValid) {
        console.error("Invalid Discord signature");
        return new Response("Invalid signature", { status: 401 });
      }

      // Parse interaction data
      const interaction = JSON.parse(body);
      console.log("Received Discord interaction:", interaction.type, interaction.data?.custom_id);

      // Handle PING (Discord verification)
      if (interaction.type === InteractionType.PING) {
        console.log("Responding to Discord PING");
        return new Response(
          JSON.stringify({ type: InteractionResponseType.PONG }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      // Handle button interactions
      if (interaction.type === InteractionType.MESSAGE_COMPONENT) {
        const customId = interaction.data?.custom_id;
        const userId = interaction.member?.user?.id || interaction.user?.id;

        console.log(`Button interaction: ${customId} from user ${userId}`);

        // Parse custom_id to extract action and reminder ID
        // Format: "acknowledge_reminder_<id>" or "decline_reminder_<id>"
        const customIdMatch = customId?.match(/^(acknowledge|decline)_reminder(?:_(.+))?$/);
        
        if (customIdMatch) {
          const action = customIdMatch[1] as "acknowledge" | "decline";
          const reminderId = customIdMatch[2]; // May be undefined for old format
          
          console.log(`Reminder ${reminderId || 'unknown'} ${action}d by user ${userId}`);
          
          // Respond immediately to Discord to prevent "interaction failed"
          const responseMessage = action === "acknowledge"
            ? "✅ **Reminder acknowledged!** Thank you for confirming."
            : "❌ **Reminder declined.** This has been noted.";

          // Send immediate response to update the message
          const response = new Response(
            JSON.stringify({
              type: InteractionResponseType.UPDATE_MESSAGE,
              data: {
                content: `${interaction.message.content}\n\n${responseMessage}`,
                components: [], // Remove buttons after interaction
              },
            }),
            {
              status: 200,
              headers: { "Content-Type": "application/json" },
            }
          );

          // Process the response asynchronously (don't await)
          // This prevents blocking the Discord interaction response
          Promise.resolve().then(() => {
            processReminderResponse(userId, action, reminderId, interaction.message);
          }).catch((err: Error) => {
            console.error("Error processing reminder response:", err);
          });

          return response;
        }

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
      console.warn("Unhandled interaction type:", interaction.type);
      return new Response("OK", { status: 200 });
    } catch (error) {
      console.error("Error handling Discord webhook:", error);
      return new Response("Internal server error", { status: 500 });
    }
  },
};

/**
 * Process reminder response asynchronously
 */
function processReminderResponse(
  userId: string,
  action: "acknowledge" | "decline",
  reminderId: string | undefined,
  message: Record<string, unknown>
) {
  try {
    console.log(`Processing ${action} response from user ${userId} for reminder ${reminderId || 'unknown'}`);
    
    // TODO: Update reminder status in database
    // In a full implementation, you would:
    // 1. Get the reminder from database using reminderId
    // 2. Update the reminder status (acknowledged/declined)
    // 3. Log the response with timestamp
    // 4. Cancel escalation if it was acknowledged
    
    // Log the response (this is a simplified version)
    console.log({
      reminderId,
      userId,
      action,
      timestamp: new Date().toISOString(),
      messageId: message.id,
    });
    
    // If you have the reminder ID, you can update it in the database:
    // const kv = await Deno.openKv();
    // const reminderService = new ReminderService(kv);
    // await reminderService.recordResponse(reminderId, userId, action);
    
  } catch (error) {
    console.error("Failed to process reminder response:", error);
    throw error;
  }
}
