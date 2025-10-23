/**
 * Discord Signature Verification
 * Verifies webhook signatures using Ed25519
 */

/**
 * Verify Discord interaction signature using Ed25519
 * @param body - Raw request body as string
 * @param signature - X-Signature-Ed25519 header value
 * @param timestamp - X-Signature-Timestamp header value
 * @param publicKey - Discord application public key
 */
export async function verifyDiscordSignature(
  body: string,
  signature: string,
  timestamp: string,
  publicKey: string
): Promise<boolean> {
  console.log("--- Signature Verification Debug ---");
  console.log("Body length:", body.length);
  console.log("Signature length:", signature.length);
  console.log("Timestamp:", timestamp);
  console.log("Public key length:", publicKey.length);
  
  try {
    // Convert hex strings to Uint8Array
    console.log("Converting signature from hex...");
    const signatureBytes = hexToBytes(signature);
    console.log("Signature bytes length:", signatureBytes.length);
    
    console.log("Converting public key from hex...");
    const publicKeyBytes = hexToBytes(publicKey);
    console.log("Public key bytes length:", publicKeyBytes.length);
    
    // Create message to verify (timestamp + body)
    const message = new TextEncoder().encode(timestamp + body);
    console.log("Message to verify length:", message.length);
    
    // Import the public key
    console.log("Importing public key...");
    const cryptoKey = await crypto.subtle.importKey(
      "raw",
      publicKeyBytes,
      {
        name: "Ed25519",
        namedCurve: "Ed25519",
      },
      false,
      ["verify"]
    );
    console.log("✅ Public key imported successfully");
    
    // Verify the signature
    console.log("Verifying signature...");
    const isValid = await crypto.subtle.verify(
      "Ed25519",
      cryptoKey,
      signatureBytes,
      message
    );
    
    console.log("Verification result:", isValid ? "✅ VALID" : "❌ INVALID");
    return isValid;
  } catch (error) {
    console.error("💥 Error during signature verification:");
    console.error("Error type:", error?.constructor?.name);
    console.error("Error message:", error instanceof Error ? error.message : String(error));
    console.error("Error stack:", error instanceof Error ? error.stack : "No stack trace");
    return false;
  }
}

/**
 * Convert hex string to Uint8Array
 */
function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}
