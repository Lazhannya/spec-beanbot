// Webhook endpoint for receiving Discord events and forwarding to n8n
import { Handlers } from "$fresh/server.ts";
import type { WebhookPayload } from "../../lib/discord/types.ts";

interface DiscordWebhookBody {
  type: number;
  data?: any;
  user?: any;
  member?: any;
  channel_id?: string;
  guild_id?: string;
  message?: any;
  token?: string;
  id?: string;
}

interface N8nWebhookPayload {
  timestamp: string;
  source: "discord_mention" | "discord_message" | "discord_reaction";
  event_type: string;
  data: {
    user_id?: string;
    username?: string;
    channel_id?: string;
    guild_id?: string;
    message_content?: string;
    message_id?: string;
    reaction_emoji?: string;
    metadata?: Record<string, unknown>;
  };
}

export const handler: Handlers = {
  async POST(req) {
    try {
      // Get headers for signature verification
      const signature = req.headers.get("x-signature-ed25519");
      const timestamp = req.headers.get("x-signature-timestamp");
      const bodyText = await req.text();

      // Verify Discord webhook signature
      const publicKey = Deno.env.get("DISCORD_PUBLIC_KEY");

      if (publicKey && signature && timestamp) {
        const isValidSignature = await validateDiscordSignature(
          signature,
          timestamp,
          bodyText,
          publicKey,
        );

        if (!isValidSignature) {
          console.warn("Invalid Discord webhook signature");
          return new Response(
            JSON.stringify({ error: "Invalid signature" }),
            {
              status: 401,
              headers: { "Content-Type": "application/json" },
            },
          );
        }
      } else if (publicKey) {
        // If public key is configured but headers are missing, reject
        console.warn("Missing signature headers");
        return new Response(
          JSON.stringify({ error: "Missing signature headers" }),
          {
            status: 401,
            headers: { "Content-Type": "application/json" },
          },
        );
      }
      // If no public key is configured, skip signature verification (development mode)

      // Parse the webhook payload
      const body: DiscordWebhookBody = JSON.parse(bodyText);

      console.log("Received webhook:", {
        type: body.type,
        hasData: !!body.data,
        hasMessage: !!body.message,
        timestamp: new Date().toISOString(),
      });

      // Validate webhook payload
      if (!body.type) {
        return new Response(
          JSON.stringify({ error: "Missing webhook type" }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          },
        );
      }

      // Process different webhook types
      let n8nPayload: N8nWebhookPayload | null = null;

      switch (body.type) {
        case 1: // Ping
          return new Response(
            JSON.stringify({ type: 1 }), // Pong response
            {
              status: 200,
              headers: { "Content-Type": "application/json" },
            },
          );

        case 2: // Application Command (Slash command)
          n8nPayload = {
            timestamp: new Date().toISOString(),
            source: "discord_mention",
            event_type: "application_command",
            data: {
              user_id: body.member?.user?.id || body.user?.id,
              username: body.member?.user?.username || body.user?.username,
              channel_id: body.channel_id,
              guild_id: body.guild_id,
              metadata: {
                command_name: body.data?.name,
                command_options: body.data?.options,
                interaction_id: body.id,
                interaction_token: body.token,
              },
            },
          };
          break;

        case 3: // Message Component (Button/Select menu)
          n8nPayload = {
            timestamp: new Date().toISOString(),
            source: "discord_message",
            event_type: "message_component",
            data: {
              user_id: body.member?.user?.id || body.user?.id,
              username: body.member?.user?.username || body.user?.username,
              channel_id: body.channel_id,
              guild_id: body.guild_id,
              message_id: body.message?.id,
              metadata: {
                component_type: body.data?.component_type,
                custom_id: body.data?.custom_id,
                values: body.data?.values,
                interaction_id: body.id,
                interaction_token: body.token,
              },
            },
          };
          break;

        case 4: // Application Command Autocomplete
          // Don't forward autocomplete to n8n, just acknowledge
          return new Response(
            JSON.stringify({
              type: 8, // Autocomplete result
              data: { choices: [] },
            }),
            {
              status: 200,
              headers: { "Content-Type": "application/json" },
            },
          );

        case 5: // Modal Submit
          n8nPayload = {
            timestamp: new Date().toISOString(),
            source: "discord_message",
            event_type: "modal_submit",
            data: {
              user_id: body.member?.user?.id || body.user?.id,
              username: body.member?.user?.username || body.user?.username,
              channel_id: body.channel_id,
              guild_id: body.guild_id,
              metadata: {
                custom_id: body.data?.custom_id,
                components: body.data?.components,
                interaction_id: body.id,
                interaction_token: body.token,
              },
            },
          };
          break;

        default:
          console.warn("Unknown webhook type:", body.type);
          return new Response(
            JSON.stringify({ error: "Unknown webhook type" }),
            {
              status: 400,
              headers: { "Content-Type": "application/json" },
            },
          );
      }

      // Forward to n8n if we have a payload
      if (n8nPayload) {
        const forwardResult = await forwardToN8n(n8nPayload);

        if (!forwardResult.success) {
          console.error("Failed to forward to n8n:", forwardResult.error);
          // Don't fail the webhook - acknowledge Discord but log the error
        }
      }

      // Acknowledge the webhook (important for Discord)
      return new Response(
        JSON.stringify({
          type: 4, // Channel message response
          data: {
            content: "✅ Event received and processed",
            flags: 64, // Ephemeral response (only visible to the user)
          },
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      );
    } catch (error) {
      console.error("Webhook processing error:", error);

      return new Response(
        JSON.stringify({
          error: "Internal server error",
          message: error.message,
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        },
      );
    }
  },

  // Handle GET requests for webhook verification/testing
  GET(req) {
    const url = new URL(req.url);
    const challenge = url.searchParams.get("challenge");

    if (challenge) {
      // Echo back the challenge for webhook verification
      return new Response(challenge, {
        status: 200,
        headers: { "Content-Type": "text/plain" },
      });
    }

    return new Response(
      JSON.stringify({
        status: "Discord Webhook Endpoint",
        timestamp: new Date().toISOString(),
        methods: ["POST", "GET"],
        description: "Receives Discord interactions and forwards to n8n",
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    );
  },
};

// Helper function to forward webhook data to n8n
async function forwardToN8n(
  payload: N8nWebhookPayload,
): Promise<{ success: boolean; error?: string }> {
  const n8nWebhookUrl = Deno.env.get("N8N_WEBHOOK_URL");

  if (!n8nWebhookUrl) {
    return {
      success: false,
      error: "N8N_WEBHOOK_URL not configured",
    };
  }

  try {
    const response = await fetch(n8nWebhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Discord-Bot-Webhook/1.0",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return {
        success: false,
        error:
          `n8n webhook failed: ${response.status} ${response.statusText} - ${errorText}`,
      };
    }

    console.log("Successfully forwarded to n8n:", {
      status: response.status,
      eventType: payload.event_type,
      userId: payload.data.user_id,
    });

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: `Network error forwarding to n8n: ${error.message}`,
    };
  }
}

// Helper function to validate Discord webhook signature (will be implemented in next task)
export async function validateDiscordSignature(
  signature: string,
  timestamp: string,
  body: string,
  publicKey: string,
): Promise<boolean> {
  try {
    // Import the public key
    const key = await crypto.subtle.importKey(
      "raw",
      hexToArrayBuffer(publicKey),
      {
        name: "Ed25519",
        namedCurve: "Ed25519",
      },
      false,
      ["verify"],
    );

    // Create the message to verify (timestamp + body)
    const message = new TextEncoder().encode(timestamp + body);

    // Convert signature from hex to ArrayBuffer
    const signatureBuffer = hexToArrayBuffer(signature);

    // Verify the signature
    const isValid = await crypto.subtle.verify(
      "Ed25519",
      key,
      signatureBuffer,
      message,
    );

    return isValid;
  } catch (error) {
    console.error("Signature verification error:", error);
    return false;
  }
}

// Helper function to convert hex string to ArrayBuffer
function hexToArrayBuffer(hex: string): ArrayBuffer {
  if (hex.length % 2 !== 0) {
    throw new Error("Invalid hex string length");
  }

  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16);
  }

  return bytes.buffer;
}
