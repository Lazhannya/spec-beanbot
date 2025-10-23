/**
 * Escalation Processing Service
 * Handles escalation logic with custom message selection
 */

import { Reminder } from "../../types/reminder.ts";
import { DiscordDeliveryService } from "../discord/delivery.ts";

export type EscalationType = "timeout" | "decline";

/**
 * Default escalation message templates
 */
const DEFAULT_TIMEOUT_MESSAGE = `⏰ **Escalation: Reminder Timeout**

A reminder has not been acknowledged within the configured timeout period.

**Original Reminder Content:**
{content}

**Target User:** <@{targetUserId}>
**Scheduled Time:** {scheduledTime}
**Timeout Period:** {timeoutMinutes} minutes

Please follow up with the user regarding this reminder.`;

const DEFAULT_DECLINE_MESSAGE = `❌ **Escalation: Reminder Declined**

A reminder has been explicitly declined by the user.

**Original Reminder Content:**
{content}

**Target User:** <@{targetUserId}>
**Scheduled Time:** {scheduledTime}

Please follow up with the user to understand why they declined this reminder.`;

/**
 * Escalation processor for handling escalation scenarios
 */
export class EscalationProcessor {
  private deliveryService: DiscordDeliveryService;

  constructor(deliveryService: DiscordDeliveryService) {
    this.deliveryService = deliveryService;
  }

  /**
   * Process escalation for a reminder
   */
  async processEscalation(
    reminder: Reminder,
    escalationType: EscalationType
  ): Promise<{ success: boolean; error?: string; messageId?: string }> {
    try {
      // Validate escalation is configured
      if (!reminder.escalation) {
        return {
          success: false,
          error: "No escalation configured for this reminder"
        };
      }

      if (!reminder.escalation.secondaryUserId) {
        return {
          success: false,
          error: "No secondary user ID configured for escalation"
        };
      }

      // Select appropriate message
      const message = this.selectEscalationMessage(reminder, escalationType);

      // Send escalation via delivery service
      const result = await this.deliveryService.sendEscalation(reminder, message);

      if (result.success) {
        console.log(
          `Successfully processed ${escalationType} escalation for reminder ${reminder.id}`
        );
      } else {
        console.error(
          `Failed to process ${escalationType} escalation for reminder ${reminder.id}: ${result.error}`
        );
      }

      return result;

    } catch (error) {
      console.error(
        `Error processing ${escalationType} escalation for reminder ${reminder.id}:`,
        error
      );
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred"
      };
    }
  }

  /**
   * Select escalation message (custom or default)
   */
  private selectEscalationMessage(
    reminder: Reminder,
    escalationType: EscalationType
  ): string {
    // Get custom message if provided
    const customMessage = escalationType === "timeout"
      ? reminder.escalation?.timeoutMessage
      : reminder.escalation?.declineMessage;

    // Use custom message if available and not empty
    if (customMessage && customMessage.trim().length > 0) {
      return this.formatMessage(customMessage, reminder);
    }

    // Fall back to default template
    const defaultTemplate = escalationType === "timeout"
      ? DEFAULT_TIMEOUT_MESSAGE
      : DEFAULT_DECLINE_MESSAGE;

    return this.formatMessage(defaultTemplate, reminder);
  }

  /**
   * Format message with reminder data placeholders
   */
  private formatMessage(template: string, reminder: Reminder): string {
    return template
      .replace("{content}", reminder.content)
      .replace("{targetUserId}", reminder.targetUserId)
      .replace("{scheduledTime}", new Date(reminder.scheduledTime).toLocaleString())
      .replace(
        "{timeoutMinutes}",
        String(reminder.escalation?.timeoutMinutes || 0)
      );
  }

  /**
   * Validate custom escalation message
   */
  static validateEscalationMessage(message: string): { valid: boolean; error?: string } {
    // Check Discord message length limit (2000 characters)
    if (message.length > 2000) {
      return {
        valid: false,
        error: `Message exceeds Discord's 2000 character limit (${message.length} characters)`
      };
    }

    // Empty messages are valid (will use defaults)
    if (message.trim().length === 0) {
      return { valid: true };
    }

    return { valid: true };
  }

  /**
   * Get default message preview for escalation type
   */
  static getDefaultMessagePreview(escalationType: EscalationType): string {
    return escalationType === "timeout"
      ? DEFAULT_TIMEOUT_MESSAGE
      : DEFAULT_DECLINE_MESSAGE;
  }
}
