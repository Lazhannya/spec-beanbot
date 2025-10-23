/**
 * Test Execution Service
 * Handles test reminder delivery and execution tracking
 */

import { Reminder, TestExecution, TestType, TestResult } from "../../types/reminder.ts";
import { ReminderRepository } from "./repository.ts";
import { DiscordDeliveryService } from "../discord/delivery.ts";

/**
 * Test execution service for manual reminder testing
 */
export class TestExecutionService {
  private repository: ReminderRepository;
  private deliveryService: DiscordDeliveryService;

  constructor(repository: ReminderRepository, deliveryService: DiscordDeliveryService) {
    this.repository = repository;
    this.deliveryService = deliveryService;
  }

  /**
   * Execute immediate delivery test
   * Sends reminder immediately without changing scheduled time
   */
  async executeImmediateDelivery(
    reminderId: string,
    executedBy: string,
    preserveSchedule: boolean = true
  ): Promise<{ 
    success: boolean; 
    testExecution?: TestExecution; 
    error?: string 
  }> {
    try {
      // Get reminder
      const reminder = await this.repository.getById(reminderId);
      if (!reminder) {
        return {
          success: false,
          error: "Reminder not found"
        };
      }

      // Create test execution record
      const testExecution: TestExecution = {
        id: crypto.randomUUID(),
        reminderId: reminder.id,
        executedBy,
        executedAt: new Date(),
        testType: TestType.IMMEDIATE_DELIVERY,
        result: TestResult.SUCCESS,
        preservedSchedule: preserveSchedule
      };

      // Send Discord message
      console.log(`[TestExecution] Sending immediate test delivery for reminder ${reminderId}`);
      const deliveryResult = await this.deliveryService.sendReminder(reminder);

      if (!deliveryResult.success) {
        testExecution.result = TestResult.FAILED;
        testExecution.errorMessage = deliveryResult.error || "Discord delivery failed";

        // Still log the failed test
        await this.logTestExecution(reminderId, testExecution);

        return {
          success: false,
          testExecution,
          error: testExecution.errorMessage
        };
      }

      console.log(`[TestExecution] Test delivery successful. Message ID: ${deliveryResult.messageId}`);

      // Log successful test execution
      await this.logTestExecution(reminderId, testExecution);

      // If not preserving schedule, update reminder status
      if (!preserveSchedule) {
        console.log(`[TestExecution] Marking reminder as delivered (schedule not preserved)`);
        const { ReminderStatus } = await import("../../types/reminder.ts");
        await this.repository.update(reminderId, {
          status: ReminderStatus.SENT,
          deliveryAttempts: (reminder.deliveryAttempts || 0) + 1,
          lastDeliveryAttempt: new Date(),
          updatedAt: new Date()
        });
      }

      return {
        success: true,
        testExecution
      };

    } catch (error) {
      console.error(`[TestExecution] Error executing immediate delivery test:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred"
      };
    }
  }

  /**
   * Execute escalation flow test
   * Tests escalation delivery without triggering actual escalation
   */
  async executeEscalationTest(
    reminderId: string,
    executedBy: string
  ): Promise<{ 
    success: boolean; 
    testExecution?: TestExecution; 
    error?: string 
  }> {
    try {
      // Get reminder
      const reminder = await this.repository.getById(reminderId);
      if (!reminder) {
        return {
          success: false,
          error: "Reminder not found"
        };
      }

      // Verify escalation is configured
      if (!reminder.escalation || !reminder.escalation.isActive) {
        return {
          success: false,
          error: "Reminder does not have escalation configured"
        };
      }

      // Create test execution record
      const testExecution: TestExecution = {
        id: crypto.randomUUID(),
        reminderId: reminder.id,
        executedBy,
        executedAt: new Date(),
        testType: TestType.ESCALATION_FLOW,
        result: TestResult.SUCCESS,
        preservedSchedule: true
      };

      // Prepare test escalation message
      const testMessage = `[ESCALATION TEST]\n\n${reminder.content}\n\n⚠️ This is a test of the escalation system. No action required.`;

      // Send escalation message
      console.log(`[TestExecution] Sending escalation test for reminder ${reminderId}`);
      const escalationResult = await this.deliveryService.sendEscalation(reminder, testMessage);

      if (!escalationResult.success) {
        testExecution.result = TestResult.FAILED;
        testExecution.errorMessage = escalationResult.error || "Escalation delivery failed";

        // Log failed test
        await this.logTestExecution(reminderId, testExecution);

        return {
          success: false,
          testExecution,
          error: testExecution.errorMessage
        };
      }

      console.log(`[TestExecution] Escalation test successful. Message ID: ${escalationResult.messageId}`);

      // Log successful test
      await this.logTestExecution(reminderId, testExecution);

      return {
        success: true,
        testExecution
      };

    } catch (error) {
      console.error(`[TestExecution] Error executing escalation test:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred"
      };
    }
  }

  /**
   * Execute validation test
   * Validates reminder configuration without sending messages
   */
  async executeValidationTest(
    reminderId: string,
    executedBy: string
  ): Promise<{ 
    success: boolean; 
    testExecution?: TestExecution; 
    error?: string;
    validationIssues?: string[]
  }> {
    try {
      // Get reminder
      const reminder = await this.repository.getById(reminderId);
      if (!reminder) {
        return {
          success: false,
          error: "Reminder not found"
        };
      }

      // Create test execution record
      const testExecution: TestExecution = {
        id: crypto.randomUUID(),
        reminderId: reminder.id,
        executedBy,
        executedAt: new Date(),
        testType: TestType.VALIDATION,
        result: TestResult.SUCCESS,
        preservedSchedule: true
      };

      // Perform validation checks
      const issues = this.validateReminder(reminder);

      if (issues.length > 0) {
        testExecution.result = TestResult.PARTIAL;
        testExecution.errorMessage = `Validation found ${issues.length} issue(s): ${issues.join("; ")}`;

        // Log validation result
        await this.logTestExecution(reminderId, testExecution);

        return {
          success: false,
          testExecution,
          error: testExecution.errorMessage,
          validationIssues: issues
        };
      }

      console.log(`[TestExecution] Validation test passed for reminder ${reminderId}`);

      // Log successful validation
      await this.logTestExecution(reminderId, testExecution);

      return {
        success: true,
        testExecution
      };

    } catch (error) {
      console.error(`[TestExecution] Error executing validation test:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred"
      };
    }
  }

  /**
   * Validate reminder configuration
   */
  private validateReminder(reminder: Reminder): string[] {
    const issues: string[] = [];

    // Content validation
    if (!reminder.content || reminder.content.trim().length === 0) {
      issues.push("Content is empty");
    }
    if (reminder.content && reminder.content.length > 2000) {
      issues.push("Content exceeds Discord's 2000 character limit");
    }

    // User ID validation
    const userIdRegex = /^\d{17,19}$/;
    if (!userIdRegex.test(reminder.targetUserId)) {
      issues.push("Invalid target user ID format (must be 17-19 digits)");
    }

    // Scheduled time validation
    const now = new Date();
    const scheduledTime = new Date(reminder.scheduledTime);
    if (scheduledTime <= now && reminder.status === "pending") {
      issues.push("Scheduled time is in the past");
    }

    // Escalation validation
    if (reminder.escalation && reminder.escalation.isActive) {
      if (!userIdRegex.test(reminder.escalation.secondaryUserId)) {
        issues.push("Invalid escalation user ID format");
      }
      if (reminder.escalation.secondaryUserId === reminder.targetUserId) {
        issues.push("Escalation user cannot be the same as target user");
      }
      if (reminder.escalation.timeoutMinutes < 1 || reminder.escalation.timeoutMinutes > 10080) {
        issues.push("Invalid escalation timeout (must be 1-10080 minutes)");
      }
      if (reminder.escalation.timeoutMessage && reminder.escalation.timeoutMessage.length > 2000) {
        issues.push("Timeout escalation message exceeds 2000 characters");
      }
      if (reminder.escalation.declineMessage && reminder.escalation.declineMessage.length > 2000) {
        issues.push("Decline escalation message exceeds 2000 characters");
      }
    }

    // Repeat rule validation
    if (reminder.repeatRule && reminder.repeatRule.isActive) {
      if (reminder.repeatRule.interval < 1) {
        issues.push("Repeat interval must be at least 1");
      }
      if (reminder.repeatRule.endCondition === "count_based") {
        if (!reminder.repeatRule.maxOccurrences || reminder.repeatRule.maxOccurrences < 1) {
          issues.push("Maximum occurrences must be specified and >= 1 for count-based repeat");
        }
      }
      if (reminder.repeatRule.endCondition === "date_based") {
        if (!reminder.repeatRule.endDate) {
          issues.push("End date must be specified for date-based repeat");
        } else if (new Date(reminder.repeatRule.endDate) <= now) {
          issues.push("End date must be in the future for date-based repeat");
        }
      }
    }

    return issues;
  }

  /**
   * Log test execution to reminder
   */
  private async logTestExecution(
    reminderId: string,
    testExecution: TestExecution
  ): Promise<void> {
    try {
      const reminder = await this.repository.getById(reminderId);
      if (!reminder) {
        console.error(`[TestExecution] Cannot log test - reminder ${reminderId} not found`);
        return;
      }

      const updatedTestExecutions = [
        ...(reminder.testExecutions || []),
        testExecution
      ];

      await this.repository.update(reminderId, {
        testExecutions: updatedTestExecutions,
        updatedAt: new Date()
      });

      console.log(`[TestExecution] Logged test execution ${testExecution.id} to reminder ${reminderId}`);
    } catch (error) {
      console.error(`[TestExecution] Error logging test execution:`, error);
    }
  }

  /**
   * Get test execution history for a reminder
   */
  async getTestHistory(reminderId: string): Promise<{
    success: boolean;
    tests?: TestExecution[];
    error?: string;
  }> {
    try {
      const reminder = await this.repository.getById(reminderId);
      if (!reminder) {
        return {
          success: false,
          error: "Reminder not found"
        };
      }

      return {
        success: true,
        tests: reminder.testExecutions || []
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred"
      };
    }
  }
}
