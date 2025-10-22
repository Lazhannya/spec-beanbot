#!/usr/bin/env -S deno run -A --watch=static/,routes/,components/,islands/,middleware/

import dev from "$fresh/dev.ts";
import config from "./fresh.config.ts";

// Setup environment defaults before loading dotenv
import "./setup-env.ts";

// Load environment variables with flexible configuration for development
import { load } from "$std/dotenv/mod.ts";

try {
  const env = await load({
    allowEmptyValues: true,
    defaultsPath: null,
    envPath: ".env",
    examplePath: null,
  });
  // Manually set environment variables from loaded .env
  for (const [key, value] of Object.entries(env)) {
    if (!Deno.env.get(key)) {
      Deno.env.set(key, value);
    }
  }
} catch (_error) {
  console.log("No .env file found, using environment variables from platform");
}

await dev(import.meta.url, "./main.ts", config);