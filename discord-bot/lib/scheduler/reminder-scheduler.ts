// Reminder scheduler service
// This module implements a cron-based scheduling system for reminder delivery

import { getRemindersForDelivery } from "../storage/reminders.ts";
import { updateReminderAfterDelivery, getCurrentTimestamp } from "../utils/reminders.ts";
import type { Reminder } from "../types/reminders.ts";

/**
 * Scheduler configuration
 */
export interface SchedulerConfig {
  // How often to check for due reminders (in milliseconds)
  checkInterval: number;
  
  // Maximum number of reminders to process per batch
  batchSize: number;
  
  // Timezone handling
  defaultTimezone: string;
  
  // Retry configuration
  maxRetries: number;
  retryDelayMs: number;
  
  // Performance settings
  maxConcurrentDeliveries: number;
  
  // Logging
  enableDebugLogging: boolean;
}

/**
 * Default scheduler configuration
 */
const DEFAULT_CONFIG: SchedulerConfig = {
  checkInterval: 60 * 1000, // Check every minute
  batchSize: 50, // Process up to 50 reminders at once
  defaultTimezone: "America/New_York",
  maxRetries: 3,
  retryDelayMs: 5000, // 5 seconds
  maxConcurrentDeliveries: 10,
  enableDebugLogging: false,
};

/**
 * Delivery callback function type
 */
export type DeliveryCallback = (reminder: Reminder) => Promise<{
  success: boolean;
  error?: string;
  shouldRetry?: boolean;
}>;

/**
 * Scheduler statistics
 */
export interface SchedulerStats {
  lastRunAt: Date;
  totalRemindersProcessed: number;
  successfulDeliveries: number;
  failedDeliveries: number;
  averageProcessingTime: number;
  isRunning: boolean;
  nextRunAt: Date;
  pendingReminders: number;
  overdueReminders: number;
}

/**
 * Main scheduler class
 */
export class ReminderScheduler {
  private config: SchedulerConfig;
  private deliveryCallback: DeliveryCallback | null = null;
  private intervalId: number | null = null;
  private isProcessing = false;
  private stats: SchedulerStats;
  private startTime: number = 0;

  constructor(config: Partial<SchedulerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.stats = this.initializeStats();
  }

  /**
   * Initialize scheduler statistics
   */
  private initializeStats(): SchedulerStats {
    const now = new Date();
    return {
      lastRunAt: now,
      totalRemindersProcessed: 0,
      successfulDeliveries: 0,
      failedDeliveries: 0,
      averageProcessingTime: 0,
      isRunning: false,
      nextRunAt: new Date(now.getTime() + this.config.checkInterval),
      pendingReminders: 0,
      overdueReminders: 0,
    };
  }

  /**
   * Set the delivery callback function
   */
  setDeliveryCallback(callback: DeliveryCallback): void {
    this.deliveryCallback = callback;
  }

  /**
   * Start the scheduler
   */
  async start(): Promise<void> {
    if (this.intervalId !== null) {
      console.warn("Scheduler is already running");
      return;
    }

    if (!this.deliveryCallback) {
      throw new Error("Delivery callback must be set before starting scheduler");
    }

    console.log("Starting reminder scheduler...");
    this.stats.isRunning = true;
    
    // Run initial check
    await this.processReminders();
    
    // Set up recurring interval
    this.intervalId = setInterval(async () => {
      try {
        await this.processReminders();
      } catch (error) {
        console.error("Error in scheduler interval:", error);
      }
    }, this.config.checkInterval);

    console.log(`Scheduler started with ${this.config.checkInterval}ms interval`);
  }

  /**
   * Stop the scheduler
   */
  stop(): void {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    
    this.stats.isRunning = false;
    console.log("Scheduler stopped");
  }

  /**
   * Get scheduler statistics
   */
  getStats(): SchedulerStats {
    return { ...this.stats };
  }

  /**
   * Process due reminders
   */
  private async processReminders(): Promise<void> {
    if (this.isProcessing) {
      if (this.config.enableDebugLogging) {
        console.log("Scheduler already processing, skipping this cycle");
      }
      return;
    }

    this.isProcessing = true;
    this.startTime = Date.now();
    
    try {
      const now = getCurrentTimestamp();
      const cutoffTime = new Date(now.getTime() + 60000); // 1 minute buffer
      
      // Get reminders that need delivery
      const dueReminders = await getRemindersForDelivery(cutoffTime);
      
      if (this.config.enableDebugLogging && dueReminders.length > 0) {
        console.log(`Found ${dueReminders.length} due reminders`);
      }

      // Update stats
      this.stats.pendingReminders = dueReminders.length;
      this.stats.overdueReminders = dueReminders.filter(r => 
        r.nextDeliveryAt && r.nextDeliveryAt < now
      ).length;

      // Process in batches
      const batches = this.createBatches(dueReminders, this.config.batchSize);
      
      for (const batch of batches) {
        await this.processBatch(batch);
      }

      // Update stats
      this.updateStats();
      
    } catch (error) {
      console.error("Error processing reminders:", error);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Create batches from reminder array
   */
  private createBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return batches;
  }

  /**
   * Process a batch of reminders
   */
  private async processBatch(reminders: Reminder[]): Promise<void> {
    const deliveryPromises = reminders.map(reminder => 
      this.processReminder(reminder)
    );

    // Limit concurrency
    const concurrentBatches = this.createBatches(
      deliveryPromises, 
      this.config.maxConcurrentDeliveries
    );

    for (const batch of concurrentBatches) {
      await Promise.allSettled(batch);
    }
  }

  /**
   * Process a single reminder
   */
  private async processReminder(reminder: Reminder): Promise<void> {
    if (!this.deliveryCallback) {
      console.error("No delivery callback set");
      return;
    }

    let retries = 0;
    let lastError: string | undefined;

    while (retries <= this.config.maxRetries) {
      try {
        if (this.config.enableDebugLogging) {
          console.log(`Processing reminder ${reminder.id} (attempt ${retries + 1})`);
        }

        // Attempt delivery
        const result = await this.deliveryCallback(reminder);

        if (result.success) {
          // Update reminder after successful delivery
          const _updatedReminder = updateReminderAfterDelivery(reminder);
          
          // Note: Updated reminder should be saved by the delivery callback
          this.stats.successfulDeliveries++;
          this.stats.totalRemindersProcessed++;
          
          if (this.config.enableDebugLogging) {
            console.log(`Successfully delivered reminder ${reminder.id}`);
          }
          
          return; // Success, exit retry loop
        }

        // Handle failure
        lastError = result.error;
        
        if (!result.shouldRetry) {
          // Don't retry this reminder
          console.error(`Permanent failure for reminder ${reminder.id}: ${result.error}`);
          this.stats.failedDeliveries++;
          this.stats.totalRemindersProcessed++;
          return;
        }

        retries++;
        
        if (retries <= this.config.maxRetries) {
          if (this.config.enableDebugLogging) {
            console.log(`Retrying reminder ${reminder.id} in ${this.config.retryDelayMs}ms`);
          }
          await this.delay(this.config.retryDelayMs);
        }

      } catch (error) {
        lastError = error instanceof Error ? error.message : "Unknown error";
        retries++;
        
        if (retries <= this.config.maxRetries) {
          console.error(`Error processing reminder ${reminder.id} (attempt ${retries}):`, error);
          await this.delay(this.config.retryDelayMs);
        }
      }
    }

    // All retries exhausted
    console.error(`Failed to deliver reminder ${reminder.id} after ${this.config.maxRetries} retries. Last error: ${lastError}`);
    this.stats.failedDeliveries++;
    this.stats.totalRemindersProcessed++;
  }

  /**
   * Update scheduler statistics
   */
  private updateStats(): void {
    const processingTime = Date.now() - this.startTime;
    
    // Update average processing time
    const totalRuns = this.stats.successfulDeliveries + this.stats.failedDeliveries;
    if (totalRuns > 0) {
      this.stats.averageProcessingTime = 
        (this.stats.averageProcessingTime * (totalRuns - 1) + processingTime) / totalRuns;
    } else {
      this.stats.averageProcessingTime = processingTime;
    }

    this.stats.lastRunAt = getCurrentTimestamp();
    this.stats.nextRunAt = new Date(Date.now() + this.config.checkInterval);
  }

  /**
   * Utility function to delay execution
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Check if a reminder is due for delivery
   */
  static isReminderDue(reminder: Reminder, bufferMinutes = 1): boolean {
    if (!reminder.nextDeliveryAt || !reminder.isActive || reminder.status !== "active") {
      return false;
    }

    const now = Date.now();
    const dueTime = reminder.nextDeliveryAt.getTime();
    const bufferMs = bufferMinutes * 60 * 1000;

    // Reminder is due if it's past due time (with buffer)
    return now >= (dueTime - bufferMs);
  }

  /**
   * Calculate statistics for upcoming reminders
   */
  static async getUpcomingStats(hours = 24): Promise<{
    total: number;
    byHour: number[];
    byCategory: Record<string, number>;
  }> {
    try {
      const now = new Date();
      const endTime = new Date(now.getTime() + hours * 60 * 60 * 1000);
      
      const upcomingReminders = await getRemindersForDelivery(endTime);
      
      // Initialize hourly breakdown
      const byHour = new Array(hours).fill(0);
      const byCategory: Record<string, number> = {};

      // Categorize reminders
      for (const reminder of upcomingReminders) {
        if (!reminder.nextDeliveryAt) continue;

        // Calculate hour offset
        const hoursDiff = Math.floor(
          (reminder.nextDeliveryAt.getTime() - now.getTime()) / (60 * 60 * 1000)
        );
        
        if (hoursDiff >= 0 && hoursDiff < hours) {
          byHour[hoursDiff]++;
        }

        // Category breakdown
        byCategory[reminder.category] = (byCategory[reminder.category] || 0) + 1;
      }

      return {
        total: upcomingReminders.length,
        byHour,
        byCategory,
      };
    } catch (error) {
      console.error("Error calculating upcoming stats:", error);
      return {
        total: 0,
        byHour: new Array(hours).fill(0),
        byCategory: {},
      };
    }
  }

  /**
   * Force process all due reminders immediately
   */
  async forceProcessDueReminders(): Promise<{
    processed: number;
    successful: number;
    failed: number;
  }> {
    console.log("Force processing due reminders...");
    
    const initialStats = { ...this.stats };
    await this.processReminders();
    
    return {
      processed: this.stats.totalRemindersProcessed - initialStats.totalRemindersProcessed,
      successful: this.stats.successfulDeliveries - initialStats.successfulDeliveries,
      failed: this.stats.failedDeliveries - initialStats.failedDeliveries,
    };
  }

  /**
   * Get configuration
   */
  getConfig(): SchedulerConfig {
    return { ...this.config };
  }

  /**
   * Update configuration (requires restart)
   */
  updateConfig(newConfig: Partial<SchedulerConfig>): void {
    const wasRunning = this.stats.isRunning;
    
    if (wasRunning) {
      this.stop();
    }
    
    this.config = { ...this.config, ...newConfig };
    
    if (wasRunning) {
      // Note: This would need to be awaited in real usage
      this.start().catch(console.error);
    }
  }

  /**
   * Health check for the scheduler
   */
  getHealthStatus(): {
    status: "healthy" | "unhealthy" | "degraded";
    issues: string[];
    uptime: number;
    lastRun: Date;
  } {
    const issues: string[] = [];
    const now = Date.now();
    const uptime = this.stats.isRunning ? now - this.startTime : 0;
    
    // Check if scheduler is running
    if (!this.stats.isRunning) {
      issues.push("Scheduler is not running");
    }

    // Check if last run was recent
    const timeSinceLastRun = now - this.stats.lastRunAt.getTime();
    const expectedInterval = this.config.checkInterval * 2; // Allow 2x interval
    
    if (timeSinceLastRun > expectedInterval) {
      issues.push(`Last run was ${Math.round(timeSinceLastRun / 1000)}s ago (expected within ${Math.round(expectedInterval / 1000)}s)`);
    }

    // Check failure rate
    const totalDeliveries = this.stats.successfulDeliveries + this.stats.failedDeliveries;
    if (totalDeliveries > 10) {
      const failureRate = this.stats.failedDeliveries / totalDeliveries;
      if (failureRate > 0.1) { // More than 10% failure rate
        issues.push(`High failure rate: ${Math.round(failureRate * 100)}%`);
      }
    }

    // Check processing time
    if (this.stats.averageProcessingTime > 30000) { // More than 30 seconds
      issues.push(`Slow processing: ${Math.round(this.stats.averageProcessingTime / 1000)}s average`);
    }

    let status: "healthy" | "unhealthy" | "degraded" = "healthy";
    if (issues.length > 0) {
      status = this.stats.isRunning ? "degraded" : "unhealthy";
    }

    return {
      status,
      issues,
      uptime,
      lastRun: this.stats.lastRunAt,
    };
  }
}

/**
 * Global scheduler instance
 */
let globalScheduler: ReminderScheduler | null = null;

/**
 * Get or create the global scheduler instance
 */
export function getScheduler(config?: Partial<SchedulerConfig>): ReminderScheduler {
  if (!globalScheduler) {
    globalScheduler = new ReminderScheduler(config);
  }
  return globalScheduler;
}

/**
 * Initialize the scheduler with a delivery callback
 */
export function initializeScheduler(
  deliveryCallback: DeliveryCallback,
  config?: Partial<SchedulerConfig>
): ReminderScheduler {
  const scheduler = getScheduler(config);
  scheduler.setDeliveryCallback(deliveryCallback);
  return scheduler;
}

/**
 * Start the global scheduler
 */
export async function startScheduler(): Promise<void> {
  const scheduler = getScheduler();
  await scheduler.start();
}

/**
 * Stop the global scheduler
 */
export function stopScheduler(): void {
  if (globalScheduler) {
    globalScheduler.stop();
  }
}

/**
 * Get scheduler statistics
 */
export function getSchedulerStats(): SchedulerStats | null {
  return globalScheduler?.getStats() || null;
}

/**
 * Utility function to format duration
 */
export function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
}