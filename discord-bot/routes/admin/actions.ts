// API endpoint for admin actions
import type { Handlers } from "$fresh/server.ts";
import { getSessionFromRequest } from "../../lib/storage/sessions.ts";
import { AdminService, isUserAdmin } from "../../lib/admin/service.ts";

interface ActionRequest {
  action: string;
}

interface ActionResponse {
  success: boolean;
  result?: unknown;
  error?: string;
}

export const handler: Handlers = {
  async POST(req) {
    try {
      // Check authentication
      const session = await getSessionFromRequest(req);
      
      if (!session?.userId) {
        return new Response(
          JSON.stringify({ success: false, error: "Authentication required" }),
          {
            status: 401,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      // Check admin permissions
      if (!isUserAdmin(session.userId)) {
        return new Response(
          JSON.stringify({ success: false, error: "Admin access required" }),
          {
            status: 403,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      // Parse request body
      const { action }: ActionRequest = await req.json();
      
      let result: unknown;
      
      switch (action) {
        case "cleanup": {
          result = await AdminService.performCleanup();
          break;
        }
        
        case "healthcheck": {
          result = await AdminService.performHealthCheck();
          break;
        }
        
        case "stats": {
          result = await AdminService.getSystemStats();
          break;
        }
        
        case "storage": {
          result = await AdminService.getStorageUsage();
          break;
        }
        
        default: {
          return new Response(
            JSON.stringify({ success: false, error: `Unknown action: ${action}` }),
            {
              status: 400,
              headers: { "Content-Type": "application/json" },
            }
          );
        }
      }

      const response: ActionResponse = {
        success: true,
        result,
      };

      return new Response(JSON.stringify(response), {
        headers: { "Content-Type": "application/json" },
      });

    } catch (error) {
      console.error("Admin action error:", error);
      
      const response: ActionResponse = {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };

      return new Response(JSON.stringify(response), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  },
};