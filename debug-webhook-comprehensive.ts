#!/usr/bin/env -S deno run --allow-net
/**
 * Comprehensive Discord Webhook Debugging
 * This will help identify exactly why verification is failing
 */

const WEBHOOK_URL = "https://spec-beanbot.lazhannya.deno.net/api/webhook/discord";

console.log("=".repeat(60));
console.log("DISCORD WEBHOOK COMPREHENSIVE DEBUG");
console.log("=".repeat(60));
console.log("");

// Test 1: Check endpoint accessibility
console.log("TEST 1: Endpoint Accessibility");
console.log("-".repeat(60));

try {
  const getResponse = await fetch(WEBHOOK_URL);
  const getData = await getResponse.json();
  
  console.log(`✅ GET request successful`);
  console.log(`   Status: ${getResponse.status}`);
  console.log(`   Public Key Configured: ${getData.publicKeyConfigured}`);
  console.log(`   Public Key Length: ${getData.publicKeyLength}`);
  
  if (!getData.publicKeyConfigured) {
    console.log("");
    console.log("❌ CRITICAL: PUBLIC_KEY is NOT configured in Deno Deploy!");
    console.log("   This is why Discord verification is failing.");
    console.log("");
    console.log("🔧 FIX:");
    console.log("   1. Go to: https://dash.deno.com/projects/spec-beanbot/settings");
    console.log("   2. Find 'Environment Variables' section");
    console.log("   3. Add PUBLIC_KEY with value from Discord Developer Portal");
    Deno.exit(1);
  }
  
  if (getData.publicKeyLength !== 64) {
    console.log("");
    console.log(`⚠️  WARNING: PUBLIC_KEY length is ${getData.publicKeyLength}, expected 64`);
    console.log("   The public key might be incorrectly formatted.");
    console.log("");
  }
} catch (error) {
  console.log(`❌ GET request failed: ${error instanceof Error ? error.message : String(error)}`);
  Deno.exit(1);
}

console.log("");

// Test 2: Check signature verification behavior
console.log("TEST 2: Signature Verification Behavior");
console.log("-".repeat(60));

const testBody = JSON.stringify({ type: 1 });
const testTimestamp = Math.floor(Date.now() / 1000).toString();
const invalidSignature = "0".repeat(128);

try {
  const response = await fetch(WEBHOOK_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Signature-Ed25519": invalidSignature,
      "X-Signature-Timestamp": testTimestamp,
    },
    body: testBody,
  });

  const status = response.status;
  const body = await response.text();

  if (status === 401 && body.includes("Invalid signature")) {
    console.log(`✅ Signature verification is working`);
    console.log(`   Invalid signatures are correctly rejected`);
  } else {
    console.log(`⚠️  Unexpected response:`);
    console.log(`   Status: ${status}`);
    console.log(`   Body: ${body}`);
  }
} catch (error) {
  console.log(`❌ Request failed: ${error instanceof Error ? error.message : String(error)}`);
}

console.log("");

// Test 3: Check for missing headers
console.log("TEST 3: Missing Headers Behavior");
console.log("-".repeat(60));

try {
  const response = await fetch(WEBHOOK_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: testBody,
  });

  const status = response.status;
  const body = await response.text();

  if (status === 401 && body.includes("Unauthorized")) {
    console.log(`✅ Missing headers are correctly rejected`);
  } else {
    console.log(`⚠️  Unexpected response:`);
    console.log(`   Status: ${status}`);
    console.log(`   Body: ${body}`);
  }
} catch (error) {
  console.log(`❌ Request failed: ${error instanceof Error ? error.message : String(error)}`);
}

console.log("");
console.log("=".repeat(60));
console.log("DIAGNOSTIC SUMMARY");
console.log("=".repeat(60));
console.log("");

console.log("If all tests above passed (✅), then:");
console.log("");
console.log("1. The endpoint is accessible and working correctly");
console.log("2. Signature verification logic is functioning");
console.log("3. The issue is likely with PUBLIC_KEY mismatch");
console.log("");
console.log("⚠️  MOST LIKELY CAUSE:");
console.log("   The PUBLIC_KEY environment variable in Deno Deploy does NOT match");
console.log("   the Public Key shown in Discord Developer Portal.");
console.log("");
console.log("🔍 HOW TO VERIFY:");
console.log("");
console.log("   Step 1: Get Public Key from Discord");
console.log("   ────────────────────────────────────");
console.log("   1. Go to: https://discord.com/developers/applications");
console.log("   2. Select your application");
console.log("   3. Go to 'General Information'");
console.log("   4. Find 'Public Key' field");
console.log("   5. Copy the ENTIRE 64-character hex string");
console.log("   6. Verify no spaces/newlines at start or end");
console.log("");
console.log("   Step 2: Compare with Deno Deploy");
console.log("   ─────────────────────────────────");
console.log("   1. Go to: https://dash.deno.com/projects/spec-beanbot/settings");
console.log("   2. Find PUBLIC_KEY environment variable");
console.log("   3. Click 'Edit' to see the value");
console.log("   4. Compare character-by-character with Discord's Public Key");
console.log("   5. If ANYTHING is different, update it");
console.log("");
console.log("   Step 3: Test Discord Verification");
console.log("   ─────────────────────────────────");
console.log("   1. After updating PUBLIC_KEY, wait 30 seconds for deployment");
console.log("   2. Go to Discord Developer Portal");
console.log("   3. Enter webhook URL in Interactions Endpoint URL");
console.log("   4. Click 'Save Changes'");
console.log("   5. Discord will send PING request");
console.log("   6. If PUBLIC_KEY matches, it will succeed");
console.log("");
console.log("💡 IMPORTANT:");
console.log("   - Discord Bot public keys CANNOT be regenerated");
console.log("   - If you copied from wrong app, you need the correct app's public key");
console.log("   - Case matters! Hex characters are case-sensitive");
console.log("   - Watch for copy/paste issues (extra characters, truncation)");
console.log("");
console.log("📋 Deno Deploy Logs:");
console.log("   https://dash.deno.com/projects/spec-beanbot/logs");
console.log("");
console.log("   When Discord tries to verify, you should see:");
console.log("   - '=== DISCORD WEBHOOK RECEIVED ==='");
console.log("   - '--- Signature Verification (TweetNaCl) ---'");
console.log("   - 'Verification result: true/false'");
console.log("");
console.log("   If you see 'false', PUBLIC_KEY is definitely wrong.");
console.log("");
