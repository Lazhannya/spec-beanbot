// Discord OAuth2 callback handler
import type { Handlers } from "$fresh/server.ts";
import {
  createSession,
  createSessionCookie,
} from "../../lib/storage/sessions.ts";
import type { DiscordUser } from "../../lib/discord/types.ts";

interface DiscordTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
  scope: string;
}

interface DiscordUserResponse {
  id: string;
  username: string;
  discriminator: string;
  avatar?: string;
  bot?: boolean;
  system?: boolean;
  mfa_enabled?: boolean;
  banner?: string;
  accent_color?: number;
  locale?: string;
  verified?: boolean;
  email?: string;
  flags?: number;
  premium_type?: number;
  public_flags?: number;
}

export const handler: Handlers = {
  async GET(req) {
    try {
      const url = new URL(req.url);
      const code = url.searchParams.get("code");
      const state = url.searchParams.get("state");
      const error = url.searchParams.get("error");

      // Check for Discord OAuth2 errors
      if (error) {
        console.error("Discord OAuth2 error:", error);
        return new Response(null, {
          status: 302,
          headers: {
            "Location": "/?error=oauth_error&message=" +
              encodeURIComponent(error),
          },
        });
      }

      // Validate required parameters
      if (!code || !state) {
        console.error("Missing OAuth2 parameters:", {
          code: !!code,
          state: !!state,
        });
        return new Response(null, {
          status: 302,
          headers: {
            "Location":
              "/?error=invalid_request&message=Missing required parameters",
          },
        });
      }

      // Verify state parameter (CSRF protection)
      const cookies = req.headers.get("cookie") || "";
      const stateCookie = cookies
        .split(";")
        .find((cookie) => cookie.trim().startsWith("oauth_state="));

      if (!stateCookie) {
        console.error("Missing state cookie");
        return new Response(null, {
          status: 302,
          headers: {
            "Location":
              "/?error=invalid_state&message=Missing state verification",
          },
        });
      }

      const expectedState = stateCookie.split("=")[1];
      if (state !== expectedState) {
        console.error("State mismatch:", {
          received: state,
          expected: expectedState,
        });
        return new Response(null, {
          status: 302,
          headers: {
            "Location":
              "/?error=invalid_state&message=State verification failed",
          },
        });
      }

      // Exchange authorization code for access token
      const tokenResponse = await exchangeCodeForToken(code, req);
      if (!tokenResponse) {
        return new Response(null, {
          status: 302,
          headers: {
            "Location":
              "/?error=token_exchange_failed&message=Failed to get access token",
          },
        });
      }

      // Get user information from Discord
      const userInfo = await getDiscordUser(tokenResponse.access_token);
      if (!userInfo) {
        return new Response(null, {
          status: 302,
          headers: {
            "Location":
              "/?error=user_fetch_failed&message=Failed to get user information",
          },
        });
      }

      // Create user session
      const session = await createSession({
        accessToken: tokenResponse.access_token,
        refreshToken: tokenResponse.refresh_token,
        tokenType: tokenResponse.token_type,
        expiresIn: tokenResponse.expires_in,
        scope: tokenResponse.scope.split(" "),
        userInfo: convertToDiscordUser(userInfo),
        ipAddress: req.headers.get("x-forwarded-for") ||
          req.headers.get("x-real-ip") ||
          "unknown",
        userAgent: req.headers.get("user-agent") || "unknown",
      });

      if (!session) {
        return new Response(null, {
          status: 302,
          headers: {
            "Location":
              "/?error=session_creation_failed&message=Failed to create user session",
          },
        });
      }

      console.log(
        `✅ OAuth2 success for user: ${userInfo.username}#${userInfo.discriminator}`,
      );

      // Create session cookie and redirect to dashboard
      const sessionCookie = createSessionCookie(session.id, {
        secure: true,
        sameSite: "lax",
        httpOnly: true,
      });

      return new Response(null, {
        status: 302,
        headers: {
          "Location": "/dashboard",
          "Set-Cookie": [
            sessionCookie,
            "oauth_state=; Max-Age=0; Path=/auth", // Clear state cookie
          ].join(", "),
        },
      });
    } catch (error) {
      console.error("OAuth2 callback error:", error);

      return new Response(null, {
        status: 302,
        headers: {
          "Location": "/?error=callback_error&message=" +
            encodeURIComponent(
              error instanceof Error ? error.message : "Unknown error",
            ),
        },
      });
    }
  },
};

// Exchange authorization code for access token
async function exchangeCodeForToken(
  code: string,
  req: Request,
): Promise<DiscordTokenResponse | null> {
  try {
    const clientId = Deno.env.get("DISCORD_CLIENT_ID");
    const clientSecret = Deno.env.get("DISCORD_CLIENT_SECRET");
    const redirectUri = Deno.env.get("DISCORD_REDIRECT_URI") ||
      `${new URL(req.url).origin}/auth/callback`;

    if (!clientId || !clientSecret) {
      throw new Error("Discord OAuth2 credentials not configured");
    }

    const tokenData = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "authorization_code",
      code: code,
      redirect_uri: redirectUri,
    });

    const response = await fetch("https://discord.com/api/oauth2/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "Discord-Bot/1.0",
      },
      body: tokenData.toString(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Token exchange failed:", response.status, errorText);
      return null;
    }

    const tokenResponse: DiscordTokenResponse = await response.json();
    return tokenResponse;
  } catch (error) {
    console.error("Token exchange error:", error);
    return null;
  }
}

// Get user information from Discord API
async function getDiscordUser(
  accessToken: string,
): Promise<DiscordUserResponse | null> {
  try {
    const response = await fetch("https://discord.com/api/users/@me", {
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "User-Agent": "Discord-Bot/1.0",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("User fetch failed:", response.status, errorText);
      return null;
    }

    const userResponse: DiscordUserResponse = await response.json();
    return userResponse;
  } catch (error) {
    console.error("User fetch error:", error);
    return null;
  }
}

// Convert Discord API user response to our DiscordUser type
function convertToDiscordUser(discordUser: DiscordUserResponse): DiscordUser {
  return {
    id: discordUser.id,
    username: discordUser.username,
    discriminator: discordUser.discriminator,
    avatar: discordUser.avatar,
    bot: discordUser.bot,
    system: discordUser.system,
    mfa_enabled: discordUser.mfa_enabled,
    banner: discordUser.banner,
    accent_color: discordUser.accent_color,
    locale: discordUser.locale,
    verified: discordUser.verified,
    email: discordUser.email,
    flags: discordUser.flags,
    premium_type: discordUser.premium_type,
    public_flags: discordUser.public_flags,
  };
}
