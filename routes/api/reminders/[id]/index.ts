/// <reference lib="deno.unstable" />

/**
 * API endpoints for individual reminder operations
 * GET /api/reminders/[id] - Retrieve reminder details
 * PUT /api/reminders/[id] - Update reminder
 * DELETE /api/reminders/[id] - Delete reminder
 */

import { Handlers } from "$fresh/server.ts";
import { ReminderService } from "../../../../discord-bot/lib/reminder/service.ts";
import { ReminderRepository } from "../../../../discord-bot/lib/reminder/repository.ts";
import { EscalationTrigger, EscalationRule } from "../../../../discord-bot/types/reminder.ts";

// Initialize reminder service
let reminderService: ReminderService | null = null;

async function getReminderService(): Promise<ReminderService> {
  if (!reminderService) {
    try {
      const kv = await Deno.openKv();
      const repository = new ReminderRepository(kv);
      const { createReminderServiceWithRepository } = await import("../../../../discord-bot/lib/utils/service-factory.ts");
      reminderService = createReminderServiceWithRepository(repository, kv);
    } catch (error) {
      console.error("Failed to initialize Deno KV:", error);
      throw new Error("Unable to initialize reminder service");
    }
  }
  return reminderService;
}

export const handler: Handlers = {
  /**
   * GET /api/reminders/[id]
   * Retrieve a single reminder by ID
   */
  async GET(_req, ctx) {
    try {
      const { id } = ctx.params;
      
      if (!id) {
        return new Response(
          JSON.stringify({ error: "Reminder ID is required" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      const service = await getReminderService();
      const result = await service.getReminder(id);

      if (!result.success) {
        return new Response(
          JSON.stringify({ error: result.error.message }),
          { status: 404, headers: { "Content-Type": "application/json" } }
        );
      }

      // Transform reminder to include timezone-aware timestamps
      const reminder = result.data;
      const responseData = {
        ...reminder,
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
        lastDeliveryAttempt: reminder.lastDeliveryAttempt?.toISOString(),
        escalation: reminder.escalation ? {
          ...reminder.escalation,
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
          ...response,
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
        })),
        testExecutions: reminder.testExecutions.map(execution => ({
          ...execution,
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
        })),
      };

      return new Response(
        JSON.stringify(responseData),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    } catch (error) {
      console.error("Error fetching reminder:", error);
      return new Response(
        JSON.stringify({ error: "Internal server error" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  },

  /**
   * PUT /api/reminders/[id]
   * Update an existing reminder
   */
  async PUT(req, ctx) {
    try {
      const { id } = ctx.params;
      
      if (!id) {
        return new Response(
          JSON.stringify({ error: "Reminder ID is required" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      const service = await getReminderService();
      
      // Check if reminder exists and is editable
      const reminderResult = await service.getReminder(id);
      
      if (!reminderResult.success) {
        return new Response(
          JSON.stringify({ error: "Reminder not found" }),
          { status: 404, headers: { "Content-Type": "application/json" } }
        );
      }

      const existingReminder = reminderResult.data;

      // Only allow editing pending reminders
      if (existingReminder.status !== "pending") {
        return new Response(
          JSON.stringify({ 
            error: "Cannot edit reminder", 
            message: `Only pending reminders can be edited. Current status: ${existingReminder.status}` 
          }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      // Parse request body
      const updateData = await req.json();

      // Validate required fields
      if (!updateData.content || !updateData.targetUserId || !updateData.scheduledTime) {
        return new Response(
          JSON.stringify({ error: "Missing required fields: content, targetUserId, scheduledTime" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      // Import timezone utilities and apply proper timezone conversion
      const { parseLocalDateTimeInTimezone, isValidTimezone } = await import("../../../../discord-bot/lib/utils/timezone.ts");
      
      // Validate content length
      if (updateData.content.length > 2000) {
        return new Response(
          JSON.stringify({ error: "Content must be less than 2000 characters" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      // Validate user ID format
      const userIdRegex = /^\d{17,19}$/;
      if (!userIdRegex.test(updateData.targetUserId)) {
        return new Response(
          JSON.stringify({ error: "Invalid target user ID format" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      // Validate timezone if provided
      if (updateData.timezone && !isValidTimezone(updateData.timezone)) {
        return new Response(
          JSON.stringify({ error: "Invalid timezone provided. Please select a valid timezone." }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }
      
      // Import logger for timezone operations
      const { logger } = await import("../../../../discord-bot/lib/utils/logger.ts");
      
      logger.info("Updating reminder with timezone conversion", {
        operation: "reminder_update_with_timezone",
        context: {
          reminderId: id,
          timezone: updateData.timezone || 'Europe/Berlin',
          originalDateTime: updateData.scheduledTime,
          targetUserId: updateData.targetUserId
        }
      });

      // TIMEZONE BUG FIX: Convert datetime-local input to proper UTC time
      const scheduledTime = parseLocalDateTimeInTimezone(updateData.scheduledTime, updateData.timezone || 'Europe/Berlin');
      
      logger.info("Timezone conversion completed for reminder update", {
        operation: "reminder_update_timezone_converted",
        context: {
          reminderId: id,
          originalDateTime: updateData.scheduledTime,
          timezone: updateData.timezone || 'Europe/Berlin',
          convertedUTC: scheduledTime.toISOString()
        }
      });
      
      const now = new Date();
      if (scheduledTime <= now) {
        return new Response(
          JSON.stringify({ error: "Scheduled time must be in the future" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      // Validate escalation if enabled
      if (updateData.enableEscalation) {
        if (!updateData.escalationUserId) {
          return new Response(
            JSON.stringify({ error: "Escalation user ID required when escalation is enabled" }),
            { status: 400, headers: { "Content-Type": "application/json" } }
          );
        }

        if (!userIdRegex.test(updateData.escalationUserId)) {
          return new Response(
            JSON.stringify({ error: "Invalid escalation user ID format" }),
            { status: 400, headers: { "Content-Type": "application/json" } }
          );
        }

        if (updateData.escalationUserId === updateData.targetUserId) {
          return new Response(
            JSON.stringify({ error: "Escalation user must be different from target user" }),
            { status: 400, headers: { "Content-Type": "application/json" } }
          );
        }

        if (updateData.escalationTimeoutMinutes < 1 || updateData.escalationTimeoutMinutes > 10080) {
          return new Response(
            JSON.stringify({ error: "Escalation timeout must be between 1-10080 minutes" }),
            { status: 400, headers: { "Content-Type": "application/json" } }
          );
        }
      }

      // Validate repeat settings if enabled
      if (updateData.enableRepeat) {
        if (updateData.repeatInterval < 1) {
          return new Response(
            JSON.stringify({ error: "Repeat interval must be at least 1" }),
            { status: 400, headers: { "Content-Type": "application/json" } }
          );
        }

        if (updateData.repeatEndCondition === "count_based" && (!updateData.repeatMaxOccurrences || updateData.repeatMaxOccurrences < 1)) {
          return new Response(
            JSON.stringify({ error: "Maximum occurrences required for count-based repeat" }),
            { status: 400, headers: { "Content-Type": "application/json" } }
          );
        }

        if (updateData.repeatEndCondition === "date_based") {
          if (!updateData.repeatEndDate) {
            return new Response(
              JSON.stringify({ error: "End date required for date-based repeat" }),
              { status: 400, headers: { "Content-Type": "application/json" } }
            );
          }

          const endDate = new Date(updateData.repeatEndDate);
          if (endDate <= scheduledTime) {
            return new Response(
              JSON.stringify({ error: "End date must be after scheduled time" }),
              { status: 400, headers: { "Content-Type": "application/json" } }
            );
          }
        }
      }

      // Update the reminder
      const updatePayload: { content: string; scheduledTime: Date; escalation?: EscalationRule } = {
        content: updateData.content,
        scheduledTime,
      };

      if (updateData.enableEscalation) {
        updatePayload.escalation = {
          id: crypto.randomUUID(),
          secondaryUserId: updateData.escalationUserId,
          timeoutMinutes: updateData.escalationTimeoutMinutes,
          triggerConditions: [EscalationTrigger.TIMEOUT, EscalationTrigger.DECLINED],
          createdAt: new Date(),
          isActive: true,
        };
      }

      const updateResult = await service.updateReminder(id, updatePayload);

      if (!updateResult.success) {
        return new Response(
          JSON.stringify({ error: updateResult.error.message }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: "Reminder updated successfully",
          reminder: updateResult.data,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    } catch (error) {
      console.error("Error updating reminder:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      return new Response(
        JSON.stringify({ error: "Internal server error", details: errorMessage }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  },

  /**
   * DELETE /api/reminders/[id]
   * Delete a reminder and clean up its schedule
   */
  async DELETE(_req, ctx) {
    try {
      const { id } = ctx.params;
      
      if (!id) {
        return new Response(
          JSON.stringify({ error: "Reminder ID is required" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      const service = await getReminderService();
      
      // Check if reminder exists
      const reminderResult = await service.getReminder(id);
      
      if (!reminderResult.success) {
        return new Response(
          JSON.stringify({ error: "Reminder not found" }),
          { status: 404, headers: { "Content-Type": "application/json" } }
        );
      }

      const existingReminder = reminderResult.data;

      // Allow deleting reminders in any status
      // Note: Acknowledged/declined reminders can be deleted if needed for cleanup
      console.log(`Deleting reminder ${id} with status: ${existingReminder.status}`);

      // Delete the reminder (permanently removes it)
      const deleteResult = await service.deleteReminder(id);

      if (!deleteResult.success) {
        return new Response(
          JSON.stringify({ error: deleteResult.error.message }),
          { status: 500, headers: { "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: "Reminder deleted successfully",
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    } catch (error) {
      console.error("Error deleting reminder:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      return new Response(
        JSON.stringify({ error: "Internal server error", details: errorMessage }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  },
};
