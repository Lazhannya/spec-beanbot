/**
 * Reminders API Endpoints
 * GET /api/reminders - List reminders with filtering
 * POST /api/reminders - Create new reminder
 */

import { HandlerContext } from "$fresh/server.ts";
import { ReminderService, CreateReminderOptions } from "../../../discord-bot/lib/reminder/service.ts";
import { ReminderRepository } from "../../../discord-bot/lib/reminder/repository.ts";
import { Reminder, ReminderStatus } from "../../../discord-bot/types/reminder.ts";

// Initialize services (in a real app, this would be dependency injected)
let reminderService: ReminderService;

async function initializeServices() {
  if (!reminderService) {
    try {
      // Try to open KV store - may not be available in all environments
      const kv = await Deno.openKv();
      const repository = new ReminderRepository(kv);
      const { createReminderServiceWithRepository } = await import("../../../discord-bot/lib/utils/service-factory.ts");
      reminderService = createReminderServiceWithRepository(repository, kv);
    } catch (error) {
      // If KV is not available, create a mock service for development
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      console.warn("Deno KV not available, using mock service:", errorMessage);
      reminderService = createMockReminderService();
    }
  }
  return reminderService;
}

// Mock service for development when KV is not available
function createMockReminderService(): ReminderService {
  const mockReminders: Reminder[] = [];
  
  return {
    createReminder(options: CreateReminderOptions) {
      const timezone = options.timezone || 'Europe/Berlin';
      const reminder: Reminder = {
        id: `mock-${Date.now()}`,
        content: options.content,
        targetUserId: options.targetUserId,
        scheduledTime: options.scheduledTime,
        timezone: timezone,
        scheduledTimezone: timezone,
        userDisplayTime: options.scheduledTime.toLocaleString(),
        utcScheduledTime: options.scheduledTime,
        createdBy: options.createdBy || 'admin',
        status: 'pending' as ReminderStatus,
        createdAt: new Date(),
        updatedAt: new Date(),
        deliveryAttempts: 0,
        responses: [],
        testExecutions: []
      };
      
      if (options.escalation) {
        reminder.escalation = {
          id: crypto.randomUUID(),
          secondaryUserId: options.escalation.secondaryUserId,
          timeoutMinutes: options.escalation.timeoutMinutes,
          triggerConditions: [],
          createdAt: new Date(),
          isActive: true,
        };
      }
      mockReminders.push(reminder);
      return Promise.resolve({ success: true, data: reminder });
    },
    
    getAllReminders(offset: number = 0, limit: number = 20) {
      const slice = mockReminders.slice(offset, offset + limit);
      return Promise.resolve({ success: true, data: slice });
    },
    
    getRemindersByStatus(status: string, limit: number = 20) {
      const filtered = mockReminders.filter(r => r.status === status).slice(0, limit);
      return Promise.resolve({ success: true, data: filtered });
    }
  } as Partial<ReminderService> as ReminderService;
}

// GET /api/reminders - List reminders
export async function handler(req: Request, _ctx: HandlerContext) {
  const url = new URL(req.url);
  
  if (req.method === "GET") {
    return await handleGetReminders(url);
  } else if (req.method === "POST") {
    return await handleCreateReminder(req);
  } else {
    return new Response("Method not allowed", { status: 405 });
  }
}

async function handleGetReminders(url: URL) {
  try {
    const service = await initializeServices();
    
    // Parse query parameters
    const status = url.searchParams.get("status");
    const _userId = url.searchParams.get("userId");
    const limit = parseInt(url.searchParams.get("limit") || "20");
    const offset = parseInt(url.searchParams.get("offset") || "0");

    let result;
    
    if (status && status !== "all") {
      // Filter by status
      result = await service.getRemindersByStatus(status as ReminderStatus, limit);
    } else {
      // Get all reminders with pagination
      result = await service.getAllReminders(offset, limit);
    }

    if (!result.success) {
      return new Response(
        JSON.stringify({ error: result.error.message }), 
        { 
          status: 500,
          headers: { "Content-Type": "application/json" }
        }
      );
    }

    // Transform reminders for API response
    const reminders = result.data.map(reminder => ({
      id: reminder.id,
      content: reminder.content,
      targetUserId: reminder.targetUserId,
      scheduledTime: reminder.scheduledTime.toISOString(),
      timezone: reminder.timezone,
      userDisplayTime: reminder.userDisplayTime,
      utcScheduledTime: reminder.utcScheduledTime?.toISOString(),
      timezoneAwareScheduledTime: reminder.scheduledTime.toLocaleString('en-US', {
        timeZone: reminder.timezone || 'Europe/Berlin',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        timeZoneName: 'short',
      }),
      createdAt: reminder.createdAt.toISOString(),
      updatedAt: reminder.updatedAt.toISOString(),
      status: reminder.status,
      deliveryAttempts: reminder.deliveryAttempts,
      lastDeliveryAttempt: reminder.lastDeliveryAttempt?.toISOString(),
      escalation: reminder.escalation ? {
        id: reminder.escalation.id,
        secondaryUserId: reminder.escalation.secondaryUserId,
        timeoutMinutes: reminder.escalation.timeoutMinutes,
        isActive: reminder.escalation.isActive,
        createdAt: reminder.escalation.createdAt.toISOString(),
        timezoneAwareCreatedAt: reminder.escalation.createdAt.toLocaleString('en-US', {
          timeZone: reminder.timezone || 'Europe/Berlin',
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          timeZoneName: 'short',
        }),
      } : undefined,
      responses: reminder.responses.map(response => ({
        id: response.id,
        userId: response.userId,
        responseType: response.responseType,
        timestamp: response.timestamp.toISOString(),
        timezoneAwareTimestamp: response.timestamp.toLocaleString('en-US', {
          timeZone: reminder.timezone || 'Europe/Berlin',
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          timeZoneName: 'short',
        }),
        messageId: response.messageId,
      })),
      testExecutions: reminder.testExecutions.map(execution => ({
        id: execution.id,
        testType: execution.testType,
        executedBy: execution.executedBy,
        executedAt: execution.executedAt.toISOString(),
        timezoneAwareExecutedAt: execution.executedAt.toLocaleString('en-US', {
          timeZone: reminder.timezone || 'Europe/Berlin',
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          timeZoneName: 'short',
        }),
        result: execution.result,
        preservedSchedule: execution.preservedSchedule,
        errorMessage: execution.errorMessage,
      })),
    }));

    return new Response(
      JSON.stringify({
        reminders,
        total: reminders.length,
        limit,
        offset,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" }
      }
    );

  } catch (error) {
    console.error("Error getting reminders:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }), 
      { 
        status: 500,
        headers: { "Content-Type": "application/json" }
      }
    );
  }
}

async function handleCreateReminder(req: Request) {
  try {
    const service = await initializeServices();
    
    // Import timezone utilities at the top
    const { parseLocalDateTimeInTimezone, isValidTimezone } = await import("../../../discord-bot/lib/utils/timezone.ts");
    
    // Parse request body
    const body = await req.json();
    
    // Validate required fields
    if (!body.content || !body.targetUserId || !body.scheduledTime) {
      return new Response(
        JSON.stringify({ 
          error: "Missing required fields: content, targetUserId, scheduledTime" 
        }), 
        { 
          status: 400,
          headers: { "Content-Type": "application/json" }
        }
      );
    }

    // Validate timezone if provided
    if (body.timezone && !isValidTimezone(body.timezone)) {
      return new Response(
        JSON.stringify({ 
          error: "Invalid timezone provided. Please select a valid timezone." 
        }), 
        { 
          status: 400,
          headers: { "Content-Type": "application/json" }
        }
      );
    }
    
    // Import logger for timezone operations
    const { logger } = await import("../../../discord-bot/lib/utils/logger.ts");
    
    logger.info("Creating reminder with timezone conversion", {
      operation: "reminder_create_with_timezone",
      context: {
        timezone: body.timezone || 'Europe/Berlin',
        originalDateTime: body.scheduledTime,
        targetUserId: body.targetUserId
      }
    });
    
    // Build create options with proper timezone conversion
    const scheduledTime = parseLocalDateTimeInTimezone(body.scheduledTime, body.timezone || 'Europe/Berlin');
    const createOptions: CreateReminderOptions = {
      content: body.content,
      targetUserId: body.targetUserId,
      // TIMEZONE BUG FIX: Convert datetime-local input to proper UTC time
      scheduledTime: scheduledTime,
      timezone: body.timezone, // Pass timezone from form
      createdBy: body.createdBy || "admin", // TODO: Get from session
    };

    logger.info("Timezone conversion completed for reminder creation", {
      operation: "reminder_create_timezone_converted",
      context: {
        originalDateTime: body.scheduledTime,
        timezone: body.timezone || 'Europe/Berlin',
        convertedUTC: scheduledTime.toISOString(),
        targetUserId: body.targetUserId
      }
    });

    // Add escalation if provided
    if (body.enableEscalation && body.escalationUserId && body.escalationTimeoutMinutes) {
      createOptions.escalation = {
        secondaryUserId: body.escalationUserId,
        timeoutMinutes: body.escalationTimeoutMinutes,
      };
    }

    // Create reminder
    const result = await service.createReminder(createOptions);
    
    if (!result.success) {
      return new Response(
        JSON.stringify({ error: result.error.message }), 
        { 
          status: 400,
          headers: { "Content-Type": "application/json" }
        }
      );
    }

    // Transform reminder for API response
    const reminder = result.data;
    const responseData = {
      id: reminder.id,
      content: reminder.content,
      targetUserId: reminder.targetUserId,
      scheduledTime: reminder.scheduledTime.toISOString(),
      timezone: reminder.timezone,
      createdAt: reminder.createdAt.toISOString(),
      updatedAt: reminder.updatedAt.toISOString(),
      status: reminder.status,
      deliveryAttempts: reminder.deliveryAttempts,
      escalation: reminder.escalation ? {
        id: reminder.escalation.id,
        secondaryUserId: reminder.escalation.secondaryUserId,
        timeoutMinutes: reminder.escalation.timeoutMinutes,
        isActive: reminder.escalation.isActive,
        createdAt: reminder.escalation.createdAt.toISOString(),
      } : undefined,
      responses: [],
      testExecutions: [],
    };

    return new Response(
      JSON.stringify(responseData),
      {
        status: 201,
        headers: { "Content-Type": "application/json" }
      }
    );

  } catch (error) {
    console.error("Error creating reminder:", error);
    
    // Handle JSON parsing errors
    if (error instanceof SyntaxError) {
      return new Response(
        JSON.stringify({ error: "Invalid JSON in request body" }), 
        { 
          status: 400,
          headers: { "Content-Type": "application/json" }
        }
      );
    }

    return new Response(
      JSON.stringify({ error: "Internal server error" }), 
      { 
        status: 500,
        headers: { "Content-Type": "application/json" }
      }
    );
  }
}