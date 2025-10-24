/// <reference lib="deno.unstable" />

/**
 * Reminder Edit Page
 * Provides interface to edit pending reminders
 * Only allows editing reminders with "pending" status
 */

import { Handlers, PageProps } from "$fresh/server.ts";
import { Reminder } from "../../../../discord-bot/types/reminder.ts";
import { ReminderService } from "../../../../discord-bot/lib/reminder/service.ts";
import { ReminderRepository } from "../../../../discord-bot/lib/reminder/repository.ts";
import EditReminderForm from "../../../../islands/EditReminderForm.tsx";

interface EditReminderPageData {
  reminder?: Reminder;
  error?: string;
}

export const handler: Handlers<EditReminderPageData> = {
  async GET(_req, ctx) {
    try {
      const { id } = ctx.params;

      if (!id) {
        return ctx.render({ error: "Reminder ID is required" });
      }

      // Initialize service
      const kv = await Deno.openKv();
      const repository = new ReminderRepository(kv);
      const service = new ReminderService(repository);

      // Fetch reminder
      const result = await service.getReminder(id);

      if (!result.success) {
        return ctx.render({ error: result.error.message });
      }

      const reminder = result.data;

      // Only allow editing pending reminders
      if (reminder.status !== "pending") {
        return ctx.render({ 
          error: `Cannot edit reminder with status "${reminder.status}". Only pending reminders can be edited.`,
          reminder 
        });
      }

      return ctx.render({ reminder });
    } catch (error) {
      console.error("Error loading reminder for edit:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      return ctx.render({ error: `Failed to load reminder: ${errorMessage}` });
    }
  },
};

export default function EditReminderPage({ data }: PageProps<EditReminderPageData>) {
  if (data.error) {
    return (
      <div class="min-h-screen bg-gray-50 p-4 md:p-8">
        <div class="max-w-4xl mx-auto">
          <div class="bg-white border-l-4 border-red-500 p-4 md:p-6">
            <h2 class="text-xl font-bold text-gray-900 mb-2">⚠️ Cannot Edit Reminder</h2>
            <p class="text-gray-700 mb-4">{data.error}</p>
            <div class="space-x-4">
              <a href="/" class="text-blue-600 hover:underline">
                ← Back to Dashboard
              </a>
              {data.reminder && (
                <a href={`/admin/reminders/${data.reminder.id}`} class="text-blue-600 hover:underline">
                  View Reminder Details
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!data.reminder) {
    return (
      <div class="min-h-screen bg-gray-50 p-4 md:p-8">
        <div class="max-w-4xl mx-auto">
          <div class="bg-white border-l-4 border-yellow-500 p-4 md:p-6">
            <h2 class="text-xl font-bold text-gray-900 mb-2">⚠️ Reminder Not Found</h2>
            <p class="text-gray-700 mb-4">The requested reminder could not be found.</p>
            <a href="/" class="text-blue-600 hover:underline">
              ← Back to Dashboard
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div class="min-h-screen bg-gray-50 p-4 md:p-8">
      <div class="max-w-4xl mx-auto">
        {/* Header with navigation */}
        <div class="mb-6">
          <div class="flex items-center justify-between mb-4">
            <a href={`/admin/reminders/${data.reminder.id}`} class="text-blue-600 hover:underline">
              ← Back to Reminder Details
            </a>
            <a href="/" class="text-gray-600 hover:underline">
              Dashboard
            </a>
          </div>
          <h1 class="text-3xl font-bold text-gray-900">Edit Reminder</h1>
          <p class="text-gray-600 mt-2">
            Modify the reminder details below. Changes will be saved when you click "Save Changes".
          </p>
        </div>

        {/* Edit form component */}
        <div class="bg-white border border-gray-200 p-4 md:p-6">
          <EditReminderForm reminder={data.reminder} />
        </div>

        {/* Additional info */}
        <div class="mt-6 bg-white border-l-4 border-blue-500 p-4">
          <h3 class="font-bold text-gray-900 mb-2">📝 Editing Tips</h3>
          <ul class="text-sm text-gray-700 space-y-1">
            <li>• Only pending reminders can be edited</li>
            <li>• Changes to the schedule will update the delivery time</li>
            <li>• Escalation settings can be added or removed</li>
            <li>• All fields are validated before saving</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
