// Discord client wrapper with dependency injection and error handling

export interface DiscordMessage {
  content: string;
  userId: string;
  channelId?: string;
  embeds?: DiscordEmbed[];
  components?: DiscordComponent[];
}

export interface DiscordEmbed {
  title?: string;
  description?: string;
  color?: number;
  timestamp?: string;
  fields?: Array<{
    name: string;
    value: string;
    inline?: boolean;
  }>;
}

export interface DiscordComponent {
  type: number;
  style?: number;
  label?: string;
  custom_id?: string;
  emoji?: {
    name: string;
    id?: string;
  };
}

export interface DiscordUser {
  id: string;
  username: string;
  discriminator: string;
  avatar?: string;
  bot?: boolean;
}

export interface DiscordAPIResponse<T = unknown> {
  data?: T;
  error?: {
    code: number;
    message: string;
  };
  rateLimit?: {
    remaining: number;
    resetAfter: number;
  };
}

export class DiscordAPIError extends Error {
  constructor(
    message: string,
    public code?: number,
    public status?: number,
    public cause?: Error
  ) {
    super(message);
    this.name = "DiscordAPIError";
  }
}

export interface DiscordClient {
  sendDirectMessage(userId: string, message: DiscordMessage): Promise<DiscordAPIResponse>;
  getUser(userId: string): Promise<DiscordAPIResponse<DiscordUser>>;
  validateUserId(userId: string): Promise<boolean>;
  createDMChannel(userId: string): Promise<DiscordAPIResponse<{ id: string }>>;
}

class DiscordClientImpl implements DiscordClient {
  constructor(
    private botToken: string,
    private baseURL = "https://discord.com/api/v10"
  ) {
    if (!botToken) {
      throw new DiscordAPIError("Discord bot token is required");
    }
  }

  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<DiscordAPIResponse<T>> {
    const url = `${this.baseURL}${endpoint}`;
    const headers = new Headers({
      "Authorization": `Bot ${this.botToken}`,
      "Content-Type": "application/json",
      "User-Agent": "ReminderBot/1.0",
      ...Object.fromEntries(new Headers(options.headers).entries()),
    });

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      // Handle rate limits
      if (response.status === 429) {
        const retryAfter = response.headers.get("retry-after");
        throw new DiscordAPIError(
          `Rate limited. Retry after ${retryAfter}s`,
          429,
          response.status
        );
      }

      // Parse response
      const data = await response.json();

      if (!response.ok) {
        throw new DiscordAPIError(
          data.message || "Discord API request failed",
          data.code,
          response.status
        );
      }

      return {
        data,
        rateLimit: {
          remaining: parseInt(response.headers.get("x-ratelimit-remaining") || "0"),
          resetAfter: parseInt(response.headers.get("x-ratelimit-reset-after") || "0"),
        },
      };
    } catch (error) {
      if (error instanceof DiscordAPIError) {
        throw error;
      }
      throw new DiscordAPIError(
        `Network error: ${error.message}`,
        undefined,
        undefined,
        error as Error
      );
    }
  }

  async createDMChannel(userId: string): Promise<DiscordAPIResponse<{ id: string }>> {
    return this.makeRequest<{ id: string }>(`/users/@me/channels`, {
      method: "POST",
      body: JSON.stringify({
        recipient_id: userId,
      }),
    });
  }

  async sendDirectMessage(
    userId: string,
    message: DiscordMessage
  ): Promise<DiscordAPIResponse> {
    // First create/get DM channel
    const channelResponse = await this.createDMChannel(userId);
    if (channelResponse.error) {
      return channelResponse;
    }

    const channelId = channelResponse.data?.id;
    if (!channelId) {
      throw new DiscordAPIError("Failed to create DM channel");
    }

    // Send message to the DM channel
    return this.makeRequest(`/channels/${channelId}/messages`, {
      method: "POST",
      body: JSON.stringify({
        content: message.content,
        embeds: message.embeds,
        components: message.components,
      }),
    });
  }

  async getUser(userId: string): Promise<DiscordAPIResponse<DiscordUser>> {
    return this.makeRequest<DiscordUser>(`/users/${userId}`);
  }

  async validateUserId(userId: string): Promise<boolean> {
    try {
      const response = await this.getUser(userId);
      return !response.error && !!response.data;
    } catch (error) {
      return false;
    }
  }
}

// Global client instance with dependency injection
let globalClient: DiscordClient | null = null;

export function getDiscordClient(): DiscordClient {
  if (!globalClient) {
    const token = Deno.env.get("DISCORD_BOT_TOKEN");
    if (!token) {
      throw new DiscordAPIError("DISCORD_BOT_TOKEN environment variable is required");
    }
    globalClient = new DiscordClientImpl(token);
  }
  return globalClient;
}

// For testing - allows injection of mock client
export function setDiscordClient(client: DiscordClient): void {
  globalClient = client;
}

export function clearDiscordClient(): void {
  globalClient = null;
}