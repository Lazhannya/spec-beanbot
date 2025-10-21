// API route for testing pattern matching
// POST /api/patterns/test - Test pattern matching against sample text

import type { Handlers } from "$fresh/server.ts";
import { getSessionFromRequest } from "../../../lib/storage/sessions.ts";
import {
  getPatternMatcher,
  initializePatternMatcher,
} from "../../../lib/patterns/matcher.ts";

interface TestPatternInput {
  text: string;
  userId?: string;
  channelId?: string;
  messageId?: string;
  config?: {
    enabled?: boolean;
    maxMatches?: number;
    minConfidence?: number;
    cooldownEnabled?: boolean;
    channelWhitelist?: string[];
    userBlacklist?: string[];
    debugMode?: boolean;
  };
}

interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  errors?: string[];
}

export const handler: Handlers = {
  /**
   * POST /api/patterns/test - Test pattern matching
   */
  async POST(req) {
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
      let input: TestPatternInput;
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
      if (!input.text?.trim()) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "Text is required for pattern testing",
          }),
          { status: 400, headers: { "Content-Type": "application/json" } },
        );
      }

      // Get or initialize pattern matcher
      let matcher = getPatternMatcher();
      if (!matcher) {
        matcher = initializePatternMatcher(input.config);
      } else if (input.config) {
        // Update config if provided
        matcher.updateConfig(input.config);
      }

      // Use default values for optional parameters
      const messageId = input.messageId || `test-${Date.now()}`;
      const userId = input.userId || session.userId;
      const channelId = input.channelId || "test-channel";

      // Analyze the message
      const analysis = matcher.analyzeMessage(
        messageId,
        userId,
        channelId,
        input.text.trim(),
      );

      // Enhance the response with additional debug info
      const enhancedAnalysis = {
        ...analysis,
        testInput: {
          text: input.text.trim(),
          userId,
          channelId,
          messageId,
          configUsed: input.config || "default",
        },
        matchDetails: analysis.matches.map((match) => ({
          ...match,
          patternName: match.pattern.name,
          patternCategory: match.pattern.category,
          patternPriority: match.pattern.priority,
          responseType: match.pattern.response.type,
          isRegex: match.pattern.isRegex,
          caseSensitive: match.pattern.caseSensitive,
          wholeWordsOnly: match.pattern.wholeWordsOnly,
          cooldownMinutes: match.pattern.cooldownMinutes,
        })),
        actionDetails: analysis.suggestedActions.map((action) => ({
          ...action,
          actionType: action.type,
          hasContent: !!action.content,
          hasEmoji: !!action.emoji,
          hasWebhookData: !!action.webhookData,
          hasReminderData: !!action.reminderData,
        })),
      };

      const response: ApiResponse = {
        success: true,
        data: enhancedAnalysis,
      };

      return new Response(JSON.stringify(response), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("Error in POST /api/patterns/test:", error);

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
