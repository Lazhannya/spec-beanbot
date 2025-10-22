# Data Model: Reminder Management Web Interface

**Phase**: Design & Data Architecture  
**Date**: 2025-10-22  
**Feature**: [Reminder Management Web Interface](./spec.md)

## Deno KV Key Structure

### Reminder Keys
```typescript
// Primary reminder storage
["reminders", reminderId: string] -> Reminder

// Time-based index for scheduling
["schedule", timestamp: number, reminderId: string] -> null

// User-based index for admin queries
["user_reminders", userId: string, reminderId: string] -> null

// Status-based index for dashboard
["status", status: string, reminderId: string] -> null
```

## Core Entities

### Reminder
```typescript
interface Reminder {
  id: string;                    // UUID for unique identification
  content: string;               // Message content to send
  targetUserId: string;          // Discord user ID (primary recipient)
  scheduledTime: Date;           // When to deliver the reminder
  createdAt: Date;              // Reminder creation timestamp
  updatedAt: Date;              // Last modification timestamp
  status: ReminderStatus;        // Current delivery/response status
  
  // Escalation configuration
  escalation?: EscalationRule;   // Optional escalation settings
  
  // Response tracking
  responses: ResponseLog[];      // Array of user interactions
  
  // Test execution tracking
  testExecutions: TestExecution[]; // Array of manual test triggers
  
  // Metadata
  createdBy: string;            // Admin user ID who created reminder
  deliveryAttempts: number;     // Count of delivery attempts
  lastDeliveryAttempt?: Date;   // Timestamp of last delivery attempt
}
```

### ReminderStatus
```typescript
enum ReminderStatus {
  PENDING = "pending",           // Scheduled but not yet sent
  SENT = "sent",                // Delivered to primary user
  ACKNOWLEDGED = "acknowledged", // Primary user confirmed receipt
  DECLINED = "declined",        // Primary user declined
  ESCALATED = "escalated",      // Sent to secondary user
  ESCALATED_ACK = "escalated_acknowledged", // Secondary user confirmed
  FAILED = "failed",            // Delivery failed permanently
  CANCELLED = "cancelled"       // Manually cancelled by admin
}
```

### EscalationRule
```typescript
interface EscalationRule {
  enabled: boolean;             // Whether escalation is active
  secondaryUserId: string;      // Discord user ID for escalation
  timeoutMinutes: number;       // Minutes before auto-escalation
  escalatedAt?: Date;          // When escalation was triggered
  escalationType: EscalationType; // How escalation was triggered
}

enum EscalationType {
  TIMEOUT = "timeout",          // Auto-escalated due to timeout
  DECLINED = "declined",        // User explicitly declined
  MANUAL = "manual"            // Admin manually escalated
}
```

### ResponseLog
```typescript
interface ResponseLog {
  id: string;                   // Unique log entry ID
  reminderId: string;          // Reference to parent reminder
  userId: string;              // Discord user who responded
  action: ResponseAction;       // Type of response
  timestamp: Date;             // When response occurred
  metadata?: Record<string, unknown>; // Additional context
}

enum ResponseAction {
  ACKNOWLEDGED = "acknowledged", // User confirmed reminder
  DECLINED = "declined",        // User declined reminder
  ESCALATED = "escalated",      // Reminder was escalated
  DELIVERED = "delivered",      // Initial delivery occurred
  FAILED = "failed"            // Delivery attempt failed
}
```

### TestExecution
```typescript
interface TestExecution {
  id: string;                   // Unique test execution ID
  reminderId: string;          // Reference to parent reminder
  testType: TestType;          // Type of test performed
  triggeredBy: string;         // Admin user who triggered test
  triggeredAt: Date;           // When test was initiated
  completedAt?: Date;          // When test completed
  success: boolean;            // Whether test succeeded
  errorMessage?: string;       // Error details if test failed
  preservedSchedule: boolean;  // Whether original schedule was maintained
}

enum TestType {
  IMMEDIATE_DELIVERY = "immediate_delivery", // Test immediate sending
  ESCALATION_FLOW = "escalation_flow",      // Test escalation workflow
  RESPONSE_TRACKING = "response_tracking"    // Test response handling
}
```

### AdminUser
```typescript
interface AdminUser {
  discordId: string;           // Discord user ID
  username: string;            // Discord username
  roles: AdminRole[];          // Permission levels
  lastLogin: Date;             // Last authentication timestamp
  sessionId?: string;          // Current session identifier
}

enum AdminRole {
  ADMIN = "admin",             // Full reminder management access
  VIEWER = "viewer"            // Read-only access to reminders
}
```

## Validation Rules

### Reminder Validation
- `content`: Required, 1-2000 characters, no Discord formatting attacks
- `targetUserId`: Required, valid Discord snowflake format (17-19 digits)
- `scheduledTime`: Required, must be future timestamp, max 1 year ahead
- `escalation.secondaryUserId`: If provided, valid Discord snowflake, different from targetUserId
- `escalation.timeoutMinutes`: If provided, between 1-10080 (1 week max)

### Business Rules
- Cannot edit reminders after they are sent (status != PENDING)
- Cannot schedule reminders in the past
- Escalation secondary user must be different from primary user
- Test executions do not modify reminder status or schedule
- Maximum 1000 pending reminders per admin user

## State Transitions

### Reminder Status Flow
```
PENDING -> SENT (on successful delivery)
PENDING -> FAILED (on delivery failure)
PENDING -> CANCELLED (on admin cancellation)

SENT -> ACKNOWLEDGED (on user confirmation)
SENT -> DECLINED (on user decline)
SENT -> ESCALATED (on timeout or decline with escalation enabled)

ESCALATED -> ESCALATED_ACK (on secondary user confirmation)
ESCALATED -> FAILED (if secondary delivery fails)
```

## KV Operations

### Write Operations
```typescript
// Create reminder with atomic indexes
async function createReminder(reminder: Reminder): Promise<void> {
  const kv = await Deno.openKv();
  
  await kv.atomic()
    .set(["reminders", reminder.id], reminder)
    .set(["schedule", reminder.scheduledTime.getTime(), reminder.id], null)
    .set(["user_reminders", reminder.targetUserId, reminder.id], null)
    .set(["status", reminder.status, reminder.id], null)
    .commit();
}

// Update reminder status with index maintenance
async function updateReminderStatus(
  reminderId: string, 
  oldStatus: ReminderStatus, 
  newStatus: ReminderStatus
): Promise<void> {
  const kv = await Deno.openKv();
  const reminder = await kv.get(["reminders", reminderId]);
  
  if (reminder.value) {
    const updated = { ...reminder.value, status: newStatus, updatedAt: new Date() };
    
    await kv.atomic()
      .set(["reminders", reminderId], updated)
      .delete(["status", oldStatus, reminderId])
      .set(["status", newStatus, reminderId], null)
      .commit();
  }
}
```

### Query Patterns
```typescript
// Get reminders due for delivery
async function getDueReminders(before: Date): Promise<Reminder[]> {
  const kv = await Deno.openKv();
  const entries = kv.list({
    prefix: ["schedule"],
    end: ["schedule", before.getTime()]
  });
  
  const reminders = [];
  for await (const entry of entries) {
    const reminderId = entry.key[2];
    const reminder = await kv.get(["reminders", reminderId]);
    if (reminder.value) reminders.push(reminder.value);
  }
  
  return reminders;
}

// Get reminders by status for dashboard
async function getRemindersByStatus(status: ReminderStatus): Promise<Reminder[]> {
  const kv = await Deno.openKv();
  const entries = kv.list({ prefix: ["status", status] });
  
  const reminders = [];
  for await (const entry of entries) {
    const reminderId = entry.key[2];
    const reminder = await kv.get(["reminders", reminderId]);
    if (reminder.value) reminders.push(reminder.value);
  }
  
  return reminders;
}
```