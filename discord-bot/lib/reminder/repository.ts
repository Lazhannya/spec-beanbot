/**
 * Reminder Repository - KV Database Operations
 * Handles all database operations for reminder entities with atomic transactions
 */

import { Reminder, ReminderStatus } from "../../types/reminder.ts";

/**
 * Repository for reminder entity operations using Deno KV
 */
export class ReminderRepository {
  private kv: Deno.Kv;

  constructor(kv: Deno.Kv) {
    this.kv = kv;
  }

  /**
   * Create a new reminder with atomic indexing
   */
  async create(reminder: Reminder): Promise<boolean> {
    try {
      const atomic = this.kv.atomic();
      
      // Primary record
      atomic.set(["reminders", reminder.id], reminder);
      
      // Time-based index for scheduling
      atomic.set(["schedule", reminder.scheduledTime.getTime(), reminder.id], null);
      
      // User-based index for admin queries
      atomic.set(["user_reminders", reminder.targetUserId, reminder.id], null);
      
      // Status-based index for dashboard
      atomic.set(["status", reminder.status, reminder.id], null);
      
      // Creator-based index for admin filtering
      atomic.set(["created_by", reminder.createdBy, reminder.id], null);

      const result = await atomic.commit();
      return result.ok;
    } catch (error) {
      console.error("Failed to create reminder:", error);
      return false;
    }
  }

  /**
   * Get reminder by ID
   */
  async getById(id: string): Promise<Reminder | null> {
    try {
      const result = await this.kv.get<Reminder>(["reminders", id]);
      return result.value;
    } catch (error) {
      console.error("Failed to get reminder by ID:", error);
      return null;
    }
  }

  /**
   * Update existing reminder with index maintenance
   */
  async update(id: string, updates: Partial<Reminder>): Promise<boolean> {
    try {
      const current = await this.getById(id);
      if (!current) return false;

      const updated = { ...current, ...updates, updatedAt: new Date() };
      const atomic = this.kv.atomic();

      // Update primary record
      atomic.set(["reminders", id], updated);

      // Update indexes if key fields changed
      if (updates.status && updates.status !== current.status) {
        atomic.delete(["status", current.status, id]);
        atomic.set(["status", updated.status, id], null);
      }

      if (updates.scheduledTime && updates.scheduledTime !== current.scheduledTime) {
        atomic.delete(["schedule", current.scheduledTime.getTime(), id]);
        atomic.set(["schedule", updated.scheduledTime.getTime(), id], null);
      }

      if (updates.targetUserId && updates.targetUserId !== current.targetUserId) {
        atomic.delete(["user_reminders", current.targetUserId, id]);
        atomic.set(["user_reminders", updated.targetUserId, id], null);
      }

      const result = await atomic.commit();
      return result.ok;
    } catch (error) {
      console.error("Failed to update reminder:", error);
      return false;
    }
  }

  /**
   * Delete reminder and all its indexes
   */
  async delete(id: string): Promise<boolean> {
    try {
      const reminder = await this.getById(id);
      if (!reminder) return false;

      const atomic = this.kv.atomic();
      
      // Delete primary record
      atomic.delete(["reminders", id]);
      
      // Delete all indexes
      atomic.delete(["schedule", reminder.scheduledTime.getTime(), id]);
      atomic.delete(["user_reminders", reminder.targetUserId, id]);
      atomic.delete(["status", reminder.status, id]);
      atomic.delete(["created_by", reminder.createdBy, id]);

      const result = await atomic.commit();
      return result.ok;
    } catch (error) {
      console.error("Failed to delete reminder:", error);
      return false;
    }
  }

  /**
   * Get reminders due for delivery before specified time
   */
  async getDueReminders(before: Date): Promise<Reminder[]> {
    try {
      const reminders: Reminder[] = [];
      const entries = this.kv.list({
        prefix: ["schedule"],
        end: ["schedule", before.getTime()]
      });

      for await (const entry of entries) {
        const reminderId = entry.key[2] as string;
        const reminder = await this.getById(reminderId);
        if (reminder && reminder.status === ReminderStatus.PENDING) {
          reminders.push(reminder);
        }
      }

      return reminders;
    } catch (error) {
      console.error("Failed to get due reminders:", error);
      return [];
    }
  }

  /**
   * Get reminders by status for dashboard filtering
   */
  async getByStatus(status: ReminderStatus, limit = 50): Promise<Reminder[]> {
    try {
      const reminders: Reminder[] = [];
      const entries = this.kv.list({
        prefix: ["status", status]
      }, { limit });

      for await (const entry of entries) {
        const reminderId = entry.key[2] as string;
        const reminder = await this.getById(reminderId);
        if (reminder) {
          reminders.push(reminder);
        }
      }

      return reminders;
    } catch (error) {
      console.error("Failed to get reminders by status:", error);
      return [];
    }
  }

  /**
   * Get reminders for a specific user
   */
  async getByUser(userId: string, limit = 50): Promise<Reminder[]> {
    try {
      const reminders: Reminder[] = [];
      const entries = this.kv.list({
        prefix: ["user_reminders", userId]
      }, { limit });

      for await (const entry of entries) {
        const reminderId = entry.key[2] as string;
        const reminder = await this.getById(reminderId);
        if (reminder) {
          reminders.push(reminder);
        }
      }

      return reminders;
    } catch (error) {
      console.error("Failed to get reminders by user:", error);
      return [];
    }
  }

  /**
   * Get reminders created by specific admin
   */
  async getByCreator(creatorId: string, limit = 50): Promise<Reminder[]> {
    try {
      const reminders: Reminder[] = [];
      const entries = this.kv.list({
        prefix: ["created_by", creatorId]
      }, { limit });

      for await (const entry of entries) {
        const reminderId = entry.key[2] as string;
        const reminder = await this.getById(reminderId);
        if (reminder) {
          reminders.push(reminder);
        }
      }

      return reminders;
    } catch (error) {
      console.error("Failed to get reminders by creator:", error);
      return [];
    }
  }

  /**
   * Get all reminders with pagination
   */
  async getAll(offset = 0, limit = 20): Promise<Reminder[]> {
    try {
      const reminders: Reminder[] = [];
      const entries = this.kv.list({
        prefix: ["reminders"]
      });

      let count = 0;
      for await (const entry of entries) {
        if (count < offset) {
          count++;
          continue;
        }
        
        if (reminders.length >= limit) break;

        const reminder = entry.value as Reminder;
        reminders.push(reminder);
        count++;
      }

      return reminders;
    } catch (error) {
      console.error("Failed to get all reminders:", error);
      return [];
    }
  }

  /**
   * Update reminder status atomically
   */
  async updateStatus(id: string, newStatus: ReminderStatus): Promise<boolean> {
    return this.update(id, { status: newStatus });
  }

  /**
   * Increment delivery attempts counter
   */
  async incrementDeliveryAttempts(id: string): Promise<boolean> {
    try {
      const reminder = await this.getById(id);
      if (!reminder) return false;

      return this.update(id, {
        deliveryAttempts: reminder.deliveryAttempts + 1,
        lastDeliveryAttempt: new Date()
      });
    } catch (error) {
      console.error("Failed to increment delivery attempts:", error);
      return false;
    }
  }

  /**
   * Count reminders by status
   */
  async countByStatus(status: ReminderStatus): Promise<number> {
    try {
      let count = 0;
      const entries = this.kv.list({
        prefix: ["status", status]
      });

      for await (const _entry of entries) {
        count++;
      }

      return count;
    } catch (error) {
      console.error("Failed to count reminders by status:", error);
      return 0;
    }
  }
}