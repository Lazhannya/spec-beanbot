/// <reference lib="deno.unstable" />

/**
 * Reminder Detail Page
 * Displays comprehensive information about a single reminder
 * Allows viewing all details, history, and actions (edit, delete, test)
 */

import { Handlers, PageProps } from "$fresh/server.ts";
import { Reminder } from "../../../../discord-bot/types/reminder.ts";
import { ReminderService } from "../../../../discord-bot/lib/reminder/service.ts";
import { ReminderRepository } from "../../../../discord-bot/lib/reminder/repository.ts";
import ReminderDetail from "../../../../components/ReminderDetail.tsx";
import ResponseLog from "../../../../components/ResponseLog.tsx";
import StatusUpdate from "../../../../islands/StatusUpdate.tsx";
import TestTrigger from "../../../../islands/TestTrigger.tsx";
import ResetToPending from "../../../../islands/ResetToPending.tsx";

interface ReminderDetailPageData {
  reminder?: Reminder;
  error?: string;
}

export const handler: Handlers<ReminderDetailPageData> = {
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

      return ctx.render({ reminder: result.data });
    } catch (error) {
      console.error("Error loading reminder:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      return ctx.render({ error: `Failed to load reminder: ${errorMessage}` });
    }
  },
};

export default function ReminderDetailPage({ data }: PageProps<ReminderDetailPageData>) {
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
                <h2 class="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-3">Error Loading Reminder</h2>
                <p class="text-gray-700 dark:text-gray-300 mb-6 leading-relaxed">{data.error}</p>
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
          <a href="/" class="inline-flex items-center text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium mb-4 transition-colors group">
            <span class="mr-2 group-hover:-translate-x-1 transition-transform">←</span>
            Back to Dashboard
          </a>
          <h1 class="text-4xl font-bold text-gray-900 dark:text-gray-100">Reminder Details</h1>
        </div>

        {/* Real-time Status Updates */}
        <div class="mb-6">
          <StatusUpdate 
            reminderId={data.reminder.id} 
            initialStatus={data.reminder.status}
            pollInterval={10000}
          />
        </div>

        {/* Test Trigger Section */}
        <div class="mb-6 bg-white dark:bg-gray-800 shadow-lg rounded-xl p-6 md:p-8 border border-gray-200 dark:border-gray-700">
          <h2 class="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">Test Reminder Delivery</h2>
          
          {/* Show reset button if not pending */}
          {data.reminder.status !== "pending" && (
            <div class="mb-6">
              <ResetToPending 
                reminderId={data.reminder.id}
                currentStatus={data.reminder.status}
              />
            </div>
          )}
          
          {/* Test trigger (only enabled for pending reminders) */}
          <TestTrigger 
            reminderId={data.reminder.id}
            isDisabled={data.reminder.status !== "pending"}
          />
          {data.reminder.status !== "pending" && (
            <div class="mt-4 bg-blue-50 dark:bg-blue-900 dark:bg-opacity-30 border-l-4 border-blue-500 dark:border-blue-600 p-4 rounded">
              <p class="text-sm text-gray-700 dark:text-gray-300 flex items-start">
                <span class="mr-2 text-lg">ℹ️</span>
                <span>Testing is only available for pending reminders. Use the "Reset to Pending" button above to enable testing again.</span>
              </p>
            </div>
          )}
        </div>

        {/* Reminder detail component */}
        <ReminderDetail reminder={data.reminder} />

        {/* Detailed Response History */}
        {data.reminder.responses && data.reminder.responses.length > 0 && (
          <div class="mt-6 bg-white dark:bg-gray-800 shadow-lg rounded-xl p-6 md:p-8 border border-gray-200 dark:border-gray-700">
            <ResponseLog responses={data.reminder.responses} />
          </div>
        )}
      </div>
    </div>
  );
}
