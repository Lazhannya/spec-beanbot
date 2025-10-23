/**
 * Reminders API Endpoints
 * GET /api/reminders - List reminders with filtering
 * POST /api/reminders - Create new reminder
 */

import { HandlerContext } from "$fresh/server.ts";
import { ReminderService, CreateReminderOptions } from "../../../discord-bot/lib/reminder/service.ts";
import { ReminderRepository } from "../../../discord-bot/lib/reminder/repository.ts";

// Initialize services (in a real app, this would be dependency injected)
let reminderService: ReminderService;

async function initializeServices() {
  if (!reminderService) {
    try {
      // Try to open KV store - may not be available in all environments
      const kv = await Deno.openKv();
      const repository = new ReminderRepository(kv);
      reminderService = new ReminderService(repository);
    } catch (error) {
      // If KV is not available, create a mock service for development
      console.warn("Deno KV not available, using mock service:", error.message);
      reminderService = createMockReminderService();
    }
  }
  return reminderService;
}

// Mock service for development when KV is not available
function createMockReminderService(): ReminderService {
  const mockReminders: any[] = [];
  
  return {
    async createReminder(options: CreateReminderOptions) {
      const reminder = {
        id: `mock-${Date.now()}`,
        content: options.content,
        targetUserId: options.targetUserId,
        scheduledTime: options.scheduledTime,
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date(),
        deliveryAttempts: 0,
        responses: [],
        escalationRules: options.escalationRules || [],
        testExecutions: []
      };
      mockReminders.push(reminder);
      return { success: true, data: reminder };
    },
    
    async getAllReminders(offset: number = 0, limit: number = 20) {
      const slice = mockReminders.slice(offset, offset + limit);
      return { success: true, data: slice };
    },
    
    async getRemindersByStatus(status: string, limit: number = 20) {
      const filtered = mockReminders.filter(r => r.status === status).slice(0, limit);
      return { success: true, data: filtered };
    }
  } as any;
}

// GET /api/reminders - List reminders
export async function handler(req: Request, ctx: HandlerContext) {
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
    const userId = url.searchParams.get("userId");
    const limit = parseInt(url.searchParams.get("limit") || "20");
    const offset = parseInt(url.searchParams.get("offset") || "0");

    let result;
    
    if (status && status !== "all") {
      // Filter by status
      result = await service.getRemindersByStatus(status as any, limit);
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
      } : undefined,
      responses: reminder.responses.map(response => ({
        id: response.id,
        userId: response.userId,
        responseType: response.responseType,
        timestamp: response.timestamp.toISOString(),
        messageId: response.messageId,
      })),
      testExecutions: reminder.testExecutions.map(execution => ({
        id: execution.id,
        testType: execution.testType,
        executedBy: execution.executedBy,
        executedAt: execution.executedAt.toISOString(),
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

    // Build create options
    const createOptions: CreateReminderOptions = {
      content: body.content,
      targetUserId: body.targetUserId,
      scheduledTime: new Date(body.scheduledTime),
      timezone: body.timezone, // Pass timezone from form
      createdBy: body.createdBy || "admin", // TODO: Get from session
    };

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