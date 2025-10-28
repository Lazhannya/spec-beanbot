/**
 * Delivery system types and interfaces
 * Supports enhanced scheduling with timezone accuracy and autonomous operation
 */

export interface DeliveryQueueItem {
  id: string;                    // UUID for queue item
  reminderId: string;            // Associated reminder ID
  userId: string;                // Target Discord user ID
  scheduledUtc: Date;            // When to deliver (UTC)
  scheduledTimezone: string;     // Original timezone for display
  userDisplayTime: string;       // Original time as entered by user
  messageContent: string;        // Message to deliver
  attempt: number;               // Current delivery attempt (0-based)
  maxAttempts: number;           // Maximum retry attempts
  nextRetry?: Date;              // Next retry time (if applicable)
  lastError?: string;            // Last delivery error message
  createdAt: Date;              // When queue item was created
  updatedAt: Date;              // Last queue item update
}

export interface DeliveryAttempt {
  id: string;                    // UUID for attempt
  queueItemId: string;           // Associated queue item
  reminderId: string;            // Associated reminder
  attemptNumber: number;         // Attempt sequence number (1-based)
  attemptedAt: Date;             // When attempt was made
  status: DeliveryStatus;        // Outcome of this attempt
  error?: DeliveryError;         // Error details if failed
  responseTime?: number;         // Response time in milliseconds
  messageId?: string;            // Discord message ID if successful
}

export enum DeliveryStatus {
  PENDING = "pending",           // Queued for delivery
  IN_PROGRESS = "in_progress",   // Currently being delivered
  SUCCESS = "success",           // Successfully delivered
  FAILED = "failed",            // Delivery failed
  RETRYING = "retrying",        // Scheduled for retry
  ABANDONED = "abandoned"        // Max attempts exceeded
}

export interface DeliveryError {
  code: string;                  // Error classification code
  message: string;               // Human-readable error message
  type: DeliveryErrorType;       // Error category
  retryable: boolean;           // Whether retry is worthwhile
  details?: Record<string, unknown>; // Additional error context
}

export enum DeliveryErrorType {
  NETWORK = "network",           // Network connectivity issues
  DISCORD_API = "discord_api",   // Discord API errors
  RATE_LIMIT = "rate_limit",     // Rate limiting
  PERMISSION = "permission",     // Permission denied
  USER_NOT_FOUND = "user_not_found", // Discord user not found
  INVALID_REQUEST = "invalid_request", // Invalid request format
  INTERNAL = "internal",         // Internal system error
  TIMEOUT = "timeout"           // Request timeout
}

export interface QueueStats {
  pending: number;               // Items waiting for delivery
  scheduled: number;             // Items scheduled for future delivery
  failed: number;               // Items that failed permanently
  delivered: number;             // Successfully delivered items
  retrying: number;             // Items in retry queue
}

export interface RetryConfig {
  maxAttempts: number;          // Maximum retry attempts
  baseDelayMs: number;          // Base delay between retries
  maxDelayMs: number;           // Maximum retry delay
  exponentialBase: number;      // Exponential backoff multiplier
}

export interface SystemHealthStatus {
  overall: HealthStatus;         // Overall system health
  components: ComponentHealth[]; // Individual component status
  lastUpdated: Date;            // When status was last checked
  uptime: number;               // System uptime in milliseconds
}

export enum HealthStatus {
  HEALTHY = "healthy",           // All systems operational
  DEGRADED = "degraded",         // Some issues but functional
  UNHEALTHY = "unhealthy",       // Significant issues
  DOWN = "down"                 // System not operational
}

export interface ComponentHealth {
  name: string;                 // Component name (e.g., "delivery_queue")
  status: HealthStatus;         // Component health status
  message?: string;             // Status description
  lastCheck: Date;              // When component was last checked
  metrics?: Record<string, number>; // Component-specific metrics
}

export interface DeliveryMetrics {
  totalDeliveries: number;      // Total delivery attempts
  successfulDeliveries: number; // Successful deliveries
  failedDeliveries: number;     // Failed deliveries
  averageDeliveryTime: number;  // Average delivery time (ms)
  retryRate: number;            // Percentage requiring retries
  errorRate: number;            // Percentage of failures
  timezoneAccuracy: number;     // Timezone conversion accuracy (%)
}

// Configuration interfaces
export interface DeliveryConfig {
  retry: RetryConfig;           // Retry configuration
  timeouts: {
    deliveryTimeout: number;    // Individual delivery timeout (ms)
    queueProcessing: number;    // Queue processing timeout (ms)
  };
  limits: {
    maxQueueSize: number;       // Maximum queue size
    maxConcurrent: number;      // Max concurrent deliveries
  };
  monitoring: {
    healthCheckInterval: number; // Health check frequency (ms)
    metricsCollection: boolean;  // Whether to collect metrics
  };
}

// Type guards for runtime validation
export function isDeliveryQueueItem(obj: unknown): obj is DeliveryQueueItem {
  return typeof obj === 'object' && obj !== null &&
    typeof (obj as Record<string, unknown>).id === 'string' &&
    typeof (obj as Record<string, unknown>).reminderId === 'string' &&
    typeof (obj as Record<string, unknown>).userId === 'string' &&
    (obj as Record<string, unknown>).scheduledUtc instanceof Date &&
    typeof (obj as Record<string, unknown>).scheduledTimezone === 'string' &&
    typeof (obj as Record<string, unknown>).userDisplayTime === 'string' &&
    typeof (obj as Record<string, unknown>).messageContent === 'string' &&
    typeof (obj as Record<string, unknown>).attempt === 'number' &&
    typeof (obj as Record<string, unknown>).maxAttempts === 'number';
}

export function isDeliveryAttempt(obj: unknown): obj is DeliveryAttempt {
  return typeof obj === 'object' && obj !== null &&
    typeof (obj as Record<string, unknown>).id === 'string' &&
    typeof (obj as Record<string, unknown>).queueItemId === 'string' &&
    typeof (obj as Record<string, unknown>).reminderId === 'string' &&
    typeof (obj as Record<string, unknown>).attemptNumber === 'number' &&
    (obj as Record<string, unknown>).attemptedAt instanceof Date &&
    Object.values(DeliveryStatus).includes((obj as Record<string, unknown>).status as DeliveryStatus);
}

export function isSystemHealthStatus(obj: unknown): obj is SystemHealthStatus {
  return typeof obj === 'object' && obj !== null &&
    Object.values(HealthStatus).includes((obj as Record<string, unknown>).overall as HealthStatus) &&
    Array.isArray((obj as Record<string, unknown>).components) &&
    (obj as Record<string, unknown>).lastUpdated instanceof Date &&
    typeof (obj as Record<string, unknown>).uptime === 'number';
}