// Reminder history tracking service
// This module provides comprehensive logging and analytics for reminder deliveries and interactions

import { getKV } from "../storage/kv.ts";
import type { AcknowledgmentMethod } from "../types/reminders.ts";

/**
 * Reminder interaction types
 */
export type InteractionType =
  | "created" // Reminder was created
  | "delivered" // Reminder was delivered
  | "acknowledged" // User acknowledged reminder
  | "snoozed" // User snoozed reminder
  | "completed" // Reminder was marked complete
  | "cancelled" // Reminder was cancelled
  | "escalated" // Reminder was escalated
  | "edited" // Reminder was modified
  | "paused" // Reminder was paused
  | "resumed"; // Reminder was resumed

/**
 * History entry for reminder interactions
 */
export interface ReminderHistoryEntry {
  id: string;
  reminderId: string;
  userId: string; // User who performed the action
  targetUserId?: string; // User who was targeted (for escalations)
  type: InteractionType;
  timestamp: Date;

  // Context data
  deliveryId?: string; // Associated delivery if applicable
  acknowledgmentMethod?: AcknowledgmentMethod;
  metadata?: {
    previousStatus?: string;
    newStatus?: string;
    escalationLevel?: number;
    snoozeMinutes?: number;
    changes?: Record<string, { from: unknown; to: unknown }>;
    error?: string;
    messageId?: string;
    channelId?: string;
  };

  // System info
  ipAddress?: string;
  userAgent?: string;
  source: "web" | "discord" | "api" | "system";
}

/**
 * Analytics summary for reminders
 */
export interface ReminderAnalytics {
  reminderId: string;

  // Delivery stats
  totalDeliveries: number;
  successfulDeliveries: number;
  failedDeliveries: number;

  // Response stats
  totalAcknowledgments: number;
  acknowledgmentRate: number; // Percentage
  averageResponseTime: number; // Minutes
  fastestResponse: number; // Minutes
  slowestResponse: number; // Minutes

  // Escalation stats
  totalEscalations: number;
  escalationLevels: number[];

  // Activity timeline
  createdAt: Date;
  firstDeliveredAt?: Date;
  lastDeliveredAt?: Date;
  lastAcknowledgedAt?: Date;
  completedAt?: Date;

  // Method breakdown
  acknowledgmentMethods: Record<AcknowledgmentMethod, number>;
}

/**
 * User activity summary
 */
export interface UserActivitySummary {
  userId: string;
  period: {
    start: Date;
    end: Date;
  };

  // Creation stats
  remindersCreated: number;
  remindersCompleted: number;
  remindersActive: number;

  // Response stats
  totalRemindersReceived: number;
  remindersAcknowledged: number;
  averageResponseTime: number;

  // Most active times
  mostActiveHour: number; // 0-23
  mostActiveDay: number; // 0-6 (Sunday = 0)

  // Category preferences
  categoryBreakdown: Record<string, number>;

  // Recent activity
  recentHistory: ReminderHistoryEntry[];
}

/**
 * History tracking service
 */
export class ReminderHistoryService {
  /**
   * Log a reminder interaction
   */
  static async logInteraction(
    reminderId: string,
    userId: string,
    type: InteractionType,
    options: {
      targetUserId?: string;
      deliveryId?: string;
      acknowledgmentMethod?: AcknowledgmentMethod;
      metadata?: ReminderHistoryEntry["metadata"];
      source?: ReminderHistoryEntry["source"];
      ipAddress?: string;
      userAgent?: string;
    } = {},
  ): Promise<void> {
    try {
      const kv = await getKV();
      const historyId = crypto.randomUUID();

      const entry: ReminderHistoryEntry = {
        id: historyId,
        reminderId,
        userId,
        targetUserId: options.targetUserId,
        type,
        timestamp: new Date(),
        deliveryId: options.deliveryId,
        acknowledgmentMethod: options.acknowledgmentMethod,
        metadata: options.metadata,
        source: options.source || "system",
        ipAddress: options.ipAddress,
        userAgent: options.userAgent,
      };

      // Store the history entry
      await kv.set(
        ["reminder_history", historyId],
        entry,
      );

      // Add to reminder's history index
      await kv.set(
        ["reminder_history_by_reminder", reminderId, historyId],
        historyId,
      );

      // Add to user's activity index
      await kv.set(
        ["reminder_history_by_user", userId, historyId],
        historyId,
      );

      // Add to type-specific index for analytics
      await kv.set(
        ["reminder_history_by_type", type, historyId],
        historyId,
      );

      // Add to daily index for timeline queries
      const dateKey = entry.timestamp.toISOString().split("T")[0];
      await kv.set(
        ["reminder_history_by_date", dateKey, historyId],
        historyId,
      );

      console.log(
        `Logged reminder interaction: ${type} for reminder ${reminderId} by user ${userId}`,
      );
    } catch (error) {
      console.error("Error logging reminder interaction:", error);
    }
  }

  /**
   * Get history for a specific reminder
   */
  static async getReminderHistory(
    reminderId: string,
    options: {
      limit?: number;
      offset?: number;
      types?: InteractionType[];
    } = {},
  ): Promise<ReminderHistoryEntry[]> {
    try {
      const kv = await getKV();
      const { limit = 50, offset = 0, types } = options;

      const entries: ReminderHistoryEntry[] = [];
      const iter = kv.list({
        prefix: ["reminder_history_by_reminder", reminderId],
      }, {
        limit: limit + offset,
      });

      let count = 0;
      for await (const entry of iter) {
        if (count < offset) {
          count++;
          continue;
        }

        const historyId = entry.value as string;
        const historyEntry = await kv.get(["reminder_history", historyId]);

        if (historyEntry.value) {
          const entryData = historyEntry.value as ReminderHistoryEntry;

          // Filter by types if specified
          if (!types || types.includes(entryData.type)) {
            entries.push(entryData);
          }
        }

        count++;
        if (entries.length >= limit) break;
      }

      // Sort by timestamp (newest first)
      return entries.sort((a, b) =>
        b.timestamp.getTime() - a.timestamp.getTime()
      );
    } catch (error) {
      console.error("Error getting reminder history:", error);
      return [];
    }
  }

  /**
   * Get user activity history
   */
  static async getUserActivity(
    userId: string,
    options: {
      limit?: number;
      offset?: number;
      startDate?: Date;
      endDate?: Date;
    } = {},
  ): Promise<ReminderHistoryEntry[]> {
    try {
      const kv = await getKV();
      const { limit = 50, offset = 0 } = options;

      const entries: ReminderHistoryEntry[] = [];
      const iter = kv.list({
        prefix: ["reminder_history_by_user", userId],
      }, {
        limit: limit + offset,
      });

      let count = 0;
      for await (const entry of iter) {
        if (count < offset) {
          count++;
          continue;
        }

        const historyId = entry.value as string;
        const historyEntry = await kv.get(["reminder_history", historyId]);

        if (historyEntry.value) {
          const entryData = historyEntry.value as ReminderHistoryEntry;

          // Filter by date range if specified
          if (options.startDate && entryData.timestamp < options.startDate) {
            continue;
          }
          if (options.endDate && entryData.timestamp > options.endDate) {
            continue;
          }

          entries.push(entryData);
        }

        count++;
        if (entries.length >= limit) break;
      }

      // Sort by timestamp (newest first)
      return entries.sort((a, b) =>
        b.timestamp.getTime() - a.timestamp.getTime()
      );
    } catch (error) {
      console.error("Error getting user activity:", error);
      return [];
    }
  }

  /**
   * Generate analytics for a reminder
   */
  static async generateReminderAnalytics(
    reminderId: string,
  ): Promise<ReminderAnalytics | null> {
    try {
      const history = await this.getReminderHistory(reminderId, {
        limit: 1000,
      });

      if (history.length === 0) {
        return null;
      }

      const analytics: ReminderAnalytics = {
        reminderId,
        totalDeliveries: 0,
        successfulDeliveries: 0,
        failedDeliveries: 0,
        totalAcknowledgments: 0,
        acknowledgmentRate: 0,
        averageResponseTime: 0,
        fastestResponse: Infinity,
        slowestResponse: 0,
        totalEscalations: 0,
        escalationLevels: [],
        createdAt: new Date(),
        acknowledgmentMethods: {
          reaction: 0,
          reply: 0,
          button: 0,
          web: 0,
        },
      };

      const responseTimes: number[] = [];
      const deliveryMap = new Map<string, Date>();

      for (const entry of history) {
        switch (entry.type) {
          case "created":
            analytics.createdAt = entry.timestamp;
            break;

          case "delivered":
            analytics.totalDeliveries++;
            if (entry.deliveryId) {
              deliveryMap.set(entry.deliveryId, entry.timestamp);
            }
            if (!analytics.firstDeliveredAt) {
              analytics.firstDeliveredAt = entry.timestamp;
            }
            analytics.lastDeliveredAt = entry.timestamp;
            analytics.successfulDeliveries++;
            break;

          case "acknowledged":
            analytics.totalAcknowledgments++;
            analytics.lastAcknowledgedAt = entry.timestamp;

            if (entry.acknowledgmentMethod) {
              analytics.acknowledgmentMethods[entry.acknowledgmentMethod]++;
            }

            // Calculate response time if we have the delivery time
            if (entry.deliveryId && deliveryMap.has(entry.deliveryId)) {
              const deliveryTime = deliveryMap.get(entry.deliveryId)!;
              const responseTime =
                (entry.timestamp.getTime() - deliveryTime.getTime()) /
                (1000 * 60); // minutes
              responseTimes.push(responseTime);

              analytics.fastestResponse = Math.min(
                analytics.fastestResponse,
                responseTime,
              );
              analytics.slowestResponse = Math.max(
                analytics.slowestResponse,
                responseTime,
              );
            }
            break;

          case "escalated":
            analytics.totalEscalations++;
            if (entry.metadata?.escalationLevel) {
              analytics.escalationLevels.push(entry.metadata.escalationLevel);
            }
            break;

          case "completed":
            analytics.completedAt = entry.timestamp;
            break;
        }
      }

      // Calculate averages
      if (responseTimes.length > 0) {
        analytics.averageResponseTime = responseTimes.reduce((a, b) =>
          a + b, 0) / responseTimes.length;
        analytics.acknowledgmentRate =
          (analytics.totalAcknowledgments / analytics.totalDeliveries) * 100;
      }

      if (analytics.fastestResponse === Infinity) {
        analytics.fastestResponse = 0;
      }

      return analytics;
    } catch (error) {
      console.error("Error generating reminder analytics:", error);
      return null;
    }
  }

  /**
   * Generate user activity summary
   */
  static async generateUserSummary(
    userId: string,
    periodDays = 30,
  ): Promise<UserActivitySummary> {
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - periodDays);

      const activity = await this.getUserActivity(userId, {
        startDate,
        endDate,
        limit: 1000,
      });

      const summary: UserActivitySummary = {
        userId,
        period: { start: startDate, end: endDate },
        remindersCreated: 0,
        remindersCompleted: 0,
        remindersActive: 0,
        totalRemindersReceived: 0,
        remindersAcknowledged: 0,
        averageResponseTime: 0,
        mostActiveHour: 0,
        mostActiveDay: 0,
        categoryBreakdown: {},
        recentHistory: activity.slice(0, 10), // Last 10 activities
      };

      const hourCounts = new Array(24).fill(0);
      const dayCounts = new Array(7).fill(0);
      const responseTimes: number[] = [];

      for (const entry of activity) {
        // Count by hour and day
        hourCounts[entry.timestamp.getHours()]++;
        dayCounts[entry.timestamp.getDay()]++;

        // Count by interaction type
        switch (entry.type) {
          case "created":
            summary.remindersCreated++;
            break;
          case "completed":
            summary.remindersCompleted++;
            break;
          case "delivered":
            summary.totalRemindersReceived++;
            break;
          case "acknowledged":
            summary.remindersAcknowledged++;
            break;
        }
      }

      // Find most active times
      summary.mostActiveHour = hourCounts.indexOf(Math.max(...hourCounts));
      summary.mostActiveDay = dayCounts.indexOf(Math.max(...dayCounts));

      // Calculate averages
      if (responseTimes.length > 0) {
        summary.averageResponseTime = responseTimes.reduce((a, b) => a + b, 0) /
          responseTimes.length;
      }

      return summary;
    } catch (error) {
      console.error("Error generating user summary:", error);
      throw error;
    }
  }

  /**
   * Clean up old history entries
   */
  static async cleanupHistory(retentionDays = 90): Promise<number> {
    try {
      const kv = await getKV();
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

      let deletedCount = 0;
      const iter = kv.list({ prefix: ["reminder_history"] });

      for await (const entry of iter) {
        const historyEntry = entry.value as ReminderHistoryEntry;

        if (historyEntry.timestamp < cutoffDate) {
          // Delete from all indexes
          await kv.delete(["reminder_history", historyEntry.id]);
          await kv.delete([
            "reminder_history_by_reminder",
            historyEntry.reminderId,
            historyEntry.id,
          ]);
          await kv.delete([
            "reminder_history_by_user",
            historyEntry.userId,
            historyEntry.id,
          ]);
          await kv.delete([
            "reminder_history_by_type",
            historyEntry.type,
            historyEntry.id,
          ]);

          const dateKey = historyEntry.timestamp.toISOString().split("T")[0];
          await kv.delete([
            "reminder_history_by_date",
            dateKey,
            historyEntry.id,
          ]);

          deletedCount++;
        }
      }

      console.log(`Cleaned up ${deletedCount} old history entries`);
      return deletedCount;
    } catch (error) {
      console.error("Error cleaning up history:", error);
      return 0;
    }
  }
}

/**
 * Convenience functions for common logging operations
 */
export const historyLogger = {
  /**
   * Log reminder creation
   */
  reminderCreated: (
    reminderId: string,
    userId: string,
    source: ReminderHistoryEntry["source"] = "web",
  ) =>
    ReminderHistoryService.logInteraction(reminderId, userId, "created", {
      source,
    }),

  /**
   * Log reminder delivery
   */
  reminderDelivered: (
    reminderId: string,
    userId: string,
    deliveryId: string,
    messageId?: string,
    channelId?: string,
  ) =>
    ReminderHistoryService.logInteraction(reminderId, userId, "delivered", {
      deliveryId,
      source: "system",
      metadata: { messageId, channelId },
    }),

  /**
   * Log reminder acknowledgment
   */
  reminderAcknowledged: (
    reminderId: string,
    userId: string,
    deliveryId: string,
    method: AcknowledgmentMethod,
    source: ReminderHistoryEntry["source"] = "discord",
  ) =>
    ReminderHistoryService.logInteraction(reminderId, userId, "acknowledged", {
      deliveryId,
      acknowledgmentMethod: method,
      source,
    }),

  /**
   * Log reminder escalation
   */
  reminderEscalated: (
    reminderId: string,
    originalUserId: string,
    targetUserId: string,
    escalationLevel: number,
  ) =>
    ReminderHistoryService.logInteraction(
      reminderId,
      originalUserId,
      "escalated",
      {
        targetUserId,
        source: "system",
        metadata: { escalationLevel },
      },
    ),

  /**
   * Log reminder status change
   */
  reminderStatusChanged: (
    reminderId: string,
    userId: string,
    type: Extract<
      InteractionType,
      "completed" | "cancelled" | "paused" | "resumed"
    >,
    previousStatus: string,
    newStatus: string,
    source: ReminderHistoryEntry["source"] = "web",
  ) =>
    ReminderHistoryService.logInteraction(reminderId, userId, type, {
      source,
      metadata: { previousStatus, newStatus },
    }),

  /**
   * Log reminder edit
   */
  reminderEdited: (
    reminderId: string,
    userId: string,
    changes: Record<string, { from: unknown; to: unknown }>,
    source: ReminderHistoryEntry["source"] = "web",
  ) =>
    ReminderHistoryService.logInteraction(reminderId, userId, "edited", {
      source,
      metadata: { changes },
    }),
};
