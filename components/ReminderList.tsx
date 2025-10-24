/**
 * ReminderList Component
 * Displays a list of reminders with filtering, sorting, and status indicators
 */

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
  // Pagination props
  currentPage?: number;
  totalPages?: number;
  pageSize?: number;
  totalCount?: number;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
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
  currentPage = 1,
  totalPages = 1,
  pageSize = 20,
  totalCount,
  onPageChange,
  onPageSizeChange,
}: ReminderListProps) {
  
  // Status styling
  const getStatusColor = (status: string): string => {
    switch (status) {
      case "pending": return "bg-yellow-100 dark:bg-yellow-900 dark:bg-opacity-30 text-yellow-800 dark:text-yellow-300";
      case "sent": return "bg-blue-100 dark:bg-blue-900 dark:bg-opacity-30 text-blue-800 dark:text-blue-300";
      case "acknowledged": return "bg-green-100 dark:bg-green-900 dark:bg-opacity-30 text-green-800 dark:text-green-300";
      case "declined": return "bg-red-100 dark:bg-red-900 dark:bg-opacity-30 text-red-800 dark:text-red-300";
      case "escalated": return "bg-purple-100 dark:bg-purple-900 dark:bg-opacity-30 text-purple-800 dark:text-purple-300";
      case "escalated_acknowledged": return "bg-green-100 dark:bg-green-900 dark:bg-opacity-30 text-green-800 dark:text-green-300";
      case "failed": return "bg-red-100 dark:bg-red-900 dark:bg-opacity-30 text-red-800 dark:text-red-300";
      case "cancelled": return "bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300";
      default: return "bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300";
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

  // Page size options
  const pageSizeOptions = [10, 20, 50, 100];

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
    <div class="bg-white dark:bg-gray-800 shadow rounded-lg border border-gray-200 dark:border-gray-700">
      {/* Header */}
      <div class="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <div class="flex justify-between items-center">
          <h2 class="text-lg font-medium text-gray-900 dark:text-gray-100">
            Reminders ({reminders.length})
          </h2>
          <div class="flex items-center space-x-3">
            {/* Status Filter */}
            {onStatusFilterChange && (
              <select
                value={statusFilter}
                onChange={(e) => onStatusFilterChange((e.target as HTMLSelectElement).value)}
                class="border border-gray-300 dark:border-gray-600 rounded-md px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
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
                type="button"
                onClick={onRefresh}
                disabled={loading}
                class="px-3 py-1 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {loading ? 'Loading...' : 'Refresh'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div class="divide-y divide-gray-200 dark:divide-gray-700">
        {loading && reminders.length === 0 ? (
          <div class="px-6 py-8 text-center">
            <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-blue-400"></div>
            <p class="mt-2 text-sm text-gray-500 dark:text-gray-400">Loading reminders...</p>
          </div>
        ) : reminders.length === 0 ? (
          <div class="px-6 py-8 text-center">
            <p class="text-gray-500 dark:text-gray-400">
              {statusFilter === "all" ? "No reminders found" : `No ${statusFilter} reminders found`}
            </p>
          </div>
        ) : (
          reminders.map((reminder) => {
            const latestResponse = getLatestResponse(reminder.responses);
            
            return (
              <div key={reminder.id} class="px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-700">
                <div class="flex items-start justify-between">
                  {/* Main Content */}
                  <div class="flex-1 min-w-0">
                    {/* Content and Status */}
                    <div class="flex items-start justify-between mb-2">
                      <p class="text-sm text-gray-900 dark:text-gray-100 font-medium">
                        {truncateContent(reminder.content)}
                      </p>
                      <span class={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(reminder.status)}`}>
                        {formatStatus(reminder.status)}
                      </span>
                    </div>

                    {/* Details Grid */}
                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-xs text-gray-500 dark:text-gray-400">
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
                      <div class="mt-2 text-xs text-purple-600 dark:text-purple-400">
                        <span class="font-medium">Escalation:</span> {reminder.escalation.secondaryUserId} 
                        (timeout: {reminder.escalation.timeoutMinutes}m)
                      </div>
                    )}

                    {/* Latest Response */}
                    {latestResponse && (
                      <div class="mt-2 text-xs text-gray-500 dark:text-gray-400">
                        <span class="font-medium">Latest Response:</span> {formatStatus(latestResponse.action)} 
                        by {latestResponse.userId} at {formatDate(latestResponse.timestamp)}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div class="ml-4 flex flex-col space-y-1">
                    {onEdit && reminder.status === "pending" && (
                      <button
                        type="button"
                        onClick={() => onEdit(reminder.id)}
                        class="px-2 py-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300"
                      >
                        Edit
                      </button>
                    )}
                    
                    {onTest && (
                      <button
                        type="button"
                        onClick={() => onTest(reminder.id)}
                        class="px-2 py-1 text-xs font-medium text-green-600 dark:text-green-400 hover:text-green-500 dark:hover:text-green-300"
                      >
                        Test
                      </button>
                    )}
                    
                    {onDelete && reminder.status === "pending" && (
                      <button
                        type="button"
                        onClick={() => onDelete(reminder.id)}
                        class="px-2 py-1 text-xs font-medium text-red-600 dark:text-red-400 hover:text-red-500 dark:hover:text-red-300"
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

      {/* Footer with Pagination */}
      {(reminders.length > 0 || totalCount) && (
        <div class="px-6 py-3 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
          <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
            {/* Count Information */}
            <div class="text-xs text-gray-500 dark:text-gray-400">
              {totalCount !== undefined ? (
                <>
                  Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, totalCount)} of {totalCount} reminder{totalCount !== 1 ? 's' : ''}
                  {statusFilter !== "all" && ` (${formatStatus(statusFilter)})`}
                </>
              ) : (
                <>
                  Showing {reminders.length} reminder{reminders.length !== 1 ? 's' : ''}
                  {statusFilter !== "all" && ` with status: ${formatStatus(statusFilter)}`}
                </>
              )}
            </div>

            {/* Pagination Controls */}
            {onPageChange && totalPages > 1 && (
              <div class="flex items-center space-x-4">
                {/* Page Size Selector */}
                {onPageSizeChange && (
                  <div class="flex items-center space-x-2">
                    <label class="text-xs text-gray-500 dark:text-gray-400">Per page:</label>
                    <select
                      value={pageSize}
                      onChange={(e) => onPageSizeChange(parseInt((e.target as HTMLSelectElement).value))}
                      class="border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    >
                      {pageSizeOptions.map(size => (
                        <option key={size} value={size}>{size}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Page Navigation */}
                <div class="flex items-center space-x-2">
                  {/* Previous Button */}
                  <button
                    type="button"
                    onClick={() => onPageChange(currentPage - 1)}
                    disabled={currentPage <= 1 || loading}
                    class="px-3 py-1 text-xs font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    Previous
                  </button>

                  {/* Page Numbers */}
                  <div class="flex items-center space-x-1">
                    {/* First page */}
                    {currentPage > 3 && (
                      <>
                        <button
                          type="button"
                          onClick={() => onPageChange(1)}
                          disabled={loading}
                          class="px-2 py-1 text-xs font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        >
                          1
                        </button>
                        {currentPage > 4 && <span class="text-gray-500 dark:text-gray-400">...</span>}
                      </>
                    )}

                    {/* Current page and neighbors */}
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum: number;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }

                      if (pageNum < 1 || pageNum > totalPages) return null;

                      return (
                        <button
                          key={pageNum}
                          type="button"
                          onClick={() => onPageChange(pageNum)}
                          disabled={loading}
                          class={`px-2 py-1 text-xs font-medium rounded focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                            currentPage === pageNum
                              ? 'bg-blue-600 dark:bg-blue-700 text-white border border-blue-600 dark:border-blue-700'
                              : 'text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}

                    {/* Last page */}
                    {currentPage < totalPages - 2 && (
                      <>
                        {currentPage < totalPages - 3 && <span class="text-gray-500 dark:text-gray-400">...</span>}
                        <button
                          type="button"
                          onClick={() => onPageChange(totalPages)}
                          disabled={loading}
                          class="px-2 py-1 text-xs font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        >
                          {totalPages}
                        </button>
                      </>
                    )}
                  </div>

                  {/* Next Button */}
                  <button
                    type="button"
                    onClick={() => onPageChange(currentPage + 1)}
                    disabled={currentPage >= totalPages || loading}
                    class="px-3 py-1 text-xs font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}