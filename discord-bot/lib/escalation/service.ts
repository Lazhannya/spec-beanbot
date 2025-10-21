// Escalation system for unacknowledged reminders
// This module handles automatic escalation of reminders that haven't been acknowledged

import { getReminderById, createDelivery } from "../storage/reminders.ts";
import { sendReminderViaDiscord } from "../discord/messenger.ts";
import type { Reminder, ReminderDelivery, EscalationTarget } from "../types/reminders.ts";

/**
 * Escalation configuration
 */
export interface EscalationConfig {
  enabled: boolean;
  checkInterval: number; // Minutes between escalation checks
  escalationLevels: EscalationLevel[];
  maxEscalationLevel: number;
  stopOnAcknowledgment: boolean;
}

/**
 * Escalation level configuration
 */
export interface EscalationLevel {
  level: number;
  delayMinutes: number; // Minutes to wait before this escalation
  targets: EscalationTarget[];
  message?: string; // Optional custom escalation message
  requiresConfirmation?: boolean; // Whether escalation needs manual approval
}

/**
 * Escalation check result
 */
export interface EscalationResult {
  reminderId: string;
  originalDeliveryId: string;
  escalationLevel: number;
  targetsNotified: string[];
  success: boolean;
  errors?: string[];
}

/**
 * Escalation batch result
 */
export interface EscalationBatchResult {
  totalChecked: number;
  escalationsTriggered: number;
  escalationResults: EscalationResult[];
  errors: string[];
  processedAt: Date;
}

/**
 * Default escalation configuration
 */
const DEFAULT_ESCALATION_CONFIG: EscalationConfig = {
  enabled: true,
  checkInterval: 5, // Check every 5 minutes
  escalationLevels: [
    {
      level: 1,
      delayMinutes: 15, // Escalate after 15 minutes
      targets: [{ type: "manager", userId: "" }],
    },
    {
      level: 2,
      delayMinutes: 30, // Escalate after 30 minutes total
      targets: [
        { type: "manager", userId: "" },
        { type: "team_lead", userId: "" },
      ],
    },
    {
      level: 3,
      delayMinutes: 60, // Escalate after 1 hour total
      targets: [
        { type: "manager", userId: "" },
        { type: "team_lead", userId: "" },
        { type: "executive", userId: "" },
      ],
      requiresConfirmation: true,
    },
  ],
  maxEscalationLevel: 3,
  stopOnAcknowledgment: true,
};

/**
 * Escalation service for managing reminder escalations
 */
export class EscalationService {
  private config: EscalationConfig;
  private running = false;
  private intervalId?: number;

  constructor(config: Partial<EscalationConfig> = {}) {
    this.config = { ...DEFAULT_ESCALATION_CONFIG, ...config };
  }

  /**
   * Start the escalation monitoring service
   */
  start(): void {
    if (this.running) {
      console.log("Escalation service is already running");
      return;
    }

    if (!this.config.enabled) {
      console.log("Escalation service is disabled");
      return;
    }

    console.log(`Starting escalation service (check interval: ${this.config.checkInterval} minutes)`);
    
    this.running = true;
    this.intervalId = setInterval(
      () => this.checkForEscalations(),
      this.config.checkInterval * 60 * 1000
    );

    // Run initial check
    this.checkForEscalations();
  }

  /**
   * Stop the escalation monitoring service
   */
  stop(): void {
    if (!this.running) {
      return;
    }

    console.log("Stopping escalation service");
    this.running = false;
    
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }
  }

  /**
   * Check for reminders that need escalation
   */
  async checkForEscalations(): Promise<EscalationBatchResult> {
    const result: EscalationBatchResult = {
      totalChecked: 0,
      escalationsTriggered: 0,
      escalationResults: [],
      errors: [],
      processedAt: new Date(),
    };

    try {
      console.log("Checking for reminders that need escalation...");

      // TODO: Implement query for unacknowledged deliveries that are due for escalation
      // For now, we'll simulate the process
      const candidateDeliveries = await this.getEscalationCandidates();
      result.totalChecked = candidateDeliveries.length;

      for (const delivery of candidateDeliveries) {
        try {
          const escalationResult = await this.processEscalation(delivery);
          if (escalationResult) {
            result.escalationResults.push(escalationResult);
            if (escalationResult.success) {
              result.escalationsTriggered++;
            }
          }
        } catch (error) {
          const errorMsg = `Failed to process escalation for delivery ${delivery.id}: ${error}`;
          console.error(errorMsg);
          result.errors.push(errorMsg);
        }
      }

      console.log(
        `Escalation check complete: ${result.totalChecked} checked, ${result.escalationsTriggered} escalated`
      );

    } catch (error) {
      const errorMsg = `Error during escalation check: ${error}`;
      console.error(errorMsg);
      result.errors.push(errorMsg);
    }

    return result;
  }

  /**
   * Get deliveries that are candidates for escalation
   */
  private getEscalationCandidates(): Promise<ReminderDelivery[]> {
    // TODO: Implement proper query for unacknowledged deliveries
    // This would:
    // 1. Find deliveries with status "delivered" but acknowledged = false
    // 2. Check if enough time has passed for escalation based on config
    // 3. Ensure reminder is still active and has escalation enabled
    // 4. Check that max escalation level hasn't been reached

    console.log("Simulating escalation candidate query...");
    return Promise.resolve([]); // Return empty for now
  }

  /**
   * Process escalation for a specific delivery
   */
  private async processEscalation(delivery: ReminderDelivery): Promise<EscalationResult | null> {
    try {
      // Get the associated reminder
      const reminder = await getReminderById(delivery.reminderId);
      if (!reminder) {
        throw new Error("Associated reminder not found");
      }

      // Check if escalation should be stopped (already acknowledged)
      if (delivery.acknowledged && this.config.stopOnAcknowledgment) {
        return null; // Don't escalate acknowledged reminders
      }

      // Check if reminder allows escalation
      if (!reminder.escalation.enabled) {
        return null; // Escalation disabled for this reminder
      }

      // Calculate next escalation level
      const nextLevel = this.calculateNextEscalationLevel(reminder, delivery);
      if (nextLevel === null) {
        return null; // No escalation needed or max level reached
      }

      // Get escalation level configuration
      const levelConfig = this.config.escalationLevels.find(l => l.level === nextLevel);
      if (!levelConfig) {
        throw new Error(`Escalation level ${nextLevel} configuration not found`);
      }

      // Check if confirmation is required and not yet approved
      if (levelConfig.requiresConfirmation) {
        console.log(`Escalation level ${nextLevel} requires confirmation - skipping automatic escalation`);
        return null;
      }

      // Process escalation
      return await this.executeEscalation(reminder, delivery, levelConfig);

    } catch (error) {
      console.error(`Error processing escalation for delivery ${delivery.id}:`, error);
      return {
        reminderId: delivery.reminderId,
        originalDeliveryId: delivery.id,
        escalationLevel: 0,
        targetsNotified: [],
        success: false,
        errors: [error instanceof Error ? error.message : String(error)],
      };
    }
  }

  /**
   * Calculate the next escalation level needed
   */
  private calculateNextEscalationLevel(reminder: Reminder, delivery: ReminderDelivery): number | null {
    const now = new Date();
    const deliveryTime = delivery.deliveredAt;
    const minutesSinceDelivery = Math.floor((now.getTime() - deliveryTime.getTime()) / (1000 * 60));

    // Check current escalation level
    const currentLevel = reminder.escalation.escalationCount || 0;
    
    // Check if max level reached
    if (currentLevel >= this.config.maxEscalationLevel) {
      return null;
    }

    // Find the appropriate escalation level based on time elapsed
    for (const levelConfig of this.config.escalationLevels) {
      if (levelConfig.level > currentLevel && minutesSinceDelivery >= levelConfig.delayMinutes) {
        return levelConfig.level;
      }
    }

    return null; // No escalation needed yet
  }

  /**
   * Execute escalation for a specific level
   */
  private async executeEscalation(
    reminder: Reminder,
    originalDelivery: ReminderDelivery,
    levelConfig: EscalationLevel
  ): Promise<EscalationResult> {
    const result: EscalationResult = {
      reminderId: reminder.id,
      originalDeliveryId: originalDelivery.id,
      escalationLevel: levelConfig.level,
      targetsNotified: [],
      success: false,
      errors: [],
    };

    try {
      console.log(
        `Executing escalation level ${levelConfig.level} for reminder ${reminder.id}`
      );

      // Send escalation messages to all targets
      for (const target of levelConfig.targets) {
        try {
          const targetUserId = await this.resolveEscalationTarget(target, reminder.targetUser);
          if (!targetUserId) {
            result.errors?.push(`Could not resolve escalation target: ${target.type}`);
            continue;
          }

          // Send escalation message via Discord
          const escalationResult = await sendReminderViaDiscord(
            {
              ...reminder,
              title: `⚠️ ESCALATION: ${reminder.title}`,
              message: levelConfig.message || 
                `This reminder requires attention. Original recipient <@${reminder.targetUser}> has not responded.\n\n**Original message:** ${reminder.message}`,
            },
            "dm"
          );

          if (escalationResult.success) {
            result.targetsNotified.push(targetUserId);

            // Create escalation delivery record
            await createDelivery({
              reminderId: reminder.id,
              targetUser: targetUserId,
              deliveredAt: new Date(),
              deliveryMethod: "dm",
              messageId: escalationResult.messageId,
              channelId: escalationResult.channelId,
              messageContent: levelConfig.message || reminder.message,
              status: "delivered",
              acknowledged: false,
              attemptCount: 1,
              lastAttemptAt: new Date(),
              isEscalation: true,
              escalationLevel: levelConfig.level,
              originalDeliveryId: originalDelivery.id,
            });

          } else {
            result.errors?.push(
              `Failed to send escalation to ${targetUserId}: ${escalationResult.error}`
            );
          }

        } catch (error) {
          result.errors?.push(`Error escalating to target ${target.type}: ${error}`);
        }
      }

      // Update reminder escalation tracking
      // TODO: Update reminder with new escalation count and timestamp
      console.log(`Would update reminder ${reminder.id} escalation count to ${levelConfig.level}`);

      result.success = result.targetsNotified.length > 0;

    } catch (error) {
      result.errors?.push(`Escalation execution failed: ${error}`);
    }

    return result;
  }

  /**
   * Resolve escalation target to actual user ID
   */
  private resolveEscalationTarget(target: EscalationTarget, _originalUserId: string): Promise<string | null> {
    // If target has explicit user ID, use it
    if (target.userId) {
      return Promise.resolve(target.userId);
    }

    // TODO: Implement target resolution based on type
    // This would involve:
    // - Looking up manager/team lead relationships
    // - Checking organizational hierarchy
    // - Using fallback targets if primary not available

    console.log(`Would resolve escalation target type: ${target.type}`);
    return Promise.resolve(null); // Return null for now since we don't have org data
  }

  /**
   * Get escalation statistics
   */
  getEscalationStats(): Promise<{
    totalEscalations: number;
    escalationsByLevel: Record<number, number>;
    averageEscalationTime: number;
    successRate: number;
  }> {
    // TODO: Implement escalation statistics
    return Promise.resolve({
      totalEscalations: 0,
      escalationsByLevel: {},
      averageEscalationTime: 0,
      successRate: 0,
    });
  }

  /**
   * Manually trigger escalation for a specific reminder
   */
  manualEscalation(reminderId: string, level: number): Promise<EscalationResult> {
    // TODO: Implement manual escalation trigger
    console.log(`Manual escalation requested for reminder ${reminderId} at level ${level}`);
    return Promise.resolve({
      reminderId,
      originalDeliveryId: "",
      escalationLevel: level,
      targetsNotified: [],
      success: false,
      errors: ["Manual escalation not yet implemented"],
    });
  }
}

/**
 * Global escalation service instance
 */
let globalEscalationService: EscalationService | null = null;

/**
 * Initialize the global escalation service
 */
export function initializeEscalationService(config?: Partial<EscalationConfig>): EscalationService {
  if (!globalEscalationService) {
    globalEscalationService = new EscalationService(config);
  }
  return globalEscalationService;
}

/**
 * Get the global escalation service instance
 */
export function getEscalationService(): EscalationService | null {
  return globalEscalationService;
}

/**
 * Start the global escalation service
 */
export function startEscalationService(): void {
  const service = getEscalationService();
  if (service) {
    service.start();
  } else {
    console.error("Escalation service not initialized");
  }
}

/**
 * Stop the global escalation service
 */
export function stopEscalationService(): void {
  const service = getEscalationService();
  if (service) {
    service.stop();
  }
}