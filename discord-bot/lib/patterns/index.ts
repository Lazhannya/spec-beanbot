// Text pattern matching module exports
// This module provides centralized access to pattern matching functionality

export {
  TextPatternMatcher,
  initializePatternMatcher,
  getPatternMatcher,
} from "./matcher.ts";

export type {
  PatternMatch,
  ResponseAction,
  MessageAnalysis,
  PatternMatchingConfig,
} from "./matcher.ts";