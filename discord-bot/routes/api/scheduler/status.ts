// Scheduler monitoring and control API route
// GET /api/scheduler/status - Get scheduler health and statistics
// POST /api/scheduler/process - Force process due reminders

import type { Handlers } from "$fresh/server.ts";
import {
  forceProcessReminders,
  getSchedulerHealth,
} from "../../../lib/scheduler/index.ts";

export const handler: Handlers = {
  /**
   * GET /api/scheduler/status
   * Returns scheduler health status and statistics
   */
  GET(_req) {
    try {
      const health = getSchedulerHealth();

      return new Response(
        JSON.stringify({
          success: true,
          data: health,
          timestamp: new Date().toISOString(),
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
          },
        },
      );
    } catch (error) {
      console.error("Error getting scheduler status:", error);

      return new Response(
        JSON.stringify({
          success: false,
          error: "Failed to get scheduler status",
          details: error instanceof Error ? error.message : "Unknown error",
        }),
        {
          status: 500,
          headers: {
            "Content-Type": "application/json",
          },
        },
      );
    }
  },

  /**
   * POST /api/scheduler/process
   * Force process due reminders immediately
   */
  async POST(_req) {
    try {
      const result = await forceProcessReminders();

      return new Response(
        JSON.stringify({
          success: result.success,
          data: {
            processed: result.processed,
            message: result.message,
          },
          timestamp: new Date().toISOString(),
        }),
        {
          status: result.success ? 200 : 500,
          headers: {
            "Content-Type": "application/json",
          },
        },
      );
    } catch (error) {
      console.error("Error force processing reminders:", error);

      return new Response(
        JSON.stringify({
          success: false,
          error: "Failed to process reminders",
          details: error instanceof Error ? error.message : "Unknown error",
        }),
        {
          status: 500,
          headers: {
            "Content-Type": "application/json",
          },
        },
      );
    }
  },
};
