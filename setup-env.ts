/**
 * Environment Setup Script
 * Ensures all required environment variables are set with defaults
 * Run this before starting the application
 */

// Set default values for missing environment variables
const defaults = new Map([
  ["WEBHOOK_SECRET", "default_webhook_secret_change_in_production"],
  ["SESSION_SECRET", "default_session_secret_change_in_production"],
  ["ADMIN_USER_IDS", ""],
  ["LOG_LEVEL", "info"],
  ["LOG_PRETTY_PRINT", "false"],
  ["SESSION_TIMEOUT_HOURS", "24"],
  ["SESSION_REFRESH_THRESHOLD_HOURS", "2"],
]);

// Set defaults for any missing variables
for (const [key, defaultValue] of defaults) {
  if (!Deno.env.get(key)) {
    Deno.env.set(key, defaultValue);
    console.log(`Set default value for ${key}`);
  }
}

console.log("Environment setup completed");