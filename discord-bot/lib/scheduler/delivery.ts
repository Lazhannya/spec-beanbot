/**
 * Enhanced delivery service for reminder system
 * Integrates with DeliveryQueue and timezone utilities for accurate delivery
 */

import { DeliveryQueue } from "./queue.ts";
import { calculateDeliveryTime } from "./timezone.ts";
import { Result } from "../utils/result.ts";
import { logger } from "../utils/logger.ts";
import type { 
  DeliveryQueueItem, 
  DeliveryAttempt, 
  DeliveryStatus,
  DeliveryError
} from "../../types/delivery.ts";

export interface DeliveryRequest {
  reminderId: string;
  userId: string;
  message: string;
  scheduledTime: string;       // datetime-local format from user
  timezone: string;            // IANA timezone identifier
  maxAttempts?: number;        // Override default retry attempts
}

export interface DeliveryResult {
  success: boolean;
  queueItemId?: string;        // ID for tracking delivery
  deliveryTime?: Date;         // UTC delivery time
  userDisplayTime?: string;    // User's local time display
  error?: DeliveryError;
}

export interface DeliveryStatusInfo {
  queueItem: DeliveryQueueItem;
  attempts: DeliveryAttempt[];
  currentStatus: DeliveryStatus;
  nextRetry?: Date;
  estimatedDelivery?: Date;
}

/**
 * Enhanced delivery service with timezone awareness and queue management
 */
export class EnhancedDeliveryService {
  constructor(
    private deliveryQueue: DeliveryQueue,
    private discordService: DiscordDeliveryInterface
  ) {}

  /**
   * Schedule a reminder for delivery with timezone accuracy
   */
  async scheduleDelivery(request: DeliveryRequest): Promise<Result<DeliveryResult, Error>> {
    try {
      logger.info("Scheduling reminder delivery", {
        operation: "schedule_delivery",
        reminderId: request.reminderId,
        userId: request.userId,
        context: {
          timezone: request.timezone,
          scheduledTime: request.scheduledTime
        }
      });

      // Validate and calculate delivery time with timezone accuracy
      const timeCalc = calculateDeliveryTime(request.scheduledTime, request.timezone);
      if (!timeCalc.isValidTime) {
        const errorMessage = timeCalc.errors?.join(", ") || "Invalid delivery time";
        logger.warn("Delivery time validation failed", {
          operation: "schedule_delivery",
          reminderId: request.reminderId,
          error: { 
            name: "ValidationError",
            message: errorMessage 
          }
        });
        
        return {
          success: false,
          error: new Error(`Delivery time validation failed: ${errorMessage}`)
        };
      }

      // Schedule in delivery queue
      const queueResult = await this.deliveryQueue.scheduleReminder(
        request.reminderId,
        request.userId,
        timeCalc.utcDeliveryTime,
        request.timezone,
        timeCalc.userDisplayTime,
        request.message
      );

      if (!queueResult.success) {
        logger.error("Failed to schedule reminder in delivery queue", {
          operation: "schedule_delivery",
          reminderId: request.reminderId,
          error: {
            name: queueResult.error.name,
            message: queueResult.error.message
          }
        });
        return {
          success: false,
          error: queueResult.error
        };
      }

      const result: DeliveryResult = {
        success: true,
        queueItemId: queueResult.data,
        deliveryTime: timeCalc.utcDeliveryTime,
        userDisplayTime: timeCalc.userDisplayTime
      };

      logger.info("Successfully scheduled reminder delivery", {
        operation: "schedule_delivery",
        reminderId: request.reminderId,
        context: {
          queueItemId: queueResult.data,
          deliveryTime: timeCalc.utcDeliveryTime.toISOString(),
          userDisplayTime: timeCalc.userDisplayTime
        }
      });

      return { success: true, data: result };

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.error("Error scheduling delivery", {
        operation: "schedule_delivery",
        reminderId: request.reminderId,
        error: {
          name: error instanceof Error ? error.name : "UnknownError",
          message: errorMsg,
          ...(error instanceof Error && error.stack && { stack: error.stack })
        }
      });

      return {
        success: false,
        error: new Error(`Failed to schedule delivery: ${errorMsg}`)
      };
    }
  }

  /**
   * Process due deliveries from the queue
   */
  async processDueDeliveries(): Promise<Result<{ processed: number; successful: number; failed: number }, Error>> {
    try {
      logger.debug("Processing due deliveries", { operation: "process_due_deliveries" });

      const dueResult = await this.deliveryQueue.getDueReminders();
      if (!dueResult.success) {
        return { success: false, error: dueResult.error };
      }

      const dueItems = dueResult.data;
      if (dueItems.length === 0) {
        return { success: true, data: { processed: 0, successful: 0, failed: 0 } };
      }

      logger.info("Processing due deliveries", {
        operation: "process_due_deliveries",
        context: { count: dueItems.length }
      });

      let successful = 0;
      let failed = 0;

      // Process each due delivery
      for (const item of dueItems) {
        const deliveryResult = await this.attemptDelivery(item);
        if (deliveryResult.success) {
          successful++;
        } else {
          failed++;
        }
      }

      const result = {
        processed: dueItems.length,
        successful,
        failed
      };

      logger.info("Completed processing due deliveries", {
        operation: "process_due_deliveries",
        context: result
      });

      return { success: true, data: result };

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.error("Error processing due deliveries", {
        operation: "process_due_deliveries",
        error: {
          name: error instanceof Error ? error.name : "UnknownError",
          message: errorMsg,
          ...(error instanceof Error && error.stack && { stack: error.stack })
        }
      });

      return { success: false, error: new Error(`Failed to process due deliveries: ${errorMsg}`) };
    }
  }

  /**
   * Attempt delivery of a single queue item
   */
  private async attemptDelivery(queueItem: DeliveryQueueItem): Promise<Result<void, Error>> {
    try {
      logger.info("Attempting delivery", {
        operation: "attempt_delivery",
        reminderId: queueItem.reminderId,
        userId: queueItem.userId,
        context: {
          attempt: queueItem.attempt + 1,
          maxAttempts: queueItem.maxAttempts
        }
      });

      // Attempt delivery through Discord service
      const deliveryResult = await this.discordService.deliverMessage(
        queueItem.userId,
        queueItem.messageContent,
        queueItem.reminderId
      );

      if (deliveryResult.success) {
        // Mark as successfully delivered
        const markResult = await this.deliveryQueue.markDelivered(queueItem.id);
        if (markResult.success) {
          logger.info("Successfully delivered and marked reminder", {
            operation: "attempt_delivery",
            reminderId: queueItem.reminderId,
            context: { messageId: deliveryResult.messageId }
          });
          return { success: true, data: undefined };
        } else {
          logger.error("Delivered but failed to mark as delivered", {
            operation: "attempt_delivery",
            reminderId: queueItem.reminderId,
            error: {
              name: markResult.error.name,
              message: markResult.error.message
            }
          });
          return { success: false, error: markResult.error };
        }
      } else {
        // Handle delivery failure
        const errorMessage = deliveryResult.error?.message || "Unknown delivery error";
        const failResult = await this.deliveryQueue.markFailed(queueItem.id, errorMessage);
        
        if (failResult.success) {
          const { willRetry, nextRetry } = failResult.data;
          
          if (willRetry && nextRetry) {
            logger.warn("Delivery failed, retry scheduled", {
              operation: "attempt_delivery",
              reminderId: queueItem.reminderId,
              context: {
                nextRetry: nextRetry.toISOString(),
                attempt: queueItem.attempt + 1,
                error: errorMessage
              }
            });
          } else {
            logger.error("Delivery permanently failed", {
              operation: "attempt_delivery",
              reminderId: queueItem.reminderId,
              context: {
                finalAttempt: queueItem.attempt + 1,
                error: errorMessage
              }
            });
          }
          return { success: false, error: new Error(errorMessage) };
        } else {
          logger.error("Failed to mark delivery as failed", {
            operation: "attempt_delivery",
            reminderId: queueItem.reminderId,
            error: {
              name: failResult.error.name,
              message: failResult.error.message
            }
          });
          return { success: false, error: failResult.error };
        }
      }

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.error("Error in delivery attempt", {
        operation: "attempt_delivery",
        reminderId: queueItem.reminderId,
        error: {
          name: error instanceof Error ? error.name : "UnknownError",
          message: errorMsg,
          ...(error instanceof Error && error.stack && { stack: error.stack })
        }
      });

      return { success: false, error: new Error(`Delivery attempt failed: ${errorMsg}`) };
    }
  }

  /**
   * Get delivery status for a reminder
   */
  getDeliveryStatus(reminderId: string): Promise<Result<DeliveryStatusInfo, Error>> {
    try {
      // This would need to be implemented in DeliveryQueue to find by reminderId
      // For now, return a placeholder implementation
      logger.debug("Getting delivery status", {
        operation: "get_delivery_status",
        reminderId
      });

      // TODO: Implement queue lookup by reminder ID
      return Promise.resolve({
        success: false,
        error: new Error("Delivery status lookup not yet implemented")
      });

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      return Promise.resolve({ success: false, error: new Error(`Failed to get delivery status: ${errorMsg}`) });
    }
  }

  /**
   * Cancel a scheduled delivery
   */
  async cancelDelivery(reminderId: string): Promise<Result<void, Error>> {
    try {
      logger.info("Cancelling delivery", {
        operation: "cancel_delivery",
        reminderId
      });

      const cancelResult = await this.deliveryQueue.cancelReminder(reminderId);
      if (!cancelResult.success) {
        logger.error("Failed to cancel delivery", {
          operation: "cancel_delivery",
          reminderId,
          error: {
            name: cancelResult.error.name,
            message: cancelResult.error.message
          }
        });
        return { success: false, error: cancelResult.error };
      }

      logger.info("Successfully cancelled delivery", {
        operation: "cancel_delivery",
        reminderId
      });

      return { success: true, data: undefined };

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.error("Error cancelling delivery", {
        operation: "cancel_delivery",
        reminderId,
        error: {
          name: error instanceof Error ? error.name : "UnknownError",
          message: errorMsg,
          ...(error instanceof Error && error.stack && { stack: error.stack })
        }
      });

      return { success: false, error: new Error(`Failed to cancel delivery: ${errorMsg}`) };
    }
  }

  /**
   * Update a scheduled delivery with new time or message
   */
  async updateDelivery(
    reminderId: string,
    updates: Partial<DeliveryRequest>
  ): Promise<Result<DeliveryResult, Error>> {
    try {
      logger.info("Updating delivery", {
        operation: "update_delivery",
        reminderId,
        context: { updates: Object.keys(updates) }
      });

      // Cancel existing delivery
      const cancelResult = await this.cancelDelivery(reminderId);
      if (!cancelResult.success) {
        return { success: false, error: cancelResult.error };
      }

      // Re-schedule with updates
      const scheduleRequest: DeliveryRequest = {
        reminderId,
        userId: updates.userId || "",
        message: updates.message || "",
        scheduledTime: updates.scheduledTime || "",
        timezone: updates.timezone || "UTC"
      };
      
      if (updates.maxAttempts !== undefined) {
        scheduleRequest.maxAttempts = updates.maxAttempts;
      }
      
      const scheduleResult = await this.scheduleDelivery(scheduleRequest);

      if (!scheduleResult.success) {
        logger.error("Failed to reschedule after cancellation", {
          operation: "update_delivery",
          reminderId,
          error: {
            name: scheduleResult.error.name,
            message: scheduleResult.error.message
          }
        });
        return { success: false, error: scheduleResult.error };
      }

      logger.info("Successfully updated delivery", {
        operation: "update_delivery",
        reminderId,
        context: { newQueueItemId: scheduleResult.data.queueItemId }
      });

      return { success: true, data: scheduleResult.data };

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.error("Error updating delivery", {
        operation: "update_delivery",
        reminderId,
        error: {
          name: error instanceof Error ? error.name : "UnknownError",
          message: errorMsg,
          ...(error instanceof Error && error.stack && { stack: error.stack })
        }
      });

      return { success: false, error: new Error(`Failed to update delivery: ${errorMsg}`) };
    }
  }
}

/**
 * Interface for Discord delivery implementation
 * Allows for dependency injection and testing
 */
export interface DiscordDeliveryInterface {
  deliverMessage(
    userId: string,
    message: string,
    reminderId: string
  ): Promise<{
    success: boolean;
    messageId?: string;
    error?: DeliveryError;
  }>;
}