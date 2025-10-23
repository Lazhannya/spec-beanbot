/**
 * Response Tracker Service
 * Handles user response tracking and triggers escalation on decline
 */

import { Reminder, ResponseLog, ResponseType } from "../../types/reminder.ts";
import { ReminderRepository } from "./repository.ts";
import { EscalationProcessor } from "./escalation.ts";
import { DiscordDeliveryService } from "../discord/delivery.ts";

/**
 * Service for tracking user responses and handling escalation triggers
 */
export class ResponseTracker {
  private repository: ReminderRepository;
  private escalationProcessor: EscalationProcessor;

  constructor(repository: ReminderRepository, deliveryService: DiscordDeliveryService) {
    this.repository = repository;
    this.escalationProcessor = new EscalationProcessor(deliveryService);
  }

  /**
   * Log user response and handle escalation if needed
   */
  async logResponse(
    reminderId: string,
    userId: string,
    responseType: ResponseType
  ): Promise<{ success: boolean; error?: string; escalated?: boolean }> {
    try {
      // Get the reminder
      const reminder = await this.repository.getById(reminderId);
      if (!reminder) {
        return {
          success: false,
          error: "Reminder not found"
        };
      }

      // Create response log entry
      const logEntry: ResponseLog = {
        id: crypto.randomUUID(),
        reminderId,
        userId,
        responseType,
        timestamp: new Date(),
        metadata: {}
      };

      // Add log entry to reminder
      const updatedReminder: Reminder = {
        ...reminder,
        responses: [...reminder.responses, logEntry],
        updatedAt: new Date()
      };

      await this.repository.update(reminderId, {
        responses: updatedReminder.responses,
        updatedAt: updatedReminder.updatedAt
      });

      console.log(`Logged ${responseType} response for reminder ${reminderId} from user ${userId}`);

      // Check if we need to trigger escalation for decline
      if (responseType === ResponseType.DECLINED && reminder.escalation?.isActive) {
        console.log(`User declined reminder ${reminderId}, triggering escalation`);
        
        const escalationResult = await this.escalationProcessor.processEscalation(
          reminder,
          "decline"
        );

        if (escalationResult.success) {
          console.log(`Successfully escalated declined reminder ${reminderId}`);
          
          // Mark escalation as triggered
          await this.repository.update(reminderId, {
            escalation: {
              ...reminder.escalation,
              triggeredAt: new Date(),
              triggerReason: "decline"
            }
          });

          return {
            success: true,
            escalated: true
          };
        } else {
          console.error(`Failed to escalate reminder ${reminderId}:`, escalationResult.error);
          return {
            success: true, // Response was logged successfully
            escalated: false,
            error: `Response logged but escalation failed: ${escalationResult.error}`
          };
        }
      }

      return {
        success: true,
        escalated: false
      };

    } catch (error) {
      console.error(`Error logging response for reminder ${reminderId}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred"
      };
    }
  }

  /**
   * Get response history for a reminder
   */
  async getResponseHistory(reminderId: string): Promise<{ 
    success: boolean; 
    responses?: ResponseLog[]; 
    error?: string 
  }> {
    try {
      const reminder = await this.repository.getById(reminderId);
      if (!reminder) {
        return {
          success: false,
          error: "Reminder not found"
        };
      }

      return {
        success: true,
        responses: reminder.responses
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred"
      };
    }
  }

  /**
   * Check if reminder has received any response
   */
  async hasResponse(reminderId: string): Promise<boolean> {
    try {
      const reminder = await this.repository.getById(reminderId);
      return reminder ? reminder.responses.length > 0 : false;
    } catch {
      return false;
    }
  }

  /**
   * Get latest response for a reminder
   */
  async getLatestResponse(reminderId: string): Promise<ResponseLog | null> {
    try {
      const reminder = await this.repository.getById(reminderId);
      if (!reminder || reminder.responses.length === 0) {
        return null;
      }

      // Sort by timestamp descending and return first
      const sortedResponses = [...reminder.responses].sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

      return sortedResponses[0] || null;
    } catch {
      return null;
    }
  }
}
