/**
 * Token generation and verification for acknowledgement links
 * Generates secure tokens to prevent unauthorized acknowledgements
 */

/**
 * Convert ArrayBuffer to hex string
 */
function bufferToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Generate a secure token for a reminder acknowledgement link
 */
export async function generateAcknowledgementToken(
  reminderId: string,
  action: "acknowledge" | "decline"
): Promise<string> {
  const secret = Deno.env.get("ACK_TOKEN_SECRET") || "default-secret-change-in-production";
  const data = `${reminderId}:${action}:${secret}`;
  
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  
  const hashBuffer = await crypto.subtle.digest("SHA-256", dataBuffer);
  const hashHex = bufferToHex(hashBuffer);
  
  // Take first 16 characters for shorter URLs
  return hashHex.substring(0, 16);
}

/**
 * Verify an acknowledgement token
 */
export async function verifyAcknowledgementToken(
  reminderId: string,
  action: "acknowledge" | "decline",
  token: string
): Promise<boolean> {
  const expectedToken = await generateAcknowledgementToken(reminderId, action);
  return token === expectedToken;
}

/**
 * Generate acknowledgement URL
 */
export async function generateAcknowledgementUrl(
  reminderId: string,
  action: "acknowledge" | "decline",
  baseUrl: string = "https://spec-beanbot.lazhannya.deno.net"
): Promise<string> {
  const token = await generateAcknowledgementToken(reminderId, action);
  return `${baseUrl}/ack/${reminderId}?action=${action}&token=${token}`;
}
