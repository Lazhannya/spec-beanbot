/** @jsx h */
import { h } from "preact";
import type { Handlers, PageProps } from "$fresh/server.ts";
import {
  deleteReminder,
  getRemindersByUser,
  updateReminder,
} from "../../lib/storage/reminders.ts";
import { getSession } from "../../lib/storage/sessions.ts";
import { historyLogger } from "../../lib/history/service.ts";
import { isUserAdmin } from "../../lib/admin/service.ts";
import type {
  Reminder,
  ReminderPriority,
  UpdateReminderInput,
} from "../../lib/types/reminders.ts";

interface ManageRemindersData {
  reminders: Reminder[];
  user: {
    id: string;
    username: string;
    avatar?: string;
  };
  stats: {
    total: number;
    active: number;
    completed: number;
    cancelled: number;
  };
  isAdmin: boolean;
}

export const handler: Handlers<ManageRemindersData> = {
  async GET(req, ctx) {
    // Check authentication via session
    const sessionId = req.headers.get("cookie")?.match(/session_id=([^;]+)/)
      ?.[1];
    if (!sessionId) {
      return new Response("", {
        status: 302,
        headers: { Location: "/auth/discord" },
      });
    }

    const session = await getSession(sessionId);
    if (!session) {
      return new Response("", {
        status: 302,
        headers: { Location: "/auth/discord" },
      });
    }

    try {
      // Get user's reminders
      const reminders = await getRemindersByUser(session.userId);

      // Calculate statistics
      const stats = {
        total: reminders.length,
        active: reminders.filter((r) =>
          r.status === "active" && r.isActive
        ).length,
        completed: reminders.filter((r) => r.status === "completed").length,
        cancelled: reminders.filter((r) => r.status === "cancelled").length,
      };

      // Check if user is admin
      const adminStatus = isUserAdmin(session.userId);

      const data: ManageRemindersData = {
        reminders,
        user: {
          id: session.userId,
          username: session.userInfo.username,
          avatar: session.userInfo.avatar,
        },
        stats,
        isAdmin: adminStatus,
      };

      return ctx.render(data);
    } catch (error) {
      console.error("Error loading reminders:", error);
      return new Response("Internal server error", { status: 500 });
    }
  },

  async POST(req, _ctx) {
    // Check authentication via session
    const sessionId = req.headers.get("cookie")?.match(/session_id=([^;]+)/)
      ?.[1];
    if (!sessionId) {
      return new Response("", {
        status: 302,
        headers: { Location: "/auth/discord" },
      });
    }

    const session = await getSession(sessionId);
    if (!session) {
      return new Response("", {
        status: 302,
        headers: { Location: "/auth/discord" },
      });
    }

    try {
      const formData = await req.formData();
      const action = formData.get("action") as string;
      const reminderId = formData.get("reminderId") as string;

      if (!reminderId) {
        return new Response("Missing reminder ID", { status: 400 });
      }

      switch (action) {
        case "delete": {
          await deleteReminder(reminderId, session.userId);
          await historyLogger.reminderStatusChanged(
            reminderId,
            session.userId,
            "cancelled",
            "active",
            "cancelled",
            "web",
          );
          break;
        }

        case "pause": {
          await updateReminder(reminderId, { isActive: false }, session.userId);
          await historyLogger.reminderStatusChanged(
            reminderId,
            session.userId,
            "paused",
            "active",
            "paused",
            "web",
          );
          break;
        }

        case "resume": {
          await updateReminder(reminderId, { isActive: true }, session.userId);
          await historyLogger.reminderStatusChanged(
            reminderId,
            session.userId,
            "resumed",
            "paused",
            "active",
            "web",
          );
          break;
        }

        case "complete": {
          await updateReminder(
            reminderId,
            { status: "completed" },
            session.userId,
          );
          await historyLogger.reminderStatusChanged(
            reminderId,
            session.userId,
            "completed",
            "active",
            "completed",
            "web",
          );
          break;
        }

        case "update": {
          // Handle form updates
          const updateData: UpdateReminderInput = {};

          const title = formData.get("title") as string;
          const message = formData.get("message") as string;
          const priority = formData.get("priority") as string;

          if (title) updateData.title = title;
          if (message) updateData.message = message;
          if (priority) updateData.priority = priority as ReminderPriority;

          await updateReminder(reminderId, updateData, session.userId);
          break;
        }

        default:
          return new Response("Invalid action", { status: 400 });
      }

      // Redirect back to the page
      return new Response("", {
        status: 302,
        headers: { Location: "/reminders/manage" },
      });
    } catch (error) {
      console.error("Error managing reminder:", error);
      return new Response("Internal server error", { status: 500 });
    }
  },
};

export default function ManageReminders(
  { data }: PageProps<ManageRemindersData>,
) {
  const { reminders, user, stats, isAdmin } = data;

  return (
    <div class="min-h-screen bg-gray-50">
      {/* Header */}
      <header class="bg-white shadow-sm border-b">
        <div class="max-w-6xl mx-auto px-4 py-4">
          <div class="flex items-center justify-between">
            <div>
              <h1 class="text-2xl font-bold text-gray-900">Manage Reminders</h1>
              <p class="text-gray-600">Welcome back, {user.username}!</p>
            </div>
            <div class="flex gap-3">
              {isAdmin && (
                <a
                  href="/admin"
                  class="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
                >
                  🔧 Admin
                </a>
              )}
              <a
                href="/reminders/history"
                class="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                📊 History
              </a>
              <a
                href="/reminders"
                class="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                📋 View All
              </a>
              <a
                href="/reminders/new"
                class="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
              >
                ➕ Create New
              </a>
            </div>
          </div>
        </div>
      </header>

      <div class="max-w-6xl mx-auto px-4 py-8">
        {/* Statistics Cards */}
        <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="Total Reminders"
            value={stats.total}
            icon="📋"
            color="blue"
          />
          <StatCard
            title="Active"
            value={stats.active}
            icon="▶️"
            color="green"
          />
          <StatCard
            title="Completed"
            value={stats.completed}
            icon="✅"
            color="gray"
          />
          <StatCard
            title="Cancelled"
            value={stats.cancelled}
            icon="❌"
            color="red"
          />
        </div>

        {/* Reminders List */}
        {reminders.length === 0
          ? (
            <div class="text-center py-12 bg-white rounded-lg shadow-sm">
              <div class="text-gray-400 text-6xl mb-4">📝</div>
              <h3 class="text-xl font-medium text-gray-900 mb-2">
                No reminders yet
              </h3>
              <p class="text-gray-600 mb-6">
                Create your first reminder to get started
              </p>
              <a
                href="/reminders/new"
                class="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Create Your First Reminder
              </a>
            </div>
          )
          : (
            <div class="space-y-6">
              {reminders.map((reminder) => (
                <ReminderCard key={reminder.id} reminder={reminder} />
              ))}
            </div>
          )}
      </div>
    </div>
  );
}

interface StatCardProps {
  title: string;
  value: number;
  icon: string;
  color: "blue" | "green" | "gray" | "red";
}

function StatCard({ title, value, icon, color }: StatCardProps) {
  const colorClasses = {
    blue: "bg-blue-50 border-blue-200 text-blue-600",
    green: "bg-green-50 border-green-200 text-green-600",
    gray: "bg-gray-50 border-gray-200 text-gray-600",
    red: "bg-red-50 border-red-200 text-red-600",
  };

  return (
    <div class={`${colorClasses[color]} border rounded-lg p-6`}>
      <div class="flex items-center">
        <div class="flex-shrink-0">
          <div class="w-8 h-8 flex items-center justify-center">
            <span class="text-xl">{icon}</span>
          </div>
        </div>
        <div class="ml-4">
          <h3 class="text-lg font-medium text-gray-900">{value}</h3>
          <p class="text-sm text-gray-600">{title}</p>
        </div>
      </div>
    </div>
  );
}

interface ReminderCardProps {
  reminder: Reminder;
}

function ReminderCard({ reminder }: ReminderCardProps) {
  const statusColors = {
    active: "bg-green-100 text-green-800",
    completed: "bg-gray-100 text-gray-800",
    cancelled: "bg-red-100 text-red-800",
    paused: "bg-yellow-100 text-yellow-800",
  };

  const priorityColors = {
    low: "border-l-blue-500",
    normal: "border-l-green-500",
    high: "border-l-yellow-500",
    urgent: "border-l-red-500",
  };

  const getStatusLabel = (reminder: Reminder) => {
    if (!reminder.isActive && reminder.status === "active") return "paused";
    return reminder.status;
  };

  const statusLabel = getStatusLabel(reminder);

  return (
    <div
      class={`bg-white border-l-4 ${
        priorityColors[reminder.priority]
      } rounded-lg shadow-sm p-6`}
    >
      <div class="flex items-start justify-between">
        <div class="flex-1">
          <div class="flex items-center gap-3 mb-3">
            <h3 class="text-lg font-medium text-gray-900">{reminder.title}</h3>
            <span
              class={`px-2 py-1 text-xs font-medium rounded-full ${
                statusColors[statusLabel as keyof typeof statusColors]
              }`}
            >
              {statusLabel.charAt(0).toUpperCase() + statusLabel.slice(1)}
            </span>
            <span class="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-600 rounded-full">
              {reminder.priority}
            </span>
          </div>

          <p class="text-gray-600 mb-4">{reminder.message}</p>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-500">
            <div>
              <span class="font-medium">Category:</span> {reminder.category}
            </div>
            <div>
              <span class="font-medium">Schedule:</span>{" "}
              {reminder.schedule.type}
            </div>
            <div>
              <span class="font-medium">Next Delivery:</span>{" "}
              {reminder.nextDeliveryAt
                ? new Date(reminder.nextDeliveryAt).toLocaleDateString()
                : "N/A"}
            </div>
          </div>
        </div>

        <div class="flex-shrink-0 ml-6">
          <ReminderActions reminder={reminder} />
        </div>
      </div>
    </div>
  );
}

interface ReminderActionsProps {
  reminder: Reminder;
}

function ReminderActions({ reminder }: ReminderActionsProps) {
  const isActive = reminder.isActive && reminder.status === "active";
  const _canEdit = reminder.status !== "completed" &&
    reminder.status !== "cancelled";

  return (
    <div class="flex flex-col gap-2">
      {/* Quick Actions */}
      <div class="flex gap-2">
        {isActive
          ? (
            <form method="post" class="inline">
              <input type="hidden" name="action" value="pause" />
              <input type="hidden" name="reminderId" value={reminder.id} />
              <button
                type="submit"
                class="px-3 py-1 text-xs font-medium text-yellow-700 bg-yellow-100 border border-yellow-300 rounded hover:bg-yellow-200 transition-colors"
              >
                ⏸️ Pause
              </button>
            </form>
          )
          : reminder.status === "active"
          ? (
            <form method="post" class="inline">
              <input type="hidden" name="action" value="resume" />
              <input type="hidden" name="reminderId" value={reminder.id} />
              <button
                type="submit"
                class="px-3 py-1 text-xs font-medium text-green-700 bg-green-100 border border-green-300 rounded hover:bg-green-200 transition-colors"
              >
                ▶️ Resume
              </button>
            </form>
          )
          : null}

        {reminder.status === "active" && (
          <form method="post" class="inline">
            <input type="hidden" name="action" value="complete" />
            <input type="hidden" name="reminderId" value={reminder.id} />
            <button
              type="submit"
              class="px-3 py-1 text-xs font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded hover:bg-gray-200 transition-colors"
            >
              ✅ Complete
            </button>
          </form>
        )}
      </div>

      {/* Management Actions */}
      <div class="flex gap-2">
        <form method="post" class="inline">
          <input type="hidden" name="action" value="delete" />
          <input type="hidden" name="reminderId" value={reminder.id} />
          <button
            type="submit"
            class="px-3 py-1 text-xs font-medium text-red-700 bg-red-100 border border-red-300 rounded hover:bg-red-200 transition-colors"
          >
            🗑️ Delete
          </button>
        </form>
      </div>
    </div>
  );
}
