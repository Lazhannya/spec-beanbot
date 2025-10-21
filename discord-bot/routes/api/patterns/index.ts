// API routes for pattern management
// GET /api/patterns - List patterns with filtering and pagination
// POST /api/patterns - Create a new pattern

import type { Handlers } from "$fresh/server.ts";
import { getSessionFromRequest } from "../../../lib/storage/sessions.ts";
import {
  textPatterns,
  getPatternById,
  getPatternCategories,
} from "../../../data/text-patterns.ts";
import type { TextPattern } from "../../../data/text-patterns.ts";

interface ListPatternsQuery {
  page?: string;
  limit?: string;
  category?: string;
  enabled?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: string;
  priority?: string;
  isRegex?: string;
}

interface CreatePatternInput {
  name: string;
  description: string;
  category: TextPattern["category"];
  patterns: string[];
  isRegex: boolean;
  caseSensitive: boolean;
  wholeWordsOnly: boolean;
  enabled: boolean;
  response: {
    type: "message" | "reaction" | "webhook" | "both";
    message?: string;
    reaction?: string;
    webhookAction?: string;
  };
  priority: number;
  cooldownMinutes: number;
  restrictToChannels?: string[];
  restrictToUsers?: string[];
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
 * GET /api/patterns - List patterns with filtering and pagination
 */
async function handleGetPatterns(req: Request): Promise<Response> {
  try {
    // Get user from session
    const session = await getSessionFromRequest(req);
    if (!session) {
      return new Response(
        JSON.stringify({ success: false, error: "Authentication required" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    // Parse query parameters
    const url = new URL(req.url);
    const query: ListPatternsQuery = Object.fromEntries(url.searchParams);

    // Start with all patterns
    let filteredPatterns = [...textPatterns];

    // Apply filters
    if (query.category) {
      const categories = query.category.split(",") as TextPattern["category"][];
      filteredPatterns = filteredPatterns.filter(p => 
        categories.includes(p.category)
      );
    }

    if (query.enabled === "true") {
      filteredPatterns = filteredPatterns.filter(p => p.enabled);
    } else if (query.enabled === "false") {
      filteredPatterns = filteredPatterns.filter(p => !p.enabled);
    }

    if (query.isRegex === "true") {
      filteredPatterns = filteredPatterns.filter(p => p.isRegex);
    } else if (query.isRegex === "false") {
      filteredPatterns = filteredPatterns.filter(p => !p.isRegex);
    }

    if (query.priority) {
      const priorityFilter = parseInt(query.priority);
      if (!isNaN(priorityFilter)) {
        filteredPatterns = filteredPatterns.filter(p => p.priority >= priorityFilter);
      }
    }

    if (query.search) {
      const searchTerm = query.search.toLowerCase();
      filteredPatterns = filteredPatterns.filter(p =>
        p.name.toLowerCase().includes(searchTerm) ||
        p.description.toLowerCase().includes(searchTerm) ||
        p.patterns.some(pattern => pattern.toLowerCase().includes(searchTerm))
      );
    }

    // Apply sorting
    const sortBy = query.sortBy || "priority";
    const sortOrder = query.sortOrder === "asc" ? 1 : -1;

    filteredPatterns.sort((a, b) => {
      let aValue: string | number;
      let bValue: string | number;

      switch (sortBy) {
        case "name":
          aValue = a.name;
          bValue = b.name;
          break;
        case "priority":
          aValue = a.priority;
          bValue = b.priority;
          break;
        case "category":
          aValue = a.category;
          bValue = b.category;
          break;
        case "createdAt":
          aValue = a.metadata.createdAt;
          bValue = b.metadata.createdAt;
          break;
        case "triggerCount":
          aValue = a.metadata.triggerCount;
          bValue = b.metadata.triggerCount;
          break;
        default:
          aValue = a.priority;
          bValue = b.priority;
      }

      if (typeof aValue === "string" && typeof bValue === "string") {
        return aValue.localeCompare(bValue) * sortOrder;
      }
      
      return ((aValue as number) - (bValue as number)) * sortOrder;
    });

    // Apply pagination
    const page = parseInt(query.page || "1");
    const limit = Math.min(parseInt(query.limit || "20"), 100);
    const offset = (page - 1) * limit;
    
    const total = filteredPatterns.length;
    const paginatedPatterns = filteredPatterns.slice(offset, offset + limit);
    const totalPages = Math.ceil(total / limit);

    const response: ApiResponse = {
      success: true,
      data: paginatedPatterns,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in GET /api/patterns:", error);
    
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
 * POST /api/patterns - Create a new pattern
 */
async function handleCreatePattern(req: Request): Promise<Response> {
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
    let input: CreatePatternInput;
    try {
      input = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid JSON in request body" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Validate required fields
    const errors: string[] = [];

    if (!input.name?.trim()) {
      errors.push("Pattern name is required");
    }

    if (!input.description?.trim()) {
      errors.push("Pattern description is required");
    }

    if (!input.category) {
      errors.push("Pattern category is required");
    } else if (!getPatternCategories().includes(input.category)) {
      errors.push("Invalid pattern category");
    }

    if (!input.patterns || !Array.isArray(input.patterns) || input.patterns.length === 0) {
      errors.push("At least one pattern is required");
    }

    if (typeof input.priority !== "number" || input.priority < 1 || input.priority > 10) {
      errors.push("Priority must be a number between 1 and 10");
    }

    if (typeof input.cooldownMinutes !== "number" || input.cooldownMinutes < 0) {
      errors.push("Cooldown minutes must be a non-negative number");
    }

    if (!input.response || !input.response.type) {
      errors.push("Response configuration is required");
    } else {
      if (!["message", "reaction", "webhook", "both"].includes(input.response.type)) {
        errors.push("Invalid response type");
      }

      if (input.response.type === "message" || input.response.type === "both") {
        if (!input.response.message?.trim()) {
          errors.push("Response message is required for message responses");
        }
      }

      if (input.response.type === "reaction" || input.response.type === "both") {
        if (!input.response.reaction?.trim()) {
          errors.push("Response reaction emoji is required for reaction responses");
        }
      }

      if (input.response.type === "webhook") {
        if (!input.response.webhookAction?.trim()) {
          errors.push("Webhook action is required for webhook responses");
        }
      }
    }

    // Validate regex patterns if specified
    if (input.isRegex && input.patterns) {
      for (const pattern of input.patterns) {
        try {
          new RegExp(pattern);
        } catch (regexError) {
          errors.push(`Invalid regex pattern: "${pattern}" - ${
            regexError instanceof Error ? regexError.message : "Unknown error"
          }`);
        }
      }
    }

    // Check for duplicate pattern ID
    const patternId = input.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    if (getPatternById(patternId)) {
      errors.push("A pattern with this name already exists");
    }

    if (errors.length > 0) {
      const response: ApiResponse = {
        success: false,
        error: "Validation failed",
        errors,
      };

      return new Response(JSON.stringify(response), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Create new pattern
    const newPattern: TextPattern = {
      id: patternId,
      name: input.name.trim(),
      description: input.description.trim(),
      category: input.category,
      patterns: input.patterns.map(p => p.trim()).filter(p => p.length > 0),
      isRegex: input.isRegex,
      caseSensitive: input.caseSensitive,
      wholeWordsOnly: input.wholeWordsOnly,
      enabled: input.enabled,
      response: {
        type: input.response.type,
        message: input.response.message?.trim(),
        reaction: input.response.reaction?.trim(),
        webhookAction: input.response.webhookAction?.trim(),
      },
      priority: input.priority,
      cooldownMinutes: input.cooldownMinutes,
      restrictToChannels: input.restrictToChannels || [],
      restrictToUsers: input.restrictToUsers || [],
      metadata: {
        createdAt: new Date().toISOString(),
        triggerCount: 0,
        isActive: true,
      },
    };

    // Add to patterns array (in real app this would save to database)
    textPatterns.push(newPattern);

    const response: ApiResponse = {
      success: true,
      data: newPattern,
    };

    return new Response(JSON.stringify(response), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in POST /api/patterns:", error);
    
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
  GET: handleGetPatterns,
  POST: handleCreatePattern,
};