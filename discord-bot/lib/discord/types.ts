// Discord API types and interfaces for the bot
// Based on Discord API v10 and discord-deno library

export interface DiscordUser {
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

export interface DiscordChannel {
  id: string;
  type: number;
  guild_id?: string;
  position?: number;
  permission_overwrites?: DiscordOverwrite[];
  name?: string;
  topic?: string;
  nsfw?: boolean;
  last_message_id?: string;
  bitrate?: number;
  user_limit?: number;
  rate_limit_per_user?: number;
  recipients?: DiscordUser[];
  icon?: string;
  owner_id?: string;
  application_id?: string;
  parent_id?: string;
  last_pin_timestamp?: string;
}

export interface DiscordGuild {
  id: string;
  name: string;
  icon?: string;
  icon_hash?: string;
  splash?: string;
  discovery_splash?: string;
  owner?: boolean;
  owner_id: string;
  permissions?: string;
  region?: string;
  afk_channel_id?: string;
  afk_timeout: number;
  widget_enabled?: boolean;
  widget_channel_id?: string;
  verification_level: number;
  default_message_notifications: number;
  explicit_content_filter: number;
  roles: DiscordRole[];
  emojis: DiscordEmoji[];
  features: string[];
  mfa_level: number;
  application_id?: string;
  system_channel_id?: string;
  system_channel_flags: number;
  rules_channel_id?: string;
  max_presences?: number;
  max_members?: number;
  vanity_url_code?: string;
  description?: string;
  banner?: string;
  premium_tier: number;
  premium_subscription_count?: number;
  preferred_locale: string;
  public_updates_channel_id?: string;
  max_video_channel_users?: number;
  approximate_member_count?: number;
  approximate_presence_count?: number;
}

export interface DiscordMessage {
  id: string;
  channel_id: string;
  guild_id?: string;
  author: DiscordUser;
  member?: DiscordGuildMember;
  content: string;
  timestamp: string;
  edited_timestamp?: string;
  tts: boolean;
  mention_everyone: boolean;
  mentions: DiscordUser[];
  mention_roles: string[];
  mention_channels?: DiscordChannelMention[];
  attachments: DiscordAttachment[];
  embeds: DiscordEmbed[];
  reactions?: DiscordReaction[];
  nonce?: string | number;
  pinned: boolean;
  webhook_id?: string;
  type: number;
  activity?: DiscordMessageActivity;
  application?: DiscordApplication;
  application_id?: string;
  message_reference?: DiscordMessageReference;
  flags?: number;
  referenced_message?: DiscordMessage;
  interaction?: DiscordMessageInteraction;
  thread?: DiscordChannel;
  components?: DiscordComponent[];
  sticker_items?: DiscordStickerItem[];
  stickers?: DiscordSticker[];
}

export interface DiscordGuildMember {
  user?: DiscordUser;
  nick?: string;
  avatar?: string;
  roles: string[];
  joined_at: string;
  premium_since?: string;
  deaf: boolean;
  mute: boolean;
  pending?: boolean;
  permissions?: string;
  communication_disabled_until?: string;
}

export interface DiscordRole {
  id: string;
  name: string;
  color: number;
  hoist: boolean;
  icon?: string;
  unicode_emoji?: string;
  position: number;
  permissions: string;
  managed: boolean;
  mentionable: boolean;
  tags?: DiscordRoleTags;
}

export interface DiscordEmoji {
  id?: string;
  name?: string;
  roles?: string[];
  user?: DiscordUser;
  require_colons?: boolean;
  managed?: boolean;
  animated?: boolean;
  available?: boolean;
}

export interface DiscordAttachment {
  id: string;
  filename: string;
  description?: string;
  content_type?: string;
  size: number;
  url: string;
  proxy_url: string;
  height?: number;
  width?: number;
  ephemeral?: boolean;
}

export interface DiscordEmbed {
  title?: string;
  type?: string;
  description?: string;
  url?: string;
  timestamp?: string;
  color?: number;
  footer?: DiscordEmbedFooter;
  image?: DiscordEmbedImage;
  thumbnail?: DiscordEmbedThumbnail;
  video?: DiscordEmbedVideo;
  provider?: DiscordEmbedProvider;
  author?: DiscordEmbedAuthor;
  fields?: DiscordEmbedField[];
}

export interface DiscordEmbedFooter {
  text: string;
  icon_url?: string;
  proxy_icon_url?: string;
}

export interface DiscordEmbedImage {
  url: string;
  proxy_url?: string;
  height?: number;
  width?: number;
}

export interface DiscordEmbedThumbnail {
  url: string;
  proxy_url?: string;
  height?: number;
  width?: number;
}

export interface DiscordEmbedVideo {
  url?: string;
  proxy_url?: string;
  height?: number;
  width?: number;
}

export interface DiscordEmbedProvider {
  name?: string;
  url?: string;
}

export interface DiscordEmbedAuthor {
  name: string;
  url?: string;
  icon_url?: string;
  proxy_icon_url?: string;
}

export interface DiscordEmbedField {
  name: string;
  value: string;
  inline?: boolean;
}

export interface DiscordReaction {
  count: number;
  me: boolean;
  emoji: DiscordEmoji;
}

export interface DiscordOverwrite {
  id: string;
  type: number;
  allow: string;
  deny: string;
}

export interface DiscordChannelMention {
  id: string;
  guild_id: string;
  type: number;
  name: string;
}

export interface DiscordMessageActivity {
  type: number;
  party_id?: string;
}

export interface DiscordApplication {
  id: string;
  name: string;
  icon?: string;
  description: string;
  rpc_origins?: string[];
  bot_public: boolean;
  bot_require_code_grant: boolean;
  terms_of_service_url?: string;
  privacy_policy_url?: string;
  owner?: DiscordUser;
  verify_key: string;
  team?: DiscordTeam;
  guild_id?: string;
  primary_sku_id?: string;
  slug?: string;
  cover_image?: string;
  flags?: number;
  tags?: string[];
  install_params?: DiscordInstallParams;
  custom_install_url?: string;
}

export interface DiscordMessageReference {
  message_id?: string;
  channel_id?: string;
  guild_id?: string;
  fail_if_not_exists?: boolean;
}

export interface DiscordMessageInteraction {
  id: string;
  type: number;
  name: string;
  user: DiscordUser;
  member?: DiscordGuildMember;
}

export interface DiscordComponent {
  type: number;
  custom_id?: string;
  disabled?: boolean;
  style?: number;
  label?: string;
  emoji?: DiscordEmoji;
  url?: string;
  options?: DiscordSelectOption[];
  placeholder?: string;
  min_values?: number;
  max_values?: number;
  min_length?: number;
  max_length?: number;
  required?: boolean;
  value?: string;
  components?: DiscordComponent[];
}

export interface DiscordSelectOption {
  label: string;
  value: string;
  description?: string;
  emoji?: DiscordEmoji;
  default?: boolean;
}

export interface DiscordStickerItem {
  id: string;
  name: string;
  format_type: number;
}

export interface DiscordSticker {
  id: string;
  pack_id?: string;
  name: string;
  description?: string;
  tags: string;
  asset?: string;
  type: number;
  format_type: number;
  available?: boolean;
  guild_id?: string;
  user?: DiscordUser;
  sort_value?: number;
}

export interface DiscordRoleTags {
  bot_id?: string;
  integration_id?: string;
  premium_subscriber?: null;
  subscription_listing_id?: string;
  available_for_purchase?: null;
  guild_connections?: null;
}

export interface DiscordTeam {
  icon?: string;
  id: string;
  members: DiscordTeamMember[];
  name: string;
  owner_user_id: string;
}

export interface DiscordTeamMember {
  membership_state: number;
  permissions: string[];
  team_id: string;
  user: DiscordUser;
}

export interface DiscordInstallParams {
  scopes: string[];
  permissions: string;
}

// Bot-specific types

export interface BotConfig {
  token: string;
  clientId: string;
  clientSecret: string;
  guildId?: string; // Optional, for guild-specific commands
  applicationId: string;
}

export interface WebhookPayload {
  type: "message" | "mention" | "reaction" | "pattern_match";
  timestamp: string;
  data: {
    message?: DiscordMessage;
    user?: DiscordUser;
    channel?: DiscordChannel;
    guild?: DiscordGuild;
    reaction?: DiscordReaction;
    pattern?: {
      id: string;
      name: string;
      matchedText: string;
    };
    metadata?: Record<string, unknown>;
  };
}

export interface BotResponse {
  type: "message" | "reaction" | "edit" | "delete";
  content?: string;
  embeds?: DiscordEmbed[];
  components?: DiscordComponent[];
  reactions?: string[]; // Unicode emojis
  messageId?: string; // For edit/delete operations
}

// Event types
export interface MessageCreateEvent {
  message: DiscordMessage;
  guildId?: string;
  channelId: string;
  userId: string;
}

export interface MessageReactionAddEvent {
  userId: string;
  channelId: string;
  messageId: string;
  guildId?: string;
  emoji: DiscordEmoji;
  member?: DiscordGuildMember;
}

export interface GuildMemberAddEvent {
  guildId: string;
  user: DiscordUser;
  member: DiscordGuildMember;
}

// Type guards
export function isDirectMessage(channel: DiscordChannel): boolean {
  return channel.type === 1; // DM channel type
}

export function isGuildMessage(message: DiscordMessage): boolean {
  return !!message.guild_id;
}

export function isBotMention(message: DiscordMessage, botId: string): boolean {
  return message.mentions.some((user) => user.id === botId);
}

export function hasEmbeds(message: DiscordMessage): boolean {
  return message.embeds && message.embeds.length > 0;
}

export function hasAttachments(message: DiscordMessage): boolean {
  return message.attachments && message.attachments.length > 0;
}
