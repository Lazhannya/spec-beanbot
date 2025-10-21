import { start } from "$fresh/server.ts";
import manifest from "./fresh.gen.ts";
import config from "./fresh.config.ts";
import { initializeAppScheduler } from "./lib/scheduler/index.ts";
import { initializeEscalationService, startEscalationService } from "./lib/escalation/index.ts";
import { initializePatternMatcher } from "./lib/patterns/index.ts";

// Initialize the reminder scheduler
console.log("🚀 Starting Discord Assistant Bot...");

try {
  await initializeAppScheduler();
  console.log("✅ Scheduler initialized");
} catch (error) {
  console.error("❌ Failed to initialize scheduler:", error);
  // Continue anyway for development
}

try {
  initializeEscalationService({
    enabled: true,
    checkInterval: 5, // Check every 5 minutes
  });
  startEscalationService();
  console.log("✅ Escalation service initialized");
} catch (error) {
  console.error("❌ Failed to initialize escalation service:", error);
  // Continue anyway for development
}

try {
  initializePatternMatcher({
    enabled: true,
    maxMatches: 5,
    minConfidence: 0.6,
    cooldownEnabled: true,
    debugMode: false,
  });
  console.log("✅ Pattern matcher initialized");
} catch (error) {
  console.error("❌ Failed to initialize pattern matcher:", error);
  // Continue anyway for development
}

await start(manifest, config);