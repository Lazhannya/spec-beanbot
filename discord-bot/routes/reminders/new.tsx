/** @jsx h */
import { h } from "preact";
import type { Handlers, PageProps } from "$fresh/server.ts";
import { getSessionFromRequest } from "../../lib/storage/sessions.ts";
import type { UserSession } from "../../lib/storage/sessions.ts";
import {
  getTemplateById,
  reminderTemplates,
} from "../../data/reminder-templates.ts";
import { createReminder } from "../../lib/storage/reminders.ts";
import { historyLogger } from "../../lib/history/service.ts";
import type {
  ReminderCategory,
  ScheduleType,
} from "../../lib/types/reminders.ts";

interface NewReminderPageData {
  session: UserSession | null;
  selectedTemplate?: string;
  error?: string;
  success?: string;
}

export const handler: Handlers<NewReminderPageData> = {
  async GET(req, ctx) {
    try {
      // Check if user is authenticated
      const session = await getSessionFromRequest(req);

      if (!session) {
        return new Response(null, {
          status: 302,
          headers: {
            "Location": "/auth/discord",
          },
        });
      }

      const url = new URL(req.url);
      const templateId = url.searchParams.get("template");

      return ctx.render({
        session,
        selectedTemplate: templateId || undefined,
      });
    } catch (error) {
      console.error("New reminder page error:", error);

      return ctx.render({
        session: null,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },

  async POST(req, ctx) {
    try {
      // Check if user is authenticated
      const session = await getSessionFromRequest(req);

      if (!session) {
        return new Response(null, {
          status: 302,
          headers: {
            "Location": "/auth/discord",
          },
        });
      }

      const formData = await req.formData();

      // Parse form data into reminder input
      const reminderInput = {
        title: (formData.get("title") as string)?.trim(),
        message: (formData.get("message") as string)?.trim(),
        targetUser: session.userInfo.id, // Target the logged-in user for now
        category: (formData.get("category") as string ||
          "personal") as ReminderCategory,
        templateId: (formData.get("templateId") as string) || undefined,
        customFields: {},

        schedule: {
          type:
            (formData.get("scheduleType") as string || "daily") as ScheduleType,
          time: (formData.get("time") as string) || "09:00",
          daysOfWeek: formData.getAll("daysOfWeek").map((d) =>
            parseInt(d as string)
          ).filter((d) => !isNaN(d)),
          dayOfMonth: undefined,
          interval: undefined,
          startDate: undefined,
          endDate: undefined,
          maxOccurrences: undefined,
          cronExpression: undefined,
          excludeDates: undefined,
        },
        timezone: (formData.get("timezone") as string) || "America/New_York",

        escalation: {
          enabled: formData.get("escalationEnabled") === "on",
          delayMinutes: parseInt(
            (formData.get("escalationDelay") as string) || "15",
          ),
          maxEscalations: 3,
          escalationTargets: (formData.get("escalationTargets") as string || "")
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean),
          escalationMessage: undefined,
          stopOnAcknowledgment: true,
          escalationInterval: undefined,
        },

        tags: [],
        notes: "",
        priority: "normal" as const,
      };

      // Basic validation
      if (!reminderInput.title || !reminderInput.message) {
        return ctx.render({
          session,
          selectedTemplate: reminderInput.templateId,
          error: "Title and message are required",
        });
      }

      // Create reminder using storage layer
      const result = await createReminder(reminderInput, session.userInfo.id);

      if (!result.success) {
        return ctx.render({
          session,
          selectedTemplate: reminderInput.templateId,
          error: result.errors?.join(", ") || "Failed to create reminder",
        });
      }

      // Log reminder creation in history
      if (result.reminder) {
        await historyLogger.reminderCreated(
          result.reminder.id,
          session.userId,
          "web",
        );
      }

      // Redirect to reminders page with success message
      return new Response(null, {
        status: 302,
        headers: {
          "Location": "/reminders?success=Reminder created successfully",
        },
      });
    } catch (error) {
      console.error("Create reminder error:", error);

      const session = await getSessionFromRequest(req);
      return ctx.render({
        session,
        error: error instanceof Error
          ? error.message
          : "Failed to create reminder",
      });
    }
  },
};

export default function NewReminderPage(
  { data }: PageProps<NewReminderPageData>,
) {
  const { session, selectedTemplate, error, success } = data;

  if (!session) {
    return (
      <div class="text-center">
        <h1 class="text-2xl font-bold mb-4">Authentication Required</h1>
        <p class="mb-4">Please log in to create reminders.</p>
        <a
          href="/auth/discord"
          class="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
        >
          Login with Discord
        </a>
      </div>
    );
  }

  const template = selectedTemplate ? getTemplateById(selectedTemplate) : null;

  return (
    <div>
      {/* Header */}
      <div class="flex justify-between items-center mb-8">
        <div>
          <h1 class="text-3xl font-bold text-gray-800">Create New Reminder</h1>
          <p class="text-gray-600 mt-1">
            Set up a personalized reminder for {session.userInfo.username}
          </p>
        </div>
        <a
          href="/reminders"
          class="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
        >
          ← Back to Reminders
        </a>
      </div>

      {/* Error/Success Messages */}
      {error && (
        <div class="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p class="text-red-700">{error}</p>
        </div>
      )}

      {success && (
        <div class="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
          <p class="text-green-700">{success}</p>
        </div>
      )}

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Form */}
        <div class="lg:col-span-2">
          <form method="POST" class="bg-white rounded-lg shadow-md p-6">
            {/* Template Selection */}
            <div class="mb-6">
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Template (Optional)
              </label>
              <select
                name="templateId"
                class="w-full border border-gray-300 rounded-lg px-3 py-2"
                value={selectedTemplate || ""}
              >
                <option value="">Custom Reminder</option>
                {reminderTemplates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.emoji} {template.name}
                  </option>
                ))}
              </select>
              {template && (
                <p class="text-sm text-gray-600 mt-1">{template.description}</p>
              )}
            </div>

            {/* Basic Information */}
            <div class="mb-6">
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Reminder Title *
              </label>
              <input
                type="text"
                name="title"
                required
                value={template?.name || ""}
                placeholder="e.g., Take morning vitamins"
                class="w-full border border-gray-300 rounded-lg px-3 py-2"
              />
            </div>

            <div class="mb-6">
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Message *
              </label>
              <textarea
                name="message"
                required
                rows={3}
                value={template?.defaultMessage || ""}
                placeholder="The message that will be sent as a reminder"
                class="w-full border border-gray-300 rounded-lg px-3 py-2"
              />
              <p class="text-xs text-gray-500 mt-1">
                You can use placeholders like {"{userName}"} and custom fields
              </p>
            </div>

            <div class="mb-6">
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Category
              </label>
              <select
                name="category"
                class="w-full border border-gray-300 rounded-lg px-3 py-2"
                value={template?.category || "personal"}
              >
                <option value="health">Health</option>
                <option value="medication">Medication</option>
                <option value="work">Work</option>
                <option value="personal">Personal</option>
                <option value="appointment">Appointment</option>
                <option value="task">Task</option>
              </select>
            </div>

            {/* Schedule Configuration */}
            <div class="mb-6 border-t pt-6">
              <h3 class="text-lg font-semibold mb-4">Schedule</h3>

              <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">
                    Frequency
                  </label>
                  <select
                    name="scheduleType"
                    class="w-full border border-gray-300 rounded-lg px-3 py-2"
                    value={template?.defaultSchedule.type || "daily"}
                  >
                    <option value="once">One Time</option>
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="custom">Custom (Cron)</option>
                  </select>
                </div>

                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">
                    Time
                  </label>
                  <input
                    type="time"
                    name="time"
                    value={template?.defaultSchedule.time || "09:00"}
                    class="w-full border border-gray-300 rounded-lg px-3 py-2"
                  />
                </div>
              </div>

              <div class="mb-4">
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  Timezone
                </label>
                <select
                  name="timezone"
                  class="w-full border border-gray-300 rounded-lg px-3 py-2"
                  value={template?.defaultSchedule.timezone ||
                    "America/New_York"}
                >
                  <option value="America/New_York">Eastern Time (ET)</option>
                  <option value="America/Chicago">Central Time (CT)</option>
                  <option value="America/Denver">Mountain Time (MT)</option>
                  <option value="America/Los_Angeles">Pacific Time (PT)</option>
                  <option value="UTC">UTC</option>
                </select>
              </div>

              {/* Days of Week (for weekly) */}
              <div class="mb-4">
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  Days of Week (for weekly reminders)
                </label>
                <div class="grid grid-cols-7 gap-2">
                  {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((
                    day,
                    index,
                  ) => (
                    <label
                      key={day}
                      class="flex items-center justify-center p-2 border rounded cursor-pointer hover:bg-gray-50"
                    >
                      <input
                        type="checkbox"
                        name="daysOfWeek"
                        value={index}
                        class="sr-only"
                      />
                      <span class="text-sm">{day}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* Escalation Settings */}
            <div class="mb-6 border-t pt-6">
              <h3 class="text-lg font-semibold mb-4">Escalation Settings</h3>

              <div class="mb-4">
                <label class="flex items-center">
                  <input
                    type="checkbox"
                    name="escalationEnabled"
                    checked={template?.escalation.enabled || false}
                    class="mr-2"
                  />
                  <span class="text-sm font-medium text-gray-700">
                    Enable escalation if not acknowledged
                  </span>
                </label>
              </div>

              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">
                    Escalation Delay (minutes)
                  </label>
                  <input
                    type="number"
                    name="escalationDelay"
                    min="1"
                    max="1440"
                    value={template?.escalation.delayMinutes || 15}
                    class="w-full border border-gray-300 rounded-lg px-3 py-2"
                  />
                </div>

                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">
                    Escalation Targets (Discord User IDs)
                  </label>
                  <input
                    type="text"
                    name="escalationTargets"
                    placeholder="123456789,987654321"
                    class="w-full border border-gray-300 rounded-lg px-3 py-2"
                  />
                  <p class="text-xs text-gray-500 mt-1">
                    Comma-separated Discord user IDs to notify
                  </p>
                </div>
              </div>
            </div>

            {/* Submit Buttons */}
            <div class="flex justify-end space-x-4">
              <a
                href="/reminders"
                class="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </a>
              <button
                type="submit"
                class="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Create Reminder
              </button>
            </div>
          </form>
        </div>

        {/* Sidebar */}
        <div class="space-y-6">
          {/* Template Preview */}
          {template && (
            <div class="bg-white rounded-lg shadow-md p-6">
              <h3 class="text-lg font-semibold mb-4">Template Preview</h3>
              <div class="flex items-center mb-3">
                <span class="text-2xl mr-2">{template.emoji}</span>
                <div>
                  <h4 class="font-medium">{template.name}</h4>
                  <p class="text-sm text-gray-600">{template.category}</p>
                </div>
              </div>
              <p class="text-sm text-gray-700 mb-3">{template.description}</p>
              <div class="bg-gray-50 rounded p-3">
                <p class="text-sm font-medium text-gray-700">
                  Default Message:
                </p>
                <p class="text-sm text-gray-600 mt-1">
                  {template.defaultMessage}
                </p>
              </div>
            </div>
          )}

          {/* Quick Tips */}
          <div class="bg-blue-50 rounded-lg p-6">
            <h3 class="text-lg font-semibold text-blue-800 mb-4">
              💡 Quick Tips
            </h3>
            <ul class="space-y-2 text-sm text-blue-700">
              <li>• Use templates for faster setup</li>
              <li>• Set escalation for important reminders</li>
              <li>• Test with a one-time reminder first</li>
              <li>• Use clear, actionable messages</li>
              <li>• Consider your timezone settings</li>
            </ul>
          </div>

          {/* Available Templates */}
          <div class="bg-white rounded-lg shadow-md p-6">
            <h3 class="text-lg font-semibold mb-4">Popular Templates</h3>
            <div class="space-y-2">
              {reminderTemplates.slice(0, 3).map((template) => (
                <a
                  key={template.id}
                  href={`/reminders/new?template=${template.id}`}
                  class="flex items-center p-2 rounded hover:bg-gray-50 cursor-pointer"
                >
                  <span class="text-lg mr-2">{template.emoji}</span>
                  <div class="flex-1">
                    <p class="text-sm font-medium">{template.name}</p>
                    <p class="text-xs text-gray-500">{template.category}</p>
                  </div>
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
