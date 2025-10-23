// Core reminder entity interfaces from data model

export interface Reminder {
  id: string;                    // UUID for unique identification
  content: string;               // Message content to send
  targetUserId: string;          // Discord user ID (primary recipient)
  scheduledTime: Date;           // When to deliver the reminder
  timezone: string;              // IANA timezone (default: Europe/Berlin)
  createdAt: Date;              // Reminder creation timestamp
  updatedAt: Date;              // Last modification timestamp
  status: ReminderStatus;        // Current delivery/response status
  
  // Escalation configuration
  escalation?: EscalationRule;   // Optional escalation settings
  
  // Response tracking
  responses: ResponseLog[];      // Array of user interactions
  
  // Test execution tracking
  testExecutions: TestExecution[]; // Array of manual test triggers
  
  // Repeat configuration
  repeatRule?: RepeatRule;      // Optional recurring schedule settings
  
  // Metadata
  createdBy: string;            // Admin user ID who created reminder
  deliveryAttempts: number;     // Count of delivery attempts
  lastDeliveryAttempt?: Date;   // Timestamp of last delivery attempt
}

export interface RepeatRule {
  id: string;                   // UUID for repeat rule
  frequency: RepeatFrequency;   // How often to repeat
  interval: number;             // Interval value (e.g., every 2 weeks)
  endCondition: RepeatEndCondition; // When to stop repeating
  endDate?: Date;               // End date (if DATE_BASED end condition)
  maxOccurrences?: number;      // Max occurrences (if COUNT_BASED end condition)
  currentOccurrence: number;    // Current occurrence count
  nextScheduledTime: Date;      // Next scheduled occurrence
  createdAt: Date;              // Rule creation timestamp
  isActive: boolean;            // Whether rule is currently active
}

export enum RepeatFrequency {
  DAILY = "daily",              // Repeat daily
  WEEKLY = "weekly",            // Repeat weekly
  MONTHLY = "monthly",          // Repeat monthly
  YEARLY = "yearly"             // Repeat yearly
}

export enum RepeatEndCondition {
  NEVER = "never",              // Never end (indefinite)
  DATE_BASED = "date_based",    // End on specific date
  COUNT_BASED = "count_based"   // End after X occurrences
}

export enum ReminderStatus {
  PENDING = "pending",           // Scheduled but not yet sent
  SENT = "sent",                // Delivered to primary user
  ACKNOWLEDGED = "acknowledged", // Primary user confirmed receipt
  DECLINED = "declined",        // Primary user declined
  ESCALATED = "escalated",      // Sent to secondary user
  ESCALATED_ACK = "escalated_acknowledged", // Secondary user confirmed
  ESCALATED_DECLINED = "escalated_declined", // Secondary user declined
  FAILED = "failed",            // Delivery failed after all attempts
  CANCELLED = "cancelled",      // Manually cancelled by admin
  EXPIRED = "expired"           // Passed scheduled time without delivery
}

export interface EscalationRule {
  id: string;                   // UUID for escalation rule
  secondaryUserId: string;      // Discord user ID for escalation
  timeoutMinutes: number;       // Minutes to wait before escalating
  triggerConditions: EscalationTrigger[]; // When to escalate
  timeoutMessage?: string;      // Custom message for timeout escalation
  declineMessage?: string;      // Custom message for decline escalation
  triggeredAt?: Date;           // When escalation was triggered
  triggerReason?: "timeout" | "decline"; // Why escalation was triggered
  createdAt: Date;              // When rule was created
  isActive: boolean;            // Whether rule is currently enabled
}

export enum EscalationTrigger {
  TIMEOUT = "timeout",          // Escalate after timeout period
  DECLINED = "declined",        // Escalate when user declines
  NO_RESPONSE = "no_response"   // Escalate when no response received
}

export interface ResponseLog {
  id: string;                   // UUID for response entry
  reminderId: string;           // Associated reminder ID
  userId: string;               // Discord user who responded
  responseType: ResponseType;   // Type of response
  timestamp: Date;              // When response occurred
  messageId?: string;           // Discord message ID if applicable
  metadata?: Record<string, unknown>; // Additional response context
}

export enum ResponseType {
  ACKNOWLEDGED = "acknowledged", // User confirmed receipt
  DECLINED = "declined",        // User declined reminder
  DELIVERED = "delivered",      // System recorded delivery
  FAILED_DELIVERY = "failed_delivery", // Delivery attempt failed
  ESCALATED = "escalated",      // Escalated to secondary user
  CANCELLED = "cancelled"       // Reminder was cancelled
}

export interface TestExecution {
  id: string;                   // UUID for test execution
  reminderId: string;           // Associated reminder ID
  executedBy: string;           // Admin user who triggered test
  executedAt: Date;             // Test execution timestamp
  testType: TestType;           // Type of test performed
  result: TestResult;           // Test execution result
  errorMessage?: string;        // Error details if test failed
  preservedSchedule: boolean;   // Whether original schedule was preserved
}

export enum TestType {
  IMMEDIATE_DELIVERY = "immediate_delivery", // Test immediate send
  ESCALATION_FLOW = "escalation_flow",      // Test escalation process
  VALIDATION = "validation"                  // Test reminder validation
}

export enum TestResult {
  SUCCESS = "success",          // Test completed successfully
  FAILED = "failed",           // Test failed with error
  PARTIAL = "partial"          // Test partially completed
}