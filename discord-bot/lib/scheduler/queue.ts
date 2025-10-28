/**
 * Delivery queue management for KV-based reminder scheduling
 * Provides atomic operations, time-based indexing, and retry logic
 */

import { Result } from "../utils/result.ts";
import { logger as log } from "../utils/logger.ts";

export interface DeliveryQueueItem {
  id: string;
  reminderId: string;
  userId: string;
  scheduledUtc: Date;
  scheduledTimezone: string;
  userDisplayTime: string;
  messageContent: string;
  attempt: number;
  maxAttempts: number;
  nextRetry?: Date;
  lastError?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface QueueStats {
  pending: number;
  scheduled: number;
  failed: number;
  delivered: number;
  retrying: number;
}

export interface RetryConfig {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
  exponentialBase: number;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  baseDelayMs: 60000, // 1 minute
  maxDelayMs: 3600000, // 1 hour
  exponentialBase: 2,
};

/**
 * Queue manager for reminder delivery with KV storage
 */
export class DeliveryQueue {
  constructor(private kv: Deno.Kv, private retryConfig: RetryConfig = DEFAULT_RETRY_CONFIG) {}

  /**
   * Schedule a reminder for delivery
   */
  async scheduleReminder(
    reminderId: string,
    userId: string,
    scheduledUtc: Date,
    scheduledTimezone: string,
    userDisplayTime: string,
    messageContent: string,
  ): Promise<Result<string, Error>> {
    try {
      const queueItem: DeliveryQueueItem = {
        id: crypto.randomUUID(),
        reminderId,
        userId,
        scheduledUtc,
        scheduledTimezone,
        userDisplayTime,
        messageContent,
        attempt: 0,
        maxAttempts: this.retryConfig.maxAttempts,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Use atomic transaction to ensure consistency
      const atomic = this.kv.atomic();
      
      // Store in multiple indices for efficient querying
      await atomic
        .set(["delivery_queue", queueItem.id], queueItem)
        .set(["delivery_schedule", scheduledUtc.getTime(), queueItem.id], queueItem.id)
        .set(["user_deliveries", userId, queueItem.id], queueItem.id)
        .set(["reminder_delivery", reminderId], queueItem.id)
        .commit();

      log.info(`Scheduled reminder ${reminderId} for delivery at ${scheduledUtc.toISOString()}`);
      return { success: true, data: queueItem.id };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      log.error(`Failed to schedule reminder ${reminderId}: ${errorMsg}`);
      return { success: false, error: new Error(`Failed to schedule reminder: ${errorMsg}`) };
    }
  }

  /**
   * Get reminders due for delivery
   */
  async getDueReminders(beforeTime = new Date()): Promise<Result<DeliveryQueueItem[], Error>> {
    try {
      const dueItems: DeliveryQueueItem[] = [];
      const cutoffTime = beforeTime.getTime();
      
      // Query by scheduled time index
      const iter = this.kv.list({ 
        prefix: ["delivery_schedule"], 
        end: ["delivery_schedule", cutoffTime + 1] 
      });
      
      for await (const entry of iter) {
        const itemId = entry.value as string;
        const itemResult = await this.kv.get(["delivery_queue", itemId]);
        
        if (itemResult.value) {
          const item = itemResult.value as DeliveryQueueItem;
          // Only include items that haven't exceeded max attempts
          if (item.attempt < item.maxAttempts) {
            dueItems.push(item);
          }
        }
      }

      log.debug(`Found ${dueItems.length} reminders due for delivery`);
      return { success: true, data: dueItems };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      log.error(`Failed to get due reminders: ${errorMsg}`);
      return { success: false, error: new Error(`Failed to get due reminders: ${errorMsg}`) };
    }
  }

  /**
   * Mark reminder as delivered successfully
   */
  async markDelivered(queueItemId: string): Promise<Result<void, Error>> {
    try {
      const itemResult = await this.kv.get(["delivery_queue", queueItemId]);
      if (!itemResult.value) {
        return { success: false, error: new Error("Queue item not found") };
      }

      const item = itemResult.value as DeliveryQueueItem;
      
      // Remove from active queues and store in delivered history
      const atomic = this.kv.atomic();
      await atomic
        .delete(["delivery_queue", queueItemId])
        .delete(["delivery_schedule", item.scheduledUtc.getTime(), queueItemId])
        .delete(["user_deliveries", item.userId, queueItemId])
        .delete(["reminder_delivery", item.reminderId])
        .set(["delivery_history", "delivered", queueItemId], {
          ...item,
          deliveredAt: new Date(),
        })
        .commit();

      log.info(`Marked reminder ${item.reminderId} as delivered`);
      return { success: true, data: undefined };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      log.error(`Failed to mark reminder as delivered: ${errorMsg}`);
      return { success: false, error: new Error(`Failed to mark as delivered: ${errorMsg}`) };
    }
  }

  /**
   * Mark reminder delivery as failed and schedule retry if possible
   */
  async markFailed(
    queueItemId: string, 
    errorMessage: string,
  ): Promise<Result<{ willRetry: boolean; nextRetry?: Date }, Error>> {
    try {
      const itemResult = await this.kv.get(["delivery_queue", queueItemId]);
      if (!itemResult.value) {
        return { success: false, error: new Error("Queue item not found") };
      }

      const item = itemResult.value as DeliveryQueueItem;
      const newAttempt = item.attempt + 1;
      const willRetry = newAttempt < item.maxAttempts;
      
      if (willRetry) {
        // Calculate exponential backoff delay
        const delayMs = Math.min(
          this.retryConfig.baseDelayMs * Math.pow(this.retryConfig.exponentialBase, newAttempt - 1),
          this.retryConfig.maxDelayMs
        );
        const nextRetry = new Date(Date.now() + delayMs);
        
        const updatedItem: DeliveryQueueItem = {
          ...item,
          attempt: newAttempt,
          lastError: errorMessage,
          nextRetry,
          updatedAt: new Date(),
        };

        // Update with new retry schedule
        const atomic = this.kv.atomic();
        await atomic
          .set(["delivery_queue", queueItemId], updatedItem)
          .delete(["delivery_schedule", item.scheduledUtc.getTime(), queueItemId])
          .set(["delivery_schedule", nextRetry.getTime(), queueItemId], queueItemId)
          .commit();

        log.warn(`Retry scheduled for reminder ${item.reminderId} (attempt ${newAttempt}/${item.maxAttempts}) at ${nextRetry.toISOString()}`);
        return { success: true, data: { willRetry: true, nextRetry } };
      } else {
        // Exceeded max attempts - move to failed
        const atomic = this.kv.atomic();
        await atomic
          .delete(["delivery_queue", queueItemId])
          .delete(["delivery_schedule", item.scheduledUtc.getTime(), queueItemId])
          .delete(["user_deliveries", item.userId, queueItemId])
          .delete(["reminder_delivery", item.reminderId])
          .set(["delivery_history", "failed", queueItemId], {
            ...item,
            attempt: newAttempt,
            lastError: errorMessage,
            failedAt: new Date(),
          })
          .commit();

        log.error(`Reminder ${item.reminderId} permanently failed after ${newAttempt} attempts`);
        return { success: true, data: { willRetry: false } };
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      log.error(`Failed to mark reminder as failed: ${errorMsg}`);
      return { success: false, error: new Error(`Failed to mark as failed: ${errorMsg}`) };
    }
  }

  /**
   * Get queue statistics
   */
  async getQueueStats(): Promise<Result<QueueStats, Error>> {
    try {
      let pending = 0;
      let scheduled = 0;
      const now = new Date();
      
      // Count active queue items
      const activeIter = this.kv.list({ prefix: ["delivery_queue"] });
      for await (const entry of activeIter) {
        const item = entry.value as DeliveryQueueItem;
        if (item.scheduledUtc <= now) {
          pending++;
        } else {
          scheduled++;
        }
      }
      
      // Count delivered items
      let delivered = 0;
      const deliveredIter = this.kv.list({ prefix: ["delivery_history", "delivered"] });
      for await (const _ of deliveredIter) {
        delivered++;
      }
      
      // Count failed items
      let failed = 0;
      const failedIter = this.kv.list({ prefix: ["delivery_history", "failed"] });
      for await (const _ of failedIter) {
        failed++;
      }

      const stats: QueueStats = {
        pending,
        scheduled,
        failed,
        delivered,
        retrying: pending, // Items pending could be retries
      };

      return { success: true, data: stats };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      log.error(`Failed to get queue stats: ${errorMsg}`);
      return { success: false, error: new Error(`Failed to get queue stats: ${errorMsg}`) };
    }
  }

  /**
   * Get user's scheduled reminders
   */
  async getUserReminders(userId: string): Promise<Result<DeliveryQueueItem[], Error>> {
    try {
      const userReminders: DeliveryQueueItem[] = [];
      
      const iter = this.kv.list({ prefix: ["user_deliveries", userId] });
      for await (const entry of iter) {
        const itemId = entry.value as string;
        const itemResult = await this.kv.get(["delivery_queue", itemId]);
        
        if (itemResult.value) {
          userReminders.push(itemResult.value as DeliveryQueueItem);
        }
      }
      
      // Sort by scheduled time
      userReminders.sort((a, b) => a.scheduledUtc.getTime() - b.scheduledUtc.getTime());
      
      return { success: true, data: userReminders };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      log.error(`Failed to get user reminders: ${errorMsg}`);
      return { success: false, error: new Error(`Failed to get user reminders: ${errorMsg}`) };
    }
  }

  /**
   * Cancel a scheduled reminder
   */
  async cancelReminder(reminderId: string): Promise<Result<void, Error>> {
    try {
      // Find the queue item by reminder ID
      const queueItemResult = await this.kv.get(["reminder_delivery", reminderId]);
      if (!queueItemResult.value) {
        return { success: false, error: new Error("Reminder not found in delivery queue") };
      }

      const queueItemId = queueItemResult.value as string;
      const itemResult = await this.kv.get(["delivery_queue", queueItemId]);
      if (!itemResult.value) {
        return { success: false, error: new Error("Queue item not found") };
      }

      const item = itemResult.value as DeliveryQueueItem;
      
      // Remove from all indices
      const atomic = this.kv.atomic();
      await atomic
        .delete(["delivery_queue", queueItemId])
        .delete(["delivery_schedule", item.scheduledUtc.getTime(), queueItemId])
        .delete(["user_deliveries", item.userId, queueItemId])
        .delete(["reminder_delivery", reminderId])
        .set(["delivery_history", "cancelled", queueItemId], {
          ...item,
          cancelledAt: new Date(),
        })
        .commit();

      log.info(`Cancelled reminder ${reminderId}`);
      return { success: true, data: undefined };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      log.error(`Failed to cancel reminder: ${errorMsg}`);
      return { success: false, error: new Error(`Failed to cancel reminder: ${errorMsg}`) };
    }
  }

  /**
   * Clean up old delivery history (for maintenance)
   */
  async cleanupHistory(olderThanDays = 30): Promise<Result<{ deletedCount: number }, Error>> {
    try {
      const cutoffDate = new Date(Date.now() - (olderThanDays * 24 * 60 * 60 * 1000));
      let deletedCount = 0;
      
      // Clean delivered history
      const deliveredIter = this.kv.list({ prefix: ["delivery_history", "delivered"] });
      for await (const entry of deliveredIter) {
        const item = entry.value as DeliveryQueueItem & { deliveredAt?: Date };
        if (item.deliveredAt && item.deliveredAt < cutoffDate) {
          await this.kv.delete(entry.key);
          deletedCount++;
        }
      }
      
      // Clean failed history
      const failedIter = this.kv.list({ prefix: ["delivery_history", "failed"] });
      for await (const entry of failedIter) {
        const item = entry.value as DeliveryQueueItem & { failedAt?: Date };
        if (item.failedAt && item.failedAt < cutoffDate) {
          await this.kv.delete(entry.key);
          deletedCount++;
        }
      }

      log.info(`Cleaned up ${deletedCount} old delivery history records`);
      return { success: true, data: { deletedCount } };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      log.error(`Failed to cleanup history: ${errorMsg}`);
      return { success: false, error: new Error(`Failed to cleanup history: ${errorMsg}`) };
    }
  }
}