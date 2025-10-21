// API route for pattern statistics
// GET /api/patterns/stats - Get pattern statistics and analytics

import type { Handlers } from "$fresh/server.ts";
import { getSessionFromRequest } from "../../../lib/storage/sessions.ts";
import {
  textPatterns,
  getPatternCategories,
} from "../../../data/text-patterns.ts";
import { getPatternMatcher } from "../../../lib/patterns/matcher.ts";

interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

interface PatternStats {
  totalPatterns: number;
  enabledPatterns: number;
  disabledPatterns: number;
  patternsByCategory: Record<string, number>;
  patternsByResponseType: Record<string, number>;
  averagePriority: number;
  averageCooldown: number;
  regexPatterns: number;
  textPatterns: number;
  caseSensitivePatterns: number;
  wholeWordPatterns: number;
  totalTriggerCount: number;
  mostTriggeredPatterns: Array<{
    id: string;
    name: string;
    triggerCount: number;
    category: string;
  }>;
  recentlyCreated: Array<{
    id: string;
    name: string;
    createdAt: string;
    category: string;
  }>;
  matcherStats?: {
    totalPatterns: number;
    activePatterns: number;
    patternsByCategory: Record<string, number>;
    cooldownsActive: number;
  };
}

export const handler: Handlers = {
  /**
   * GET /api/patterns/stats - Get pattern statistics
   */
  async GET(req) {
    try {
      // Get user from session
      const session = await getSessionFromRequest(req);
      if (!session) {
        return new Response(
          JSON.stringify({ success: false, error: "Authentication required" }),
          { status: 401, headers: { "Content-Type": "application/json" } }
        );
      }

      // Calculate basic statistics
      const totalPatterns = textPatterns.length;
      const enabledPatterns = textPatterns.filter(p => p.enabled).length;
      const disabledPatterns = totalPatterns - enabledPatterns;

      // Patterns by category
      const patternsByCategory: Record<string, number> = {};
      for (const category of getPatternCategories()) {
        patternsByCategory[category] = textPatterns.filter(p => p.category === category).length;
      }

      // Patterns by response type
      const patternsByResponseType: Record<string, number> = {};
      for (const pattern of textPatterns) {
        const type = pattern.response.type;
        patternsByResponseType[type] = (patternsByResponseType[type] || 0) + 1;
      }

      // Calculate averages
      const averagePriority = totalPatterns > 0 
        ? textPatterns.reduce((sum, p) => sum + p.priority, 0) / totalPatterns 
        : 0;

      const averageCooldown = totalPatterns > 0 
        ? textPatterns.reduce((sum, p) => sum + p.cooldownMinutes, 0) / totalPatterns 
        : 0;

      // Pattern type counts
      const regexPatterns = textPatterns.filter(p => p.isRegex).length;
      const textPatternsCount = totalPatterns - regexPatterns;
      const caseSensitivePatterns = textPatterns.filter(p => p.caseSensitive).length;
      const wholeWordPatterns = textPatterns.filter(p => p.wholeWordsOnly).length;

      // Total trigger count
      const totalTriggerCount = textPatterns.reduce((sum, p) => sum + p.metadata.triggerCount, 0);

      // Most triggered patterns (top 10)
      const mostTriggeredPatterns = textPatterns
        .filter(p => p.metadata.triggerCount > 0)
        .sort((a, b) => b.metadata.triggerCount - a.metadata.triggerCount)
        .slice(0, 10)
        .map(p => ({
          id: p.id,
          name: p.name,
          triggerCount: p.metadata.triggerCount,
          category: p.category,
        }));

      // Recently created patterns (last 10)
      const recentlyCreated = textPatterns
        .sort((a, b) => new Date(b.metadata.createdAt).getTime() - new Date(a.metadata.createdAt).getTime())
        .slice(0, 10)
        .map(p => ({
          id: p.id,
          name: p.name,
          createdAt: p.metadata.createdAt,
          category: p.category,
        }));

      // Get matcher statistics if available
      let matcherStats;
      try {
        const matcher = getPatternMatcher();
        if (matcher) {
          matcherStats = matcher.getStats();
        }
      } catch (error) {
        console.warn("Could not get pattern matcher stats:", error);
      }

      const stats: PatternStats = {
        totalPatterns,
        enabledPatterns,
        disabledPatterns,
        patternsByCategory,
        patternsByResponseType,
        averagePriority: Math.round(averagePriority * 100) / 100,
        averageCooldown: Math.round(averageCooldown * 100) / 100,
        regexPatterns,
        textPatterns: textPatternsCount,
        caseSensitivePatterns,
        wholeWordPatterns,
        totalTriggerCount,
        mostTriggeredPatterns,
        recentlyCreated,
        matcherStats,
      };

      const response: ApiResponse = {
        success: true,
        data: stats,
      };

      return new Response(JSON.stringify(response), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("Error in GET /api/patterns/stats:", error);
      
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