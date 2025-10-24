/**
 * Discord Delivery Service - Handles sending reminders to Discord users
 * Integrates with Discord API for message delivery and response handling
 */

import { Reminder } from "../../types/reminder.ts";

/**
 * Discord delivery service for sending reminders via DM
 */
export class DiscordDeliveryService {
  private botToken: string;
  private baseUrl = "https://discord.com/api/v10";

  constructor(botToken: string) {
    this.botToken = botToken;
  }

  /**
   * Send a reminder message to a Discord user
   */
  async sendReminder(reminder: Reminder): Promise<{ success: boolean; error?: string; messageId?: string }> {
    try {
      console.log(`Sending reminder ${reminder.id} to user ${reminder.targetUserId}`);

      // Create DM channel with user
      const dmChannel = await this.createDMChannel(reminder.targetUserId);
      if (!dmChannel.success) {
        return {
          success: false,
          error: `Failed to create DM channel: ${dmChannel.error}`
        };
      }

      // Send reminder message with reminder ID in buttons
      const message = await this.sendMessage(dmChannel.channelId!, reminder.content, reminder.id);
      if (!message.success) {
        return {
          success: false,
          error: `Failed to send message: ${message.error}`
        };
      }

      console.log(`Successfully sent reminder ${reminder.id}, message ID: ${message.messageId}`);
      
      return message.messageId 
        ? { success: true, messageId: message.messageId }
        : { success: true };

    } catch (error) {
      console.error(`Error sending reminder ${reminder.id}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred"
      };
    }
  }

  /**
   * Send escalation message to secondary user
   */
  async sendEscalation(reminder: Reminder, escalationMessage: string): Promise<{ success: boolean; error?: string; messageId?: string }> {
    try {
      if (!reminder.escalation?.secondaryUserId) {
        return {
          success: false,
          error: "No escalation user configured"
        };
      }

      console.log(`Sending escalation for reminder ${reminder.id} to user ${reminder.escalation.secondaryUserId}`);

      // Create DM channel with escalation user
      const dmChannel = await this.createDMChannel(reminder.escalation.secondaryUserId);
      if (!dmChannel.success) {
        return {
          success: false,
          error: `Failed to create escalation DM channel: ${dmChannel.error}`
        };
      }

      // Send escalation message
      const message = await this.sendMessage(dmChannel.channelId!, escalationMessage);
      if (!message.success) {
        return {
          success: false,
          error: `Failed to send escalation message: ${message.error}`
        };
      }

      console.log(`Successfully sent escalation for reminder ${reminder.id}, message ID: ${message.messageId}`);
      
      return message.messageId
        ? { success: true, messageId: message.messageId }
        : { success: true };

    } catch (error) {
      console.error(`Error sending escalation for reminder ${reminder.id}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred"
      };
    }
  }

  /**
   * Create DM channel with a user
   */
  private async createDMChannel(userId: string): Promise<{ success: boolean; channelId?: string; error?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/users/@me/channels`, {
        method: "POST",
        headers: {
          "Authorization": `Bot ${this.botToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          recipient_id: userId
        })
      });

      if (!response.ok) {
        const errorData = await response.text();
        return {
          success: false,
          error: `Discord API error: ${response.status} ${errorData}`
        };
      }

      const channelData = await response.json();
      return {
        success: true,
        channelId: channelData.id
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Network error"
      };
    }
  }

  /**
   * Send message to a Discord channel with clickable acknowledgement links
   * No buttons or replies needed - user clicks URL to acknowledge/decline
   */
  private async sendMessage(
    channelId: string, 
    content: string, 
    reminderId?: string
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      // Build message with clickable links
      let messageContent = `🔔 **Reminder**\n\n${content}`;
      
      if (reminderId) {
        // Generate secure tokens for acknowledgement links
        const { generateAcknowledgementUrl } = await import("../utils/ack-token.ts");
        const baseUrl = Deno.env.get("BASE_URL") || "https://spec-beanbot.lazhannya.deno.net";
        
        const ackUrl = await generateAcknowledgementUrl(reminderId, "acknowledge", baseUrl);
        const declineUrl = await generateAcknowledgementUrl(reminderId, "decline", baseUrl);
        
        messageContent += `\n\n📝 **To respond, click a link:**\n✅ [Acknowledge](${ackUrl})\n❌ [Decline](${declineUrl})`;
      }

      const response = await fetch(`${this.baseUrl}/channels/${channelId}/messages`, {
        method: "POST",
        headers: {
          "Authorization": `Bot ${this.botToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          content: messageContent
        })
      });

      if (!response.ok) {
        const errorData = await response.text();
        return {
          success: false,
          error: `Discord API error: ${response.status} ${errorData}`
        };
      }

      const messageData = await response.json();
      return {
        success: true,
        messageId: messageData.id
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Network error"
      };
    }
  }

  /**
   * Validate if bot can send DM to user
   */
  async canSendDM(userId: string): Promise<boolean> {
    try {
      const dmResult = await this.createDMChannel(userId);
      return dmResult.success;
    } catch {
      return false;
    }
  }

  /**
   * Get user information from Discord
   */
  async getUserInfo(userId: string): Promise<{ success: boolean; user?: Record<string, unknown>; error?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/users/${userId}`, {
        headers: {
          "Authorization": `Bot ${this.botToken}`
        }
      });

      if (!response.ok) {
        return {
          success: false,
          error: `Failed to get user info: ${response.status}`
        };
      }

      const userData = await response.json() as Record<string, unknown>;
      return {
        success: true,
        user: userData
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Network error"
      };
    }
  }
}