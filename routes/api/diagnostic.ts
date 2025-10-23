/**
 * Environment Variable Diagnostic Endpoint
 * Shows what environment variables are configured (safely)
 */

import { Handlers } from "$fresh/server.ts";

export const handler: Handlers = {
  GET() {
    const publicKey = Deno.env.get("PUBLIC_KEY");
    const discordToken = Deno.env.get("DISCORD_TOKEN");
    const appId = Deno.env.get("APP_ID");
    
    return new Response(
      JSON.stringify({
        environment: {
          PUBLIC_KEY: {
            configured: !!publicKey,
            length: publicKey?.length || 0,
            isValidHex: publicKey ? /^[0-9a-fA-F]{64}$/.test(publicKey) : false,
            preview: publicKey ? `${publicKey.substring(0, 8)}...${publicKey.substring(56)}` : null,
          },
          DISCORD_TOKEN: {
            configured: !!discordToken,
            length: discordToken?.length || 0,
          },
          APP_ID: {
            configured: !!appId,
            value: appId || null,
          },
        },
        note: "Check that PUBLIC_KEY is exactly 64 hex characters matching your Discord app's Public Key",
      }, null, 2),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  },
};
