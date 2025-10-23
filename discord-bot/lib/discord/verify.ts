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
  try {
    // Convert hex strings to Uint8Array
    const signatureBytes = hexToBytes(signature);
    const publicKeyBytes = hexToBytes(publicKey);
    
    // Create message to verify (timestamp + body)
    const message = new TextEncoder().encode(timestamp + body);
    
    // Import the public key
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
    
    // Verify the signature
    const isValid = await crypto.subtle.verify(
      "Ed25519",
      cryptoKey,
      signatureBytes,
      message
    );
    
    return isValid;
  } catch (error) {
    console.error("Error verifying Discord signature:", error);
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
