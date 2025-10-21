// Administrative service for system monitoring and user management
// This module provides comprehensive system statistics and administrative operations

import { getKV } from "../storage/kv.ts";
import { getSessionStats } from "../storage/sessions.ts";
import { ReminderHistoryService } from "../history/service.ts";
import type { Reminder } from "../types/reminders.ts";
import type { UserSession } from "../storage/sessions.ts";

/**
 * System-wide statistics
 */
export interface SystemStats {
  // User metrics
  totalUsers: number;
  activeUsers: number; // Users with sessions in last 7 days
  newUsersToday: number;
  newUsersThisWeek: number;

  // Reminder metrics
  totalReminders: number;
  activeReminders: number;
  completedReminders: number;
  cancelledReminders: number;
  remindersCreatedToday: number;
  remindersCreatedThisWeek: number;

  // Delivery metrics
  totalDeliveries: number;
  successfulDeliveries: number;
  failedDeliveries: number;
  deliverySuccessRate: number;

  // Response metrics
  totalAcknowledgments: number;
  acknowledgmentRate: number;
  averageResponseTime: number; // in minutes

  // System metrics
  totalSessions: number;
  activeSessions: number;
  expiredSessions: number;
  storageUsage: StorageUsage;

  // Performance metrics
  uptime: number; // in milliseconds
  lastUpdated: Date;
}

/**
 * Storage usage breakdown
 */
export interface StorageUsage {
  totalEntries: number;
  reminderEntries: number;
  sessionEntries: number;
  historyEntries: number;
  otherEntries: number;
  estimatedSizeKB: number;
}

/**
 * User management information
 */
export interface UserInfo {
  userId: string;
  username: string;
  discriminator: string;
  avatar?: string;

  // Activity metrics
  firstSeen: Date;
  lastSeen: Date;
  totalSessions: number;
  currentSessions: number;

  // Reminder metrics
  totalReminders: number;
  activeReminders: number;
  completedReminders: number;
  totalDeliveries: number;
  totalAcknowledgments: number;
  acknowledgmentRate: number;
  averageResponseTime: number;

  // Admin flags
  isAdmin: boolean;
  isBanned: boolean;
  notes?: string;
}

/**
 * System health check result
 */
export interface HealthCheck {
  status: "healthy" | "warning" | "error";
  timestamp: Date;
  checks: {
    database: { status: "ok" | "error"; message?: string };
    storage: {
      status: "ok" | "warning" | "error";
      usage: number;
      message?: string;
    };
    sessions: { status: "ok" | "warning"; count: number; message?: string };
    reminders: {
      status: "ok" | "warning";
      activeCount: number;
      message?: string;
    };
  };
  warnings: string[];
  errors: string[];
}

/**
 * Administrative service class
 */
export class AdminService {
  private static startTime = Date.now();

  /**
   * Get comprehensive system statistics
   */
  static async getSystemStats(): Promise<SystemStats> {
    try {
      const kv = await getKV();

      // Get session statistics
      const sessionStats = await getSessionStats();

      // Count users by examining sessions
      const userSet = new Set<string>();
      const activeUserSet = new Set<string>();
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      // Count reminders by status
      let totalReminders = 0;
      let activeReminders = 0;
      let completedReminders = 0;
      let cancelledReminders = 0;

      const reminderIter = kv.list({ prefix: ["reminders"] });
      for await (const entry of reminderIter) {
        const reminder = entry.value as Reminder;
        totalReminders++;

        switch (reminder.status) {
          case "active":
            activeReminders++;
            break;
          case "completed":
            completedReminders++;
            break;
          case "cancelled":
            cancelledReminders++;
            break;
        }

        userSet.add(reminder.targetUser);
      }

      // Count sessions for active users
      const sessionIter = kv.list({ prefix: ["sessions"] });
      for await (const entry of sessionIter) {
        const session = entry.value as UserSession;
        userSet.add(session.userId);

        const lastAccessed = new Date(session.lastAccessedAt);
        if (lastAccessed >= sevenDaysAgo) {
          activeUserSet.add(session.userId);
        }
      }

      // Count recent activity
      const today = new Date();
      const startOfToday = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate(),
      );
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

      const newUsersToday = 0;
      const newUsersThisWeek = 0;
      let remindersCreatedToday = 0;
      let remindersCreatedThisWeek = 0;

      // Count deliveries and acknowledgments
      let totalDeliveries = 0;
      let successfulDeliveries = 0;
      let totalAcknowledgments = 0;
      const responseTimes: number[] = [];

      const historyIter = kv.list({ prefix: ["reminder_history"] });
      for await (const entry of historyIter) {
        const historyEntry = entry.value as { type: string; timestamp: string };
        const timestamp = new Date(historyEntry.timestamp);

        switch (historyEntry.type) {
          case "created":
            if (timestamp >= startOfToday) {
              remindersCreatedToday++;
            }
            if (timestamp >= oneWeekAgo) {
              remindersCreatedThisWeek++;
            }
            break;
          case "delivered":
            totalDeliveries++;
            successfulDeliveries++;
            break;
          case "acknowledged":
            totalAcknowledgments++;
            break;
        }
      }

      // Calculate storage usage
      const storageUsage = await this.getStorageUsage();

      const stats: SystemStats = {
        // User metrics
        totalUsers: userSet.size,
        activeUsers: activeUserSet.size,
        newUsersToday,
        newUsersThisWeek,

        // Reminder metrics
        totalReminders,
        activeReminders,
        completedReminders,
        cancelledReminders,
        remindersCreatedToday,
        remindersCreatedThisWeek,

        // Delivery metrics
        totalDeliveries,
        successfulDeliveries,
        failedDeliveries: totalDeliveries - successfulDeliveries,
        deliverySuccessRate: totalDeliveries > 0
          ? (successfulDeliveries / totalDeliveries) * 100
          : 0,

        // Response metrics
        totalAcknowledgments,
        acknowledgmentRate: totalDeliveries > 0
          ? (totalAcknowledgments / totalDeliveries) * 100
          : 0,
        averageResponseTime: responseTimes.length > 0
          ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
          : 0,

        // System metrics
        totalSessions: sessionStats.totalSessions,
        activeSessions: sessionStats.activeSessions,
        expiredSessions: sessionStats.expiredSessions,
        storageUsage,

        // Performance metrics
        uptime: Date.now() - this.startTime,
        lastUpdated: new Date(),
      };

      return stats;
    } catch (error) {
      console.error("Error getting system stats:", error);
      throw error;
    }
  }

  /**
   * Get storage usage breakdown
   */
  static async getStorageUsage(): Promise<StorageUsage> {
    try {
      const kv = await getKV();

      let totalEntries = 0;
      let reminderEntries = 0;
      let sessionEntries = 0;
      let historyEntries = 0;
      let otherEntries = 0;
      let estimatedSizeKB = 0;

      const allEntries = kv.list({ prefix: [] });
      for await (const entry of allEntries) {
        totalEntries++;

        const keyStr = entry.key.join("/");
        const entrySize = JSON.stringify(entry.value).length;
        estimatedSizeKB += entrySize / 1024;

        if (keyStr.startsWith("reminders")) {
          reminderEntries++;
        } else if (keyStr.startsWith("sessions")) {
          sessionEntries++;
        } else if (keyStr.startsWith("reminder_history")) {
          historyEntries++;
        } else {
          otherEntries++;
        }
      }

      return {
        totalEntries,
        reminderEntries,
        sessionEntries,
        historyEntries,
        otherEntries,
        estimatedSizeKB: Math.round(estimatedSizeKB),
      };
    } catch (error) {
      console.error("Error getting storage usage:", error);
      return {
        totalEntries: 0,
        reminderEntries: 0,
        sessionEntries: 0,
        historyEntries: 0,
        otherEntries: 0,
        estimatedSizeKB: 0,
      };
    }
  }

  /**
   * Get all users with their activity information
   */
  static async getAllUsers(options: {
    limit?: number;
    offset?: number;
    sortBy?: "lastSeen" | "totalReminders" | "username";
    sortOrder?: "asc" | "desc";
  } = {}): Promise<UserInfo[]> {
    try {
      const kv = await getKV();
      const {
        limit = 50,
        offset = 0,
        sortBy = "lastSeen",
        sortOrder = "desc",
      } = options;

      const userMap = new Map<string, Partial<UserInfo>>();

      // Collect user information from sessions
      const sessionIter = kv.list({ prefix: ["sessions"] });
      for await (const entry of sessionIter) {
        const session = entry.value as UserSession;
        const userId = session.userId;

        if (!userMap.has(userId)) {
          userMap.set(userId, {
            userId,
            username: session.userInfo.username,
            discriminator: session.userInfo.discriminator,
            avatar: session.userInfo.avatar,
            totalSessions: 0,
            currentSessions: 0,
            totalReminders: 0,
            activeReminders: 0,
            completedReminders: 0,
            totalDeliveries: 0,
            totalAcknowledgments: 0,
            acknowledgmentRate: 0,
            averageResponseTime: 0,
            isAdmin: false,
            isBanned: false,
          });
        }

        const user = userMap.get(userId)!;
        user.totalSessions = (user.totalSessions || 0) + 1;

        const createdAt = new Date(session.createdAt);
        const lastAccessed = new Date(session.lastAccessedAt);

        if (!user.firstSeen || createdAt < user.firstSeen) {
          user.firstSeen = createdAt;
        }
        if (!user.lastSeen || lastAccessed > user.lastSeen) {
          user.lastSeen = lastAccessed;
        }

        // Check if session is still active (within last hour)
        const oneHourAgo = new Date();
        oneHourAgo.setHours(oneHourAgo.getHours() - 1);
        if (lastAccessed >= oneHourAgo) {
          user.currentSessions = (user.currentSessions || 0) + 1;
        }
      }

      // Collect reminder information
      const reminderIter = kv.list({ prefix: ["reminders"] });
      for await (const entry of reminderIter) {
        const reminder = entry.value as Reminder;
        const userId = reminder.targetUser;

        if (userMap.has(userId)) {
          const user = userMap.get(userId)!;
          user.totalReminders = (user.totalReminders || 0) + 1;

          if (reminder.status === "active") {
            user.activeReminders = (user.activeReminders || 0) + 1;
          } else if (reminder.status === "completed") {
            user.completedReminders = (user.completedReminders || 0) + 1;
          }
        }
      }

      // Get user activity from history
      for (const [userId, user] of userMap.entries()) {
        const userActivity = await ReminderHistoryService.generateUserSummary(
          userId,
          30,
        );
        user.totalDeliveries = userActivity.totalRemindersReceived;
        user.totalAcknowledgments = userActivity.remindersAcknowledged;
        user.acknowledgmentRate = user.totalDeliveries > 0
          ? (user.totalAcknowledgments / user.totalDeliveries) * 100
          : 0;
        user.averageResponseTime = userActivity.averageResponseTime;
      }

      // Convert to array and sort
      const users = Array.from(userMap.values()) as UserInfo[];

      users.sort((a, b) => {
        let aVal: string | number | undefined,
          bVal: string | number | undefined;

        switch (sortBy) {
          case "lastSeen":
            aVal = a.lastSeen?.getTime() || 0;
            bVal = b.lastSeen?.getTime() || 0;
            break;
          case "totalReminders":
            aVal = a.totalReminders;
            bVal = b.totalReminders;
            break;
          case "username":
            aVal = a.username.toLowerCase();
            bVal = b.username.toLowerCase();
            break;
          default:
            aVal = a.lastSeen?.getTime() || 0;
            bVal = b.lastSeen?.getTime() || 0;
        }

        if (sortOrder === "asc") {
          return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
        } else {
          return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
        }
      });

      // Apply pagination
      return users.slice(offset, offset + limit);
    } catch (error) {
      console.error("Error getting users:", error);
      return [];
    }
  }

  /**
   * Get detailed information about a specific user
   */
  static async getUserDetails(userId: string): Promise<UserInfo | null> {
    try {
      const users = await this.getAllUsers({ limit: 1000 });
      return users.find((user) => user.userId === userId) || null;
    } catch (error) {
      console.error("Error getting user details:", error);
      return null;
    }
  }

  /**
   * Perform system health check
   */
  static async performHealthCheck(): Promise<HealthCheck> {
    const result: HealthCheck = {
      status: "healthy",
      timestamp: new Date(),
      checks: {
        database: { status: "ok" },
        storage: { status: "ok", usage: 0 },
        sessions: { status: "ok", count: 0 },
        reminders: { status: "ok", activeCount: 0 },
      },
      warnings: [],
      errors: [],
    };

    try {
      // Check database connectivity
      const kv = await getKV();
      await kv.list({ prefix: ["health_check"] }, { limit: 1 });
      result.checks.database.status = "ok";
    } catch (error) {
      result.checks.database.status = "error";
      result.checks.database.message = error instanceof Error
        ? error.message
        : "Database connection failed";
      result.errors.push("Database connectivity issue");
      result.status = "error";
    }

    try {
      // Check storage usage
      const storageUsage = await this.getStorageUsage();
      result.checks.storage.usage = storageUsage.estimatedSizeKB;

      if (storageUsage.estimatedSizeKB > 100 * 1024) { // > 100MB
        result.checks.storage.status = "warning";
        result.checks.storage.message = "High storage usage detected";
        result.warnings.push("Storage usage is high");
        if (result.status === "healthy") result.status = "warning";
      }
    } catch (_error) {
      result.checks.storage.status = "error";
      result.checks.storage.message = "Failed to check storage usage";
      result.errors.push("Storage check failed");
      result.status = "error";
    }

    try {
      // Check session health
      const sessionStats = await getSessionStats();
      result.checks.sessions.count = sessionStats.activeSessions;

      if (sessionStats.expiredSessions > sessionStats.activeSessions * 2) {
        result.checks.sessions.status = "warning";
        result.checks.sessions.message = "High number of expired sessions";
        result.warnings.push("Consider running session cleanup");
        if (result.status === "healthy") result.status = "warning";
      }
    } catch (_error) {
      result.errors.push("Session check failed");
      result.status = "error";
    }

    try {
      // Check reminder system
      const stats = await this.getSystemStats();
      result.checks.reminders.activeCount = stats.activeReminders;

      if (stats.deliverySuccessRate < 90 && stats.totalDeliveries > 10) {
        result.checks.reminders.status = "warning";
        result.warnings.push("Low delivery success rate detected");
        if (result.status === "healthy") result.status = "warning";
      }
    } catch (_error) {
      result.errors.push("Reminder system check failed");
      result.status = "error";
    }

    return result;
  }

  /**
   * Clean up system data
   */
  static async performCleanup(): Promise<{
    sessionsDeleted: number;
    historyDeleted: number;
    errors: string[];
  }> {
    const result: {
      sessionsDeleted: number;
      historyDeleted: number;
      errors: string[];
    } = {
      sessionsDeleted: 0,
      historyDeleted: 0,
      errors: [],
    };

    try {
      // Clean up expired sessions
      const { cleanupExpiredSessions } = await import("../storage/sessions.ts");
      result.sessionsDeleted = await cleanupExpiredSessions();
    } catch (error) {
      result.errors.push(
        `Session cleanup failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      );
    }

    try {
      // Clean up old history
      result.historyDeleted = await ReminderHistoryService.cleanupHistory(90);
    } catch (error) {
      result.errors.push(
        `History cleanup failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      );
    }

    return result;
  }
}

/**
 * Admin authorization helper
 */
export function isUserAdmin(userId: string): boolean {
  // For now, implement a simple admin list
  // In production, this could be stored in the database
  const adminUsers: string[] = [
    // Add admin Discord user IDs here
    // "123456789012345678", // Example admin user ID
  ];

  return adminUsers.includes(userId);
}

/**
 * Require admin authorization
 */
export function requireAdmin(userId: string): void {
  if (!isUserAdmin(userId)) {
    throw new Error("Admin access required");
  }
}
