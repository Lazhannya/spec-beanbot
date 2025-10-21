// API routes for individual reminder template
// GET /api/reminders/templates/[id] - Get a specific template

import type { Handlers } from "$fresh/server.ts";
import { getSessionFromRequest } from "../../../../lib/storage/sessions.ts";
import { getTemplateById } from "../../../../data/reminder-templates.ts";

interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  errors?: string[];
}

export const handler: Handlers = {
  /**
   * GET /api/reminders/templates/[id] - Get a specific template
   */
  async GET(req, ctx) {
    try {
      // Get user from session
      const session = await getSessionFromRequest(req);
      if (!session) {
        return new Response(
          JSON.stringify({ success: false, error: "Authentication required" }),
          { status: 401, headers: { "Content-Type": "application/json" } }
        );
      }

      const templateId = ctx.params.id;
      
      // Get template
      const template = getTemplateById(templateId);
      if (!template) {
        return new Response(
          JSON.stringify({ success: false, error: "Template not found" }),
          { status: 404, headers: { "Content-Type": "application/json" } }
        );
      }

      const response: ApiResponse = {
        success: true,
        data: template,
      };

      return new Response(JSON.stringify(response), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("Error in GET /api/reminders/templates/[id]:", error);
      
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