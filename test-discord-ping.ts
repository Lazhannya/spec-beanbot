#!/usr/bin/env -S deno run --allow-net --allow-env --allow-read
/**
 * Test Discord PING Verification
 * Simulates what Discord does when verifying an interactions endpoint
 */

// You need to get these from Discord Developer Portal:
// 1. Your application's Public Key
// 2. Generate a test signature using Discord's verification

const WEBHOOK_URL = Deno.args[0] || "https://spec-beanbot.lazhannya.deno.net/api/webhook/discord";

console.log("=== Discord PING Verification Test ===\n");
console.log(`Testing URL: ${WEBHOOK_URL}\n`);

// Test 1: Check endpoint accessibility
console.log("Test 1: GET request (accessibility check)");
console.log("------------------------------------------");

try {
  const getResponse = await fetch(WEBHOOK_URL, {
    method: "GET",
  });
  
  const getText = await getResponse.text();
  console.log(`Status: ${getResponse.status}`);
  console.log(`Response:\n${getText}\n`);
  
  if (getResponse.status === 200) {
    const data = JSON.parse(getText);
    console.log("✅ Endpoint is accessible");
    console.log(`Public Key Configured: ${data.publicKeyConfigured}`);
    console.log(`Public Key Length: ${data.publicKeyLength}`);
    
    if (!data.publicKeyConfigured) {
      console.log("⚠️  WARNING: Public key is not configured!");
      console.log("This will cause signature verification to fail.");
      console.log("\nTo fix:");
      console.log("1. Go to Discord Developer Portal");
      console.log("2. Copy your application's Public Key");
      console.log("3. Set PUBLIC_KEY environment variable in Deno Deploy");
    } else if (data.publicKeyLength !== 64) {
      console.log("⚠️  WARNING: Public key length is unexpected!");
      console.log(`Expected 64 hex characters, got ${data.publicKeyLength}`);
    } else {
      console.log("✅ Public key is configured with correct length");
    }
  } else {
    console.log("❌ Endpoint returned non-200 status");
  }
} catch (error) {
  console.error("❌ Failed to reach endpoint:", error instanceof Error ? error.message : String(error));
}

console.log("\n" + "=".repeat(50));
console.log("\n📋 Next Steps:\n");
console.log("1. If public key is NOT configured:");
console.log("   - Get your Public Key from Discord Developer Portal");
console.log("   - Go to: https://discord.com/developers/applications");
console.log("   - Select your application");
console.log("   - Go to 'General Information'");
console.log("   - Copy the 'Public Key' (64-character hex string)");
console.log("   - Set it as PUBLIC_KEY environment variable in Deno Deploy\n");

console.log("2. If public key IS configured:");
console.log("   - The issue might be with signature verification");
console.log("   - Check Deno Deploy logs when Discord tries to verify");
console.log("   - Look for '❌ Invalid Discord signature' messages");
console.log("   - Ensure PUBLIC_KEY exactly matches Discord Developer Portal\n");

console.log("3. To manually test PING:");
console.log("   - Discord doesn't expose a test tool");
console.log("   - You must use Discord Developer Portal's 'Save Changes' button");
console.log("   - This will trigger an actual PING request");
console.log("   - Check Deno Deploy logs to see what happened\n");

console.log("4. Common issues:");
console.log("   - PUBLIC_KEY has extra spaces/newlines (trim it!)");
console.log("   - PUBLIC_KEY is from wrong application");
console.log("   - PUBLIC_KEY was regenerated (old one won't work)");
console.log("   - Environment variable not reloaded (restart deployment)\n");
