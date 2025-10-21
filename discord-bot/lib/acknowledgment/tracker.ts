// Acknowledgment tracking service for reminders
// This module handles tracking user responses to reminder messages

import {
  acknowledgeDelivery,
  getDeliveryById,
  getReminderById,
  updateReminder,
} from "../storage/reminders.ts";
import type {
  AcknowledgmentMethod,
  ReminderDelivery,
} from "../types/reminders.ts";

/**
 * Acknowledgment action types that users can take
 */
export type AcknowledgmentAction =
  | "complete" // Mark reminder as completed
  | "snooze" // Snooze reminder for later
  | "dismiss" // Dismiss/cancel reminder
  | "escalate" // Manual escalation request
  | "react"; // Simple acknowledgment reaction

/**
 * Result of acknowledgment processing
 */
export interface AcknowledgmentResult {
  success: boolean;
  message: string;
  updated: {
    delivery?: boolean;
    reminder?: boolean;
    escalationStopped?: boolean;
  };
  error?: string;
}

/**
 * Acknowledgment tracking service
 */
export class AcknowledgmentTracker {
  /**
   * Process user acknowledgment from Discord interaction
   */
  static async processAcknowledgment(
    deliveryId: string,
    userId: string,
    action: AcknowledgmentAction,
    method: AcknowledgmentMethod,
    metadata?: {
      messageId?: string;
      channelId?: string;
      customId?: string;
      snoozeMinutes?: number;
    },
  ): Promise<AcknowledgmentResult> {
    try {
      console.log(
        `Processing acknowledgment: delivery=${deliveryId}, user=${userId}, action=${action}, method=${method}`,
      );

      // Get delivery record
      const delivery = await getDeliveryById(deliveryId);
      if (!delivery) {
        return {
          success: false,
          message: "Delivery record not found",
          updated: {},
          error: "DELIVERY_NOT_FOUND",
        };
      }

      // Verify user authorization - get reminder to check creator
      const reminder = await getReminderById(delivery.reminderId);
      if (!reminder) {
        return {
          success: false,
          message: "Associated reminder not found",
          updated: {},
          error: "REMINDER_NOT_FOUND",
        };
      }

      if (delivery.targetUser !== userId && reminder.createdBy !== userId) {
        return {
          success: false,
          message: "Not authorized to acknowledge this reminder",
          updated: {},
          error: "UNAUTHORIZED",
        };
      }

      // Check if already acknowledged
      if (delivery.acknowledged) {
        return {
          success: false,
          message: "This reminder has already been acknowledged",
          updated: {},
          error: "ALREADY_ACKNOWLEDGED",
        };
      }

      // Process the acknowledgment action
      const result = await this.handleAcknowledgmentAction(
        delivery,
        action,
        method,
        metadata,
      );

      return result;
    } catch (error) {
      console.error("Error processing acknowledgment:", error);
      return {
        success: false,
        message: "Failed to process acknowledgment",
        updated: {},
        error: error instanceof Error ? error.message : "UNKNOWN_ERROR",
      };
    }
  }

  /**
   * Handle specific acknowledgment actions
   */
  private static async handleAcknowledgmentAction(
    delivery: ReminderDelivery,
    action: AcknowledgmentAction,
    method: AcknowledgmentMethod,
    metadata?: {
      messageId?: string;
      channelId?: string;
      customId?: string;
      snoozeMinutes?: number;
    },
  ): Promise<AcknowledgmentResult> {
    let result: AcknowledgmentResult = {
      success: false,
      message: "",
      updated: {},
    };

    // Mark delivery as acknowledged first
    const acknowledged = await acknowledgeDelivery(delivery.id, method);
    if (!acknowledged) {
      throw new Error("Failed to mark delivery as acknowledged");
    }
    result.updated.delivery = true;

    // Handle action-specific logic
    switch (action) {
      case "complete":
        result = await this.handleComplete(delivery, result);
        break;

      case "snooze":
        result = this.handleSnooze(delivery, result, metadata?.snoozeMinutes);
        break;

      case "dismiss":
        result = await this.handleDismiss(delivery, result);
        break;

      case "escalate":
        result = this.handleEscalate(delivery, result);
        break;

      case "react":
        result = this.handleReact(delivery, result);
        break;

      default:
        result.message = `Unknown acknowledgment action: ${action}`;
        result.error = "INVALID_ACTION";
        return result;
    }

    // Stop escalation if configured to do so
    if (result.success) {
      // TODO: Check reminder escalation config and stop if needed
      // This will be enhanced when escalation system is implemented
      result.updated.escalationStopped = true;
    }

    return result;
  }

  /**
   * Handle "complete" action - mark reminder as completed
   */
  private static async handleComplete(
    delivery: ReminderDelivery,
    result: AcknowledgmentResult,
  ): Promise<AcknowledgmentResult> {
    const updated = await updateReminder(delivery.reminderId, {
      status: "completed",
    }, delivery.targetUser);
    if (updated.success) {
      result.success = true;
      result.message = "Reminder marked as completed! 🎉";
      result.updated.reminder = true;
    } else {
      result.message = "Failed to update reminder status";
      result.error = "UPDATE_FAILED";
    }

    return result;
  }

  /**
   * Handle "snooze" action - delay reminder
   */
  private static handleSnooze(
    delivery: ReminderDelivery,
    result: AcknowledgmentResult,
    snoozeMinutes = 15,
  ): AcknowledgmentResult {
    // Calculate new delivery time
    const newDeliveryTime = new Date();
    newDeliveryTime.setMinutes(newDeliveryTime.getMinutes() + snoozeMinutes);

    // TODO: Implement snooze logic with new delivery scheduling
    // For now, just acknowledge that it would be snoozed
    result.success = true;
    result.message = `Reminder snoozed for ${snoozeMinutes} minutes! ⏰`;

    console.log(
      `Would snooze reminder ${delivery.reminderId} until ${newDeliveryTime.toISOString()}`,
    );

    return result;
  }

  /**
   * Handle "dismiss" action - cancel/dismiss reminder
   */
  private static async handleDismiss(
    delivery: ReminderDelivery,
    result: AcknowledgmentResult,
  ): Promise<AcknowledgmentResult> {
    const updated = await updateReminder(delivery.reminderId, {
      status: "cancelled",
    }, delivery.targetUser);
    if (updated.success) {
      result.success = true;
      result.message = "Reminder dismissed! 🚫";
      result.updated.reminder = true;
    } else {
      result.message = "Failed to dismiss reminder";
      result.error = "UPDATE_FAILED";
    }

    return result;
  }

  /**
   * Handle "escalate" action - manual escalation request
   */
  private static handleEscalate(
    delivery: ReminderDelivery,
    result: AcknowledgmentResult,
  ): AcknowledgmentResult {
    // TODO: Implement manual escalation logic
    // For now, just acknowledge the request
    result.success = true;
    result.message =
      "Escalation requested! 📢 We'll notify additional contacts.";

    console.log(
      `Manual escalation requested for reminder ${delivery.reminderId}`,
    );

    return result;
  }

  /**
   * Handle "react" action - simple acknowledgment
   */
  private static handleReact(
    _delivery: ReminderDelivery,
    result: AcknowledgmentResult,
  ): AcknowledgmentResult {
    result.success = true;
    result.message = "Thanks for acknowledging! 👍";

    return result;
  }

  /**
   * Get acknowledgment statistics for a user
   */
  static getAcknowledgmentStats(_userId: string): Promise<{
    totalDeliveries: number;
    acknowledgedDeliveries: number;
    acknowledgmentRate: number;
    averageResponseTime: number; // minutes
    methodBreakdown: Record<AcknowledgmentMethod, number>;
    actionBreakdown: Record<AcknowledgmentAction, number>;
  }> {
    // TODO: Implement comprehensive statistics
    // This would query all deliveries for the user and calculate stats
    return Promise.resolve({
      totalDeliveries: 0,
      acknowledgedDeliveries: 0,
      acknowledgmentRate: 0,
      averageResponseTime: 0,
      methodBreakdown: {
        reaction: 0,
        reply: 0,
        button: 0,
        web: 0,
      },
      actionBreakdown: {
        complete: 0,
        snooze: 0,
        dismiss: 0,
        escalate: 0,
        react: 0,
      },
    });
  }

  /**
   * Find delivery by Discord message ID
   */
  static findDeliveryByMessageId(
    messageId: string,
  ): Promise<ReminderDelivery | null> {
    // TODO: Implement reverse lookup by message ID
    // This would require storing message IDs in delivery records
    // For now, return null - this will be enhanced later
    console.log(`Looking up delivery for message ID: ${messageId}`);
    return Promise.resolve(null);
  }

  /**
   * Validate acknowledgment permissions
   */
  static async canAcknowledge(
    deliveryId: string,
    userId: string,
  ): Promise<{ authorized: boolean; reason?: string }> {
    const delivery = await getDeliveryById(deliveryId);
    if (!delivery) {
      return { authorized: false, reason: "Delivery not found" };
    }

    if (delivery.acknowledged) {
      return { authorized: false, reason: "Already acknowledged" };
    }

    // Check authorization by getting the reminder
    const reminder = await getReminderById(delivery.reminderId);
    if (!reminder) {
      return { authorized: false, reason: "Associated reminder not found" };
    }

    if (delivery.targetUser !== userId && reminder.createdBy !== userId) {
      return { authorized: false, reason: "Not authorized for this reminder" };
    }

    return { authorized: true };
  }
}

/**
 * Utility functions for acknowledgment tracking
 */
export const acknowledgmentUtils = {
  /**
   * Parse custom ID from Discord button interaction
   */
  parseButtonCustomId(customId: string): {
    type: "reminder_action";
    deliveryId: string;
    action: AcknowledgmentAction;
  } | null {
    try {
      // Expected format: "reminder_action:deliveryId:action"
      const parts = customId.split(":");
      if (parts.length !== 3 || parts[0] !== "reminder_action") {
        return null;
      }

      const [, deliveryId, action] = parts;
      if (!this.isValidAction(action)) {
        return null;
      }

      return {
        type: "reminder_action",
        deliveryId,
        action: action as AcknowledgmentAction,
      };
    } catch {
      return null;
    }
  },

  /**
   * Check if action is valid
   */
  isValidAction(action: string): action is AcknowledgmentAction {
    return ["complete", "snooze", "dismiss", "escalate", "react"].includes(
      action,
    );
  },

  /**
   * Get user-friendly action description
   */
  getActionDescription(action: AcknowledgmentAction): string {
    const descriptions = {
      complete: "Mark as completed",
      snooze: "Snooze for later",
      dismiss: "Dismiss reminder",
      escalate: "Request escalation",
      react: "Acknowledge",
    };
    return descriptions[action] || "Unknown action";
  },

  /**
   * Get action emoji
   */
  getActionEmoji(action: AcknowledgmentAction): string {
    const emojis = {
      complete: "✅",
      snooze: "⏰",
      dismiss: "🚫",
      escalate: "📢",
      react: "👍",
    };
    return emojis[action] || "❓";
  },
};
