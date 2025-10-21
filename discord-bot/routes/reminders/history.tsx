/** @jsx h */
import { h } from "preact";
import { useState, useEffect } from "preact/hooks";
import type { Handlers, PageProps } from "$fresh/server.ts";
import { ReminderHistoryService } from "../../lib/history/service.ts";
import { getSession } from "../../lib/storage/sessions.ts";
import type { ReminderHistoryEntry, UserActivitySummary, InteractionType } from "../../lib/history/service.ts";

/**
 * Get cookies from request headers
 */
function getCookiesFromRequest(req: Request): Record<string, string> {
  const cookies: Record<string, string> = {};
  const cookieHeader = req.headers.get("cookie");
  
  if (cookieHeader) {
    cookieHeader.split(";").forEach((cookie) => {
      const [name, value] = cookie.trim().split("=");
      if (name && value) {
        cookies[name] = decodeURIComponent(value);
      }
    });
  }
  
  return cookies;
}

interface HistoryPageData {
  session?: {
    userId: string;
    user: {
      id: string;
      username: string;
      discriminator: string;
      avatar: string | null;
    };
  };
  userActivity?: UserActivitySummary;
  recentHistory?: ReminderHistoryEntry[];
}

export const handler: Handlers<HistoryPageData> = {
  async GET(req, ctx) {
    try {
      // Check authentication
      const cookies = getCookiesFromRequest(req);
      const sessionToken = cookies.session;

      if (!sessionToken) {
        return ctx.render({});
      }

      const session = await getSession(sessionToken);
      if (!session?.userId) {
        return ctx.render({});
      }

      // Get user activity summary
      const userActivity = await ReminderHistoryService.generateUserSummary(
        session.userId,
        30 // Last 30 days
      );

      // Get recent history
      const recentHistory = await ReminderHistoryService.getUserActivity(
        session.userId,
        {
          limit: 50, // Show last 50 activities
        }
      );

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
        userActivity,
        recentHistory,
      });

    } catch (error) {
      console.error("Error loading history page:", error);
      return ctx.render({});
    }
  },
};

/**
 * Props for the history page
 */
interface HistoryPageProps extends PageProps<HistoryPageData> {}

/**
 * Format timestamp for display
 */
function formatTimestamp(timestamp: Date): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 60) {
    return `${diffMins}m ago`;
  } else if (diffHours < 24) {
    return `${diffHours}h ago`;
  } else if (diffDays < 7) {
    return `${diffDays}d ago`;
  } else {
    return date.toLocaleDateString();
  }
}

/**
 * Get icon for interaction type
 */
function getInteractionIcon(type: InteractionType): string {
  switch (type) {
    case "created": return "➕";
    case "delivered": return "📨";
    case "acknowledged": return "✅";
    case "snoozed": return "⏰";
    case "completed": return "🎯";
    case "cancelled": return "❌";
    case "escalated": return "⚠️";
    case "edited": return "✏️";
    case "paused": return "⏸️";
    case "resumed": return "▶️";
    default: return "📝";
  }
}

/**
 * Get color class for interaction type
 */
function getInteractionColor(type: InteractionType): string {
  switch (type) {
    case "created": return "text-green-600";
    case "delivered": return "text-blue-600";
    case "acknowledged": return "text-green-600";
    case "snoozed": return "text-yellow-600";
    case "completed": return "text-green-700";
    case "cancelled": return "text-red-600";
    case "escalated": return "text-orange-600";
    case "edited": return "text-purple-600";
    case "paused": return "text-gray-600";
    case "resumed": return "text-green-600";
    default: return "text-gray-600";
  }
}

/**
 * Activity summary card component
 */
function ActivitySummaryCard({ summary }: { summary: UserActivitySummary }) {
  const responseRate = summary.totalRemindersReceived > 0 
    ? ((summary.remindersAcknowledged / summary.totalRemindersReceived) * 100).toFixed(1)
    : "0";

  const avgResponseHours = summary.averageResponseTime > 0 
    ? (summary.averageResponseTime / 60).toFixed(1)
    : "0";

  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const mostActiveDay = dayNames[summary.mostActiveDay];

  return (
    <div class="bg-white rounded-lg shadow-md p-6">
      <h3 class="text-lg font-semibold text-gray-900 mb-4">Activity Summary</h3>
      
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div class="text-center">
          <div class="text-2xl font-bold text-blue-600">{summary.remindersCreated}</div>
          <div class="text-sm text-gray-600">Created</div>
        </div>
        
        <div class="text-center">
          <div class="text-2xl font-bold text-green-600">{summary.remindersCompleted}</div>
          <div class="text-sm text-gray-600">Completed</div>
        </div>
        
        <div class="text-center">
          <div class="text-2xl font-bold text-orange-600">{responseRate}%</div>
          <div class="text-sm text-gray-600">Response Rate</div>
        </div>
        
        <div class="text-center">
          <div class="text-2xl font-bold text-purple-600">{avgResponseHours}h</div>
          <div class="text-sm text-gray-600">Avg Response</div>
        </div>
      </div>

      <div class="mt-6 pt-4 border-t border-gray-200">
        <div class="grid grid-cols-2 gap-4 text-sm text-gray-600">
          <div>
            <span class="font-medium">Most Active Day:</span> {mostActiveDay}
          </div>
          <div>
            <span class="font-medium">Most Active Hour:</span> {summary.mostActiveHour}:00
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * History entry component
 */
function HistoryEntryCard({ entry }: { entry: ReminderHistoryEntry }) {
  const icon = getInteractionIcon(entry.type);
  const colorClass = getInteractionColor(entry.type);
  const timestamp = formatTimestamp(entry.timestamp);

  return (
    <div class="bg-white rounded-lg shadow-md p-4 border-l-4 border-blue-500">
      <div class="flex items-start justify-between">
        <div class="flex items-center space-x-3">
          <span class="text-xl">{icon}</span>
          <div>
            <h4 class={`font-medium ${colorClass} capitalize`}>
              {entry.type.replace(/([A-Z])/g, ' $1').trim()}
            </h4>
            <p class="text-sm text-gray-600">
              Reminder: {entry.reminderId.slice(0, 8)}...
            </p>
          </div>
        </div>
        
        <div class="text-right">
          <div class="text-sm text-gray-500">{timestamp}</div>
          <div class="text-xs text-gray-400 capitalize">{entry.source}</div>
        </div>
      </div>

      {entry.metadata && (
        <div class="mt-3 pt-3 border-t border-gray-100">
          <div class="text-xs text-gray-600">
            {entry.metadata.escalationLevel && (
              <span class="inline-block bg-orange-100 text-orange-800 px-2 py-1 rounded-full mr-2">
                Escalation Level {entry.metadata.escalationLevel}
              </span>
            )}
            
            {entry.metadata.snoozeMinutes && (
              <span class="inline-block bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full mr-2">
                Snoozed {entry.metadata.snoozeMinutes}m
              </span>
            )}
            
            {entry.acknowledgmentMethod && (
              <span class="inline-block bg-green-100 text-green-800 px-2 py-1 rounded-full mr-2 capitalize">
                {entry.acknowledgmentMethod}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Filter controls component
 */
function FilterControls({ 
  filters, 
  onChange 
}: { 
  filters: {
    type: InteractionType | undefined;
    period: number;
  };
  onChange: (filters: { type: InteractionType | undefined; period: number }) => void;
}) {
  const interactionTypes: InteractionType[] = [
    "created", "delivered", "acknowledged", "snoozed", "completed", 
    "cancelled", "escalated", "edited", "paused", "resumed"
  ];

  return (
    <div class="bg-white rounded-lg shadow-md p-4 mb-6">
      <h3 class="text-lg font-semibold text-gray-900 mb-4">Filters</h3>
      
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">
            Interaction Type
          </label>
          <select
            value={filters.type || ""}
            onChange={(e) => onChange({
              ...filters,
              type: (e.currentTarget.value as InteractionType) || undefined
            })}
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Types</option>
            {interactionTypes.map((type) => (
              <option key={type} value={type} class="capitalize">
                {getInteractionIcon(type)} {type.replace(/([A-Z])/g, ' $1').trim()}
              </option>
            ))}
          </select>
        </div>
        
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">
            Time Period
          </label>
          <select
            value={filters.period}
            onChange={(e) => onChange({
              ...filters,
              period: parseInt(e.currentTarget.value)
            })}
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
            <option value={365}>Last year</option>
          </select>
        </div>
      </div>
    </div>
  );
}

/**
 * Main history page component
 */
export default function HistoryPage(props: PageProps<HistoryPageData>) {
  const { session, userActivity, recentHistory } = props.data;
  
  const [filters, setFilters] = useState<{
    type: InteractionType | undefined;
    period: number;
  }>({
    type: undefined,
    period: 30,
  });
  
  const [filteredHistory, setFilteredHistory] = useState<ReminderHistoryEntry[]>(recentHistory || []);
  const [_loading, _setLoading] = useState(false);

  // Check authentication
  if (!session?.userId) {
    return (
      <div class="min-h-screen bg-gray-50 flex items-center justify-center">
        <div class="text-center">
          <h1 class="text-2xl font-bold text-gray-900 mb-4">Authentication Required</h1>
          <p class="text-gray-600 mb-6">Please log in to view your reminder history.</p>
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

  // Filter history when filters change
  useEffect(() => {
    const filtered = (recentHistory || []).filter((entry: ReminderHistoryEntry) => {
      if (filters.type && entry.type !== filters.type) {
        return false;
      }
      
      const daysCutoff = new Date();
      daysCutoff.setDate(daysCutoff.getDate() - filters.period);
      
      if (new Date(entry.timestamp) < daysCutoff) {
        return false;
      }
      
      return true;
    });
    
    setFilteredHistory(filtered);
  }, [filters, recentHistory]);

  return (
    <div class="min-h-screen bg-gray-50">
      {/* Header */}
      <div class="bg-white shadow-sm">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div class="flex items-center justify-between">
            <div>
              <h1 class="text-2xl font-bold text-gray-900">Reminder History</h1>
              <p class="text-gray-600 mt-1">
                Track your reminder activities and analytics
              </p>
            </div>
            
            <div class="flex items-center space-x-4">
              <div class="flex items-center space-x-2">
                {session.user.avatar ? (
                  <img
                    src={`https://cdn.discordapp.com/avatars/${session.user.id}/${session.user.avatar}.png?size=32`}
                    alt="Avatar"
                    class="w-8 h-8 rounded-full"
                  />
                ) : (
                  <div class="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                    <span class="text-gray-600 text-sm font-medium">
                      {session.user.username.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
                <span class="text-sm font-medium text-gray-900">
                  {session.user.username}
                </span>
              </div>
              
              <a
                href="/reminders"
                class="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Back to Reminders
              </a>
            </div>
          </div>
        </div>
      </div>

      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Activity Summary */}
        {userActivity && (
          <div class="mb-8">
            <ActivitySummaryCard summary={userActivity} />
          </div>
        )}

        {/* Filters */}
        <FilterControls filters={filters} onChange={setFilters} />

        {/* History Timeline */}
        <div class="bg-white rounded-lg shadow-md">
          <div class="px-6 py-4 border-b border-gray-200">
            <h3 class="text-lg font-semibold text-gray-900">
              Activity Timeline ({filteredHistory.length} entries)
            </h3>
          </div>
          
          <div class="p-6">
            {_loading ? (
              <div class="text-center py-8">
                <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <p class="text-gray-600 mt-2">Loading history...</p>
              </div>
            ) : filteredHistory.length > 0 ? (
              <div class="space-y-4">
                {filteredHistory.map((entry) => (
                  <HistoryEntryCard key={entry.id} entry={entry} />
                ))}
              </div>
            ) : (
              <div class="text-center py-8">
                <p class="text-gray-600">No activity found for the selected filters.</p>
                <p class="text-sm text-gray-500 mt-2">
                  Try adjusting your filters or create some reminders to see activity here.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}