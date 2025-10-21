/** @jsx h */
import { h } from "preact";
import type { Handlers, PageProps } from "$fresh/server.ts";
import { getSessionFromRequest } from "../../lib/storage/sessions.ts";
import type { UserSession } from "../../lib/storage/sessions.ts";
import {
  getCategories,
  reminderTemplates,
} from "../../data/reminder-templates.ts";

interface RemindersPageData {
  session: UserSession | null;
  reminders: any[]; // Will be properly typed when we create reminder types
  error?: string;
}

export const handler: Handlers<RemindersPageData> = {
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

      // For now, we'll use empty reminders array until we implement reminder storage
      const reminders: any[] = [];

      return ctx.render({
        session,
        reminders,
      });
    } catch (error) {
      console.error("Reminders page error:", error);

      return ctx.render({
        session: null,
        reminders: [],
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },
};

export default function RemindersPage({ data }: PageProps<RemindersPageData>) {
  const { session, reminders, error } = data;

  if (!session) {
    return (
      <div class="text-center">
        <h1 class="text-2xl font-bold mb-4">Authentication Required</h1>
        <p class="mb-4">Please log in to manage your reminders.</p>
        <a
          href="/auth/discord"
          class="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
        >
          Login with Discord
        </a>
      </div>
    );
  }

  if (error) {
    return (
      <div class="bg-red-50 border border-red-200 rounded-lg p-4">
        <h1 class="text-xl font-bold text-red-800 mb-2">Error</h1>
        <p class="text-red-700">{error}</p>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div class="flex justify-between items-center mb-8">
        <div>
          <h1 class="text-3xl font-bold text-gray-800">Reminders</h1>
          <p class="text-gray-600 mt-1">
            Welcome back,{" "}
            {session.userInfo.username}! Manage your reminders here.
          </p>
        </div>
        <div class="flex space-x-4">
          <a
            href="/reminders/new"
            class="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
          >
            ➕ New Reminder
          </a>
          <a
            href="/dashboard"
            class="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
          >
            📊 Dashboard
          </a>
        </div>
      </div>

      {/* Quick Templates */}
      <div class="bg-white rounded-lg shadow-md p-6 mb-8">
        <h2 class="text-xl font-semibold mb-4">🚀 Quick Start Templates</h2>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {reminderTemplates.slice(0, 6).map((template) => (
            <div
              key={template.id}
              class="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
            >
              <div class="flex items-center mb-2">
                <span class="text-2xl mr-2">{template.emoji}</span>
                <h3 class="font-semibold text-gray-800">{template.name}</h3>
              </div>
              <p class="text-sm text-gray-600 mb-3">{template.description}</p>
              <div class="flex justify-between items-center">
                <span class="text-xs px-2 py-1 bg-gray-100 rounded text-gray-700">
                  {template.category}
                </span>
                <button class="text-blue-600 hover:text-blue-800 text-sm font-medium">
                  Use Template →
                </button>
              </div>
            </div>
          ))}
        </div>
        <div class="text-center mt-4">
          <a
            href="/reminders/templates"
            class="text-blue-600 hover:text-blue-800 font-medium"
          >
            View All Templates ({reminderTemplates.length}) →
          </a>
        </div>
      </div>

      {/* Current Reminders */}
      <div class="bg-white rounded-lg shadow-md">
        <div class="p-6 border-b border-gray-200">
          <div class="flex justify-between items-center">
            <h2 class="text-xl font-semibold">Your Reminders</h2>
            <div class="flex space-x-2">
              <select class="border border-gray-300 rounded px-3 py-1 text-sm">
                <option value="all">All Categories</option>
                {getCategories().map((category) => (
                  <option key={category} value={category}>
                    {category.charAt(0).toUpperCase() + category.slice(1)}
                  </option>
                ))}
              </select>
              <select class="border border-gray-300 rounded px-3 py-1 text-sm">
                <option value="active">Active</option>
                <option value="paused">Paused</option>
                <option value="completed">Completed</option>
              </select>
            </div>
          </div>
        </div>

        <div class="p-6">
          {reminders.length === 0
            ? (
              <div class="text-center py-12">
                <div class="text-6xl mb-4">📅</div>
                <h3 class="text-xl font-semibold text-gray-700 mb-2">
                  No Reminders Yet
                </h3>
                <p class="text-gray-500 mb-6">
                  Get started by creating your first reminder using one of the
                  templates above.
                </p>
                <div class="flex justify-center space-x-4">
                  <a
                    href="/reminders/new"
                    class="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Create Custom Reminder
                  </a>
                  <button class="bg-gray-200 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-300 transition-colors">
                    Browse Templates
                  </button>
                </div>
              </div>
            )
            : (
              <div class="space-y-4">
                {/* Reminder list will go here when we implement reminder storage */}
                {reminders.map((reminder, index) => (
                  <div
                    key={index}
                    class="border border-gray-200 rounded-lg p-4"
                  >
                    {/* Reminder item template */}
                    <div class="flex justify-between items-start">
                      <div class="flex-1">
                        <h4 class="font-semibold text-gray-800">
                          Reminder Title
                        </h4>
                        <p class="text-gray-600 text-sm mt-1">
                          Reminder description
                        </p>
                        <div class="flex items-center mt-2 space-x-4 text-xs text-gray-500">
                          <span>📅 Next: Today at 2:00 PM</span>
                          <span>🔄 Daily</span>
                          <span>✅ 5/7 acknowledged</span>
                        </div>
                      </div>
                      <div class="flex space-x-2">
                        <button class="text-blue-600 hover:text-blue-800 text-sm">
                          Edit
                        </button>
                        <button class="text-red-600 hover:text-red-800 text-sm">
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
        </div>
      </div>

      {/* Statistics */}
      <div class="mt-8 grid grid-cols-1 md:grid-cols-4 gap-4">
        <div class="bg-white rounded-lg shadow-md p-6 text-center">
          <div class="text-3xl font-bold text-blue-600">{reminders.length}</div>
          <div class="text-gray-600 text-sm">Total Reminders</div>
        </div>
        <div class="bg-white rounded-lg shadow-md p-6 text-center">
          <div class="text-3xl font-bold text-green-600">0</div>
          <div class="text-gray-600 text-sm">Active Today</div>
        </div>
        <div class="bg-white rounded-lg shadow-md p-6 text-center">
          <div class="text-3xl font-bold text-yellow-600">0</div>
          <div class="text-gray-600 text-sm">Pending</div>
        </div>
        <div class="bg-white rounded-lg shadow-md p-6 text-center">
          <div class="text-3xl font-bold text-purple-600">0</div>
          <div class="text-gray-600 text-sm">This Week</div>
        </div>
      </div>
    </div>
  );
}
