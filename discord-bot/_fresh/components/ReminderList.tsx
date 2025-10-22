/**
 * ReminderList Component
 * Displays a list of reminders with filtering, sorting, and status indicators
 */

import { JSX } from "preact";

// Type definitions
interface Reminder {
  id: string;
  content: string;
  targetUserId: string;
  scheduledTime: string; // ISO string
  createdAt: string;
  status: string;
  deliveryAttempts: number;
  escalation?: {
    secondaryUserId: string;
    timeoutMinutes: number;
  };
  responses: Array<{
    id: string;
    action: string;
    timestamp: string;
    userId: string;
  }>;
}

interface ReminderListProps {
  reminders: Reminder[];
  loading?: boolean;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  onTest?: (id: string) => void;
  onRefresh?: () => void;
  statusFilter?: string;
  onStatusFilterChange?: (status: string) => void;
}

export default function ReminderList({
  reminders,
  loading = false,
  onEdit,
  onDelete,
  onTest,
  onRefresh,
  statusFilter = "all",
  onStatusFilterChange,
}: ReminderListProps) {
  
  // Status styling
  const getStatusColor = (status: string): string => {
    switch (status) {
      case "pending": return "bg-yellow-100 text-yellow-800";
      case "sent": return "bg-blue-100 text-blue-800";
      case "acknowledged": return "bg-green-100 text-green-800";
      case "declined": return "bg-red-100 text-red-800";
      case "escalated": return "bg-purple-100 text-purple-800";
      case "escalated_acknowledged": return "bg-green-100 text-green-800";
      case "failed": return "bg-red-100 text-red-800";
      case "cancelled": return "bg-gray-100 text-gray-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  // Format date for display
  const formatDate = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      return date.toLocaleString();
    } catch {
      return dateString;
    }
  };

  // Format status for display
  const formatStatus = (status: string): string => {
    return status.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  // Truncate content for display
  const truncateContent = (content: string, maxLength = 100): string => {
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength) + '...';
  };

  // Get the latest response for a reminder
  const getLatestResponse = (responses: Reminder['responses']) => {
    if (!responses || responses.length === 0) return null;
    return responses.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    )[0];
  };

  // Filter options
  const statusOptions = [
    { value: "all", label: "All Reminders" },
    { value: "pending", label: "Pending" },
    { value: "sent", label: "Sent" },
    { value: "acknowledged", label: "Acknowledged" },
    { value: "declined", label: "Declined" },
    { value: "escalated", label: "Escalated" },
    { value: "failed", label: "Failed" },
    { value: "cancelled", label: "Cancelled" },
  ];

  return (
    <div class="bg-white shadow rounded-lg">
      {/* Header */}
      <div class="px-6 py-4 border-b border-gray-200">
        <div class="flex justify-between items-center">
          <h2 class="text-lg font-medium text-gray-900">
            Reminders ({reminders.length})
          </h2>
          <div class="flex items-center space-x-3">
            {/* Status Filter */}
            {onStatusFilterChange && (
              <select
                value={statusFilter}
                onChange={(e) => onStatusFilterChange((e.target as HTMLSelectElement).value)}
                class="border border-gray-300 rounded-md px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {statusOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            )}
            
            {/* Refresh Button */}
            {onRefresh && (
              <button
                onClick={onRefresh}
                disabled={loading}
                class="px-3 py-1 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {loading ? 'Loading...' : 'Refresh'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div class="divide-y divide-gray-200">
        {loading && reminders.length === 0 ? (
          <div class="px-6 py-8 text-center">
            <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p class="mt-2 text-sm text-gray-500">Loading reminders...</p>
          </div>
        ) : reminders.length === 0 ? (
          <div class="px-6 py-8 text-center">
            <p class="text-gray-500">
              {statusFilter === "all" ? "No reminders found" : `No ${statusFilter} reminders found`}
            </p>
          </div>
        ) : (
          reminders.map((reminder) => {
            const latestResponse = getLatestResponse(reminder.responses);
            
            return (
              <div key={reminder.id} class="px-6 py-4 hover:bg-gray-50">
                <div class="flex items-start justify-between">
                  {/* Main Content */}
                  <div class="flex-1 min-w-0">
                    {/* Content and Status */}
                    <div class="flex items-start justify-between mb-2">
                      <p class="text-sm text-gray-900 font-medium">
                        {truncateContent(reminder.content)}
                      </p>
                      <span class={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(reminder.status)}`}>
                        {formatStatus(reminder.status)}
                      </span>
                    </div>

                    {/* Details Grid */}
                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-xs text-gray-500">
                      <div>
                        <span class="font-medium">Target:</span> {reminder.targetUserId}
                      </div>
                      <div>
                        <span class="font-medium">Scheduled:</span> {formatDate(reminder.scheduledTime)}
                      </div>
                      <div>
                        <span class="font-medium">Created:</span> {formatDate(reminder.createdAt)}
                      </div>
                      <div>
                        <span class="font-medium">Attempts:</span> {reminder.deliveryAttempts}
                      </div>
                    </div>

                    {/* Escalation Info */}
                    {reminder.escalation && (
                      <div class="mt-2 text-xs text-purple-600">
                        <span class="font-medium">Escalation:</span> {reminder.escalation.secondaryUserId} 
                        (timeout: {reminder.escalation.timeoutMinutes}m)
                      </div>
                    )}

                    {/* Latest Response */}
                    {latestResponse && (
                      <div class="mt-2 text-xs text-gray-500">
                        <span class="font-medium">Latest Response:</span> {formatStatus(latestResponse.action)} 
                        by {latestResponse.userId} at {formatDate(latestResponse.timestamp)}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div class="ml-4 flex flex-col space-y-1">
                    {onEdit && reminder.status === "pending" && (
                      <button
                        onClick={() => onEdit(reminder.id)}
                        class="px-2 py-1 text-xs font-medium text-blue-600 hover:text-blue-500"
                      >
                        Edit
                      </button>
                    )}
                    
                    {onTest && (
                      <button
                        onClick={() => onTest(reminder.id)}
                        class="px-2 py-1 text-xs font-medium text-green-600 hover:text-green-500"
                      >
                        Test
                      </button>
                    )}
                    
                    {onDelete && reminder.status === "pending" && (
                      <button
                        onClick={() => onDelete(reminder.id)}
                        class="px-2 py-1 text-xs font-medium text-red-600 hover:text-red-500"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer */}
      {reminders.length > 0 && (
        <div class="px-6 py-3 bg-gray-50 border-t border-gray-200">
          <p class="text-xs text-gray-500">
            Showing {reminders.length} reminder{reminders.length !== 1 ? 's' : ''}
            {statusFilter !== "all" && ` with status: ${formatStatus(statusFilter)}`}
          </p>
        </div>
      )}
    </div>
  );
}