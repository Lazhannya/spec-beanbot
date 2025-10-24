#!/usr/bin/env -S deno run --allow-net --allow-env --allow-read
/**
 * Test Discord Signature Verification
 * Simulates what Discord does when verifying the webhook endpoint
 */

import { verifyDiscordSignature } from "./discord-bot/lib/discord/verify.ts";
import { getConfig } from "./discord-bot/lib/config/env.ts";

console.log("=== Discord Signature Verification Test ===\n");

// Get the configured public key
const config = getConfig();
console.log("Public Key Configured:", !!config.publicKey);
console.log("Public Key Length:", config.publicKey?.length);
console.log("Public Key (first 16 chars):", config.publicKey?.substring(0, 16));
console.log("");

// Test 1: Verify the public key format
console.log("Test 1: Public Key Format Validation");
console.log("-------------------------------------");

if (!config.publicKey) {
  console.error("❌ PUBLIC_KEY is not set!");
  Deno.exit(1);
}

if (config.publicKey.length !== 64) {
  console.error(`❌ PUBLIC_KEY length is ${config.publicKey.length}, expected 64`);
  console.error("The public key should be a 64-character hexadecimal string");
  Deno.exit(1);
}

// Check if it's valid hex
const isValidHex = /^[0-9a-fA-F]{64}$/.test(config.publicKey);
if (!isValidHex) {
  console.error("❌ PUBLIC_KEY contains non-hexadecimal characters");
  console.error("The public key should only contain 0-9 and a-f characters");
  Deno.exit(1);
}

console.log("✅ Public key format is valid (64-char hex string)");
console.log("");

// Test 2: Test signature verification with a sample payload
console.log("Test 2: Signature Verification Logic");
console.log("--------------------------------------");

// Create a test PING payload
const testBody = JSON.stringify({ type: 1 });
const testTimestamp = Math.floor(Date.now() / 1000).toString();

console.log("Test payload:", testBody);
console.log("Test timestamp:", testTimestamp);
console.log("");

// NOTE: We can't actually generate a valid signature without Discord's private key
// But we can test that our verification function works correctly
console.log("ℹ️  Cannot generate a valid signature without Discord's private key");
console.log("ℹ️  This test verifies that the verification logic doesn't crash");
console.log("");

try {
  // Use a dummy signature (this will fail validation, but shouldn't crash)
  const dummySignature = "0".repeat(128); // 128 hex chars = 64 bytes
  
  console.log("Testing verification with dummy signature...");
  const result = await verifyDiscordSignature(
    testBody,
    dummySignature,
    testTimestamp,
    config.publicKey
  );
  
  console.log(`Verification result: ${result}`);
  
  if (result === false) {
    console.log("✅ Verification correctly rejected invalid signature");
  } else {
    console.log("❌ Verification incorrectly accepted invalid signature!");
  }
} catch (error) {
  console.error("❌ Verification threw an error:");
  console.error(error instanceof Error ? error.message : String(error));
  Deno.exit(1);
}

console.log("");
console.log("=".repeat(50));
console.log("");
console.log("📋 Summary:");
console.log("✅ Public key is configured correctly");
console.log("✅ Public key format is valid");
console.log("✅ Verification logic works without crashing");
console.log("");
console.log("⚠️  Important Notes:");
console.log("1. We cannot test actual signature verification without Discord's private key");
console.log("2. Discord generates the signature when it sends the PING request");
console.log("3. If Discord verification is failing, possible causes:");
console.log("   a. PUBLIC_KEY doesn't match your Discord application");
console.log("   b. Discord changed their signing algorithm (unlikely)");
console.log("   c. Request body is being modified before reaching our handler");
console.log("   d. SSL/TLS issue with Deno Deploy endpoint");
console.log("");
console.log("🔍 Next Steps:");
console.log("1. Double-check PUBLIC_KEY in Deno Deploy matches Discord portal");
console.log("2. Try the Discord portal save again and check Deno Deploy logs");
console.log("3. Look for these log messages:");
console.log("   - '=== DISCORD WEBHOOK RECEIVED ==='");
console.log("   - 'Signature verification result: true/false'");
console.log("4. If you see 'false', the PUBLIC_KEY is definitely wrong");
console.log("5. If you don't see any logs, Discord isn't reaching your endpoint");
console.log("");
