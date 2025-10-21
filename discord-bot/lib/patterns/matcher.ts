// Text pattern matching service for Discord message analysis
// This module handles pattern recognition and automated responses

import { textPatterns } from "../../data/text-patterns.ts";
import type { TextPattern } from "../../data/text-patterns.ts";

/**
 * Pattern match result
 */
export interface PatternMatch {
  pattern: TextPattern;
  matchedText: string;
  matchPosition: number;
  matchLength: number;
  confidence: number; // 0-1 score
}

/**
 * Response action to take after pattern match
 */
export interface ResponseAction {
  type: "message" | "reaction" | "webhook" | "reminder";
  content?: string;
  emoji?: string;
  webhookData?: Record<string, unknown>;
  reminderData?: {
    title: string;
    message: string;
    delayMinutes: number;
  };
}

/**
 * Analysis result for a Discord message
 */
export interface MessageAnalysis {
  messageId: string;
  userId: string;
  channelId: string;
  content: string;
  matches: PatternMatch[];
  suggestedActions: ResponseAction[];
  shouldRespond: boolean;
  confidence: number;
  analysisTimestamp: Date;
}

/**
 * Pattern matching configuration
 */
export interface PatternMatchingConfig {
  enabled: boolean;
  maxMatches: number; // Maximum matches to return per message
  minConfidence: number; // Minimum confidence threshold (0-1)
  cooldownEnabled: boolean; // Whether to respect pattern cooldowns
  channelWhitelist?: string[]; // Only analyze messages in these channels
  userBlacklist?: string[]; // Skip messages from these users
  debugMode: boolean; // Log detailed analysis info
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: PatternMatchingConfig = {
  enabled: true,
  maxMatches: 5,
  minConfidence: 0.6,
  cooldownEnabled: true,
  debugMode: false,
};

/**
 * Text pattern matching service
 */
export class TextPatternMatcher {
  private config: PatternMatchingConfig;
  private patterns: TextPattern[];
  private patternCooldowns: Map<string, Date> = new Map();

  constructor(config: Partial<PatternMatchingConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.patterns = textPatterns.filter((p) => p.enabled);

    if (this.config.debugMode) {
      console.log(
        `Pattern matcher initialized with ${this.patterns.length} active patterns`,
      );
    }
  }

  /**
   * Analyze a Discord message for pattern matches
   */
  analyzeMessage(
    messageId: string,
    userId: string,
    channelId: string,
    content: string,
  ): MessageAnalysis {
    const analysis: MessageAnalysis = {
      messageId,
      userId,
      channelId,
      content,
      matches: [],
      suggestedActions: [],
      shouldRespond: false,
      confidence: 0,
      analysisTimestamp: new Date(),
    };

    // Check if analysis should be performed
    if (!this.shouldAnalyze(userId, channelId)) {
      return analysis;
    }

    // Find pattern matches
    analysis.matches = this.findMatches(content, channelId, userId);

    // Generate suggested actions
    analysis.suggestedActions = this.generateActions(analysis.matches);

    // Calculate overall confidence and determine if response is needed
    analysis.confidence = this.calculateConfidence(analysis.matches);
    analysis.shouldRespond = analysis.confidence >= this.config.minConfidence;

    if (this.config.debugMode) {
      console.log(
        `Message analysis: ${analysis.matches.length} matches, confidence: ${analysis.confidence}`,
      );
    }

    return analysis;
  }

  /**
   * Check if message should be analyzed
   */
  private shouldAnalyze(userId: string, channelId: string): boolean {
    if (!this.config.enabled) {
      return false;
    }

    // Check channel whitelist
    if (
      this.config.channelWhitelist &&
      !this.config.channelWhitelist.includes(channelId)
    ) {
      return false;
    }

    // Check user blacklist
    if (
      this.config.userBlacklist && this.config.userBlacklist.includes(userId)
    ) {
      return false;
    }

    return true;
  }

  /**
   * Find all pattern matches in the message content
   */
  private findMatches(
    content: string,
    channelId: string,
    userId: string,
  ): PatternMatch[] {
    const matches: PatternMatch[] = [];

    for (const pattern of this.patterns) {
      try {
        // Check if pattern is on cooldown
        if (this.config.cooldownEnabled && this.isOnCooldown(pattern.id)) {
          continue;
        }

        // Check channel restrictions
        if (
          pattern.restrictToChannels &&
          pattern.restrictToChannels.length > 0 &&
          !pattern.restrictToChannels.includes(channelId)
        ) {
          continue;
        }

        // Check user restrictions
        if (
          pattern.restrictToUsers &&
          pattern.restrictToUsers.length > 0 &&
          !pattern.restrictToUsers.includes(userId)
        ) {
          continue;
        }

        // Test each pattern
        for (const patternStr of pattern.patterns) {
          const match = this.testPattern(content, patternStr, pattern);
          if (match) {
            matches.push({
              pattern,
              matchedText: match.text,
              matchPosition: match.position,
              matchLength: match.length,
              confidence: this.calculatePatternConfidence(pattern, match),
            });

            // Update cooldown
            if (this.config.cooldownEnabled && pattern.cooldownMinutes > 0) {
              this.setCooldown(pattern.id, pattern.cooldownMinutes);
            }

            // Stop after first match for this pattern
            break;
          }
        }
      } catch (error) {
        console.error(`Error testing pattern ${pattern.id}:`, error);
      }
    }

    // Sort by priority and confidence
    matches.sort((a, b) => {
      if (a.pattern.priority !== b.pattern.priority) {
        return b.pattern.priority - a.pattern.priority;
      }
      return b.confidence - a.confidence;
    });

    // Limit number of matches
    return matches.slice(0, this.config.maxMatches);
  }

  /**
   * Test a single pattern against content
   */
  private testPattern(
    content: string,
    patternStr: string,
    pattern: TextPattern,
  ): { text: string; position: number; length: number } | null {
    const testContent = pattern.caseSensitive ? content : content.toLowerCase();
    const testPattern = pattern.caseSensitive
      ? patternStr
      : patternStr.toLowerCase();

    try {
      if (pattern.isRegex) {
        const flags = pattern.caseSensitive ? "g" : "gi";
        const regex = new RegExp(testPattern, flags);
        const match = regex.exec(testContent);

        if (match) {
          return {
            text: match[0],
            position: match.index,
            length: match[0].length,
          };
        }
      } else {
        // Simple text search
        if (pattern.wholeWordsOnly) {
          const wordRegex = new RegExp(
            `\\b${this.escapeRegex(testPattern)}\\b`,
            pattern.caseSensitive ? "g" : "gi",
          );
          const match = wordRegex.exec(testContent);

          if (match) {
            return {
              text: match[0],
              position: match.index,
              length: match[0].length,
            };
          }
        } else {
          const position = testContent.indexOf(testPattern);
          if (position !== -1) {
            return {
              text: content.substring(position, position + testPattern.length),
              position,
              length: testPattern.length,
            };
          }
        }
      }
    } catch (error) {
      console.error(`Error testing pattern "${patternStr}":`, error);
    }

    return null;
  }

  /**
   * Calculate confidence score for a pattern match
   */
  private calculatePatternConfidence(
    pattern: TextPattern,
    match: { text: string; position: number; length: number },
  ): number {
    let confidence = 0.5; // Base confidence

    // Boost confidence based on match length
    confidence += Math.min(0.3, match.length / 50);

    // Boost confidence for exact matches
    if (pattern.isRegex) {
      confidence += 0.1;
    }

    // Boost confidence for whole word matches
    if (pattern.wholeWordsOnly) {
      confidence += 0.1;
    }

    // Category-specific boosts
    switch (pattern.category) {
      case "emergency":
        confidence += 0.2;
        break;
      case "help":
        confidence += 0.15;
        break;
      case "question":
        confidence += 0.1;
        break;
    }

    return Math.min(1.0, confidence);
  }

  /**
   * Calculate overall confidence from all matches
   */
  private calculateConfidence(matches: PatternMatch[]): number {
    if (matches.length === 0) {
      return 0;
    }

    // Use highest confidence as base
    const maxConfidence = Math.max(...matches.map((m) => m.confidence));

    // Add small boost for multiple matches
    const multiMatchBoost = Math.min(0.2, (matches.length - 1) * 0.05);

    return Math.min(1.0, maxConfidence + multiMatchBoost);
  }

  /**
   * Generate suggested actions from pattern matches
   */
  private generateActions(matches: PatternMatch[]): ResponseAction[] {
    const actions: ResponseAction[] = [];

    for (const match of matches) {
      const pattern = match.pattern;

      // Generate message response
      if (
        pattern.response.type === "message" || pattern.response.type === "both"
      ) {
        if (pattern.response.message) {
          actions.push({
            type: "message",
            content: pattern.response.message,
          });
        }
      }

      // Generate reaction response
      if (
        pattern.response.type === "reaction" || pattern.response.type === "both"
      ) {
        if (pattern.response.reaction) {
          actions.push({
            type: "reaction",
            emoji: pattern.response.reaction,
          });
        }
      }

      // Generate webhook response
      if (pattern.response.type === "webhook") {
        if (pattern.response.webhookAction) {
          actions.push({
            type: "webhook",
            webhookData: {
              action: pattern.response.webhookAction,
              pattern: pattern.name,
              matchedText: match.matchedText,
              confidence: match.confidence,
            },
          });
        }
      }
    }

    return actions;
  }

  /**
   * Check if pattern is on cooldown
   */
  private isOnCooldown(patternId: string): boolean {
    const cooldownEnd = this.patternCooldowns.get(patternId);
    if (!cooldownEnd) {
      return false;
    }

    return new Date() < cooldownEnd;
  }

  /**
   * Set cooldown for a pattern
   */
  private setCooldown(patternId: string, minutes: number): void {
    const cooldownEnd = new Date();
    cooldownEnd.setMinutes(cooldownEnd.getMinutes() + minutes);
    this.patternCooldowns.set(patternId, cooldownEnd);
  }

  /**
   * Escape special regex characters
   */
  private escapeRegex(text: string): string {
    return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  /**
   * Update pattern configuration
   */
  updateConfig(newConfig: Partial<PatternMatchingConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Reload patterns from data source
   */
  reloadPatterns(): void {
    this.patterns = textPatterns.filter((p) => p.enabled);
    console.log(`Reloaded ${this.patterns.length} active patterns`);
  }

  /**
   * Get pattern statistics
   */
  getStats(): {
    totalPatterns: number;
    activePatterns: number;
    patternsByCategory: Record<string, number>;
    cooldownsActive: number;
  } {
    const stats = {
      totalPatterns: textPatterns.length,
      activePatterns: this.patterns.length,
      patternsByCategory: {} as Record<string, number>,
      cooldownsActive: 0,
    };

    // Count patterns by category
    for (const pattern of this.patterns) {
      stats.patternsByCategory[pattern.category] =
        (stats.patternsByCategory[pattern.category] || 0) + 1;
    }

    // Count active cooldowns
    const now = new Date();
    for (const cooldownEnd of this.patternCooldowns.values()) {
      if (now < cooldownEnd) {
        stats.cooldownsActive++;
      }
    }

    return stats;
  }
}

/**
 * Global pattern matcher instance
 */
let globalPatternMatcher: TextPatternMatcher | null = null;

/**
 * Initialize the global pattern matcher
 */
export function initializePatternMatcher(
  config?: Partial<PatternMatchingConfig>,
): TextPatternMatcher {
  if (!globalPatternMatcher) {
    globalPatternMatcher = new TextPatternMatcher(config);
  }
  return globalPatternMatcher;
}

/**
 * Get the global pattern matcher instance
 */
export function getPatternMatcher(): TextPatternMatcher | null {
  return globalPatternMatcher;
}
