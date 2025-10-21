// API routes for reminder management
// GET /api/reminders - List reminders with filtering and pagination
// POST /api/reminders - Create a new reminder

import type { Handlers } from "$fresh/server.ts";
import { getSessionFromRequest } from "../../../lib/storage/sessions.ts";
import {
  createReminder,
  searchReminders,
} from "../../../lib/storage/reminders.ts";
import type {
  CreateReminderInput,
  ReminderCategory,
  ReminderPriority,
  ReminderSearchCriteria,
  ReminderStatus,
} from "../../../lib/types/reminders.ts";

interface ListRemindersQuery {
  page?: string;
  limit?: string;
  status?: string;
  category?: string;
  priority?: string;
  tags?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: string;
  templateId?: string;
  createdAfter?: string;
  createdBefore?: string;
  nextDeliveryAfter?: string;
  nextDeliveryBefore?: string;
}

interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  errors?: string[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/**
 * GET /api/reminders - List reminders with filtering and pagination
 */
async function handleGetReminders(req: Request): Promise<Response> {
  try {
    // Get user from session
    const session = await getSessionFromRequest(req);
    if (!session) {
      return new Response(
        JSON.stringify({ success: false, error: "Authentication required" }),
        { status: 401, headers: { "Content-Type": "application/json" } },
      );
    }

    // Parse query parameters
    const url = new URL(req.url);
    const query: ListRemindersQuery = Object.fromEntries(url.searchParams);

    // Build search criteria
    const criteria: ReminderSearchCriteria = {
      userId: session.userId, // Only return reminders created by this user
    };

    // Parse pagination
    const page = parseInt(query.page || "1");
    const limit = Math.min(parseInt(query.limit || "20"), 100); // Max 100 per page
    criteria.offset = (page - 1) * limit;
    criteria.limit = limit;

    // Parse filters
    if (query.status) {
      criteria.status = query.status.split(",") as ReminderStatus[];
    }

    if (query.category) {
      criteria.category = query.category.split(",") as ReminderCategory[];
    }

    if (query.priority) {
      criteria.priority = query.priority.split(",") as ReminderPriority[];
    }

    if (query.tags) {
      criteria.tags = query.tags.split(",");
    }

    if (query.search) {
      criteria.searchText = query.search.trim();
    }

    if (query.templateId) {
      criteria.templateId = query.templateId;
    }

    // Parse date filters
    if (query.createdAfter) {
      criteria.createdAfter = new Date(query.createdAfter);
    }

    if (query.createdBefore) {
      criteria.createdBefore = new Date(query.createdBefore);
    }

    if (query.nextDeliveryAfter) {
      criteria.nextDeliveryAfter = new Date(query.nextDeliveryAfter);
    }

    if (query.nextDeliveryBefore) {
      criteria.nextDeliveryBefore = new Date(query.nextDeliveryBefore);
    }

    // Parse sorting
    if (query.sortBy) {
      const validSortFields = [
        "createdAt",
        "nextDeliveryAt",
        "priority",
        "title",
      ];
      if (validSortFields.includes(query.sortBy)) {
        criteria.sortBy = query.sortBy as
          | "createdAt"
          | "nextDeliveryAt"
          | "priority"
          | "title";
        criteria.sortOrder = (query.sortOrder as "asc" | "desc") || "desc";
      }
    }

    // Search reminders
    const result = await searchReminders(criteria);

    // Calculate pagination
    const totalPages = Math.ceil(result.total / limit);

    const response: ApiResponse = {
      success: true,
      data: result.reminders,
      pagination: {
        page,
        limit,
        total: result.total,
        totalPages,
      },
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in GET /api/reminders:", error);

    const response: ApiResponse = {
      success: false,
      error: "Internal server error",
    };

    return new Response(JSON.stringify(response), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

/**
 * POST /api/reminders - Create a new reminder
 */
async function handleCreateReminder(req: Request): Promise<Response> {
  try {
    // Get user from session
    const session = await getSessionFromRequest(req);
    if (!session) {
      return new Response(
        JSON.stringify({ success: false, error: "Authentication required" }),
        { status: 401, headers: { "Content-Type": "application/json" } },
      );
    }

    // Parse request body
    let input: CreateReminderInput;
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

    // Validate required fields
    if (!input.title || !input.message || !input.category || !input.schedule) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Missing required fields: title, message, category, schedule",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    // Set default target user to creator if not specified
    if (!input.targetUser) {
      input.targetUser = session.userId;
    }

    // Create reminder
    const result = await createReminder(input, session.userId);

    if (result.success) {
      const response: ApiResponse = {
        success: true,
        data: result.reminder,
      };

      return new Response(JSON.stringify(response), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      });
    } else {
      const response: ApiResponse = {
        success: false,
        error: "Failed to create reminder",
        errors: result.errors,
      };

      return new Response(JSON.stringify(response), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
  } catch (error) {
    console.error("Error in POST /api/reminders:", error);

    const response: ApiResponse = {
      success: false,
      error: "Internal server error",
    };

    return new Response(JSON.stringify(response), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

export const handler: Handlers = {
  GET: handleGetReminders,
  POST: handleCreateReminder,
};
