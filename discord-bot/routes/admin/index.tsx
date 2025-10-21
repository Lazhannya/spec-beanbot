/** @jsx h */
import { h } from "preact";
import { useState } from "preact/hooks";
import type { Handlers, PageProps } from "$fresh/server.ts";
import { getSessionFromRequest } from "../../lib/storage/sessions.ts";
import { AdminService, isUserAdmin } from "../../lib/admin/service.ts";
import type {
  HealthCheck,
  StorageUsage,
  SystemStats,
  UserInfo,
} from "../../lib/admin/service.ts";

interface AdminDashboardData {
  session?: {
    userId: string;
    user: {
      id: string;
      username: string;
      discriminator: string;
      avatar: string | null;
    };
  };
  systemStats?: SystemStats;
  recentUsers?: UserInfo[];
  healthCheck?: HealthCheck;
  isAdmin?: boolean;
}

export const handler: Handlers<AdminDashboardData> = {
  async GET(req, ctx) {
    try {
      // Check authentication
      const session = await getSessionFromRequest(req);

      if (!session?.userId) {
        return ctx.render({});
      }

      // Check admin permissions
      const adminAccess = isUserAdmin(session.userId);

      if (!adminAccess) {
        return ctx.render({
          session: {
            userId: session.userId,
            user: {
              id: session.userInfo.id,
              username: session.userInfo.username,
              discriminator: session.userInfo.discriminator,
              avatar: session.userInfo.avatar || null,
            },
          },
          isAdmin: false,
        });
      }

      // Get system statistics
      const systemStats = await AdminService.getSystemStats();

      // Get recent users
      const recentUsers = await AdminService.getAllUsers({
        limit: 20,
        sortBy: "lastSeen",
        sortOrder: "desc",
      });

      // Perform health check
      const healthCheck = await AdminService.performHealthCheck();

      return ctx.render({
        session: {
          userId: session.userId,
          user: {
            id: session.userInfo.id,
            username: session.userInfo.username,
            discriminator: session.userInfo.discriminator,
            avatar: session.userInfo.avatar || null,
          },
        },
        systemStats,
        recentUsers,
        healthCheck,
        isAdmin: true,
      });
    } catch (error) {
      console.error("Error loading admin dashboard:", error);
      return ctx.render({});
    }
  },
};

/**
 * Props for the admin dashboard page
 */
interface AdminDashboardProps extends PageProps {
  session?: {
    userId: string;
    user: {
      id: string;
      username: string;
      discriminator: string;
      avatar: string | null;
    };
  };

  // Data passed from server
  systemStats?: SystemStats;
  recentUsers?: UserInfo[];
  healthCheck?: HealthCheck;
  isAdmin?: boolean;
}

/**
 * Format large numbers with K/M suffixes
 */
function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + "M";
  } else if (num >= 1000) {
    return (num / 1000).toFixed(1) + "K";
  } else {
    return num.toString();
  }
}

/**
 * Format bytes to human readable format
 */
function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) {
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  } else if (bytes >= 1024) {
    return (bytes / 1024).toFixed(1) + " KB";
  } else {
    return bytes + " B";
  }
}

/**
 * Format duration from milliseconds
 */
function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `${days}d ${hours % 24}h`;
  } else if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
}

/**
 * System statistics card component
 */
function StatsCard({
  title,
  value,
  subtitle,
  icon,
  color = "blue",
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: string;
  color?: "blue" | "green" | "yellow" | "red" | "purple";
}) {
  const colorClasses = {
    blue: "bg-blue-50 text-blue-700 border-blue-200",
    green: "bg-green-50 text-green-700 border-green-200",
    yellow: "bg-yellow-50 text-yellow-700 border-yellow-200",
    red: "bg-red-50 text-red-700 border-red-200",
    purple: "bg-purple-50 text-purple-700 border-purple-200",
  };

  return (
    <div class={`p-6 rounded-lg border-2 ${colorClasses[color]}`}>
      <div class="flex items-center justify-between">
        <div>
          <p class="text-sm font-medium opacity-80">{title}</p>
          <p class="text-2xl font-bold mt-1">{value}</p>
          {subtitle && <p class="text-xs opacity-70 mt-1">{subtitle}</p>}
        </div>
        <div class="text-3xl opacity-60">
          {icon}
        </div>
      </div>
    </div>
  );
}

/**
 * Health check status component
 */
function HealthStatus({ healthCheck }: { healthCheck: HealthCheck }) {
  const statusColors = {
    healthy: "text-green-600 bg-green-100",
    warning: "text-yellow-600 bg-yellow-100",
    error: "text-red-600 bg-red-100",
  };

  const statusIcons = {
    healthy: "✅",
    warning: "⚠️",
    error: "❌",
  };

  return (
    <div class="bg-white rounded-lg shadow-md p-6">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-lg font-semibold text-gray-900">System Health</h3>
        <div
          class={`px-3 py-1 rounded-full text-sm font-medium ${
            statusColors[healthCheck.status]
          }`}
        >
          {statusIcons[healthCheck.status]} {healthCheck.status.toUpperCase()}
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Object.entries(healthCheck.checks).map(([name, check]) => (
          <div
            key={name}
            class="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
          >
            <div>
              <span class="font-medium capitalize">{name}</span>
              {check.message && (
                <p class="text-sm text-gray-600">{check.message}</p>
              )}
            </div>
            <span
              class={`text-sm font-medium ${
                check.status === "ok"
                  ? "text-green-600"
                  : check.status === "warning"
                  ? "text-yellow-600"
                  : "text-red-600"
              }`}
            >
              {check.status === "ok"
                ? "✅"
                : check.status === "warning"
                ? "⚠️"
                : "❌"}
            </span>
          </div>
        ))}
      </div>

      {(healthCheck.warnings.length > 0 || healthCheck.errors.length > 0) && (
        <div class="mt-4 space-y-2">
          {healthCheck.warnings.map((warning, index) => (
            <div
              key={index}
              class="flex items-center space-x-2 text-yellow-700 bg-yellow-50 p-2 rounded"
            >
              <span>⚠️</span>
              <span class="text-sm">{warning}</span>
            </div>
          ))}
          {healthCheck.errors.map((error, index) => (
            <div
              key={index}
              class="flex items-center space-x-2 text-red-700 bg-red-50 p-2 rounded"
            >
              <span>❌</span>
              <span class="text-sm">{error}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Storage usage component
 */
function StorageUsage({ storage }: { storage: StorageUsage }) {
  const totalSizeKB = storage.estimatedSizeKB;
  const usagePercentage = Math.min((totalSizeKB / (100 * 1024)) * 100, 100); // Max 100MB for visualization

  return (
    <div class="bg-white rounded-lg shadow-md p-6">
      <h3 class="text-lg font-semibold text-gray-900 mb-4">Storage Usage</h3>

      <div class="mb-4">
        <div class="flex justify-between text-sm text-gray-600 mb-1">
          <span>Total Usage</span>
          <span>{formatBytes(totalSizeKB * 1024)}</span>
        </div>
        <div class="w-full bg-gray-200 rounded-full h-2">
          <div
            class={`h-2 rounded-full ${
              usagePercentage > 80
                ? "bg-red-500"
                : usagePercentage > 60
                ? "bg-yellow-500"
                : "bg-green-500"
            }`}
            style={{ width: `${usagePercentage}%` }}
          >
          </div>
        </div>
      </div>

      <div class="grid grid-cols-2 gap-4 text-sm">
        <div class="flex justify-between">
          <span class="text-gray-600">Reminders:</span>
          <span class="font-medium">
            {formatNumber(storage.reminderEntries)}
          </span>
        </div>
        <div class="flex justify-between">
          <span class="text-gray-600">Sessions:</span>
          <span class="font-medium">
            {formatNumber(storage.sessionEntries)}
          </span>
        </div>
        <div class="flex justify-between">
          <span class="text-gray-600">History:</span>
          <span class="font-medium">
            {formatNumber(storage.historyEntries)}
          </span>
        </div>
        <div class="flex justify-between">
          <span class="text-gray-600">Other:</span>
          <span class="font-medium">{formatNumber(storage.otherEntries)}</span>
        </div>
      </div>
    </div>
  );
}

/**
 * Recent users table component
 */
function RecentUsersTable({ users }: { users: UserInfo[] }) {
  return (
    <div class="bg-white rounded-lg shadow-md overflow-hidden">
      <div class="px-6 py-4 border-b border-gray-200">
        <h3 class="text-lg font-semibold text-gray-900">Recent Users</h3>
      </div>

      <div class="overflow-x-auto">
        <table class="w-full">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                User
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Reminders
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Response Rate
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Last Seen
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            {users.map((user) => (
              <tr key={user.userId} class="hover:bg-gray-50">
                <td class="px-6 py-4 whitespace-nowrap">
                  <div class="flex items-center">
                    {user.avatar
                      ? (
                        <img
                          src={`https://cdn.discordapp.com/avatars/${user.userId}/${user.avatar}.png?size=32`}
                          alt="Avatar"
                          class="w-8 h-8 rounded-full mr-3"
                        />
                      )
                      : (
                        <div class="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center mr-3">
                          <span class="text-gray-600 text-xs font-medium">
                            {user.username.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                    <div>
                      <div class="text-sm font-medium text-gray-900">
                        {user.username}
                      </div>
                      <div class="text-sm text-gray-500">
                        #{user.discriminator}
                      </div>
                    </div>
                  </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <div class="text-sm text-gray-900">
                    {user.totalReminders} total
                  </div>
                  <div class="text-sm text-gray-500">
                    {user.activeReminders} active
                  </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <div class="text-sm text-gray-900">
                    {user.acknowledgmentRate.toFixed(1)}%
                  </div>
                  <div class="text-sm text-gray-500">
                    {formatDuration(user.averageResponseTime * 60 * 1000)} avg
                  </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {user.lastSeen
                    ? new Date(user.lastSeen).toLocaleDateString()
                    : "Never"}
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <span
                    class={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      user.currentSessions > 0
                        ? "bg-green-100 text-green-800"
                        : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {user.currentSessions > 0 ? "Online" : "Offline"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/**
 * System actions component
 */
function SystemActions() {
  const [loading, setLoading] = useState<string | null>(null);
  const [results, setResults] = useState<string | null>(null);

  const performAction = async (action: string) => {
    setLoading(action);
    setResults(null);

    try {
      const response = await fetch(`/admin/actions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });

      const result = await response.json();

      if (response.ok) {
        setResults(
          `${action} completed successfully: ${JSON.stringify(result)}`,
        );
      } else {
        setResults(`${action} failed: ${result.error}`);
      }
    } catch (error) {
      setResults(
        `${action} failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      );
    } finally {
      setLoading(null);
    }
  };

  return (
    <div class="bg-white rounded-lg shadow-md p-6">
      <h3 class="text-lg font-semibold text-gray-900 mb-4">System Actions</h3>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <button
          type="button"
          onClick={() => performAction("cleanup")}
          disabled={loading !== null}
          class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading === "cleanup" ? "Cleaning..." : "🧹 Cleanup Data"}
        </button>

        <button
          type="button"
          onClick={() => performAction("healthcheck")}
          disabled={loading !== null}
          class="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading === "healthcheck" ? "Checking..." : "🏥 Health Check"}
        </button>

        <button
          type="button"
          onClick={() => performAction("stats")}
          disabled={loading !== null}
          class="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading === "stats" ? "Loading..." : "📊 Refresh Stats"}
        </button>
      </div>

      {results && (
        <div class="mt-4 p-3 bg-gray-50 rounded-md">
          <p class="text-sm text-gray-700">{results}</p>
        </div>
      )}
    </div>
  );
}

/**
 * Main admin dashboard component
 */
export default function AdminDashboard(props: PageProps<AdminDashboardData>) {
  const { session, systemStats, recentUsers, healthCheck, isAdmin } =
    props.data;

  // Check authentication and admin access
  if (!session?.userId) {
    return (
      <div class="min-h-screen bg-gray-50 flex items-center justify-center">
        <div class="text-center">
          <h1 class="text-2xl font-bold text-gray-900 mb-4">
            Authentication Required
          </h1>
          <p class="text-gray-600 mb-6">
            Please log in to access the admin dashboard.
          </p>
          <a
            href="/auth/discord"
            class="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Login with Discord
          </a>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div class="min-h-screen bg-gray-50 flex items-center justify-center">
        <div class="text-center">
          <h1 class="text-2xl font-bold text-red-600 mb-4">Access Denied</h1>
          <p class="text-gray-600 mb-6">
            You don't have permission to access the admin dashboard.
          </p>
          <a
            href="/reminders"
            class="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Back to Reminders
          </a>
        </div>
      </div>
    );
  }

  return (
    <div class="min-h-screen bg-gray-50">
      {/* Header */}
      <div class="bg-white shadow-sm">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div class="flex items-center justify-between">
            <div>
              <h1 class="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
              <p class="text-gray-600 mt-1">
                System monitoring and user management
              </p>
            </div>

            <div class="flex items-center space-x-4">
              <div class="flex items-center space-x-2">
                {session.user.avatar
                  ? (
                    <img
                      src={`https://cdn.discordapp.com/avatars/${session.user.id}/${session.user.avatar}.png?size=32`}
                      alt="Avatar"
                      class="w-8 h-8 rounded-full"
                    />
                  )
                  : (
                    <div class="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                      <span class="text-gray-600 text-sm font-medium">
                        {session.user.username.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                <span class="text-sm font-medium text-gray-900">
                  {session.user.username}
                </span>
                <span class="text-xs bg-red-100 text-red-800 px-2 py-1 rounded-full">
                  ADMIN
                </span>
              </div>

              <a
                href="/reminders"
                class="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Back to App
              </a>
            </div>
          </div>
        </div>
      </div>

      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* System Stats Overview */}
        {systemStats && (
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatsCard
              title="Total Users"
              value={formatNumber(systemStats.totalUsers)}
              subtitle={`${systemStats.activeUsers} active`}
              icon="👥"
              color="blue"
            />

            <StatsCard
              title="Total Reminders"
              value={formatNumber(systemStats.totalReminders)}
              subtitle={`${systemStats.activeReminders} active`}
              icon="📋"
              color="green"
            />

            <StatsCard
              title="Delivery Rate"
              value={`${systemStats.deliverySuccessRate.toFixed(1)}%`}
              subtitle={`${formatNumber(systemStats.totalDeliveries)} total`}
              icon="📨"
              color={systemStats.deliverySuccessRate > 95
                ? "green"
                : systemStats.deliverySuccessRate > 80
                ? "yellow"
                : "red"}
            />

            <StatsCard
              title="System Uptime"
              value={formatDuration(systemStats.uptime)}
              subtitle={`Since ${
                new Date(Date.now() - systemStats.uptime).toLocaleDateString()
              }`}
              icon="⏱️"
              color="purple"
            />
          </div>
        )}

        {/* Health Check and Storage */}
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {healthCheck && <HealthStatus healthCheck={healthCheck} />}
          {systemStats && <StorageUsage storage={systemStats.storageUsage} />}
        </div>

        {/* System Actions */}
        <div class="mb-8">
          <SystemActions />
        </div>

        {/* Recent Users */}
        {recentUsers && recentUsers.length > 0 && (
          <div>
            <RecentUsersTable users={recentUsers} />
          </div>
        )}
      </div>
    </div>
  );
}
