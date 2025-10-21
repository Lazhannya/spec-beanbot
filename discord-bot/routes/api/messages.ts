// Discord message event handler with pattern matching
// This route processes Discord message events and applies pattern analysis

import { type Handlers } from "$fresh/server.ts";
import { getPatternMatcher } from "../../lib/patterns/index.ts";
import type { MessageAnalysis, ResponseAction } from "../../lib/patterns/index.ts";

/**
 * Discord message event structure
 */
interface DiscordMessageEvent {
  id: string;
  channel_id: string;
  guild_id?: string;
  author: {
    id: string;
    username: string;
    bot?: boolean;
  };
  content: string;
  timestamp: string;
  message_reference?: {
    message_id: string;
  };
}

/**
 * Webhook payload from Discord
 */
interface DiscordWebhookPayload {
  type: number; // 0 = message
  data: DiscordMessageEvent;
}

export const handler: Handlers = {
  /**
   * Handle Discord message events
   */
  async POST(req, _ctx) {
    try {
      // Verify webhook signature (placeholder for now)
      const signature = req.headers.get("x-signature-ed25519");
      if (!signature) {
        return new Response("Missing signature", { status: 401 });
      }

      const payload: DiscordWebhookPayload = await req.json();
      
      // Only process message events
      if (payload.type !== 0) {
        return new Response("Event type not supported", { status: 200 });
      }

      const message = payload.data;

      // Skip bot messages
      if (message.author.bot) {
        return new Response("Bot message ignored", { status: 200 });
      }

      // Skip empty messages
      if (!message.content.trim()) {
        return new Response("Empty message ignored", { status: 200 });
      }

      // Analyze message with pattern matcher
      const analysis = analyzeMessage(message);

      // Process the analysis and respond if needed
      if (analysis.shouldRespond) {
        await handlePatternResponse(message, analysis);
      }

      return new Response(
        JSON.stringify({
          success: true,
          analyzed: true,
          matches: analysis.matches.length,
          confidence: analysis.confidence,
          responded: analysis.shouldRespond,
        }),
        {
          headers: { "Content-Type": "application/json" },
        }
      );

    } catch (error) {
      console.error("Error processing Discord message:", error);
      return new Response("Internal server error", { status: 500 });
    }
  },
};

/**
 * Analyze Discord message for patterns
 */
function analyzeMessage(message: DiscordMessageEvent): MessageAnalysis {
  const patternMatcher = getPatternMatcher();
  
  if (!patternMatcher) {
    console.error("Pattern matcher not initialized");
    return {
      messageId: message.id,
      userId: message.author.id,
      channelId: message.channel_id,
      content: message.content,
      matches: [],
      suggestedActions: [],
      shouldRespond: false,
      confidence: 0,
      analysisTimestamp: new Date(),
    };
  }

  console.log(`Analyzing message from ${message.author.username}: "${message.content}"`);
  
  return patternMatcher.analyzeMessage(
    message.id,
    message.author.id,
    message.channel_id,
    message.content
  );
}

/**
 * Handle pattern-based responses
 */
async function handlePatternResponse(
  message: DiscordMessageEvent,
  analysis: MessageAnalysis
): Promise<void> {
  
  console.log(`Responding to message ${message.id} with ${analysis.suggestedActions.length} actions`);

  for (const action of analysis.suggestedActions) {
    try {
      await executeResponseAction(message, action);
    } catch (error) {
      console.error("Error executing response action:", error);
    }
  }
}

/**
 * Execute a specific response action
 */
async function executeResponseAction(
  message: DiscordMessageEvent,
  action: ResponseAction
): Promise<void> {
  
  switch (action.type) {
    case "message":
      if (action.content) {
        await sendDiscordMessage(message.channel_id, action.content);
      }
      break;

    case "reaction":
      if (action.emoji) {
        await addDiscordReaction(message.channel_id, message.id, action.emoji);
      }
      break;

    case "webhook":
      if (action.webhookData) {
        await sendWebhookNotification(message, action.webhookData);
      }
      break;

    case "reminder":
      if (action.reminderData) {
        await createAutoReminder(message, action.reminderData);
      }
      break;

    default:
      console.warn(`Unknown response action type: ${action.type}`);
  }
}

/**
 * Send message to Discord channel
 */
function sendDiscordMessage(channelId: string, content: string): Promise<void> {
  // TODO: Implement Discord API call to send message
  console.log(`Would send message to channel ${channelId}: ${content}`);
  
  // This would integrate with the Discord messenger service
  // await discordMessenger.sendMessage(channelId, { content });
  return Promise.resolve();
}

/**
 * Add reaction to Discord message
 */
function addDiscordReaction(
  channelId: string,
  messageId: string,
  emoji: string
): Promise<void> {
  // TODO: Implement Discord API call to add reaction
  console.log(`Would add reaction ${emoji} to message ${messageId} in channel ${channelId}`);
  
  // This would call Discord API: PUT /channels/{channel.id}/messages/{message.id}/reactions/{emoji}/@me
  return Promise.resolve();
}

/**
 * Send webhook notification to external system
 */
function sendWebhookNotification(
  message: DiscordMessageEvent,
  webhookData: Record<string, unknown>
): Promise<void> {
  // TODO: Implement webhook sending (e.g., to n8n)
  console.log("Would send webhook notification:", {
    message: {
      id: message.id,
      content: message.content,
      author: message.author.username,
      channel: message.channel_id,
    },
    ...webhookData,
  });
  
  // This would integrate with the webhook system
  // await webhookService.send(webhookData);
  return Promise.resolve();
}

/**
 * Create automatic reminder based on pattern match
 */
function createAutoReminder(
  message: DiscordMessageEvent,
  reminderData: { title: string; message: string; delayMinutes: number }
): Promise<void> {
  // TODO: Implement automatic reminder creation
  console.log("Would create auto-reminder:", {
    title: reminderData.title,
    message: reminderData.message,
    delayMinutes: reminderData.delayMinutes,
    targetUser: message.author.id,
    triggerMessage: message.content,
  });
  
  // This would integrate with the reminder creation system
  // await createReminder({
  //   title: reminderData.title,
  //   message: reminderData.message,
  //   targetUser: message.author.id,
  //   schedule: { type: "once", date: new Date(Date.now() + reminderData.delayMinutes * 60000) },
  //   ...
  // });
  return Promise.resolve();
}