/**
 * Minimal Discord Webhook - Exact copy of working Deno Deploy example
 */

import { Handlers } from "$fresh/server.ts";
import nacl from "https://cdn.skypack.dev/tweetnacl@v1.0.3";

export const handler: Handlers = {
  async POST(req) {
    // Get Discord headers
    const signature = req.headers.get("X-Signature-Ed25519");
    const timestamp = req.headers.get("X-Signature-Timestamp");
    
    if (!signature || !timestamp) {
      console.log("Missing signature headers");
      return new Response("Unauthorized", { status: 401 });
    }

    // Get raw body
    const body = await req.text();
    
    // Verify signature
    const publicKey = Deno.env.get("PUBLIC_KEY");
    if (!publicKey) {
      console.log("PUBLIC_KEY not configured");
      return new Response("Server error", { status: 500 });
    }

    const isValid = nacl.sign.detached.verify(
      new TextEncoder().encode(timestamp + body),
      hexToUint8Array(signature),
      hexToUint8Array(publicKey)
    );

    if (!isValid) {
      console.log("Invalid signature");
      return new Response("Invalid signature", { status: 401 });
    }

    // Parse interaction
    const interaction = JSON.parse(body);
    const { type } = interaction;

    // Handle PING
    if (type === 1) {
      console.log("PING received, responding with PONG");
      return new Response(
        JSON.stringify({ type: 1 }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Handle other interactions
    return new Response(
      JSON.stringify({
        type: 4,
        data: { content: "Interaction received" },
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  },
};

function hexToUint8Array(hex: string): Uint8Array {
  return new Uint8Array(
    hex.match(/.{1,2}/g)!.map((val) => parseInt(val, 16))
  );
}
