// Discord message delivery service for reminders
// This module handles sending reminder messages to Discord users

import type { Reminder } from "../types/reminders.ts";

/**
 * Discord API endpoints and configuration
 */
const DISCORD_API_BASE = "https://discord.com/api/v10";

/**
 * Discord message embed structure
 */
interface DiscordEmbed {
  title?: string;
  description?: string;
  color?: number;
  fields?: Array<{
    name: string;
    value: string;
    inline?: boolean;
  }>;
  footer?: {
    text: string;
  };
  timestamp?: string;
}

/**
 * Discord message components (buttons)
 */
interface DiscordComponent {
  type: number;
  components: Array<{
    type: number;
    style: number;
    label: string;
    custom_id: string;
    emoji?: {
      name: string;
    };
  }>;
}

/**
 * Discord message payload
 */
interface DiscordMessagePayload {
  content?: string;
  embeds?: DiscordEmbed[];
  components?: DiscordComponent[];
}

/**
 * Discord API response for message creation
 */
interface DiscordMessageResponse {
  id: string;
  channel_id: string;
  content: string;
  timestamp: string;
}

/**
 * Delivery result interface
 */
export interface DeliveryResult {
  success: boolean;
  messageId?: string;
  channelId?: string;
  error?: string;
  shouldRetry?: boolean;
}

/**
 * Discord messenger class for sending reminder messages
 */
export class DiscordMessenger {
  private botToken: string;
  private applicationId: string;

  constructor(botToken: string, applicationId: string) {
    this.botToken = botToken;
    this.applicationId = applicationId;
  }

  /**
   * Send a reminder message to a Discord user
   */
  async sendReminderMessage(
    reminder: Reminder,
    deliveryMethod: "dm" | "channel" = "dm",
    channelId?: string,
  ): Promise<DeliveryResult> {
    try {
      // Create DM channel if sending via DM
      if (deliveryMethod === "dm") {
        const dmChannel = await this.createDMChannel(reminder.targetUser);
        if (!dmChannel.success) {
          return {
            success: false,
            error: dmChannel.error,
            shouldRetry: dmChannel.shouldRetry,
          };
        }
        channelId = dmChannel.channelId;
      }

      if (!channelId) {
        return {
          success: false,
          error: "No channel ID provided for message delivery",
          shouldRetry: false,
        };
      }

      // Create message payload
      const messagePayload = this.createReminderMessage(reminder);

      // Send message to Discord
      const response = await this.sendMessage(channelId, messagePayload);

      if (response.success && response.messageId) {
        return {
          success: true,
          messageId: response.messageId,
          channelId: channelId,
        };
      } else {
        return {
          success: false,
          error: response.error,
          shouldRetry: response.shouldRetry,
        };
      }
    } catch (error) {
      console.error("Error sending reminder message:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        shouldRetry: true,
      };
    }
  }

  /**
   * Create a DM channel with a user
   */
  private async createDMChannel(userId: string): Promise<{
    success: boolean;
    channelId?: string;
    error?: string;
    shouldRetry?: boolean;
  }> {
    try {
      const response = await fetch(`${DISCORD_API_BASE}/users/@me/channels`, {
        method: "POST",
        headers: {
          "Authorization": `Bot ${this.botToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          recipient_id: userId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error(
          "Failed to create DM channel:",
          response.status,
          errorData,
        );

        // Check if it's a rate limit (429) or server error (5xx)
        const shouldRetry = response.status === 429 || response.status >= 500;

        return {
          success: false,
          error: `Failed to create DM channel: ${response.status}`,
          shouldRetry,
        };
      }

      const channelData = await response.json();
      return {
        success: true,
        channelId: channelData.id,
      };
    } catch (error) {
      console.error("Error creating DM channel:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Network error",
        shouldRetry: true,
      };
    }
  }

  /**
   * Send a message to a Discord channel
   */
  private async sendMessage(
    channelId: string,
    payload: DiscordMessagePayload,
  ): Promise<{
    success: boolean;
    messageId?: string;
    error?: string;
    shouldRetry?: boolean;
  }> {
    try {
      const response = await fetch(
        `${DISCORD_API_BASE}/channels/${channelId}/messages`,
        {
          method: "POST",
          headers: {
            "Authorization": `Bot ${this.botToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        },
      );

      if (!response.ok) {
        const errorData = await response.text();
        console.error("Failed to send message:", response.status, errorData);

        // Check if it's a rate limit (429) or server error (5xx)
        const shouldRetry = response.status === 429 || response.status >= 500;

        return {
          success: false,
          error: `Failed to send message: ${response.status}`,
          shouldRetry,
        };
      }

      const messageData: DiscordMessageResponse = await response.json();
      return {
        success: true,
        messageId: messageData.id,
      };
    } catch (error) {
      console.error("Error sending message:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Network error",
        shouldRetry: true,
      };
    }
  }

  /**
   * Create a Discord message payload for a reminder
   */
  private createReminderMessage(reminder: Reminder): DiscordMessagePayload {
    // Create embed
    const embed: DiscordEmbed = {
      title: `🔔 ${reminder.title}`,
      description: reminder.message,
      color: this.getCategoryColor(reminder.category),
      fields: [],
      footer: {
        text: "React with ✅ to acknowledge • Created by Discord Assistant Bot",
      },
      timestamp: new Date().toISOString(),
    };

    // Add category field
    const categoryEmojis: Record<string, string> = {
      health: "🏥",
      medication: "💊",
      work: "💼",
      personal: "👤",
      appointment: "📅",
      task: "✅",
      custom: "📝",
    };

    embed.fields!.push({
      name: "Category",
      value: `${categoryEmojis[reminder.category] || "📝"} ${
        reminder.category.charAt(0).toUpperCase() + reminder.category.slice(1)
      }`,
      inline: true,
    });

    // Add priority field
    const priorityEmojis: Record<string, string> = {
      low: "🟢",
      normal: "🟡",
      high: "🟠",
      urgent: "🔴",
    };

    embed.fields!.push({
      name: "Priority",
      value: `${priorityEmojis[reminder.priority]} ${
        reminder.priority.charAt(0).toUpperCase() + reminder.priority.slice(1)
      }`,
      inline: true,
    });

    // Add next delivery time if available
    if (reminder.nextDeliveryAt) {
      embed.fields!.push({
        name: "Next Reminder",
        value: `<t:${Math.floor(reminder.nextDeliveryAt.getTime() / 1000)}:R>`,
        inline: true,
      });
    }

    // Add custom fields if available
    if (
      reminder.customFields && Object.keys(reminder.customFields).length > 0
    ) {
      for (const [key, value] of Object.entries(reminder.customFields)) {
        embed.fields!.push({
          name: key.charAt(0).toUpperCase() + key.slice(1),
          value: String(value),
          inline: true,
        });
      }
    }

    // Create action buttons
    const components: DiscordComponent[] = [
      {
        type: 1, // Action Row
        components: [
          {
            type: 2, // Button
            style: 3, // Success (green)
            label: "Mark Complete",
            custom_id: `reminder_complete_${reminder.id}`,
            emoji: {
              name: "✅",
            },
          },
          {
            type: 2, // Button
            style: 2, // Secondary (gray)
            label: "Snooze",
            custom_id: `reminder_snooze_${reminder.id}`,
            emoji: {
              name: "⏰",
            },
          },
          {
            type: 2, // Button
            style: 4, // Danger (red)
            label: "Cancel",
            custom_id: `reminder_cancel_${reminder.id}`,
            emoji: {
              name: "❌",
            },
          },
        ],
      },
    ];

    return {
      embeds: [embed],
      components: components,
    };
  }

  /**
   * Get color for reminder category
   */
  private getCategoryColor(category: string): number {
    const colors: Record<string, number> = {
      health: 0x00FF7F, // Spring Green
      medication: 0xFF6B9D, // Pink
      work: 0x4169E1, // Royal Blue
      personal: 0x9370DB, // Medium Purple
      appointment: 0xFF4500, // Orange Red
      task: 0x32CD32, // Lime Green
      custom: 0x708090, // Slate Gray
    };

    return colors[category] || 0x708090; // Default to Slate Gray
  }

  /**
   * Send a test message to verify bot configuration
   */
  async sendTestMessage(userId: string): Promise<DeliveryResult> {
    const testReminder: Reminder = {
      id: "test-reminder",
      createdBy: "system",
      targetUser: userId,
      title: "Test Reminder",
      message:
        "This is a test message to verify the Discord bot is working correctly.",
      category: "custom",
      status: "active",
      isActive: true,
      schedule: {
        type: "once",
        time: "12:00",
        occurrenceCount: 0,
      },
      timezone: "UTC",
      escalation: {
        enabled: false,
        delayMinutes: 15,
        maxEscalations: 3,
        escalationTargets: [],
        stopOnAcknowledgment: true,
        escalationCount: 0,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
      priority: "normal",
    };

    return await this.sendReminderMessage(testReminder, "dm");
  }

  /**
   * Send escalation message for unacknowledged reminders
   */
  async sendEscalationMessage(
    originalReminder: Reminder,
    escalationTargets: string[],
    escalationLevel: number,
  ): Promise<DeliveryResult[]> {
    const results: DeliveryResult[] = [];

    for (const targetUserId of escalationTargets) {
      try {
        // Create escalation embed
        const embed: DiscordEmbed = {
          title: `⚠️ Escalation: ${originalReminder.title}`,
          description:
            `**Original recipient:** <@${originalReminder.targetUser}>\n**Original message:** ${originalReminder.message}`,
          color: 0xFF4500, // Orange Red for escalation
          fields: [
            {
              name: "Escalation Level",
              value: escalationLevel.toString(),
              inline: true,
            },
            {
              name: "Original Reminder Time",
              value: originalReminder.lastDeliveredAt
                ? `<t:${
                  Math.floor(originalReminder.lastDeliveredAt.getTime() / 1000)
                }:R>`
                : "Unknown",
              inline: true,
            },
          ],
          footer: {
            text: "Please follow up with the original recipient",
          },
          timestamp: new Date().toISOString(),
        };

        const payload: DiscordMessagePayload = {
          embeds: [embed],
        };

        // Create DM channel and send message
        const dmChannel = await this.createDMChannel(targetUserId);
        if (dmChannel.success && dmChannel.channelId) {
          const result = await this.sendMessage(dmChannel.channelId, payload);
          results.push({
            success: result.success,
            messageId: result.messageId,
            channelId: dmChannel.channelId,
            error: result.error,
            shouldRetry: result.shouldRetry,
          });
        } else {
          results.push({
            success: false,
            error: `Failed to create DM channel for user ${targetUserId}`,
            shouldRetry: dmChannel.shouldRetry,
          });
        }
      } catch (error) {
        console.error(`Error sending escalation to ${targetUserId}:`, error);
        results.push({
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
          shouldRetry: true,
        });
      }
    }

    return results;
  }

  /**
   * Handle acknowledgment reactions (to be called by interaction handlers)
   */
  handleAcknowledgment(
    reminderId: string,
    userId: string,
    action: "complete" | "snooze" | "cancel",
  ): {
    success: boolean;
    message: string;
  } {
    // This will be implemented when we add acknowledgment tracking
    console.log(
      `Handling ${action} for reminder ${reminderId} by user ${userId}`,
    );

    return {
      success: true,
      message: `Reminder ${action}d successfully`,
    };
  }
}

/**
 * Create Discord messenger instance with environment configuration
 */
export function createDiscordMessenger(): DiscordMessenger | null {
  // Note: In a real environment, these would come from environment variables
  const botToken = "your_bot_token_here"; // process.env.DISCORD_BOT_TOKEN
  const applicationId = "your_app_id_here"; // process.env.DISCORD_CLIENT_ID

  if (!botToken || !applicationId) {
    console.warn("Discord bot token or application ID not configured");
    return null;
  }

  return new DiscordMessenger(botToken, applicationId);
}

/**
 * Global messenger instance
 */
let globalMessenger: DiscordMessenger | null = null;

/**
 * Get or create the global messenger instance
 */
export function getDiscordMessenger(): DiscordMessenger | null {
  if (!globalMessenger) {
    globalMessenger = createDiscordMessenger();
  }
  return globalMessenger;
}

/**
 * Send a reminder via Discord
 */
export async function sendReminderViaDiscord(
  reminder: Reminder,
  deliveryMethod: "dm" | "channel" = "dm",
  channelId?: string,
): Promise<DeliveryResult> {
  const messenger = getDiscordMessenger();

  if (!messenger) {
    return {
      success: false,
      error: "Discord messenger not configured",
      shouldRetry: false,
    };
  }

  return await messenger.sendReminderMessage(
    reminder,
    deliveryMethod,
    channelId,
  );
}

/**
 * Send escalation messages
 */
export async function sendEscalationViaDiscord(
  reminder: Reminder,
  escalationTargets: string[],
  escalationLevel: number,
): Promise<DeliveryResult[]> {
  const messenger = getDiscordMessenger();

  if (!messenger) {
    return escalationTargets.map(() => ({
      success: false,
      error: "Discord messenger not configured",
      shouldRetry: false,
    }));
  }

  return await messenger.sendEscalationMessage(
    reminder,
    escalationTargets,
    escalationLevel,
  );
}
