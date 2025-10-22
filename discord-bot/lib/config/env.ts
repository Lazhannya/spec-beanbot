/**
 * Environment Configuration Module
 * Handles environment variables with safe defaults for deployment
 */

export interface EnvironmentConfig {
  // Discord Bot Configuration
  appId: string;
  discordToken: string;
  publicKey: string;

  // OAuth2 Configuration
  discordClientId: string;
  discordClientSecret: string;
  discordRedirectUri: string;

  // Webhook Configuration
  webhookUrl?: string;
  webhookSecret: string;

  // Web Interface Configuration
  sessionSecret: string;

  // Admin Configuration
  adminUserIds: string[];

  // Logging Configuration
  logLevel: string;
  logPrettyPrint: boolean;

  // Session Configuration
  sessionTimeoutHours: number;
  sessionRefreshThresholdHours: number;

  // Deployment Environment
  isProduction: boolean;
  isDevelopment: boolean;
}

/**
 * Get environment variable with optional default
 */
function getEnv(key: string, defaultValue?: string): string {
  const value = Deno.env.get(key);
  if (value !== undefined) {
    return value;
  }
  if (defaultValue !== undefined) {
    return defaultValue;
  }
  throw new Error(`Required environment variable ${key} is not set`);
}

/**
 * Get environment variable as boolean
 */
function getEnvBool(key: string, defaultValue: boolean = false): boolean {
  const value = Deno.env.get(key);
  if (value === undefined) {
    return defaultValue;
  }
  return value.toLowerCase() === 'true' || value === '1';
}

/**
 * Get environment variable as number
 */
function getEnvNumber(key: string, defaultValue: number): number {
  const value = Deno.env.get(key);
  if (value === undefined) {
    return defaultValue;
  }
  const parsed = parseInt(value, 10);
  if (isNaN(parsed)) {
    return defaultValue;
  }
  return parsed;
}

/**
 * Parse comma-separated list
 */
function getEnvList(key: string, defaultValue: string[] = []): string[] {
  const value = Deno.env.get(key);
  if (!value || value.trim().length === 0) {
    return defaultValue;
  }
  return value.split(',').map(item => item.trim()).filter(item => item.length > 0);
}

/**
 * Generate a random secret if none provided (for development)
 */
function generateRandomSecret(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 32; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Load and validate environment configuration
 */
export function loadEnvironmentConfig(): EnvironmentConfig {
  // Detect environment
  const environment = getEnv('DENO_ENV', 'development');
  const isProduction = environment === 'production' || !!Deno.env.get('DENO_DEPLOYMENT_ID');
  const isDevelopment = !isProduction;

  // Required for production, optional for development
  const getRequiredInProd = (key: string, devDefault?: string): string => {
    if (isProduction) {
      return getEnv(key);
    }
    return getEnv(key, devDefault || '');
  };

  return {
    // Discord Bot Configuration
    appId: getRequiredInProd('APP_ID', 'dev_app_id'),
    discordToken: getRequiredInProd('DISCORD_TOKEN', 'dev_token'),
    publicKey: getRequiredInProd('PUBLIC_KEY', 'dev_public_key'),

    // OAuth2 Configuration
    discordClientId: getRequiredInProd('DISCORD_CLIENT_ID', 'dev_client_id'),
    discordClientSecret: getRequiredInProd('DISCORD_CLIENT_SECRET', 'dev_client_secret'),
    discordRedirectUri: getEnv(
      'DISCORD_REDIRECT_URI', 
      isDevelopment ? 'http://localhost:8000/auth/callback' : ''
    ),

    // Webhook Configuration (optional)
    webhookUrl: getEnv('WEBHOOK_URL', undefined),
    webhookSecret: getEnv('WEBHOOK_SECRET', generateRandomSecret()),

    // Web Interface Configuration
    sessionSecret: getEnv('SESSION_SECRET', generateRandomSecret()),

    // Admin Configuration
    adminUserIds: getEnvList('ADMIN_USER_IDS', []),

    // Logging Configuration
    logLevel: getEnv('LOG_LEVEL', isDevelopment ? 'debug' : 'info'),
    logPrettyPrint: getEnvBool('LOG_PRETTY_PRINT', isDevelopment),

    // Session Configuration
    sessionTimeoutHours: getEnvNumber('SESSION_TIMEOUT_HOURS', 24),
    sessionRefreshThresholdHours: getEnvNumber('SESSION_REFRESH_THRESHOLD_HOURS', 2),

    // Environment flags
    isProduction,
    isDevelopment,
  };
}

/**
 * Validate critical configuration
 */
export function validateConfig(config: EnvironmentConfig): void {
  const errors: string[] = [];

  if (config.isProduction) {
    // Production validation
    if (!config.discordToken || config.discordToken === 'dev_token') {
      errors.push('DISCORD_TOKEN must be set in production');
    }
    if (!config.discordClientSecret || config.discordClientSecret === 'dev_client_secret') {
      errors.push('DISCORD_CLIENT_SECRET must be set in production');
    }
    if (!config.discordRedirectUri) {
      errors.push('DISCORD_REDIRECT_URI must be set in production');
    }
    if (config.adminUserIds.length === 0) {
      errors.push('ADMIN_USER_IDS must be set in production');
    }
  }

  // General validation
  if (config.sessionTimeoutHours < 1 || config.sessionTimeoutHours > 168) {
    errors.push('SESSION_TIMEOUT_HOURS must be between 1 and 168 (1 week)');
  }

  if (config.sessionRefreshThresholdHours < 0.5 || config.sessionRefreshThresholdHours >= config.sessionTimeoutHours) {
    errors.push('SESSION_REFRESH_THRESHOLD_HOURS must be between 0.5 and SESSION_TIMEOUT_HOURS');
  }

  if (errors.length > 0) {
    throw new Error(`Configuration validation failed:\n${errors.join('\n')}`);
  }
}

// Global configuration instance
let _config: EnvironmentConfig | null = null;

/**
 * Get the global configuration instance
 */
export function getConfig(): EnvironmentConfig {
  if (!_config) {
    _config = loadEnvironmentConfig();
    validateConfig(_config);
  }
  return _config;
}

/**
 * Reset configuration (for testing)
 */
export function resetConfig(): void {
  _config = null;
}