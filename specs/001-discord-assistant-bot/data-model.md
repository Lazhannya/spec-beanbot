# Data Model: Personal Assistant Discord Bot

**Created**: 2025-10-21  
**Feature**: Personal Assistant Discord Bot  
**Architecture**: Embedded TypeScript modules with Deno KV for runtime state

## Data Architecture Overview

This project uses a hybrid data approach optimized for Deno Deploy:

- **Embedded Modules**: Static configuration and templates stored as TypeScript modules
- **Deno KV**: Runtime state, sessions, and temporary data requiring persistence
- **In-Memory**: Active reminders and cached data for performance

## Storage Strategy

### Embedded Data (TypeScript Modules)
- Text pattern definitions and responses
- Reminder templates and configurations  
- User permission configurations
- Bot configuration and settings

### Deno KV Storage
- Active reminder schedules and state
- User authentication sessions
- Webhook call logs and retry state
- Bot interaction logs

### In-Memory Storage
- Discord client state
- Active pattern matchers
- Cached user data during sessions

## Core Data Types

### User (Session Data - Deno KV)
Represents Discord users with active sessions.

**Storage Location**: `kv.set(["users", discord_id], userData)`

**Attributes:**
- `discord_id` (string): Discord user ID (key)
- `username` (string): Discord username for display
- `display_name` (string): Discord display name
- `avatar_url` (string): Discord avatar URL
- `session_id` (string): Active session identifier
- `created_at` (timestamp): First authentication time
- `last_active` (timestamp): Last web interface activity
- `timezone` (string): User's timezone for reminder scheduling
- `permissions` (array): Bot permissions (create_reminders, admin, etc.)

### Reminder (Runtime State - Deno KV)
Active reminder schedules and state.

**Storage Location**: `kv.set(["reminders", reminder_id], reminderData)`

**Attributes:**
- `id` (string): Unique reminder identifier (key)
- `creator_id` (string): Discord ID of reminder creator
- `target_user_id` (string): Discord ID of reminder recipient
- `secondary_user_id` (string, optional): Discord ID for escalation
- `template_id` (string): Reference to embedded reminder template
- `custom_message` (string, optional): Override for template message
- `scheduled_time` (timestamp): When reminder should trigger
- `timeout_minutes` (integer): Minutes before escalating
- `status` (enum): pending, triggered, acknowledged, escalated, completed, cancelled
- `created_at` (timestamp): When reminder was created
- `triggered_at` (timestamp, optional): When reminder was sent
- `escalated_at` (timestamp, optional): When escalation occurred
- `metadata` (object): Additional reminder-specific data

**State Transitions:**
```
pending → triggered → acknowledged → completed
         ↓
         escalated → completed
         ↓
         cancelled (from any state)
```

### ReminderTemplate (Embedded Data - TypeScript Module)
Predefined reminder templates for common use cases.

**Storage Location**: `data/reminder-templates.ts`

```typescript
export interface ReminderTemplate {
  id: string;
  name: string;
  category: 'medication' | 'pet_care' | 'general' | 'custom';
  default_message: string;
  default_timeout_minutes: number;
  description: string;
  suggested_schedule?: string; // Cron-like pattern
}

export const reminderTemplates: ReminderTemplate[] = [
  {
    id: "medication_reminder",
    name: "Medication Reminder",
    category: "medication",
    default_message: "⏰ Time to take your medication!",
    default_timeout_minutes: 15,
    description: "Standard medication reminder with 15-minute escalation",
    suggested_schedule: "0 8,20 * * *" // 8 AM and 8 PM daily
  },
  {
    id: "dog_walk",
    name: "Dog Walk",
    category: "pet_care", 
    default_message: "🐕 Time to walk the dog!",
    default_timeout_minutes: 30,
    description: "Dog walking reminder with 30-minute escalation"
  }
  // Additional templates...
];
```

### TextPattern (Embedded Data - TypeScript Module)
Configurable text matching patterns with responses.

**Storage Location**: `data/text-patterns.ts`

```typescript
export interface TextPattern {
  id: string;
  name: string;
  pattern: string;
  response_message: string;
  match_type: 'exact' | 'contains' | 'regex' | 'starts_with' | 'ends_with';
  is_active: boolean;
  priority: number; // Higher = checked first
  category: 'greeting' | 'help' | 'status' | 'custom';
  usage_count: number; // Updated in Deno KV
  created_at: string; // ISO date string
}

export const textPatterns: TextPattern[] = [
  {
    id: "greeting_pattern",
    name: "Greeting Response",
    pattern: "hello|hi|hey",
    response_message: "Hello! How can I help you today? 👋",
    match_type: "regex",
    is_active: true,
    priority: 10,
    category: "greeting",
    usage_count: 0,
    created_at: "2025-10-21T00:00:00Z"
  },
  {
    id: "help_pattern",
    name: "Help Request",
    pattern: "help|commands|what can you do",
    response_message: "I can help with reminders and respond to various commands. Visit the web interface to manage your reminders!",
    match_type: "regex", 
    is_active: true,
    priority: 20,
    category: "help",
    usage_count: 0,
    created_at: "2025-10-21T00:00:00Z"
  }
  // Additional patterns...
];
```

### WebhookCall (Runtime Logs - Deno KV)
Record of webhook attempts for audit and retry logic.

**Storage Location**: `kv.set(["webhook_calls", call_id], callData)`

**Attributes:**
- `id` (string): Unique call identifier (key)
- `reminder_id` (string, optional): Associated reminder if applicable
- `webhook_url` (string): Target n8n endpoint
- `payload` (object): Data sent in webhook request
- `response_status` (number, optional): HTTP response status
- `response_body` (string, optional): Response content
- `success` (boolean): Whether call was successful
- `attempt_number` (number): Retry attempt (1 for first attempt)
- `created_at` (timestamp): When call was initiated
- `completed_at` (timestamp, optional): When call completed
- `error_message` (string, optional): Error details if failed

### BotInteraction (Runtime Logs - Deno KV)
Comprehensive logging of bot activities.

**Storage Location**: `kv.set(["interactions", interaction_id], interactionData)`

**Attributes:**
- `id` (string): Unique interaction identifier (key)
- `user_id` (string): Discord ID of interacting user
- `interaction_type` (enum): mention, reminder_triggered, pattern_matched, command_used, error_occurred
- `channel_id` (string): Discord channel where interaction occurred
- `server_id` (string, optional): Discord server ID (null for DMs)
- `message_content` (string, optional): Original message content
- `bot_response` (string, optional): Bot's response message
- `metadata` (object): Additional interaction-specific data
- `success` (boolean): Whether interaction completed successfully
- `error_details` (string, optional): Error information if applicable
- `created_at` (timestamp): When interaction occurred
- `processing_time_ms` (number): Time taken to process

## Data Access Patterns

### Embedded Data Access
```typescript
// Reading pattern definitions
import { textPatterns, TextPattern } from '../data/text-patterns.ts';
import { reminderTemplates, ReminderTemplate } from '../data/reminder-templates.ts';

// Accessing patterns at runtime
const activePatterns = textPatterns.filter(p => p.is_active);
const sortedPatterns = activePatterns.sort((a, b) => b.priority - a.priority);
```

### Deno KV Operations
```typescript
// User session management
const kv = await Deno.openKv();

// Store user session
await kv.set(["users", discordId], userData);

// Retrieve user session
const userResult = await kv.get(["users", discordId]);
const user = userResult.value as User;

// Store active reminder
await kv.set(["reminders", reminderId], reminderData);

// List active reminders for user
const reminderList = kv.list({ prefix: ["reminders"] });
for await (const entry of reminderList) {
  const reminder = entry.value as Reminder;
  if (reminder.creator_id === userId && reminder.status === 'pending') {
    // Process reminder
  }
}
```

### Data Modification Patterns
```typescript
// Update embedded data (requires code deployment)
// Edit data/text-patterns.ts directly and redeploy

// Update runtime state
async function updateReminderStatus(id: string, status: ReminderStatus) {
  const kv = await Deno.openKv();
  const result = await kv.get(["reminders", id]);
  if (result.value) {
    const reminder = result.value as Reminder;
    reminder.status = status;
    reminder.updated_at = new Date().toISOString();
    await kv.set(["reminders", id], reminder);
  }
}
```

## Data Lifecycle Management

### Session Management
- User sessions stored in Deno KV with TTL
- Automatic cleanup of expired sessions
- OAuth2 refresh token handling

### Reminder Lifecycle
1. **Creation**: Store in Deno KV with pending status
2. **Scheduling**: Background process monitors scheduled times
3. **Delivery**: Update status and log interaction
4. **Escalation**: Monitor for acknowledgments and escalate if needed
5. **Completion**: Mark completed and archive logs

### Pattern Usage Tracking
- Usage counts updated in Deno KV (not embedded data)
- Periodic analytics and optimization based on usage
- Pattern effectiveness monitoring

### Log Retention
- Webhook calls: Retain for 30 days for debugging
- Bot interactions: Retain for 90 days for monitoring  
- Old logs automatically purged by background process

## Performance Considerations

### Embedded Data Performance
- Pattern matching optimized with compiled regex
- Templates cached at application startup
- No database queries for static configuration

### Deno KV Optimization
- Efficient key naming for range queries
- Batch operations for bulk updates
- Proper indexing strategy for common queries

### Memory Management
- In-memory caching of frequently accessed data
- Lazy loading of large data sets
- Garbage collection considerations for long-running processes

## Data Migration Strategy

### Embedded Data Changes
1. Update TypeScript interfaces
2. Add migration logic for data format changes
3. Deploy new version with backward compatibility
4. Clean up old format after verification

### Runtime Data Migration
```typescript
async function migrateKvData(oldVersion: string, newVersion: string) {
  const kv = await Deno.openKv();
  
  // Migration logic based on version
  if (oldVersion === "1.0.0" && newVersion === "1.1.0") {
    // Migrate reminder format
    const reminders = kv.list({ prefix: ["reminders"] });
    for await (const entry of reminders) {
      const oldReminder = entry.value as OldReminder;
      const newReminder = convertReminderFormat(oldReminder);
      await kv.set(entry.key, newReminder);
    }
  }
}
```

## Security and Validation

### Data Validation
```typescript
import { z } from "https://deno.land/x/zod/mod.ts";

const ReminderSchema = z.object({
  id: z.string().uuid(),
  creator_id: z.string().regex(/^\d+$/), // Discord ID format
  target_user_id: z.string().regex(/^\d+$/),
  scheduled_time: z.string().datetime(),
  timeout_minutes: z.number().min(1).max(1440),
  // ... other fields
});

// Validate before storing
const validatedReminder = ReminderSchema.parse(reminderData);
```

### Access Control
- User permissions checked before data access
- Discord OAuth2 for authentication
- Rate limiting on data modification endpoints

### Data Sanitization
- HTML/script injection prevention in messages
- Discord mention sanitization
- Input length limits enforcement