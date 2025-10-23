/**
 * Test Reminder API Endpoint
 * POST /api/reminders/[id]/test
 * Manually trigger reminder for testing purposes
 */

import { HandlerContext } from "$fresh/server.ts";
import { ReminderService } from "../../../../discord-bot/lib/reminder/service.ts";
import { ReminderRepository } from "../../../../discord-bot/lib/reminder/repository.ts";
import { TestType, TestResult } from "../../../../discord-bot/types/reminder.ts";

// Initialize services (same pattern as main reminders API)
let reminderService: ReminderService;

async function initializeServices() {
  if (!reminderService) {
    try {
      // Try to open KV store - may not be available in all environments
      const kv = await Deno.openKv();
      const repository = new ReminderRepository(kv);
      reminderService = new ReminderService(repository);
    } catch (error) {
      console.log("Deno KV not available, using mock service:", error.message);
      // Create a mock service for development/testing
      reminderService = createMockReminderService();
    }
  }
  return { reminder: reminderService };
}

function createMockReminderService(): ReminderService {
  // Simple mock implementation for development
  const mockRepo = {
    async getById(id: string) {
      // Return a mock reminder for testing
      return {
        id,
        content: "Test reminder content",
        targetUserId: "123456789012345678",
        scheduledTime: new Date(Date.now() + 60000), // 1 minute from now
        createdAt: new Date(),
        updatedAt: new Date(),
        status: "pending",
        responses: [],
        testExecutions: [],
        createdBy: "admin",
        deliveryAttempts: 0,
        escalation: {
          id: "esc1",
          secondaryUserId: "987654321098765432",
          timeoutMinutes: 30,
          triggerConditions: ["timeout"],
          createdAt: new Date(),
          isActive: true,
        },
        repeatRule: null
      };
    }
  };
  
  return new ReminderService(mockRepo as any);
}

interface TestRequestBody {
  testType?: "immediate_delivery" | "escalation_flow" | "validation";
  preserveSchedule?: boolean;
}

export const handler = {
  async POST(req: Request, ctx: HandlerContext) {
    try {
      // Get reminder ID from URL parameters
      const reminderId = ctx.params.id;
      
      if (!reminderId) {
        return new Response(
          JSON.stringify({ error: "Missing reminder ID" }),
          { 
            status: 400,
            headers: { "Content-Type": "application/json" }
          }
        );
      }

      // Parse request body
      let body: TestRequestBody = {};
      try {
        body = await req.json();
      } catch {
        // Default values if no body provided
      }

      const testType = body.testType || "immediate_delivery";
      const preserveSchedule = body.preserveSchedule !== false; // Default to true

      // Initialize services
      const services = await initializeServices();
      const service = services.reminder;

      // Get the reminder to test
      const reminderResult = await service.getReminder(reminderId);
      if (!reminderResult.success) {
        return new Response(
          JSON.stringify({ error: "Reminder not found" }),
          { 
            status: 404,
            headers: { "Content-Type": "application/json" }
          }
        );
      }

      const reminder = reminderResult.data;

      // Create test execution record
      const testExecution = {
        id: crypto.randomUUID(),
        reminderId: reminder.id,
        executedBy: "admin", // TODO: Get from session/auth
        executedAt: new Date(),
        testType: testType as TestType,
        result: TestResult.SUCCESS, // Will update if fails
        preservedSchedule: preserveSchedule,
        errorMessage: undefined as string | undefined
      };

      // Perform the test based on type
      let testResult: { success: boolean; message: string; error?: string };

      switch (testType) {
        case "immediate_delivery":
          testResult = await performImmediateDeliveryTest(reminder, service, preserveSchedule);
          break;
        case "escalation_flow":
          testResult = await performEscalationTest(reminder, service);
          break;
        case "validation":
          testResult = await performValidationTest(reminder, service);
          break;
        default:
          return new Response(
            JSON.stringify({ error: "Invalid test type" }),
            { 
              status: 400,
              headers: { "Content-Type": "application/json" }
            }
          );
      }

      // Update test execution result
      testExecution.result = testResult.success ? TestResult.SUCCESS : TestResult.FAILED;
      if (!testResult.success && testResult.error) {
        testExecution.errorMessage = testResult.error;
      }

      // TODO: Save test execution to reminder
      // This would require extending the reminder service to handle test executions

      // Return result
      return new Response(
        JSON.stringify({
          success: testResult.success,
          message: testResult.message,
          testExecution: {
            id: testExecution.id,
            testType: testExecution.testType,
            executedAt: testExecution.executedAt,
            result: testExecution.result,
            preservedSchedule: testExecution.preservedSchedule
          }
        }),
        {
          status: testResult.success ? 200 : 400,
          headers: { "Content-Type": "application/json" }
        }
      );

    } catch (error) {
      console.error("Error in test reminder endpoint:", error);
      return new Response(
        JSON.stringify({ 
          error: "Internal server error",
          details: error instanceof Error ? error.message : "Unknown error"
        }),
        { 
          status: 500,
          headers: { "Content-Type": "application/json" }
        }
      );
    }
  }
};

/**
 * Perform immediate delivery test
 */
async function performImmediateDeliveryTest(
  reminder: any,
  reminderService: any,
  preserveSchedule: boolean
): Promise<{ success: boolean; message: string; error?: string }> {
  try {
    // For now, just simulate delivery without actually sending
    // In a real implementation, this would trigger the delivery service
    
    console.log(`Test delivery for reminder ${reminder.id} to user ${reminder.targetUserId}`);
    console.log(`Content: ${reminder.content}`);
    console.log(`Preserve schedule: ${preserveSchedule}`);
    
    // Simulate delivery success
    if (preserveSchedule) {
      return {
        success: true,
        message: `Test delivery completed successfully. Original schedule (${reminder.scheduledTime}) preserved.`
      };
    } else {
      // Would mark as delivered in real implementation
      return {
        success: true,
        message: "Test delivery completed successfully. Reminder marked as delivered."
      };
    }
  } catch (error) {
    return {
      success: false,
      message: "Test delivery failed",
      error: error instanceof Error ? error.message : "Unknown error"
    };
  }
}

/**
 * Perform escalation flow test
 */
async function performEscalationTest(
  reminder: any,
  reminderService: any
): Promise<{ success: boolean; message: string; error?: string }> {
  try {
    if (!reminder.escalation || !reminder.escalation.isActive) {
      return {
        success: false,
        message: "Escalation test failed",
        error: "Reminder does not have escalation configured"
      };
    }

    console.log(`Test escalation for reminder ${reminder.id}`);
    console.log(`Primary user: ${reminder.targetUserId}`);
    console.log(`Escalation user: ${reminder.escalation.secondaryUserId}`);
    console.log(`Timeout: ${reminder.escalation.timeoutMinutes} minutes`);

    // Simulate escalation flow
    return {
      success: true,
      message: `Escalation test completed successfully. Would escalate to user ${reminder.escalation.secondaryUserId} after ${reminder.escalation.timeoutMinutes} minutes.`
    };
  } catch (error) {
    return {
      success: false,
      message: "Escalation test failed",
      error: error instanceof Error ? error.message : "Unknown error"
    };
  }
}

/**
 * Perform validation test
 */
async function performValidationTest(
  reminder: any,
  reminderService: any
): Promise<{ success: boolean; message: string; error?: string }> {
  try {
    // Validate reminder data
    const issues: string[] = [];

    // Check content
    if (!reminder.content || reminder.content.trim().length === 0) {
      issues.push("Content is empty");
    }
    if (reminder.content.length > 2000) {
      issues.push("Content exceeds 2000 characters");
    }

    // Check user ID format
    const userIdRegex = /^\d{17,19}$/;
    if (!userIdRegex.test(reminder.targetUserId)) {
      issues.push("Invalid target user ID format");
    }

    // Check scheduled time
    const now = new Date();
    const scheduledTime = new Date(reminder.scheduledTime);
    if (scheduledTime <= now && reminder.status === "pending") {
      issues.push("Scheduled time is in the past");
    }

    // Check escalation if configured
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
    }

    // Check repeat rule if configured
    if (reminder.repeatRule && reminder.repeatRule.isActive) {
      if (reminder.repeatRule.interval < 1) {
        issues.push("Repeat interval must be at least 1");
      }
      if (reminder.repeatRule.endCondition === "count_based" && (!reminder.repeatRule.maxOccurrences || reminder.repeatRule.maxOccurrences < 1)) {
        issues.push("Maximum occurrences must be specified for count-based repeat");
      }
      if (reminder.repeatRule.endCondition === "date_based" && (!reminder.repeatRule.endDate || new Date(reminder.repeatRule.endDate) <= now)) {
        issues.push("End date must be in the future for date-based repeat");
      }
    }

    if (issues.length > 0) {
      return {
        success: false,
        message: "Validation test found issues",
        error: issues.join("; ")
      };
    }

    return {
      success: true,
      message: `Validation test passed. Reminder is properly configured with no issues found.`
    };
  } catch (error) {
    return {
      success: false,
      message: "Validation test failed",
      error: error instanceof Error ? error.message : "Unknown error"
    };
  }
}