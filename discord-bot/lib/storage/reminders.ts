// Reminder storage operations using Deno KV
// This module provides CRUD operations for reminder management

import type {
  Reminder,
  CreateReminderInput,
  UpdateReminderInput,
  ReminderSearchCriteria,
  ReminderDelivery,
  ReminderStats,
  BulkReminderOperation,
} from "../types/reminders.ts";

import {
  createReminderFromInput,
  generateReminderId,
  getCurrentTimestamp,
  calculateReminderStats,
} from "../utils/reminders.ts";

import { validateCreateReminderInput, validateUpdateReminderInput } from "../validation/reminders.ts";

/**
 * Deno KV storage keys
 */
const KV_KEYS = {
  // Primary reminder storage
  reminder: (id: string) => ["reminders", id],
  
  // Indexes for efficient querying
  remindersByUser: (userId: string, id: string) => ["reminders_by_user", userId, id],
  remindersByTarget: (targetUserId: string, id: string) => ["reminders_by_target", targetUserId, id],
  remindersByStatus: (status: string, id: string) => ["reminders_by_status", status, id],
  remindersByCategory: (category: string, id: string) => ["reminders_by_category", category, id],
  remindersByTemplate: (templateId: string, id: string) => ["reminders_by_template", templateId, id],
  remindersByNextDelivery: (timestamp: number, id: string) => ["reminders_by_next_delivery", timestamp, id],
  
  // Delivery tracking
  delivery: (id: string) => ["deliveries", id],
  deliveriesByReminder: (reminderId: string, deliveryId: string) => ["deliveries_by_reminder", reminderId, deliveryId],
  deliveriesByUser: (userId: string, deliveryId: string) => ["deliveries_by_user", userId, deliveryId],
  
  // Statistics
  userStats: (userId: string) => ["user_stats", userId],
  
  // Sequences for auto-incrementing IDs
  reminderSequence: () => ["sequences", "reminders"],
  deliverySequence: () => ["sequences", "deliveries"],
} as const;

/**
 * Get Deno KV instance
 */
async function getKV(): Promise<Deno.Kv> {
  return await Deno.openKv();
}

/**
 * Create a new reminder
 */
export async function createReminder(
  input: CreateReminderInput,
  createdBy: string
): Promise<{ success: boolean; reminder?: Reminder; errors?: string[] }> {
  // Validate input
  const validation = validateCreateReminderInput(input);
  if (!validation.isValid) {
    return { success: false, errors: validation.errors };
  }

  try {
    const kv = await getKV();
    const reminder = createReminderFromInput(input, createdBy);

    // Start atomic transaction
    const atomic = kv.atomic();

    // Store main reminder record
    atomic.set(KV_KEYS.reminder(reminder.id), reminder);

    // Create indexes
    atomic.set(KV_KEYS.remindersByUser(createdBy, reminder.id), reminder.id);
    atomic.set(KV_KEYS.remindersByTarget(reminder.targetUser, reminder.id), reminder.id);
    atomic.set(KV_KEYS.remindersByStatus(reminder.status, reminder.id), reminder.id);
    atomic.set(KV_KEYS.remindersByCategory(reminder.category, reminder.id), reminder.id);
    
    if (reminder.templateId) {
      atomic.set(KV_KEYS.remindersByTemplate(reminder.templateId, reminder.id), reminder.id);
    }
    
    if (reminder.nextDeliveryAt) {
      atomic.set(
        KV_KEYS.remindersByNextDelivery(reminder.nextDeliveryAt.getTime(), reminder.id),
        reminder.id
      );
    }

    // Commit transaction
    const result = await atomic.commit();
    
    if (result.ok) {
      return { success: true, reminder };
    } else {
      return { success: false, errors: ["Failed to create reminder"] };
    }
  } catch (error) {
    console.error("Error creating reminder:", error);
    return { success: false, errors: ["Database error"] };
  }
}

/**
 * Get a reminder by ID
 */
export async function getReminderById(id: string): Promise<Reminder | null> {
  try {
    const kv = await getKV();
    const result = await kv.get<Reminder>(KV_KEYS.reminder(id));
    return result.value;
  } catch (error) {
    console.error("Error getting reminder:", error);
    return null;
  }
}

/**
 * Update an existing reminder
 */
export async function updateReminder(
  id: string,
  input: UpdateReminderInput,
  updatedBy: string
): Promise<{ success: boolean; reminder?: Reminder; errors?: string[] }> {
  // Validate input
  const validation = validateUpdateReminderInput(input);
  if (!validation.isValid) {
    return { success: false, errors: validation.errors };
  }

  try {
    const kv = await getKV();
    
    // Get existing reminder
    const existing = await getReminderById(id);
    if (!existing) {
      return { success: false, errors: ["Reminder not found"] };
    }

    // Check permissions (only creator or admin can update)
    if (existing.createdBy !== updatedBy) {
      return { success: false, errors: ["Permission denied"] };
    }

    // Create updated reminder with proper type handling
    const updated: Reminder = {
      ...existing,
      ...input,
      id: existing.id, // Preserve ID
      createdBy: existing.createdBy, // Preserve creator
      createdAt: existing.createdAt, // Preserve creation date
      updatedAt: getCurrentTimestamp(),
      // Ensure required fields maintain their types
      schedule: input.schedule ? { ...existing.schedule, ...input.schedule } : existing.schedule,
    };

    // Start atomic transaction
    const atomic = kv.atomic();

    // Update main record
    atomic.set(KV_KEYS.reminder(id), updated);

    // Update indexes if status changed
    if (input.status && input.status !== existing.status) {
      atomic.delete(KV_KEYS.remindersByStatus(existing.status, id));
      atomic.set(KV_KEYS.remindersByStatus(input.status, id), id);
    }

    // Update category index if changed
    if (input.category && input.category !== existing.category) {
      atomic.delete(KV_KEYS.remindersByCategory(existing.category, id));
      atomic.set(KV_KEYS.remindersByCategory(input.category, id), id);
    }

    // Update next delivery index if changed
    if (updated.nextDeliveryAt?.getTime() !== existing.nextDeliveryAt?.getTime()) {
      if (existing.nextDeliveryAt) {
        atomic.delete(KV_KEYS.remindersByNextDelivery(existing.nextDeliveryAt.getTime(), id));
      }
      if (updated.nextDeliveryAt) {
        atomic.set(KV_KEYS.remindersByNextDelivery(updated.nextDeliveryAt.getTime(), id), id);
      }
    }

    // Commit transaction
    const result = await atomic.commit();
    
    if (result.ok) {
      return { success: true, reminder: updated };
    } else {
      return { success: false, errors: ["Failed to update reminder"] };
    }
  } catch (error) {
    console.error("Error updating reminder:", error);
    return { success: false, errors: ["Database error"] };
  }
}

/**
 * Delete a reminder
 */
export async function deleteReminder(
  id: string,
  deletedBy: string
): Promise<{ success: boolean; errors?: string[] }> {
  try {
    const kv = await getKV();
    
    // Get existing reminder
    const existing = await getReminderById(id);
    if (!existing) {
      return { success: false, errors: ["Reminder not found"] };
    }

    // Check permissions
    if (existing.createdBy !== deletedBy) {
      return { success: false, errors: ["Permission denied"] };
    }

    // Start atomic transaction
    const atomic = kv.atomic();

    // Delete main record
    atomic.delete(KV_KEYS.reminder(id));

    // Delete all indexes
    atomic.delete(KV_KEYS.remindersByUser(existing.createdBy, id));
    atomic.delete(KV_KEYS.remindersByTarget(existing.targetUser, id));
    atomic.delete(KV_KEYS.remindersByStatus(existing.status, id));
    atomic.delete(KV_KEYS.remindersByCategory(existing.category, id));
    
    if (existing.templateId) {
      atomic.delete(KV_KEYS.remindersByTemplate(existing.templateId, id));
    }
    
    if (existing.nextDeliveryAt) {
      atomic.delete(KV_KEYS.remindersByNextDelivery(existing.nextDeliveryAt.getTime(), id));
    }

    // Delete related deliveries
    const deliveries = await getDeliveriesByReminder(id);
    for (const delivery of deliveries) {
      atomic.delete(KV_KEYS.delivery(delivery.id));
      atomic.delete(KV_KEYS.deliveriesByReminder(id, delivery.id));
      atomic.delete(KV_KEYS.deliveriesByUser(delivery.targetUser, delivery.id));
    }

    // Commit transaction
    const result = await atomic.commit();
    
    if (result.ok) {
      return { success: true };
    } else {
      return { success: false, errors: ["Failed to delete reminder"] };
    }
  } catch (error) {
    console.error("Error deleting reminder:", error);
    return { success: false, errors: ["Database error"] };
  }
}

/**
 * Search reminders with criteria
 */
export async function searchReminders(
  criteria: ReminderSearchCriteria
): Promise<{ reminders: Reminder[]; total: number }> {
  try {
    const kv = await getKV();
    let reminderIds: string[] = [];

    // Use most specific index available
    if (criteria.userId) {
      const userReminders = kv.list<string>({ 
        prefix: ["reminders_by_user", criteria.userId] 
      });
      for await (const entry of userReminders) {
        reminderIds.push(entry.value);
      }
    } else if (criteria.status && criteria.status.length === 1) {
      const statusReminders = kv.list<string>({ 
        prefix: ["reminders_by_status", criteria.status[0]] 
      });
      for await (const entry of statusReminders) {
        reminderIds.push(entry.value);
      }
    } else if (criteria.category && criteria.category.length === 1) {
      const categoryReminders = kv.list<string>({ 
        prefix: ["reminders_by_category", criteria.category[0]] 
      });
      for await (const entry of categoryReminders) {
        reminderIds.push(entry.value);
      }
    } else {
      // Fall back to scanning all reminders
      const allReminders = kv.list<Reminder>({ prefix: ["reminders"] });
      for await (const entry of allReminders) {
        reminderIds.push(entry.value.id);
      }
    }

    // Get reminder objects and apply filters
    const reminders: Reminder[] = [];
    for (const id of reminderIds) {
      const reminder = await getReminderById(id);
      if (reminder && matchesCriteria(reminder, criteria)) {
        reminders.push(reminder);
      }
    }

    // Apply sorting
    if (criteria.sortBy) {
      reminders.sort((a, b) => {
        const aVal = getValueForSort(a, criteria.sortBy!);
        const bVal = getValueForSort(b, criteria.sortBy!);
        
        if (criteria.sortOrder === "desc") {
          return bVal > aVal ? 1 : -1;
        } else {
          return aVal > bVal ? 1 : -1;
        }
      });
    }

    // Apply pagination
    const total = reminders.length;
    const start = criteria.offset || 0;
    const end = start + (criteria.limit || total);
    const paginatedReminders = reminders.slice(start, end);

    return { reminders: paginatedReminders, total };
  } catch (error) {
    console.error("Error searching reminders:", error);
    return { reminders: [], total: 0 };
  }
}

/**
 * Get reminders for a specific user
 */
export async function getRemindersByUser(userId: string): Promise<Reminder[]> {
  return (await searchReminders({ userId })).reminders;
}

/**
 * Get active reminders that need delivery
 */
export async function getRemindersForDelivery(beforeTime?: Date): Promise<Reminder[]> {
  const cutoff = beforeTime || new Date();
  const criteria: ReminderSearchCriteria = {
    status: ["active"],
    nextDeliveryBefore: cutoff,
  };
  
  return (await searchReminders(criteria)).reminders;
}

/**
 * Create a delivery record
 */
export async function createDelivery(delivery: Omit<ReminderDelivery, "id">): Promise<string | null> {
  try {
    const kv = await getKV();
    const id = generateReminderId();
    
    const fullDelivery: ReminderDelivery = {
      ...delivery,
      id,
    };

    // Start atomic transaction
    const atomic = kv.atomic();

    // Store delivery record
    atomic.set(KV_KEYS.delivery(id), fullDelivery);
    atomic.set(KV_KEYS.deliveriesByReminder(delivery.reminderId, id), id);
    atomic.set(KV_KEYS.deliveriesByUser(delivery.targetUser, id), id);

    // Commit transaction
    const result = await atomic.commit();
    
    return result.ok ? id : null;
  } catch (error) {
    console.error("Error creating delivery:", error);
    return null;
  }
}

/**
 * Get delivery by ID
 */
export async function getDeliveryById(id: string): Promise<ReminderDelivery | null> {
  try {
    const kv = await getKV();
    const result = await kv.get<ReminderDelivery>(KV_KEYS.delivery(id));
    return result.value;
  } catch (error) {
    console.error("Error getting delivery:", error);
    return null;
  }
}

/**
 * Get deliveries for a reminder
 */
export async function getDeliveriesByReminder(reminderId: string): Promise<ReminderDelivery[]> {
  try {
    const kv = await getKV();
    const deliveries: ReminderDelivery[] = [];
    
    const entries = kv.list<string>({ 
      prefix: ["deliveries_by_reminder", reminderId] 
    });
    
    for await (const entry of entries) {
      const delivery = await getDeliveryById(entry.value);
      if (delivery) {
        deliveries.push(delivery);
      }
    }
    
    return deliveries;
  } catch (error) {
    console.error("Error getting deliveries:", error);
    return [];
  }
}

/**
 * Update delivery status
 */
export async function updateDeliveryStatus(
  id: string,
  status: ReminderDelivery["status"],
  errorMessage?: string
): Promise<boolean> {
  try {
    const kv = await getKV();
    const delivery = await getDeliveryById(id);
    
    if (!delivery) {
      return false;
    }

    const updated: ReminderDelivery = {
      ...delivery,
      status,
      lastAttemptAt: new Date(),
      attemptCount: status === "retrying" ? delivery.attemptCount + 1 : delivery.attemptCount,
      errorMessage: errorMessage || delivery.errorMessage,
    };

    await kv.set(KV_KEYS.delivery(id), updated);
    return true;
  } catch (error) {
    console.error("Error updating delivery status:", error);
    return false;
  }
}

/**
 * Mark delivery as acknowledged
 */
export async function acknowledgeDelivery(
  id: string,
  method: ReminderDelivery["acknowledgmentMethod"]
): Promise<boolean> {
  try {
    const kv = await getKV();
    const delivery = await getDeliveryById(id);
    
    if (!delivery) {
      return false;
    }

    const updated: ReminderDelivery = {
      ...delivery,
      acknowledged: true,
      acknowledgedAt: new Date(),
      acknowledgmentMethod: method,
    };

    await kv.set(KV_KEYS.delivery(id), updated);
    return true;
  } catch (error) {
    console.error("Error acknowledging delivery:", error);
    return false;
  }
}

/**
 * Perform bulk operations on reminders
 */
export async function bulkOperateReminders(
  operation: BulkReminderOperation,
  userId: string
): Promise<{ success: boolean; processed: number; errors: string[] }> {
  const errors: string[] = [];
  let processed = 0;

  try {
    for (const reminderId of operation.reminderIds) {
      let result;
      
      switch (operation.operation) {
        case "delete":
          result = await deleteReminder(reminderId, userId);
          break;
          
        case "pause":
          result = await updateReminder(reminderId, { isActive: false }, userId);
          break;
          
        case "resume":
          result = await updateReminder(reminderId, { isActive: true }, userId);
          break;
          
        case "complete": {
          const updateData: UpdateReminderInput = { 
            status: "completed"
          };
          result = await updateReminder(reminderId, updateData, userId);
          break;
        }
          
        case "update":
          if (!operation.updateData) {
            errors.push(`No update data provided for reminder ${reminderId}`);
            continue;
          }
          result = await updateReminder(reminderId, operation.updateData, userId);
          break;
          
        default:
          errors.push(`Unknown operation: ${operation.operation}`);
          continue;
      }

      if (result.success) {
        processed++;
      } else {
        errors.push(`Failed to ${operation.operation} reminder ${reminderId}: ${result.errors?.join(", ")}`);
      }
    }

    return {
      success: errors.length === 0,
      processed,
      errors,
    };
  } catch (error) {
    console.error("Error in bulk operation:", error);
    return {
      success: false,
      processed,
      errors: [...errors, "Database error during bulk operation"],
    };
  }
}

/**
 * Get or create user statistics
 */
export async function getUserStats(userId: string): Promise<ReminderStats> {
  try {
    const kv = await getKV();
    const result = await kv.get<ReminderStats>(KV_KEYS.userStats(userId));
    
    if (result.value) {
      return result.value;
    }

    // Create new stats
    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    
    const reminders = await getRemindersByUser(userId);
    const stats = calculateReminderStats(reminders, userId, periodStart, periodEnd);
    
    await kv.set(KV_KEYS.userStats(userId), stats);
    return stats;
  } catch (error) {
    console.error("Error getting user stats:", error);
    // Return default stats
    const now = new Date();
    return {
      userId,
      totalReminders: 0,
      activeReminders: 0,
      completedReminders: 0,
      totalDeliveries: 0,
      successfulDeliveries: 0,
      failedDeliveries: 0,
      acknowledgmentRate: 0,
      averageAcknowledgmentTime: 0,
      fastestAcknowledgment: 0,
      slowestAcknowledgment: 0,
      categoryBreakdown: {
        health: 0,
        medication: 0,
        work: 0,
        personal: 0,
        appointment: 0,
        task: 0,
        custom: 0,
      },
      templateUsage: {},
      lastUpdated: now,
      periodStart: new Date(now.getFullYear(), now.getMonth(), 1),
      periodEnd: new Date(now.getFullYear(), now.getMonth() + 1, 0),
    };
  }
}

/**
 * Helper function to check if reminder matches search criteria
 */
function matchesCriteria(reminder: Reminder, criteria: ReminderSearchCriteria): boolean {
  // Status filter
  if (criteria.status && !criteria.status.includes(reminder.status)) {
    return false;
  }

  // Category filter
  if (criteria.category && !criteria.category.includes(reminder.category)) {
    return false;
  }

  // Priority filter
  if (criteria.priority && !criteria.priority.includes(reminder.priority)) {
    return false;
  }

  // Tags filter
  if (criteria.tags && criteria.tags.length > 0) {
    const hasMatchingTag = criteria.tags.some(tag => 
      reminder.tags?.includes(tag)
    );
    if (!hasMatchingTag) {
      return false;
    }
  }

  // Template filter
  if (criteria.templateId && reminder.templateId !== criteria.templateId) {
    return false;
  }

  // Date filters
  if (criteria.createdAfter && reminder.createdAt < criteria.createdAfter) {
    return false;
  }
  
  if (criteria.createdBefore && reminder.createdAt > criteria.createdBefore) {
    return false;
  }
  
  if (criteria.nextDeliveryAfter && 
      (!reminder.nextDeliveryAt || reminder.nextDeliveryAt < criteria.nextDeliveryAfter)) {
    return false;
  }
  
  if (criteria.nextDeliveryBefore && 
      (!reminder.nextDeliveryAt || reminder.nextDeliveryAt > criteria.nextDeliveryBefore)) {
    return false;
  }

  // Text search
  if (criteria.searchText) {
    const searchLower = criteria.searchText.toLowerCase();
    const searchableText = [
      reminder.title,
      reminder.message,
      reminder.notes || "",
      ...(reminder.tags || [])
    ].join(" ").toLowerCase();
    
    if (!searchableText.includes(searchLower)) {
      return false;
    }
  }

  return true;
}

/**
 * Helper function to get value for sorting
 */
function getValueForSort(reminder: Reminder, sortBy: string): string | number {
  switch (sortBy) {
    case "createdAt":
      return reminder.createdAt.getTime();
    case "nextDeliveryAt":
      return reminder.nextDeliveryAt?.getTime() || 0;
    case "priority": {
      const priorityOrder = { urgent: 4, high: 3, normal: 2, low: 1 };
      return priorityOrder[reminder.priority];
    }
    case "title":
      return reminder.title.toLowerCase();
    default:
      return 0;
  }
}