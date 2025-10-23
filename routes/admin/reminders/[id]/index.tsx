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
      <div class="min-h-screen bg-gray-50 p-8">
        <div class="max-w-4xl mx-auto">
          <div class="bg-red-50 border border-red-200 rounded-lg p-6">
            <h2 class="text-xl font-semibold text-red-800 mb-2">Error Loading Reminder</h2>
            <p class="text-red-600">{data.error}</p>
            <div class="mt-4">
              <a
                href="/"
                class="text-blue-600 hover:text-blue-800 underline"
              >
                ← Back to Dashboard
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!data.reminder) {
    return (
      <div class="min-h-screen bg-gray-50 p-8">
        <div class="max-w-4xl mx-auto">
          <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
            <h2 class="text-xl font-semibold text-yellow-800 mb-2">Reminder Not Found</h2>
            <p class="text-yellow-600">The requested reminder could not be found.</p>
            <div class="mt-4">
              <a
                href="/"
                class="text-blue-600 hover:text-blue-800 underline"
              >
                ← Back to Dashboard
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div class="min-h-screen bg-gray-50 p-8">
      <div class="max-w-4xl mx-auto">
        {/* Header with navigation */}
        <div class="mb-6">
          <a
            href="/"
            class="text-blue-600 hover:text-blue-800 underline inline-flex items-center mb-4"
          >
            <span class="mr-2">←</span>
            Back to Dashboard
          </a>
          <h1 class="text-3xl font-bold text-gray-900">Reminder Details</h1>
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
        <div class="mb-6 bg-white rounded-lg shadow-md p-6">
          <h2 class="text-lg font-semibold text-gray-900 mb-4">Test Reminder Delivery</h2>
          <TestTrigger 
            reminderId={data.reminder.id}
            isDisabled={data.reminder.status !== "pending"}
          />
          {data.reminder.status !== "pending" && (
            <p class="mt-2 text-sm text-yellow-700 bg-yellow-50 border border-yellow-200 rounded p-2">
              ℹ️ Testing is only available for pending reminders to ensure original schedules are preserved
            </p>
          )}
        </div>

        {/* Reminder detail component */}
        <ReminderDetail reminder={data.reminder} />

        {/* Detailed Response History */}
        {data.reminder.responses && data.reminder.responses.length > 0 && (
          <div class="mt-6 bg-white rounded-lg shadow-md p-6">
            <ResponseLog responses={data.reminder.responses} />
          </div>
        )}
      </div>
    </div>
  );
}
