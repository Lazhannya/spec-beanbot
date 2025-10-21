// API routes for reminder templates
// GET /api/reminders/templates - Get all available reminder templates

import type { Handlers } from "$fresh/server.ts";
import { getSessionFromRequest } from "../../../lib/storage/sessions.ts";
import { reminderTemplates } from "../../../data/reminder-templates.ts";

interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  errors?: string[];
}

export const handler: Handlers = {
  /**
   * GET /api/reminders/templates - Get all available reminder templates
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

      // Parse query parameters for filtering
      const url = new URL(req.url);
      const category = url.searchParams.get("category");

      let filteredTemplates = reminderTemplates;

      // Filter by category if specified
      if (category) {
        filteredTemplates = filteredTemplates.filter(
          template => template.category === category
        );
      }

      // Sort templates by category priority and name
      const sortedTemplates = filteredTemplates.sort((a, b) => {
        // First by category priority
        const categoryPriority = {
          health: 1,
          medication: 2,
          work: 3,
          appointment: 4,
          personal: 5,
          task: 6,
          custom: 7,
        };
        
        const aPriority = categoryPriority[a.category] || 999;
        const bPriority = categoryPriority[b.category] || 999;
        
        if (aPriority !== bPriority) {
          return aPriority - bPriority;
        }
        
        // Then alphabetically by name
        return a.name.localeCompare(b.name);
      });

      const response: ApiResponse = {
        success: true,
        data: {
          templates: sortedTemplates,
          total: sortedTemplates.length,
          categories: [...new Set(reminderTemplates.map(t => t.category))].sort(),
        },
      };

      return new Response(JSON.stringify(response), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("Error in GET /api/reminders/templates:", error);
      
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