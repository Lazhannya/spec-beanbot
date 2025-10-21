// Discord OAuth2 authentication start endpoint
import type { Handlers } from "$fresh/server.ts";

export const handler: Handlers = {
  GET(req) {
    try {
      // Get Discord OAuth2 configuration from environment
      const clientId = Deno.env.get("DISCORD_CLIENT_ID");
      const redirectUri = Deno.env.get("DISCORD_REDIRECT_URI") ||
        `${new URL(req.url).origin}/auth/callback`;

      if (!clientId) {
        return new Response(
          JSON.stringify({ error: "Discord OAuth2 not configured" }),
          {
            status: 500,
            headers: { "Content-Type": "application/json" },
          },
        );
      }

      // Generate state parameter for CSRF protection
      const state = crypto.randomUUID();

      // Store state in session for verification later
      // Note: In a real implementation, you'd store this in a secure way
      const stateExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      // Discord OAuth2 scopes
      const scopes = [
        "identify", // Basic user info
        "email", // User email
        "guilds", // User's guilds (optional)
        "connections", // User connections (optional)
      ];

      // Build Discord OAuth2 authorization URL
      const discordAuthUrl = new URL(
        "https://discord.com/api/oauth2/authorize",
      );
      discordAuthUrl.searchParams.set("client_id", clientId);
      discordAuthUrl.searchParams.set("redirect_uri", redirectUri);
      discordAuthUrl.searchParams.set("response_type", "code");
      discordAuthUrl.searchParams.set("scope", scopes.join(" "));
      discordAuthUrl.searchParams.set("state", state);
      discordAuthUrl.searchParams.set("prompt", "none"); // Don't prompt if already authorized

      console.log(`🔗 Initiating Discord OAuth2 flow for state: ${state}`);

      // Create response with state cookie for verification
      const response = new Response(null, {
        status: 302,
        headers: {
          "Location": discordAuthUrl.toString(),
          "Set-Cookie":
            `oauth_state=${state}; HttpOnly; Secure; SameSite=Lax; Max-Age=600; Path=/auth`, // 10 minutes
        },
      });

      return response;
    } catch (error) {
      console.error("OAuth2 initialization error:", error);

      return new Response(
        JSON.stringify({
          error: "Failed to initialize OAuth2 flow",
          message: error instanceof Error ? error.message : "Unknown error",
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        },
      );
    }
  },
};
