#!/usr/bin/env -S deno run --allow-net
/**
 * Test which signature verification library is deployed
 */

const WEBHOOK_URL = "https://spec-beanbot.lazhannya.deno.net/api/webhook/discord";

console.log("=== Testing Deployed Signature Verification ===\n");

// Send a POST with invalid signature to trigger signature verification
// We'll look at the logs to see which verification method is being used

const testBody = JSON.stringify({ type: 1 }); // PING
const testTimestamp = Math.floor(Date.now() / 1000).toString();
const dummySignature = "0".repeat(128); // Invalid signature

console.log("Sending test request to trigger signature verification...");
console.log(`URL: ${WEBHOOK_URL}`);
console.log(`Body: ${testBody}`);
console.log(`Timestamp: ${testTimestamp}`);
console.log("");

try {
  const response = await fetch(WEBHOOK_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Signature-Ed25519": dummySignature,
      "X-Signature-Timestamp": testTimestamp,
    },
    body: testBody,
  });

  const status = response.status;
  const text = await response.text();

  console.log(`Response Status: ${status}`);
  console.log(`Response Body: ${text}`);
  console.log("");

  if (status === 401) {
    console.log("✅ Endpoint rejected invalid signature (expected behavior)");
    console.log("");
    console.log("📋 Check Deno Deploy logs to see which verification method was used:");
    console.log("   - If you see '--- Signature Verification (TweetNaCl) ---' → TweetNaCl is deployed ✅");
    console.log("   - If you see '--- Signature Verification Debug ---' → crypto.subtle is deployed ❌");
    console.log("");
    console.log("Deno Deploy logs: https://dash.deno.com/projects/spec-beanbot/logs");
  } else {
    console.log(`⚠️  Unexpected status code: ${status}`);
    console.log("Expected 401 for invalid signature");
  }
} catch (error) {
  console.error("❌ Request failed:", error instanceof Error ? error.message : String(error));
}
