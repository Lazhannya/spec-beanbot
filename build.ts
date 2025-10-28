#!/usr/bin/env -S deno run -A --unstable-cron --unstable-kv

/**
 * Build Entry Point
 * 
 * This is used for building the Fresh application without starting cron jobs.
 * Cron jobs are only included in the production main.ts file.
 */

/// <reference no-default-lib="true" />
/// <reference lib="dom" />
/// <reference lib="dom.iterable" />
/// <reference lib="dom.asynciterable" />
/// <reference lib="deno.ns" />

// Setup environment defaults before loading dotenv
import "./setup-env.ts";

// Load environment variables with flexible configuration for building
import { load } from "$std/dotenv/mod.ts";

// Load .env file if it exists, but don't fail if missing
try {
  const env = await load({
    allowEmptyValues: true,
    defaultsPath: null, // Don't validate against .env.example
    envPath: ".env",
    examplePath: null, // Don't require .env.example validation
  });
  // Manually set environment variables from loaded .env
  for (const [key, value] of Object.entries(env)) {
    if (!Deno.env.get(key)) {
      Deno.env.set(key, value);
    }
  }
} catch (_error) {
  // In production (Deno Deploy), .env files don't exist and env vars come from platform
  console.log("No .env file found, using environment variables from platform");
}

import { start } from "$fresh/server.ts";
import manifest from "./fresh.gen.ts";
import config from "./fresh.config.ts";

// NOTE: Cron jobs are NOT imported during build to prevent build timeouts
// They are only imported in production main.ts for deployment
console.log("🔧 Build mode: Skipping cron job registration to prevent build timeout");
console.log("📋 Cron jobs will be registered in production via main.ts");

await start(manifest, config);