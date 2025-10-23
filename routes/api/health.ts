/**
 * Health check endpoint for debugging
 */

import { Handlers } from "$fresh/server.ts";
import { getConfig } from "../../discord-bot/lib/config/env.ts";

export const handler: Handlers = {
  GET(_req) {
    const config = getConfig();
    
    return new Response(
      JSON.stringify({
        status: "healthy",
        timestamp: new Date().toISOString(),
        environment: {
          isDevelopment: config.isDevelopment,
          isProduction: config.isProduction,
        },
        discord: {
          tokenConfigured: !!config.discordToken,
          tokenLength: config.discordToken?.length || 0,
          publicKeyConfigured: !!config.publicKey,
          publicKeyLength: config.publicKey?.length || 0,
          publicKeyValid: config.publicKey?.length === 64, // Ed25519 public keys are 64 hex chars
          appIdConfigured: !!config.appId,
          clientIdConfigured: !!config.discordClientId,
        },
        endpoints: {
          webhook: "/api/webhook/discord",
          health: "/api/health",
        },
        note: "If publicKeyValid is false, check PUBLIC_KEY environment variable - it should be 64 hex characters"
      }, null, 2),
      {
        status: 200,
        headers: { 
          "Content-Type": "application/json",
          "Cache-Control": "no-cache"
        },
      }
    );
  },
};
