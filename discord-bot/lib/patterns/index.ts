// Text pattern matching module exports
// This module provides centralized access to pattern matching functionality

export {
  getPatternMatcher,
  initializePatternMatcher,
  TextPatternMatcher,
} from "./matcher.ts";

export type {
  MessageAnalysis,
  PatternMatch,
  PatternMatchingConfig,
  ResponseAction,
} from "./matcher.ts";
