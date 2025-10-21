// Discord interaction handler for reminder acknowledgments
// This route processes Discord button interactions and other acknowledgment methods

import { type Handlers } from "$fresh/server.ts";
import { AcknowledgmentTracker, acknowledgmentUtils } from "../../lib/acknowledgment/index.ts";
import type { AcknowledgmentAction } from "../../lib/acknowledgment/index.ts";

/**
 * Discord interaction types
 */
interface DiscordInteraction {
  id: string;
  application_id: string;
  type: number; // 1 = PING, 2 = APPLICATION_COMMAND, 3 = MESSAGE_COMPONENT
  data?: {
    custom_id?: string;
    component_type?: number;
  };
  user?: {
    id: string;
    username: string;
  };
  member?: {
    user: {
      id: string;
      username: string;
    };
  };
  message?: {
    id: string;
  };
  channel_id?: string;
  guild_id?: string;
  token: string;
}

/**
 * Discord interaction response types
 */
const INTERACTION_RESPONSE_TYPES = {
  PONG: 1,
  CHANNEL_MESSAGE_WITH_SOURCE: 4,
  DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE: 5,
  DEFERRED_UPDATE_MESSAGE: 6,
  UPDATE_MESSAGE: 7,
} as const;

export const handler: Handlers = {
  /**
   * Handle Discord interactions (button clicks, slash commands, etc.)
   */
  async POST(req, _ctx) {
    try {
      // Verify Discord signature
      const signature = req.headers.get("x-signature-ed25519");
      const timestamp = req.headers.get("x-signature-timestamp");
      
      if (!signature || !timestamp) {
        return new Response("Missing signature headers", { status: 401 });
      }

      // TODO: Implement Ed25519 signature verification
      // For now, we'll skip verification in development
      const isValidSignature = true; // await verifyDiscordSignature(req, signature, timestamp);
      
      if (!isValidSignature) {
        return new Response("Invalid signature", { status: 401 });
      }

      const interaction: DiscordInteraction = await req.json();

      // Handle ping (verification)
      if (interaction.type === 1) {
        return new Response(
          JSON.stringify({ type: INTERACTION_RESPONSE_TYPES.PONG }),
          {
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      // Handle button interactions
      if (interaction.type === 3 && interaction.data?.component_type === 2) {
        return await handleButtonInteraction(interaction);
      }

      // Handle other interaction types
      return new Response(
        JSON.stringify({
          type: INTERACTION_RESPONSE_TYPES.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            content: "Interaction type not supported yet.",
            flags: 64, // EPHEMERAL
          },
        }),
        {
          headers: { "Content-Type": "application/json" },
        }
      );

    } catch (error) {
      console.error("Error handling Discord interaction:", error);
      return new Response("Internal server error", { status: 500 });
    }
  },
};

/**
 * Handle button interaction for reminder acknowledgments
 */
async function handleButtonInteraction(interaction: DiscordInteraction) {
  try {
    const customId = interaction.data?.custom_id;
    if (!customId) {
      return createErrorResponse("Missing custom ID");
    }

    // Parse button custom ID
    const buttonData = acknowledgmentUtils.parseButtonCustomId(customId);
    if (!buttonData) {
      return createErrorResponse("Invalid button format");
    }

    const userId = interaction.user?.id || interaction.member?.user?.id;
    if (!userId) {
      return createErrorResponse("User information not found");
    }

    // Check if user can acknowledge this delivery
    const canAck = await AcknowledgmentTracker.canAcknowledge(
      buttonData.deliveryId,
      userId
    );

    if (!canAck.authorized) {
      return createErrorResponse(canAck.reason || "Not authorized");
    }

    // Process the acknowledgment
    const result = await AcknowledgmentTracker.processAcknowledgment(
      buttonData.deliveryId,
      userId,
      buttonData.action,
      "button",
      {
        messageId: interaction.message?.id,
        channelId: interaction.channel_id,
        customId: customId,
        snoozeMinutes: getSnoozeMinutes(buttonData.action),
      }
    );

    if (result.success) {
      return createSuccessResponse(result.message, buttonData.action);
    } else {
      return createErrorResponse(result.error || "Failed to process acknowledgment");
    }

  } catch (error) {
    console.error("Error handling button interaction:", error);
    return createErrorResponse("Internal error processing acknowledgment");
  }
}

/**
 * Create success response with updated message
 */
function createSuccessResponse(message: string, action: AcknowledgmentAction) {
  const emoji = acknowledgmentUtils.getActionEmoji(action);
  
  return new Response(
    JSON.stringify({
      type: INTERACTION_RESPONSE_TYPES.UPDATE_MESSAGE,
      data: {
        content: `${emoji} ${message}`,
        components: [], // Remove buttons after acknowledgment
        embeds: [], // Remove embed after acknowledgment
      },
    }),
    {
      headers: { "Content-Type": "application/json" },
    }
  );
}

/**
 * Create error response
 */
function createErrorResponse(errorMessage: string) {
  return new Response(
    JSON.stringify({
      type: INTERACTION_RESPONSE_TYPES.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        content: `❌ ${errorMessage}`,
        flags: 64, // EPHEMERAL
      },
    }),
    {
      headers: { "Content-Type": "application/json" },
    }
  );
}

/**
 * Get snooze minutes based on action
 */
function getSnoozeMinutes(action: AcknowledgmentAction): number | undefined {
  return action === "snooze" ? 15 : undefined; // Default 15 minutes
}

/**
 * Verify Discord signature (placeholder)
 */
function _verifyDiscordSignature(
  _req: Request,
  _signature: string,
  _timestamp: string
): boolean {
  // TODO: Implement proper Ed25519 signature verification
  // This requires the Discord public key and crypto verification
  return true; // Skip verification for now
}