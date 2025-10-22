// KV schema operations for reminder keys and indexing

import type { Reminder, ReminderStatus } from "../../types/reminder.ts";

// KV Key Patterns from data model
export const KVKeys = {
  // Primary reminder storage: ["reminders", reminderId: string] -> Reminder
  reminder: (id: string): Deno.KvKey => ["reminders", id],
  
  // Time-based index: ["schedule", timestamp: number, reminderId: string] -> null
  schedule: (timestamp: number, id: string): Deno.KvKey => 
    ["schedule", timestamp, id],
  
  // User-based index: ["user_reminders", userId: string, reminderId: string] -> null
  userReminder: (userId: string, id: string): Deno.KvKey => 
    ["user_reminders", userId, id],
  
  // Status-based index: ["status", status: string, reminderId: string] -> null
  statusReminder: (status: ReminderStatus, id: string): Deno.KvKey => 
    ["status", status, id],

  // Session storage: ["sessions", sessionId: string] -> SessionData
  session: (sessionId: string): Deno.KvKey => ["sessions", sessionId],

  // User auth: ["auth", "users", userId: string] -> UserData
  authUser: (userId: string): Deno.KvKey => ["auth", "users", userId],
} as const;

// Query selectors for listing operations
export const KVSelectors = {
  // All reminders
  allReminders: (): Deno.KvListSelector => ({ prefix: ["reminders"] }),
  
  // Reminders by user
  remindersByUser: (userId: string): Deno.KvListSelector => 
    ({ prefix: ["user_reminders", userId] }),
  
  // Reminders by status
  remindersByStatus: (status: ReminderStatus): Deno.KvListSelector => 
    ({ prefix: ["status", status] }),
  
  // Scheduled reminders in time range
  scheduledReminders: (fromTime: number, toTime: number): Deno.KvListSelector => ({
    start: ["schedule", fromTime],
    end: ["schedule", toTime + 1], // +1 for exclusive end
  }),

  // All sessions
  allSessions: (): Deno.KvListSelector => ({ prefix: ["sessions"] }),
} as const;

// Index operations for maintaining consistency
export class KVSchemaOperations {
  
  // Create all required indexes for a reminder
  static createReminderIndexes(reminder: Reminder): Deno.KvKey[] {
    const indexes: Deno.KvKey[] = [];
    
    // Schedule index
    const scheduleTime = reminder.scheduledTime.getTime();
    indexes.push(KVKeys.schedule(scheduleTime, reminder.id));
    
    // User index
    indexes.push(KVKeys.userReminder(reminder.targetUserId, reminder.id));
    
    // Status index
    indexes.push(KVKeys.statusReminder(reminder.status, reminder.id));
    
    return indexes;
  }
  
  // Remove all indexes for a reminder
  static removeReminderIndexes(reminder: Reminder): Deno.KvKey[] {
    return this.createReminderIndexes(reminder);
  }
  
  // Update indexes when reminder status changes
  static updateStatusIndex(
    reminderId: string, 
    oldStatus: ReminderStatus, 
    newStatus: ReminderStatus
  ): { remove: Deno.KvKey[]; add: Deno.KvKey[] } {
    return {
      remove: [KVKeys.statusReminder(oldStatus, reminderId)],
      add: [KVKeys.statusReminder(newStatus, reminderId)],
    };
  }
  
  // Update indexes when reminder schedule changes
  static updateScheduleIndex(
    reminderId: string,
    oldTime: Date,
    newTime: Date
  ): { remove: Deno.KvKey[]; add: Deno.KvKey[] } {
    return {
      remove: [KVKeys.schedule(oldTime.getTime(), reminderId)],
      add: [KVKeys.schedule(newTime.getTime(), reminderId)],
    };
  }
}

// Atomic transaction helpers
export class AtomicOperations {
  
  // Set reminder with all indexes atomically
  static setReminder(atomic: Deno.AtomicOperation, reminder: Reminder): Deno.AtomicOperation {
    // Set primary reminder
    atomic.set(KVKeys.reminder(reminder.id), reminder);
    
    // Set all indexes
    const indexes = KVSchemaOperations.createReminderIndexes(reminder);
    for (const indexKey of indexes) {
      atomic.set(indexKey, null); // Index values are null (just for existence)
    }
    
    return atomic;
  }
  
  // Delete reminder with all indexes atomically
  static deleteReminder(atomic: Deno.AtomicOperation, reminder: Reminder): Deno.AtomicOperation {
    // Delete primary reminder
    atomic.delete(KVKeys.reminder(reminder.id));
    
    // Delete all indexes
    const indexes = KVSchemaOperations.removeReminderIndexes(reminder);
    for (const indexKey of indexes) {
      atomic.delete(indexKey);
    }
    
    return atomic;
  }
  
  // Update reminder status atomically
  static updateReminderStatus(
    atomic: Deno.AtomicOperation,
    reminder: Reminder,
    newStatus: ReminderStatus
  ): Deno.AtomicOperation {
    const oldStatus = reminder.status;
    const updatedReminder = { ...reminder, status: newStatus, updatedAt: new Date() };
    
    // Update primary reminder
    atomic.set(KVKeys.reminder(reminder.id), updatedReminder);
    
    // Update status index
    const indexChanges = KVSchemaOperations.updateStatusIndex(reminder.id, oldStatus, newStatus);
    
    // Remove old status index
    for (const key of indexChanges.remove) {
      atomic.delete(key);
    }
    
    // Add new status index
    for (const key of indexChanges.add) {
      atomic.set(key, null);
    }
    
    return atomic;
  }
}