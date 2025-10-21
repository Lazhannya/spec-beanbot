// API routes for individual pattern management
// GET /api/patterns/[id] - Get a specific pattern
// PUT /api/patterns/[id] - Update a specific pattern
// DELETE /api/patterns/[id] - Delete a specific pattern

import type { Handlers } from "$fresh/server.ts";
import { getSessionFromRequest } from "../../../lib/storage/sessions.ts";
import {
  getPatternById,
  getPatternCategories,
  textPatterns,
} from "../../../data/text-patterns.ts";
import type { TextPattern } from "../../../data/text-patterns.ts";

interface UpdatePatternInput {
  name?: string;
  description?: string;
  category?: TextPattern["category"];
  patterns?: string[];
  isRegex?: boolean;
  caseSensitive?: boolean;
  wholeWordsOnly?: boolean;
  enabled?: boolean;
  response?: {
    type: "message" | "reaction" | "webhook" | "both";
    message?: string;
    reaction?: string;
    webhookAction?: string;
  };
  priority?: number;
  cooldownMinutes?: number;
  restrictToChannels?: string[];
  restrictToUsers?: string[];
}

interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  errors?: string[];
}

export const handler: Handlers = {
  /**
   * GET /api/patterns/[id] - Get a specific pattern
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

      const pattern = getPatternById(ctx.params.id);

      if (!pattern) {
        return new Response(
          JSON.stringify({ success: false, error: "Pattern not found" }),
          { status: 404, headers: { "Content-Type": "application/json" } },
        );
      }

      const response: ApiResponse = {
        success: true,
        data: pattern,
      };

      return new Response(JSON.stringify(response), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("Error in GET /api/patterns/[id]:", error);

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
   * PUT /api/patterns/[id] - Update a specific pattern
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

      // Find the pattern
      const patternIndex = textPatterns.findIndex((p) =>
        p.id === ctx.params.id
      );

      if (patternIndex === -1) {
        return new Response(
          JSON.stringify({ success: false, error: "Pattern not found" }),
          { status: 404, headers: { "Content-Type": "application/json" } },
        );
      }

      // Parse request body
      let input: UpdatePatternInput;
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

      // Validate input
      const errors: string[] = [];

      if (input.name !== undefined && !input.name.trim()) {
        errors.push("Pattern name cannot be empty");
      }

      if (input.description !== undefined && !input.description.trim()) {
        errors.push("Pattern description cannot be empty");
      }

      if (
        input.category !== undefined &&
        !getPatternCategories().includes(input.category)
      ) {
        errors.push("Invalid pattern category");
      }

      if (input.patterns !== undefined) {
        if (!Array.isArray(input.patterns) || input.patterns.length === 0) {
          errors.push("At least one pattern is required");
        }
      }

      if (input.priority !== undefined) {
        if (
          typeof input.priority !== "number" || input.priority < 1 ||
          input.priority > 10
        ) {
          errors.push("Priority must be a number between 1 and 10");
        }
      }

      if (input.cooldownMinutes !== undefined) {
        if (
          typeof input.cooldownMinutes !== "number" || input.cooldownMinutes < 0
        ) {
          errors.push("Cooldown minutes must be a non-negative number");
        }
      }

      if (input.response !== undefined) {
        if (!input.response.type) {
          errors.push("Response type is required");
        } else if (
          !["message", "reaction", "webhook", "both"].includes(
            input.response.type,
          )
        ) {
          errors.push("Invalid response type");
        }

        if (
          input.response.type === "message" || input.response.type === "both"
        ) {
          if (!input.response.message?.trim()) {
            errors.push("Response message is required for message responses");
          }
        }

        if (
          input.response.type === "reaction" || input.response.type === "both"
        ) {
          if (!input.response.reaction?.trim()) {
            errors.push(
              "Response reaction emoji is required for reaction responses",
            );
          }
        }

        if (input.response.type === "webhook") {
          if (!input.response.webhookAction?.trim()) {
            errors.push("Webhook action is required for webhook responses");
          }
        }
      }

      // Validate regex patterns if specified
      const isRegex = input.isRegex !== undefined
        ? input.isRegex
        : textPatterns[patternIndex].isRegex;
      const patterns = input.patterns || textPatterns[patternIndex].patterns;

      if (isRegex && patterns) {
        for (const pattern of patterns) {
          try {
            new RegExp(pattern);
          } catch (regexError) {
            errors.push(
              `Invalid regex pattern: "${pattern}" - ${
                regexError instanceof Error
                  ? regexError.message
                  : "Unknown error"
              }`,
            );
          }
        }
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

      // Update the pattern
      const existingPattern = textPatterns[patternIndex];
      const updatedPattern: TextPattern = {
        ...existingPattern,
        ...(input.name !== undefined && { name: input.name.trim() }),
        ...(input.description !== undefined &&
          { description: input.description.trim() }),
        ...(input.category !== undefined && { category: input.category }),
        ...(input.patterns !== undefined && {
          patterns: input.patterns.map((p) => p.trim()).filter((p) =>
            p.length > 0
          ),
        }),
        ...(input.isRegex !== undefined && { isRegex: input.isRegex }),
        ...(input.caseSensitive !== undefined &&
          { caseSensitive: input.caseSensitive }),
        ...(input.wholeWordsOnly !== undefined &&
          { wholeWordsOnly: input.wholeWordsOnly }),
        ...(input.enabled !== undefined && { enabled: input.enabled }),
        ...(input.response !== undefined && {
          response: {
            type: input.response.type,
            message: input.response.message?.trim(),
            reaction: input.response.reaction?.trim(),
            webhookAction: input.response.webhookAction?.trim(),
          },
        }),
        ...(input.priority !== undefined && { priority: input.priority }),
        ...(input.cooldownMinutes !== undefined &&
          { cooldownMinutes: input.cooldownMinutes }),
        ...(input.restrictToChannels !== undefined &&
          { restrictToChannels: input.restrictToChannels }),
        ...(input.restrictToUsers !== undefined &&
          { restrictToUsers: input.restrictToUsers }),
      };

      // Replace the pattern in the array
      textPatterns[patternIndex] = updatedPattern;

      const response: ApiResponse = {
        success: true,
        data: updatedPattern,
      };

      return new Response(JSON.stringify(response), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("Error in PUT /api/patterns/[id]:", error);

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
   * DELETE /api/patterns/[id] - Delete a specific pattern
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

      // Find the pattern
      const patternIndex = textPatterns.findIndex((p) =>
        p.id === ctx.params.id
      );

      if (patternIndex === -1) {
        return new Response(
          JSON.stringify({ success: false, error: "Pattern not found" }),
          { status: 404, headers: { "Content-Type": "application/json" } },
        );
      }

      // Get the pattern before deletion for response
      const deletedPattern = textPatterns[patternIndex];

      // Remove the pattern from the array
      textPatterns.splice(patternIndex, 1);

      const response: ApiResponse = {
        success: true,
        data: {
          id: deletedPattern.id,
          name: deletedPattern.name,
          deleted: true,
        },
      };

      return new Response(JSON.stringify(response), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("Error in DELETE /api/patterns/[id]:", error);

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
