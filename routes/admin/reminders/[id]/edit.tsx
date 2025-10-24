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
      <div class="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-4 md:p-8">
        <div class="max-w-4xl mx-auto">
          <div class="bg-white dark:bg-gray-800 shadow-lg rounded-xl border-l-4 border-red-500 dark:border-red-600 p-6 md:p-8">
            <div class="flex items-start space-x-4">
              <div class="flex-shrink-0">
                <div class="w-12 h-12 bg-red-100 dark:bg-red-900 dark:bg-opacity-30 rounded-lg flex items-center justify-center">
                  <span class="text-2xl">⚠️</span>
                </div>
              </div>
              <div class="flex-1">
                <h2 class="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-3">Cannot Edit Reminder</h2>
                <p class="text-gray-700 dark:text-gray-300 mb-6 leading-relaxed">{data.error}</p>
                <div class="flex flex-wrap gap-3">
                  <a href="/" class="inline-flex items-center text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium transition-colors">
                    <span class="mr-2">←</span>
                    Back to Dashboard
                  </a>
                  {data.reminder && (
                    <a href={`/admin/reminders/${data.reminder.id}`} class="inline-flex items-center text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium transition-colors">
                      View Reminder Details
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!data.reminder) {
    return (
      <div class="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-4 md:p-8">
        <div class="max-w-4xl mx-auto">
          <div class="bg-white dark:bg-gray-800 shadow-lg rounded-xl border-l-4 border-yellow-500 dark:border-yellow-600 p-6 md:p-8">
            <div class="flex items-start space-x-4">
              <div class="flex-shrink-0">
                <div class="w-12 h-12 bg-yellow-100 dark:bg-yellow-900 dark:bg-opacity-30 rounded-lg flex items-center justify-center">
                  <span class="text-2xl">⚠️</span>
                </div>
              </div>
              <div class="flex-1">
                <h2 class="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-3">Reminder Not Found</h2>
                <p class="text-gray-700 dark:text-gray-300 mb-6">The requested reminder could not be found.</p>
                <a href="/" class="inline-flex items-center text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium transition-colors">
                  <span class="mr-2">←</span>
                  Back to Dashboard
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div class="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-4 md:p-8">
      <div class="max-w-4xl mx-auto">
        {/* Header with navigation */}
        <div class="mb-6">
          <div class="flex items-center justify-between mb-4 flex-wrap gap-3">
            <a href={`/admin/reminders/${data.reminder.id}`} class="inline-flex items-center text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium transition-colors group">
              <span class="mr-2 group-hover:-translate-x-1 transition-transform">←</span>
              Back to Reminder Details
            </a>
            <a href="/" class="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 font-medium transition-colors">
              Dashboard
            </a>
          </div>
          <h1 class="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-3">Edit Reminder</h1>
          <p class="text-gray-600 dark:text-gray-400 text-lg">
            Modify the reminder details below. Changes will be saved when you click "Save Changes".
          </p>
        </div>

        {/* Edit form component */}
        <div class="bg-white dark:bg-gray-800 shadow-lg rounded-xl p-6 md:p-8 border border-gray-200 dark:border-gray-700">
          <EditReminderForm reminder={data.reminder} />
        </div>

        {/* Additional info */}
        <div class="mt-6 bg-white dark:bg-gray-800 shadow-md rounded-xl border-l-4 border-blue-500 dark:border-blue-600 p-6">
          <div class="flex items-start space-x-3">
            <div class="flex-shrink-0">
              <span class="text-2xl">📝</span>
            </div>
            <div class="flex-1">
              <h3 class="font-bold text-gray-900 dark:text-gray-100 mb-3 text-lg">Editing Tips</h3>
              <ul class="text-sm text-gray-700 dark:text-gray-300 space-y-2">
                <li class="flex items-start">
                  <span class="mr-2 text-blue-500 dark:text-blue-400">•</span>
                  <span>Only pending reminders can be edited</span>
                </li>
                <li class="flex items-start">
                  <span class="mr-2 text-blue-500 dark:text-blue-400">•</span>
                  <span>Changes to the schedule will update the delivery time</span>
                </li>
                <li class="flex items-start">
                  <span class="mr-2 text-blue-500 dark:text-blue-400">•</span>
                  <span>Escalation settings can be added or removed</span>
                </li>
                <li class="flex items-start">
                  <span class="mr-2 text-blue-500 dark:text-blue-400">•</span>
                  <span>All fields are validated before saving</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
