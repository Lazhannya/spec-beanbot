/**
 * Discord Signature Verification
 * Verifies webhook signatures using Ed25519 via TweetNaCl
 * Based on official Deno Deploy Discord example
 * Last verified: 2025-10-24 09:52 UTC
 */

import nacl from "https://cdn.skypack.dev/tweetnacl@v1.0.3";

/**
 * Verify Discord interaction signature using Ed25519
 * @param body - Raw request body as string
 * @param signature - X-Signature-Ed25519 header value
 * @param timestamp - X-Signature-Timestamp header value
 * @param publicKey - Discord application public key
 */
export function verifyDiscordSignature(
  body: string,
  signature: string,
  timestamp: string,
  publicKey: string
): Promise<boolean> {
  console.log("--- Signature Verification (TweetNaCl) ---");
  console.log("Body length:", body.length);
  console.log("Signature length:", signature.length);
  console.log("Timestamp:", timestamp);
  console.log("Public key length:", publicKey.length);
  
  try {
    // Create message to verify (timestamp + body)
    const message = new TextEncoder().encode(timestamp + body);
    console.log("Message length:", message.length);
    
    // Convert hex strings to Uint8Array
    const signatureBytes = hexToUint8Array(signature);
    const publicKeyBytes = hexToUint8Array(publicKey);
    
    console.log("Signature bytes length:", signatureBytes.length);
    console.log("Public key bytes length:", publicKeyBytes.length);
    
    // Verify using TweetNaCl (same as official Deno Deploy example)
    const isValid = nacl.sign.detached.verify(
      message,
      signatureBytes,
      publicKeyBytes
    );
    
    console.log("Verification result:", isValid ? "✅ VALID" : "❌ INVALID");
    return Promise.resolve(isValid);
  } catch (error) {
    console.error("💥 Error during signature verification:");
    console.error("Error type:", error?.constructor?.name);
    console.error("Error message:", error instanceof Error ? error.message : String(error));
    console.error("Error stack:", error instanceof Error ? error.stack : "No stack trace");
    return Promise.resolve(false);
  }
}

/**
 * Convert hex string to Uint8Array
 */
function hexToUint8Array(hex: string): Uint8Array {
  return new Uint8Array(
    hex.match(/.{1,2}/g)!.map((val) => parseInt(val, 16))
  );
}
