// API routes for reminder statistics and analytics
// GET /api/reminders/stats - Get reminder statistics for current user

import type { Handlers } from "$fresh/server.ts";
import { getSessionFromRequest } from "../../../lib/storage/sessions.ts";
import {
  getUserStats,
  searchReminders,
} from "../../../lib/storage/reminders.ts";

interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  errors?: string[];
}

export const handler: Handlers = {
  /**
   * GET /api/reminders/stats - Get reminder statistics for current user
   */
  async GET(req, _ctx) {
    try {
      // Get user from session
      const session = await getSessionFromRequest(req);
      if (!session) {
        return new Response(
          JSON.stringify({ success: false, error: "Authentication required" }),
          { status: 401, headers: { "Content-Type": "application/json" } }
        );
      }

      // Get user statistics
      const stats = await getUserStats(session.userId);

      // Get recent activity for additional insights
      const recentReminders = await searchReminders({
        userId: session.userId,
        limit: 10,
        sortBy: "createdAt",
        sortOrder: "desc",
      });

      const upcomingReminders = await searchReminders({
        userId: session.userId,
        status: ["active"],
        limit: 5,
        sortBy: "nextDeliveryAt",
        sortOrder: "asc",
      });

      const response: ApiResponse = {
        success: true,
        data: {
          stats,
          recentActivity: {
            recentReminders: recentReminders.reminders,
            upcomingReminders: upcomingReminders.reminders,
          },
          summary: {
            totalReminders: stats.totalReminders,
            activeReminders: stats.activeReminders,
            completedReminders: stats.completedReminders,
            acknowledgmentRate: Math.round(stats.acknowledgmentRate * 100),
            topCategory: Object.entries(stats.categoryBreakdown)
              .sort(([,a], [,b]) => b - a)[0]?.[0] || "none",
          },
        },
      };

      return new Response(JSON.stringify(response), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("Error in GET /api/reminders/stats:", error);
      
      const response: ApiResponse = {
        success: false,
        error: "Internal server error",
      };

      return new Response(JSON.stringify(response), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  },
};