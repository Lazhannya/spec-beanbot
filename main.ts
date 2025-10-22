/// <reference no-default-lib="true" />
/// <reference lib="dom" />
/// <reference lib="dom.iterable" />
/// <reference lib="dom.asynciterable" />
/// <reference lib="deno.ns" />

// Setup environment defaults before loading dotenv
import "./setup-env.ts";

// Load environment variables with flexible configuration for deployment
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

await start(manifest, config);