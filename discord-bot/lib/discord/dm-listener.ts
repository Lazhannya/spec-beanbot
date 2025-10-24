/**
 * Discord DM Listener Service - Processes user DM replies for reminder acknowledgement
 * Implements reply-based acknowledgement system (Option 2 from ALTERNATIVES_TO_WEBHOOKS.md)
 * 
 * Requires: MESSAGE_CONTENT privileged intent in Discord Developer Portal
 */

import { ReminderService } from "../reminder/service.ts";

/**
 * Keywords that user can reply with to acknowledge or decline reminders
 */
const ACKNOWLEDGE_KEYWORDS = ["okay", "ok", "yes", "acknowledge", "ack", "done", "✓", "✅"];
const DECLINE_KEYWORDS = ["decline", "no", "nope", "skip", "cancel", "❌"];

/**
 * Service for listening to and processing Discord DM messages
 */
export class DMListenerService {
  private reminderService: ReminderService;
  private botToken: string;
  private baseUrl = "https://discord.com/api/v10";

  constructor(reminderService: ReminderService, botToken: string) {
    this.reminderService = reminderService;
    this.botToken = botToken;
  }

  /**
   * Process a DM message from a user
   * Checks if message is a response to a pending reminder
   */
  async processDMMessage(userId: string, messageContent: string): Promise<{
    success: boolean;
    action?: "acknowledged" | "declined";
    reminderId?: string;
    error?: string;
  }> {
    try {
      console.log(`Processing DM from user ${userId}: "${messageContent}"`);

      // Normalize message for keyword matching
      const normalizedContent = messageContent.toLowerCase().trim();

      // Check if message is an acknowledgement
      const isAcknowledge = ACKNOWLEDGE_KEYWORDS.some(keyword => 
        normalizedContent === keyword || normalizedContent.includes(keyword)
      );

      // Check if message is a decline
      const isDecline = DECLINE_KEYWORDS.some(keyword => 
        normalizedContent === keyword || normalizedContent.includes(keyword)
      );

      if (!isAcknowledge && !isDecline) {
        console.log(`Message from ${userId} does not match acknowledgement keywords`);
        return {
          success: false,
          error: "Message does not contain acknowledgement keywords"
        };
      }

      // Find the most recent pending reminder for this user
      const reminder = await this.reminderService.getLatestPendingReminderForUser(userId);
      
      if (!reminder) {
        console.log(`No pending reminder found for user ${userId}`);
        return {
          success: false,
          error: "No pending reminder found for user"
        };
      }

      // Process acknowledgement
      if (isAcknowledge) {
        await this.reminderService.acknowledgeReminder(reminder.id, userId);
        await this.sendConfirmation(userId, "✅ Reminder acknowledged!", reminder.id);
        
        console.log(`User ${userId} acknowledged reminder ${reminder.id}`);
        return {
          success: true,
          action: "acknowledged",
          reminderId: reminder.id
        };
      }

      // Process decline
      if (isDecline) {
        await this.reminderService.declineReminder(reminder.id, userId);
        await this.sendConfirmation(userId, "❌ Reminder declined.", reminder.id);
        
        console.log(`User ${userId} declined reminder ${reminder.id}`);
        return {
          success: true,
          action: "declined",
          reminderId: reminder.id
        };
      }

      return {
        success: false,
        error: "Unexpected error processing message"
      };

    } catch (error) {
      console.error(`Error processing DM from ${userId}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      };
    }
  }

  /**
   * Send confirmation message to user after processing their response
   */
  private async sendConfirmation(
    userId: string, 
    message: string,
    reminderId: string
  ): Promise<void> {
    try {
      // Create DM channel
      const dmChannel = await this.createDMChannel(userId);
      if (!dmChannel.success) {
        console.error(`Failed to create DM channel for confirmation: ${dmChannel.error}`);
        return;
      }

      // Send confirmation message
      await fetch(`${this.baseUrl}/channels/${dmChannel.channelId}/messages`, {
        method: "POST",
        headers: {
          "Authorization": `Bot ${this.botToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          content: message
        })
      });

      console.log(`Sent confirmation to user ${userId} for reminder ${reminderId}`);
    } catch (error) {
      console.error(`Error sending confirmation to ${userId}:`, error);
    }
  }

  /**
   * Create DM channel with a user
   */
  private async createDMChannel(userId: string): Promise<{ 
    success: boolean; 
    channelId?: string; 
    error?: string;
  }> {
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
   * Validate if a message is from a DM channel (not a server)
   */
  isDMChannel(channelType: number): boolean {
    // Channel type 1 = DM
    return channelType === 1;
  }
}
