// API routes for bulk reminder operations
// POST /api/reminders/bulk - Perform bulk operations on multiple reminders

import type { Handlers } from "$fresh/server.ts";
import { getSessionFromRequest } from "../../../lib/storage/sessions.ts";
import {
  bulkOperateReminders,
} from "../../../lib/storage/reminders.ts";
import type {
  BulkReminderOperation,
} from "../../../lib/types/reminders.ts";

interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  errors?: string[];
}

export const handler: Handlers = {
  /**
   * POST /api/reminders/bulk - Perform bulk operations on multiple reminders
   */
  async POST(req, _ctx) {
    try {
      // Get user from session
      const session = await getSessionFromRequest(req);
      if (!session) {
        return new Response(
          JSON.stringify({ success: false, error: "Authentication required" }),
          { status: 401, headers: { "Content-Type": "application/json" } }
        );
      }

      // Parse request body
      let operation: BulkReminderOperation;
      try {
        operation = await req.json();
      } catch {
        return new Response(
          JSON.stringify({ success: false, error: "Invalid JSON in request body" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      // Validate required fields
      if (!operation.operation || !operation.reminderIds || !Array.isArray(operation.reminderIds)) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: "Missing or invalid required fields: operation, reminderIds" 
          }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      // Validate operation type
      const validOperations = ["delete", "pause", "resume", "complete", "update"];
      if (!validOperations.includes(operation.operation)) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: `Invalid operation. Must be one of: ${validOperations.join(", ")}` 
          }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      // Validate that update operations have update data
      if (operation.operation === "update" && !operation.updateData) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: "Update operation requires updateData field" 
          }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      // Perform bulk operation
      const result = await bulkOperateReminders(operation, session.userId);

      const response: ApiResponse = {
        success: result.success,
        data: {
          operation: operation.operation,
          processed: result.processed,
          total: operation.reminderIds.length,
          errors: result.errors,
        },
      };

      // Return appropriate status code based on results
      const statusCode = result.success ? 200 : 
                        result.processed > 0 ? 207 : // Partial success
                        400; // Complete failure

      return new Response(JSON.stringify(response), {
        status: statusCode,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("Error in POST /api/reminders/bulk:", error);
      
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