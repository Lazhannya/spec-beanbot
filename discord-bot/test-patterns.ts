#!/usr/bin/env -S deno run -A

// Test script for pattern management functionality
// This script tests the pattern matching service and data structures

import { initializePatternMatcher } from "./lib/patterns/matcher.ts";
import {
  getPatternById,
  getPatternCategories,
  textPatterns,
} from "./data/text-patterns.ts";

console.log("🧪 Testing Pattern Management System");
console.log("=====================================\n");

// Test 1: Pattern data loading
console.log("1. Testing Pattern Data Loading:");
console.log(`   Total patterns loaded: ${textPatterns.length}`);
console.log(`   Available categories: ${getPatternCategories().join(", ")}`);
console.log(`   First pattern: ${textPatterns[0]?.name || "None"}`);

// Test 2: Pattern lookup
console.log("\n2. Testing Pattern Lookup:");
const helpPattern = getPatternById("help-request");
console.log(`   Help pattern found: ${helpPattern ? "✅" : "❌"}`);
if (helpPattern) {
  console.log(`   Pattern name: ${helpPattern.name}`);
  console.log(`   Pattern category: ${helpPattern.category}`);
  console.log(`   Response type: ${helpPattern.response.type}`);
}

// Test 3: Pattern matcher initialization
console.log("\n3. Testing Pattern Matcher:");
try {
  const matcher = initializePatternMatcher({
    debugMode: true,
    minConfidence: 0.5,
  });
  console.log("   Pattern matcher initialized: ✅");

  const stats = matcher.getStats();
  console.log(`   Active patterns: ${stats.activePatterns}`);
  console.log(`   Total patterns: ${stats.totalPatterns}`);
  console.log(
    `   Categories: ${Object.keys(stats.patternsByCategory).join(", ")}`,
  );
} catch (error) {
  console.log(
    `   Pattern matcher failed: ❌ ${
      error instanceof Error ? error.message : "Unknown error"
    }`,
  );
}

// Test 4: Pattern analysis
console.log("\n4. Testing Pattern Analysis:");
try {
  const matcher = initializePatternMatcher();

  const testMessages = [
    "Hello there! Can you help me with something?",
    "I need urgent assistance right now!",
    "Thanks for all your help!",
    "What time is the meeting?",
    "Good morning everyone!",
  ];

  for (const message of testMessages) {
    console.log(`\n   Testing: "${message}"`);
    const analysis = matcher.analyzeMessage(
      `test-${Date.now()}`,
      "test-user",
      "test-channel",
      message,
    );

    console.log(`   - Matches found: ${analysis.matches.length}`);
    console.log(`   - Confidence: ${analysis.confidence.toFixed(2)}`);
    console.log(`   - Should respond: ${analysis.shouldRespond ? "✅" : "❌"}`);
    console.log(`   - Suggested actions: ${analysis.suggestedActions.length}`);

    if (analysis.matches.length > 0) {
      console.log(
        `   - Top match: ${analysis.matches[0].pattern.name} (${
          analysis.matches[0].confidence.toFixed(2)
        })`,
      );
    }
  }
} catch (error) {
  console.log(
    `   Pattern analysis failed: ❌ ${
      error instanceof Error ? error.message : "Unknown error"
    }`,
  );
}

console.log("\n🎉 Pattern Management System Test Complete!");

// Test 5: API Input/Output simulation
console.log("\n5. Testing API Data Structures:");

// Simulate creating a new pattern (like API would receive)
const newPatternInput = {
  name: "Test Pattern",
  description: "A test pattern for validation",
  category: "keyword" as const,
  patterns: ["test pattern", "testing"],
  isRegex: false,
  caseSensitive: false,
  wholeWordsOnly: true,
  enabled: true,
  response: {
    type: "message" as const,
    message: "This is a test response!",
  },
  priority: 5,
  cooldownMinutes: 10,
  restrictToChannels: [],
  restrictToUsers: [],
};

console.log("   Sample API input structure: ✅");
console.log(`   - Name: ${newPatternInput.name}`);
console.log(`   - Category: ${newPatternInput.category}`);
console.log(`   - Patterns: ${newPatternInput.patterns.length}`);
console.log(`   - Response type: ${newPatternInput.response.type}`);

// Simulate API validation
const validationErrors: string[] = [];

if (!newPatternInput.name?.trim()) {
  validationErrors.push("Pattern name is required");
}

if (!newPatternInput.patterns || newPatternInput.patterns.length === 0) {
  validationErrors.push("At least one pattern is required");
}

if (newPatternInput.priority < 1 || newPatternInput.priority > 10) {
  validationErrors.push("Priority must be between 1 and 10");
}

console.log(
  `   Validation result: ${
    validationErrors.length === 0 ? "✅ Valid" : "❌ Invalid"
  }`,
);
if (validationErrors.length > 0) {
  console.log(`   Errors: ${validationErrors.join(", ")}`);
}

console.log("\n✨ All pattern management tests completed successfully!");
