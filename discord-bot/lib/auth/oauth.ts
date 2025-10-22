// Discord OAuth2 authentication flow

export interface DiscordOAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes: string[];
}

export interface DiscordTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
  scope: string;
}

export interface DiscordUserInfo {
  id: string;
  username: string;
  discriminator: string;
  avatar?: string;
  email?: string;
  verified?: boolean;
}

export class OAuthError extends Error {
  constructor(message: string, public code?: string, cause?: Error) {
    super(message);
    this.name = "OAuthError";
  }
}

export class DiscordOAuth {
  constructor(private config: DiscordOAuthConfig) {
    this.validateConfig();
  }

  private validateConfig(): void {
    if (!this.config.clientId) {
      throw new OAuthError("Discord client ID is required");
    }
    if (!this.config.clientSecret) {
      throw new OAuthError("Discord client secret is required");
    }
    if (!this.config.redirectUri) {
      throw new OAuthError("Discord redirect URI is required");
    }
  }

  generateAuthUrl(state?: string): string {
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      response_type: "code",
      scope: this.config.scopes.join(" "),
    });

    if (state) {
      params.set("state", state);
    }

    return `https://discord.com/api/oauth2/authorize?${params.toString()}`;
  }

  async exchangeCodeForToken(code: string): Promise<DiscordTokenResponse> {
    const data = new URLSearchParams({
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
      grant_type: "authorization_code",
      code,
      redirect_uri: this.config.redirectUri,
    });

    try {
      const response = await fetch("https://discord.com/api/oauth2/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: data,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new OAuthError(
          error.error_description || "Token exchange failed",
          error.error
        );
      }

      return await response.json();
    } catch (error) {
      if (error instanceof OAuthError) {
        throw error;
      }
      throw new OAuthError(
        `Network error during token exchange: ${error.message}`,
        undefined,
        error as Error
      );
    }
  }

  async getUserInfo(accessToken: string): Promise<DiscordUserInfo> {
    try {
      const response = await fetch("https://discord.com/api/users/@me", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new OAuthError(
          error.message || "Failed to fetch user info",
          error.code?.toString()
        );
      }

      return await response.json();
    } catch (error) {
      if (error instanceof OAuthError) {
        throw error;
      }
      throw new OAuthError(
        `Network error during user info fetch: ${error.message}`,
        undefined,
        error as Error
      );
    }
  }

  async refreshToken(refreshToken: string): Promise<DiscordTokenResponse> {
    const data = new URLSearchParams({
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    });

    try {
      const response = await fetch("https://discord.com/api/oauth2/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: data,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new OAuthError(
          error.error_description || "Token refresh failed",
          error.error
        );
      }

      return await response.json();
    } catch (error) {
      if (error instanceof OAuthError) {
        throw error;
      }
      throw new OAuthError(
        `Network error during token refresh: ${error.message}`,
        undefined,
        error as Error
      );
    }
  }
}

// Global OAuth instance
let globalOAuth: DiscordOAuth | null = null;

export function getDiscordOAuth(): DiscordOAuth {
  if (!globalOAuth) {
    const config: DiscordOAuthConfig = {
      clientId: Deno.env.get("DISCORD_CLIENT_ID") || "",
      clientSecret: Deno.env.get("DISCORD_CLIENT_SECRET") || "",
      redirectUri: Deno.env.get("DISCORD_REDIRECT_URI") || "",
      scopes: ["identify", "email"],
    };
    globalOAuth = new DiscordOAuth(config);
  }
  return globalOAuth;
}

// For testing
export function setDiscordOAuth(oauth: DiscordOAuth): void {
  globalOAuth = oauth;
}