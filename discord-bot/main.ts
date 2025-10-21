import { start } from "$fresh/server.ts";
import manifest from "./fresh.gen.ts";
import config from "./fresh.config.ts";
import { initializeAppScheduler } from "./lib/scheduler/index.ts";
import {
  initializeEscalationService,
  startEscalationService,
} from "./lib/escalation/index.ts";
import { initializePatternMatcher } from "./lib/patterns/index.ts";

// Environment detection
const isDenoDeploy = Deno.env.get("DENO_DEPLOYMENT_ID") !== undefined;
const isProduction = Deno.env.get("DENO_ENV") === "production" || isDenoDeploy;

console.log(`🚀 Starting Discord Assistant Bot...`);
console.log(`📍 Environment: ${isProduction ? "Production" : "Development"}`);
console.log(`🌐 Deno Deploy: ${isDenoDeploy ? "Yes" : "No"}`);

// Initialize services with production-optimized settings
try {
  await initializeAppScheduler();
  console.log("✅ Scheduler initialized");
} catch (error) {
  console.error("❌ Failed to initialize scheduler:", error);
  if (isProduction) {
    // In production, scheduler failure might be critical
    console.error("Scheduler failure in production environment");
  }
}

try {
  initializeEscalationService({
    enabled: true,
    checkInterval: isProduction ? 10 : 5, // Longer intervals in production for efficiency
  });
  startEscalationService();
  console.log("✅ Escalation service initialized");
} catch (error) {
  console.error("❌ Failed to initialize escalation service:", error);
}

try {
  initializePatternMatcher({
    enabled: true,
    maxMatches: 5,
    minConfidence: 0.6,
    cooldownEnabled: true,
    debugMode: !isProduction, // Disable debug mode in production
  });
  console.log("✅ Pattern matcher initialized");
} catch (error) {
  console.error("❌ Failed to initialize pattern matcher:", error);
}

// Add graceful shutdown handling for Deno Deploy
if (isDenoDeploy) {
  // Set up signal handlers for graceful shutdown
  Deno.addSignalListener("SIGTERM", () => {
    console.log("🔄 Received SIGTERM, shutting down gracefully...");
    // Perform cleanup here if needed
  });

  Deno.addSignalListener("SIGINT", () => {
    console.log("🔄 Received SIGINT, shutting down gracefully...");
    // Perform cleanup here if needed
  });
}

console.log("🎯 Starting Fresh server...");
await start(manifest, config);
