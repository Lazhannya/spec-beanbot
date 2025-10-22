/**
 * Environment Validation Script
 * Run this to check if all required environment variables are properly configured
 */

// Setup environment defaults
import "./setup-env.ts";

// Load .env file explicitly for validation
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

interface EnvironmentCheck {
  name: string;
  value: string | undefined;
  required: boolean;
  isValid: boolean;
  error?: string;
}

// Define required and optional environment variables
const envChecks: EnvironmentCheck[] = [
  // Required for production
  { name: "APP_ID", value: Deno.env.get("APP_ID"), required: true, isValid: false },
  { name: "DISCORD_TOKEN", value: Deno.env.get("DISCORD_TOKEN"), required: true, isValid: false },
  { name: "PUBLIC_KEY", value: Deno.env.get("PUBLIC_KEY"), required: true, isValid: false },
  { name: "DISCORD_CLIENT_ID", value: Deno.env.get("DISCORD_CLIENT_ID"), required: true, isValid: false },
  { name: "DISCORD_CLIENT_SECRET", value: Deno.env.get("DISCORD_CLIENT_SECRET"), required: true, isValid: false },
  { name: "DISCORD_REDIRECT_URI", value: Deno.env.get("DISCORD_REDIRECT_URI"), required: true, isValid: false },
  { name: "ADMIN_USER_IDS", value: Deno.env.get("ADMIN_USER_IDS"), required: true, isValid: false },

  // Optional with defaults
  { name: "WEBHOOK_URL", value: Deno.env.get("WEBHOOK_URL"), required: false, isValid: true },
  { name: "WEBHOOK_SECRET", value: Deno.env.get("WEBHOOK_SECRET"), required: false, isValid: false },
  { name: "SESSION_SECRET", value: Deno.env.get("SESSION_SECRET"), required: false, isValid: false },
  { name: "LOG_LEVEL", value: Deno.env.get("LOG_LEVEL"), required: false, isValid: false },
  { name: "LOG_PRETTY_PRINT", value: Deno.env.get("LOG_PRETTY_PRINT"), required: false, isValid: false },
  { name: "SESSION_TIMEOUT_HOURS", value: Deno.env.get("SESSION_TIMEOUT_HOURS"), required: false, isValid: false },
  { name: "SESSION_REFRESH_THRESHOLD_HOURS", value: Deno.env.get("SESSION_REFRESH_THRESHOLD_HOURS"), required: false, isValid: false },
];

// Validation functions
function validateDiscordSnowflake(value: string | undefined): boolean {
  if (!value) return false;
  return /^\d{17,19}$/.test(value);
}

function validateUrl(value: string | undefined): boolean {
  if (!value) return false;
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

function validateLogLevel(value: string | undefined): boolean {
  if (!value) return false;
  return ['debug', 'info', 'warn', 'error'].includes(value.toLowerCase());
}

function validateBoolean(value: string | undefined): boolean {
  if (!value) return false;
  return ['true', 'false'].includes(value.toLowerCase());
}

function validateNumber(value: string | undefined, min?: number, max?: number): boolean {
  if (!value) return false;
  const num = parseInt(value, 10);
  if (isNaN(num)) return false;
  if (min !== undefined && num < min) return false;
  if (max !== undefined && num > max) return false;
  return true;
}

// Validate each environment variable
for (const check of envChecks) {
  if (check.required && !check.value) {
    check.isValid = false;
    check.error = "Required variable is missing";
    continue;
  }

  if (!check.value && !check.required) {
    check.isValid = true; // Optional and not set is OK
    continue;
  }

  // Validate specific variables
  switch (check.name) {
    case "APP_ID":
    case "DISCORD_CLIENT_ID":
      check.isValid = validateDiscordSnowflake(check.value);
      if (!check.isValid) check.error = "Invalid Discord snowflake format";
      break;

    case "DISCORD_TOKEN":
      check.isValid = !!(check.value && check.value.length > 20);
      if (!check.isValid) check.error = "Invalid Discord token format";
      break;

    case "PUBLIC_KEY":
    case "DISCORD_CLIENT_SECRET":
    case "WEBHOOK_SECRET":
    case "SESSION_SECRET":
      check.isValid = !!(check.value && check.value.length >= 8);
      if (!check.isValid) check.error = "Secret must be at least 8 characters";
      break;

    case "DISCORD_REDIRECT_URI":
    case "WEBHOOK_URL":
      if (check.value) {
        check.isValid = validateUrl(check.value);
        if (!check.isValid) check.error = "Invalid URL format";
      }
      break;

    case "ADMIN_USER_IDS":
      if (check.value && check.value.trim()) {
        const userIds = check.value.split(',').map(id => id.trim());
        check.isValid = userIds.every(id => validateDiscordSnowflake(id));
        if (!check.isValid) check.error = "Invalid Discord user ID format";
      } else if (check.required) {
        check.isValid = false;
        check.error = "At least one admin user ID is required";
      }
      break;

    case "LOG_LEVEL":
      if (check.value) {
        check.isValid = validateLogLevel(check.value);
        if (!check.isValid) check.error = "Must be: debug, info, warn, or error";
      }
      break;

    case "LOG_PRETTY_PRINT":
      if (check.value) {
        check.isValid = validateBoolean(check.value);
        if (!check.isValid) check.error = "Must be: true or false";
      }
      break;

    case "SESSION_TIMEOUT_HOURS":
      if (check.value) {
        check.isValid = validateNumber(check.value, 1, 168); // 1 hour to 1 week
        if (!check.isValid) check.error = "Must be between 1 and 168 hours";
      }
      break;

    case "SESSION_REFRESH_THRESHOLD_HOURS":
      if (check.value) {
        check.isValid = validateNumber(check.value, 0.5, 48); // 30 minutes to 2 days
        if (!check.isValid) check.error = "Must be between 0.5 and 48 hours";
      }
      break;

    default:
      check.isValid = true; // Unknown variables are considered valid
  }
}

// Report results
console.log("\n🔍 Environment Variable Validation Report\n");

const isProduction = !!Deno.env.get('DENO_DEPLOYMENT_ID');
console.log(`Environment: ${isProduction ? 'Production (Deno Deploy)' : 'Development'}`);
console.log("=" .repeat(60));

let hasErrors = false;
let hasWarnings = false;

for (const check of envChecks) {
  const status = check.isValid ? "✅" : "❌";
  const required = check.required ? "(required)" : "(optional)";
  const value = check.value ? 
    (check.name.includes("SECRET") || check.name.includes("TOKEN") ? "[REDACTED]" : check.value) : 
    "[NOT SET]";
  
  console.log(`${status} ${check.name} ${required}: ${value}`);
  
  if (check.error) {
    console.log(`   ⚠️  ${check.error}`);
    if (check.required) {
      hasErrors = true;
    } else {
      hasWarnings = true;
    }
  }
}

console.log("=" .repeat(60));

if (hasErrors) {
  console.log("❌ VALIDATION FAILED: Critical environment variables are missing or invalid");
  console.log("   Please fix the errors above before deploying.");
  Deno.exit(1);
} else if (hasWarnings) {
  console.log("⚠️  VALIDATION PASSED WITH WARNINGS: Some optional variables need attention");
  console.log("   The application will run but some features may not work correctly.");
} else {
  console.log("✅ VALIDATION PASSED: All environment variables are properly configured");
}

console.log("\nFor deployment instructions, see DEPLOYMENT.md");