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
            <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
            </svg>
            Back to Dashboard
          </a>
          <h1 class="text-3xl font-bold text-gray-900">Reminder Details</h1>
        </div>

        {/* Reminder detail component */}
        <ReminderDetail reminder={data.reminder} />
      </div>
    </div>
  );
}
