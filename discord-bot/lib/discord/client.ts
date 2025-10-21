// Discord bot client initialization and management
import {
  Bot,
  Channel,
  createBot,
  Guild,
  Interaction,
  Message,
  startBot,
  User,
} from "discord-deno";
import type {
  BotConfig,
  BotResponse,
  DiscordMessage,
  DiscordUser,
  MessageCreateEvent,
  MessageReactionAddEvent,
} from "./types.ts";

let botInstance: Bot | null = null;

export interface DiscordClientOptions {
  token: string;
  intents: number[];
  onMessage?: (event: MessageCreateEvent) => Promise<void>;
  onReaction?: (event: MessageReactionAddEvent) => Promise<void>;
  onReady?: () => Promise<void>;
  onError?: (error: Error) => Promise<void>;
}

export class DiscordClient {
  private bot: Bot;
  private config: BotConfig;
  private isConnected: boolean = false;
  private messageHandlers: Array<(event: MessageCreateEvent) => Promise<void>> =
    [];
  private reactionHandlers: Array<
    (event: MessageReactionAddEvent) => Promise<void>
  > = [];

  constructor(config: BotConfig, options: DiscordClientOptions) {
    this.config = config;

    this.bot = createBot({
      token: config.token,
      intents: options.intents || [
        1 << 9, // GUILD_MESSAGES
        1 << 10, // GUILD_MESSAGE_REACTIONS
        1 << 12, // DIRECT_MESSAGES
        1 << 13, // DIRECT_MESSAGE_REACTIONS
        1 << 15, // MESSAGE_CONTENT
      ],
    });

    this.setupEventHandlers(options);
  }

  private setupEventHandlers(options: DiscordClientOptions): void {
    // Ready event
    this.bot.events.ready = async (_bot: Bot, payload) => {
      console.log(
        `🤖 Bot connected as ${payload.user.username}#${payload.user.discriminator}`,
      );
      this.isConnected = true;

      if (options.onReady) {
        await options.onReady();
      }
    };

    // Message create event
    this.bot.events.messageCreate = async (_bot: Bot, message: Message) => {
      // Skip messages from bots
      if (message.author.bot) return;

      const event: MessageCreateEvent = {
        message: this.convertMessage(message),
        guildId: message.guildId?.toString(),
        channelId: message.channelId.toString(),
        userId: message.author.id.toString(),
      };

      // Call registered handlers
      for (const handler of this.messageHandlers) {
        try {
          await handler(event);
        } catch (error) {
          console.error("Error in message handler:", error);
          if (options.onError) {
            await options.onError(error as Error);
          }
        }
      }

      // Call provided handler
      if (options.onMessage) {
        try {
          await options.onMessage(event);
        } catch (error) {
          console.error("Error in onMessage handler:", error);
          if (options.onError) {
            await options.onError(error as Error);
          }
        }
      }
    };

    // Message reaction add event
    this.bot.events.reactionAdd = async (_bot: Bot, payload) => {
      // Skip reactions from bots
      if (payload.userId === this.bot.id) return;

      const event: MessageReactionAddEvent = {
        userId: payload.userId.toString(),
        channelId: payload.channelId.toString(),
        messageId: payload.messageId.toString(),
        guildId: payload.guildId?.toString(),
        emoji: {
          id: payload.emoji.id?.toString(),
          name: payload.emoji.name,
          animated: payload.emoji.animated,
        },
      };

      // Call registered handlers
      for (const handler of this.reactionHandlers) {
        try {
          await handler(event);
        } catch (error) {
          console.error("Error in reaction handler:", error);
          if (options.onError) {
            await options.onError(error as Error);
          }
        }
      }

      // Call provided handler
      if (options.onReaction) {
        try {
          await options.onReaction(event);
        } catch (error) {
          console.error("Error in onReaction handler:", error);
          if (options.onError) {
            await options.onError(error as Error);
          }
        }
      }
    };
  }

  private convertMessage(message: Message): DiscordMessage {
    return {
      id: message.id.toString(),
      channel_id: message.channelId.toString(),
      guild_id: message.guildId?.toString(),
      author: this.convertUser(message.author),
      content: message.content,
      timestamp: new Date(message.timestamp).toISOString(),
      edited_timestamp: message.editedTimestamp
        ? new Date(message.editedTimestamp).toISOString()
        : undefined,
      tts: message.tts || false,
      mention_everyone: message.mentionEveryone || false,
      mentions: message.mentions?.map((user) => this.convertUser(user)) || [],
      mention_roles: message.mentionRoles?.map((role) => role.toString()) || [],
      attachments: message.attachments || [],
      embeds: message.embeds || [],
      reactions: message.reactions || [],
      pinned: message.pinned || false,
      type: message.type || 0,
    };
  }

  private convertUser(user: User): DiscordUser {
    return {
      id: user.id.toString(),
      username: user.username,
      discriminator: user.discriminator,
      avatar: user.avatar,
      bot: user.bot,
      system: user.system,
    };
  }

  // Public methods
  async connect(): Promise<void> {
    if (this.isConnected) {
      console.log("Bot is already connected");
      return;
    }

    try {
      await startBot(this.bot);
      botInstance = this.bot;
    } catch (error) {
      console.error("Failed to connect bot:", error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (!this.isConnected) {
      console.log("Bot is not connected");
      return;
    }

    // Note: discord-deno doesn't have a built-in disconnect method
    // This would need to be implemented based on the library's capabilities
    this.isConnected = false;
    botInstance = null;
  }

  isReady(): boolean {
    return this.isConnected;
  }

  // Message sending methods
  async sendMessage(
    channelId: string,
    content: string | BotResponse,
  ): Promise<void> {
    if (!this.isConnected) {
      throw new Error("Bot is not connected");
    }

    try {
      if (typeof content === "string") {
        await this.bot.helpers.sendMessage(BigInt(channelId), { content });
      } else {
        const payload: any = {};

        if (content.content) payload.content = content.content;
        if (content.embeds) payload.embeds = content.embeds;
        if (content.components) payload.components = content.components;

        await this.bot.helpers.sendMessage(BigInt(channelId), payload);

        // Add reactions if specified
        if (content.reactions && content.reactions.length > 0) {
          // Get the sent message ID (this is a simplified approach)
          // In practice, you'd need to get the actual message ID from the response
          for (const reaction of content.reactions) {
            try {
              // This would need to be implemented properly with message ID
              // await this.bot.helpers.addReaction(BigInt(channelId), messageId, reaction);
            } catch (error) {
              console.error("Failed to add reaction:", error);
            }
          }
        }
      }
    } catch (error) {
      console.error("Failed to send message:", error);
      throw error;
    }
  }

  async sendDirectMessage(
    userId: string,
    content: string | BotResponse,
  ): Promise<void> {
    if (!this.isConnected) {
      throw new Error("Bot is not connected");
    }

    try {
      // Create DM channel first
      const dmChannel = await this.bot.helpers.getDmChannel(BigInt(userId));
      await this.sendMessage(dmChannel.id.toString(), content);
    } catch (error) {
      console.error("Failed to send direct message:", error);
      throw error;
    }
  }

  async addReaction(
    channelId: string,
    messageId: string,
    emoji: string,
  ): Promise<void> {
    if (!this.isConnected) {
      throw new Error("Bot is not connected");
    }

    try {
      await this.bot.helpers.addReaction(
        BigInt(channelId),
        BigInt(messageId),
        emoji,
      );
    } catch (error) {
      console.error("Failed to add reaction:", error);
      throw error;
    }
  }

  async removeReaction(
    channelId: string,
    messageId: string,
    emoji: string,
    userId?: string,
  ): Promise<void> {
    if (!this.isConnected) {
      throw new Error("Bot is not connected");
    }

    try {
      if (userId) {
        await this.bot.helpers.removeReaction(
          BigInt(channelId),
          BigInt(messageId),
          emoji,
          BigInt(userId),
        );
      } else {
        await this.bot.helpers.removeReaction(
          BigInt(channelId),
          BigInt(messageId),
          emoji,
        );
      }
    } catch (error) {
      console.error("Failed to remove reaction:", error);
      throw error;
    }
  }

  // Event handler registration
  onMessage(handler: (event: MessageCreateEvent) => Promise<void>): void {
    this.messageHandlers.push(handler);
  }

  onReaction(handler: (event: MessageReactionAddEvent) => Promise<void>): void {
    this.reactionHandlers.push(handler);
  }

  // Utility methods
  getBotUser(): DiscordUser | null {
    if (!this.isConnected || !this.bot.id) {
      return null;
    }

    // This would need to be implemented based on the bot's user data
    return {
      id: this.bot.id.toString(),
      username: "DiscordBot", // This should come from the actual bot user
      discriminator: "0000",
      bot: true,
    };
  }

  async getChannel(channelId: string): Promise<Channel | null> {
    if (!this.isConnected) {
      throw new Error("Bot is not connected");
    }

    try {
      return await this.bot.helpers.getChannel(BigInt(channelId));
    } catch (error) {
      console.error("Failed to get channel:", error);
      return null;
    }
  }

  async getUser(userId: string): Promise<User | null> {
    if (!this.isConnected) {
      throw new Error("Bot is not connected");
    }

    try {
      return await this.bot.helpers.getUser(BigInt(userId));
    } catch (error) {
      console.error("Failed to get user:", error);
      return null;
    }
  }

  async getGuild(guildId: string): Promise<Guild | null> {
    if (!this.isConnected) {
      throw new Error("Bot is not connected");
    }

    try {
      return await this.bot.helpers.getGuild(BigInt(guildId));
    } catch (error) {
      console.error("Failed to get guild:", error);
      return null;
    }
  }
}

// Factory function for creating and initializing the Discord client
export async function createDiscordClient(
  config: BotConfig,
  options: DiscordClientOptions,
): Promise<DiscordClient> {
  const client = new DiscordClient(config, options);
  return client;
}

// Singleton access to the current bot instance
export function getBotInstance(): Bot | null {
  return botInstance;
}

// Helper function to get bot configuration from environment variables
export function getBotConfigFromEnv(): BotConfig {
  const token = Deno.env.get("DISCORD_BOT_TOKEN");
  const clientId = Deno.env.get("DISCORD_CLIENT_ID");
  const clientSecret = Deno.env.get("DISCORD_CLIENT_SECRET");
  const applicationId = Deno.env.get("DISCORD_APPLICATION_ID") || clientId;

  if (!token || !clientId || !clientSecret) {
    throw new Error(
      "Missing required Discord environment variables: DISCORD_BOT_TOKEN, DISCORD_CLIENT_ID, DISCORD_CLIENT_SECRET",
    );
  }

  return {
    token,
    clientId,
    clientSecret,
    applicationId: applicationId!,
    guildId: Deno.env.get("DISCORD_GUILD_ID"), // Optional
  };
}
