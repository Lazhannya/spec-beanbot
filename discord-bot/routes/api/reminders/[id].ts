// API routes for individual reminder management
// GET /api/reminders/[id] - Get a specific reminder
// PUT /api/reminders/[id] - Update a specific reminder
// DELETE /api/reminders/[id] - Delete a specific reminder

import type { Handlers } from "$fresh/server.ts";
import { getSessionFromRequest } from "../../../lib/storage/sessions.ts";
import {
  deleteReminder,
  getDeliveriesByReminder,
  getReminderById,
  updateReminder,
} from "../../../lib/storage/reminders.ts";
import type { UpdateReminderInput } from "../../../lib/types/reminders.ts";

interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  errors?: string[];
}

export const handler: Handlers = {
  /**
   * GET /api/reminders/[id] - Get a specific reminder
   */
  async GET(req, ctx) {
    try {
      // Get user from session
      const session = await getSessionFromRequest(req);
      if (!session) {
        return new Response(
          JSON.stringify({ success: false, error: "Authentication required" }),
          { status: 401, headers: { "Content-Type": "application/json" } },
        );
      }

      const reminderId = ctx.params.id;

      // Get reminder
      const reminder = await getReminderById(reminderId);
      if (!reminder) {
        return new Response(
          JSON.stringify({ success: false, error: "Reminder not found" }),
          { status: 404, headers: { "Content-Type": "application/json" } },
        );
      }

      // Check permissions - user can only access their own reminders
      if (reminder.createdBy !== session.userId) {
        return new Response(
          JSON.stringify({ success: false, error: "Permission denied" }),
          { status: 403, headers: { "Content-Type": "application/json" } },
        );
      }

      // Get delivery history
      const deliveries = await getDeliveriesByReminder(reminderId);

      const response: ApiResponse = {
        success: true,
        data: {
          reminder,
          deliveries,
        },
      };

      return new Response(JSON.stringify(response), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("Error in GET /api/reminders/[id]:", error);

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

  /**
   * PUT /api/reminders/[id] - Update a specific reminder
   */
  async PUT(req, ctx) {
    try {
      // Get user from session
      const session = await getSessionFromRequest(req);
      if (!session) {
        return new Response(
          JSON.stringify({ success: false, error: "Authentication required" }),
          { status: 401, headers: { "Content-Type": "application/json" } },
        );
      }

      const reminderId = ctx.params.id;

      // Parse request body
      let input: UpdateReminderInput;
      try {
        input = await req.json();
      } catch {
        return new Response(
          JSON.stringify({
            success: false,
            error: "Invalid JSON in request body",
          }),
          { status: 400, headers: { "Content-Type": "application/json" } },
        );
      }

      // Update reminder
      const result = await updateReminder(reminderId, input, session.userId);

      if (result.success) {
        const response: ApiResponse = {
          success: true,
          data: result.reminder,
        };

        return new Response(JSON.stringify(response), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      } else {
        const statusCode = result.errors?.includes("Reminder not found")
          ? 404
          : result.errors?.includes("Permission denied")
          ? 403
          : 400;

        const response: ApiResponse = {
          success: false,
          error: "Failed to update reminder",
          errors: result.errors,
        };

        return new Response(JSON.stringify(response), {
          status: statusCode,
          headers: { "Content-Type": "application/json" },
        });
      }
    } catch (error) {
      console.error("Error in PUT /api/reminders/[id]:", error);

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

  /**
   * DELETE /api/reminders/[id] - Delete a specific reminder
   */
  async DELETE(req, ctx) {
    try {
      // Get user from session
      const session = await getSessionFromRequest(req);
      if (!session) {
        return new Response(
          JSON.stringify({ success: false, error: "Authentication required" }),
          { status: 401, headers: { "Content-Type": "application/json" } },
        );
      }

      const reminderId = ctx.params.id;

      // Delete reminder
      const result = await deleteReminder(reminderId, session.userId);

      if (result.success) {
        const response: ApiResponse = {
          success: true,
          data: { id: reminderId, deleted: true },
        };

        return new Response(JSON.stringify(response), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      } else {
        const statusCode = result.errors?.includes("Reminder not found")
          ? 404
          : result.errors?.includes("Permission denied")
          ? 403
          : 400;

        const response: ApiResponse = {
          success: false,
          error: "Failed to delete reminder",
          errors: result.errors,
        };

        return new Response(JSON.stringify(response), {
          status: statusCode,
          headers: { "Content-Type": "application/json" },
        });
      }
    } catch (error) {
      console.error("Error in DELETE /api/reminders/[id]:", error);

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
