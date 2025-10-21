// Reminder data types and interfaces
// This module defines all TypeScript interfaces for reminder management

import type { ReminderTemplate } from "../../data/reminder-templates.ts";

/**
 * Core reminder record stored in Deno KV
 */
export interface Reminder {
  // Unique identifier
  id: string;
  
  // User and ownership
  createdBy: string; // Discord user ID who created the reminder
  targetUser: string; // Discord user ID who will receive the reminder
  
  // Basic information
  title: string;
  message: string;
  category: ReminderCategory;
  
  // Template association
  templateId?: string; // Optional reference to reminder template
  customFields?: Record<string, unknown>; // Additional template-specific data
  
  // Scheduling configuration
  schedule: ReminderSchedule;
  timezone: string; // IANA timezone identifier
  
  // Status and lifecycle
  status: ReminderStatus;
  isActive: boolean;
  
  // Escalation settings
  escalation: EscalationConfig;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  lastDeliveredAt?: Date;
  nextDeliveryAt?: Date;
  completedAt?: Date;
  
  // Metadata
  tags?: string[];
  notes?: string;
  priority: ReminderPriority;
}

/**
 * Reminder categories for organization
 */
export type ReminderCategory = 
  | "health"
  | "medication" 
  | "work"
  | "personal"
  | "appointment"
  | "task"
  | "custom";

/**
 * Reminder priority levels
 */
export type ReminderPriority = "low" | "normal" | "high" | "urgent";

/**
 * Reminder status lifecycle
 */
export type ReminderStatus = 
  | "draft"        // Created but not activated
  | "active"       // Scheduled and running
  | "paused"       // Temporarily disabled
  | "completed"    // Manually marked as done
  | "expired"      // Past end date or max occurrences
  | "failed"       // Delivery failures exceeded threshold
  | "cancelled";   // Manually cancelled

/**
 * Schedule configuration for reminders
 */
export interface ReminderSchedule {
  type: ScheduleType;
  
  // Time configuration
  time: string; // HH:MM format (24-hour)
  
  // Frequency-specific settings
  daysOfWeek?: number[]; // 0-6, Sunday=0 (for weekly)
  dayOfMonth?: number; // 1-31 (for monthly)
  interval?: number; // Every N days/weeks/months
  
  // Date boundaries
  startDate?: Date;
  endDate?: Date;
  maxOccurrences?: number;
  
  // Advanced scheduling
  cronExpression?: string; // For custom schedules
  excludeDates?: Date[]; // Skip these specific dates
  
  // Execution tracking
  occurrenceCount: number; // How many times it has been delivered
  lastOccurrence?: Date;
  nextOccurrence?: Date;
}

/**
 * Schedule type enumeration
 */
export type ScheduleType = 
  | "once"      // Single execution
  | "daily"     // Every day
  | "weekly"    // Specific days of week
  | "monthly"   // Monthly on specific day
  | "yearly"    // Annual reminder
  | "interval"  // Every N days/weeks/months
  | "custom";   // Cron expression

/**
 * Escalation target specification
 */
export interface EscalationTarget {
  type: "manager" | "team_lead" | "executive" | "user";
  userId?: string; // Direct user ID (if type is "user")
  fallbackUserId?: string; // Fallback if primary target unavailable
  requiresApproval?: boolean; // Whether escalation to this target needs manual approval
}

/**
 * Escalation configuration for reminder management
 */
export interface EscalationConfig {
  enabled: boolean;
  
  // Timing
  delayMinutes: number; // How long to wait before escalating
  maxEscalations: number; // Maximum escalation attempts
  
  // Targets
  escalationTargets: string[]; // Discord user IDs to notify
  escalationMessage?: string; // Custom escalation message
  
  // Behavior
  stopOnAcknowledgment: boolean; // Stop escalating if original user responds
  escalationInterval?: number; // Time between escalation attempts
  
  // Tracking
  escalationCount: number; // Current escalation level
  lastEscalationAt?: Date;
}

/**
 * Reminder delivery record for tracking
 */
export interface ReminderDelivery {
  id: string;
  reminderId: string;
  
  // Delivery details
  targetUser: string;
  deliveredAt: Date;
  deliveryMethod: DeliveryMethod;
  
  // Message information
  messageId?: string; // Discord message ID
  channelId?: string; // Discord channel ID
  messageContent: string;
  
  // Status tracking
  status: DeliveryStatus;
  acknowledged: boolean;
  acknowledgedAt?: Date;
  acknowledgmentMethod?: AcknowledgmentMethod;
  
  // Error handling
  attemptCount: number;
  lastAttemptAt: Date;
  errorMessage?: string;
  
  // Escalation
  isEscalation: boolean;
  escalationLevel?: number;
  originalDeliveryId?: string; // Reference to original delivery if this is escalation
}

/**
 * Delivery method enumeration
 */
export type DeliveryMethod = 
  | "dm"          // Direct message
  | "channel"     // Channel message
  | "mention"     // Channel mention
  | "webhook";    // External webhook

/**
 * Delivery status tracking
 */
export type DeliveryStatus = 
  | "pending"     // Scheduled but not sent
  | "sending"     // Currently being sent
  | "delivered"   // Successfully sent
  | "failed"      // Delivery failed
  | "retrying";   // Retrying after failure

/**
 * Acknowledgment method tracking
 */
export type AcknowledgmentMethod = 
  | "reaction"    // Discord reaction
  | "reply"       // Discord reply
  | "button"      // Button interaction
  | "web";        // Web interface

/**
 * Reminder statistics for analytics
 */
export interface ReminderStats {
  userId: string;
  
  // Counts
  totalReminders: number;
  activeReminders: number;
  completedReminders: number;
  
  // Delivery metrics
  totalDeliveries: number;
  successfulDeliveries: number;
  failedDeliveries: number;
  acknowledgmentRate: number; // Percentage
  
  // Response times
  averageAcknowledgmentTime: number; // Minutes
  fastestAcknowledgment: number; // Minutes
  slowestAcknowledgment: number; // Minutes
  
  // Categories
  categoryBreakdown: Record<ReminderCategory, number>;
  templateUsage: Record<string, number>; // Template ID -> usage count
  
  // Time periods
  lastUpdated: Date;
  periodStart: Date;
  periodEnd: Date;
}

/**
 * Validation schema for reminder creation
 */
export interface CreateReminderInput {
  title: string;
  message: string;
  targetUser: string;
  category: ReminderCategory;
  templateId?: string;
  customFields?: Record<string, unknown>;
  schedule: Omit<ReminderSchedule, "occurrenceCount" | "lastOccurrence" | "nextOccurrence">;
  timezone: string;
  escalation: Omit<EscalationConfig, "escalationCount" | "lastEscalationAt">;
  tags?: string[];
  notes?: string;
  priority?: ReminderPriority;
}

/**
 * Validation schema for reminder updates
 */
export interface UpdateReminderInput {
  title?: string;
  message?: string;
  category?: ReminderCategory;
  customFields?: Record<string, unknown>;
  schedule?: Partial<ReminderSchedule>;
  timezone?: string;
  escalation?: Partial<EscalationConfig>;
  tags?: string[];
  notes?: string;
  priority?: ReminderPriority;
  isActive?: boolean;
  status?: ReminderStatus;
}

/**
 * Search and filter criteria
 */
export interface ReminderSearchCriteria {
  userId?: string; // Filter by creator or target
  status?: ReminderStatus[];
  category?: ReminderCategory[];
  priority?: ReminderPriority[];
  tags?: string[];
  templateId?: string;
  
  // Date ranges
  createdAfter?: Date;
  createdBefore?: Date;
  nextDeliveryAfter?: Date;
  nextDeliveryBefore?: Date;
  
  // Text search
  searchText?: string; // Search in title, message, notes
  
  // Pagination
  limit?: number;
  offset?: number;
  sortBy?: "createdAt" | "nextDeliveryAt" | "priority" | "title";
  sortOrder?: "asc" | "desc";
}

/**
 * Bulk operation input
 */
export interface BulkReminderOperation {
  operation: "delete" | "pause" | "resume" | "complete" | "update";
  reminderIds: string[];
  updateData?: Partial<UpdateReminderInput>; // For bulk updates
}

/**
 * Reminder template application data
 */
export interface TemplateApplicationData {
  template: ReminderTemplate;
  customFields: Record<string, unknown>;
  overrides: Partial<CreateReminderInput>;
}

/**
 * Validation result for reminder operations
 */
export interface ReminderValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Timezone utility type
 */
export type SupportedTimezone = 
  | "America/New_York"
  | "America/Chicago" 
  | "America/Denver"
  | "America/Los_Angeles"
  | "America/Toronto"
  | "Europe/London"
  | "Europe/Paris"
  | "Europe/Berlin"
  | "Asia/Tokyo"
  | "Asia/Shanghai"
  | "Australia/Sydney"
  | "UTC";

/**
 * Export all types for easy importing
 */
export type {
  ReminderTemplate,
};

/**
 * Type guards for runtime validation
 */
export function isValidReminderCategory(category: string): category is ReminderCategory {
  return ["health", "medication", "work", "personal", "appointment", "task", "custom"].includes(category);
}

export function isValidReminderPriority(priority: string): priority is ReminderPriority {
  return ["low", "normal", "high", "urgent"].includes(priority);
}

export function isValidReminderStatus(status: string): status is ReminderStatus {
  return ["draft", "active", "paused", "completed", "expired", "failed", "cancelled"].includes(status);
}

export function isValidScheduleType(type: string): type is ScheduleType {
  return ["once", "daily", "weekly", "monthly", "yearly", "interval", "custom"].includes(type);
}

export function isValidDeliveryMethod(method: string): method is DeliveryMethod {
  return ["dm", "channel", "mention", "webhook"].includes(method);
}

export function isValidTimezone(timezone: string): timezone is SupportedTimezone {
  const supported: SupportedTimezone[] = [
    "America/New_York", "America/Chicago", "America/Denver", "America/Los_Angeles",
    "America/Toronto", "Europe/London", "Europe/Paris", "Europe/Berlin",
    "Asia/Tokyo", "Asia/Shanghai", "Australia/Sydney", "UTC"
  ];
  return supported.includes(timezone as SupportedTimezone);
}