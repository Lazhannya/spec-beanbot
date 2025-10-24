/**
 * Response Log Component
 * Displays response history and audit trail for reminders
 */

import { ResponseLog, ResponseType } from "../discord-bot/types/reminder.ts";

interface ResponseLogProps {
  responses: ResponseLog[];
  showEmpty?: boolean;
}

/**
 * Format response type for display
 */
function formatResponseType(type: ResponseType): string {
  const labels: Record<ResponseType, string> = {
    [ResponseType.ACKNOWLEDGED]: "Acknowledged",
    [ResponseType.DECLINED]: "Declined",
    [ResponseType.DELIVERED]: "Delivered",
    [ResponseType.FAILED_DELIVERY]: "Failed Delivery",
    [ResponseType.ESCALATED]: "Escalated",
    [ResponseType.CANCELLED]: "Cancelled"
  };
  return labels[type] || type;
}

/**
 * Get badge color for response type
 */
function getResponseColor(type: ResponseType): string {
  const colors: Record<ResponseType, string> = {
    [ResponseType.ACKNOWLEDGED]: "bg-green-100 dark:bg-green-900 dark:bg-opacity-30 text-green-800 dark:text-green-300",
    [ResponseType.DECLINED]: "bg-red-100 dark:bg-red-900 dark:bg-opacity-30 text-red-800 dark:text-red-300",
    [ResponseType.DELIVERED]: "bg-blue-100 dark:bg-blue-900 dark:bg-opacity-30 text-blue-800 dark:text-blue-300",
    [ResponseType.FAILED_DELIVERY]: "bg-orange-100 dark:bg-orange-900 dark:bg-opacity-30 text-orange-800 dark:text-orange-300",
    [ResponseType.ESCALATED]: "bg-purple-100 dark:bg-purple-900 dark:bg-opacity-30 text-purple-800 dark:text-purple-300",
    [ResponseType.CANCELLED]: "bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300"
  };
  return colors[type] || "bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300";
}

/**
 * Format timestamp for display
 */
function formatTimestamp(date: Date): string {
  const d = new Date(date);
  return d.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}

/**
 * Response Log Component
 */
export default function ResponseLogComponent({ responses, showEmpty = true }: ResponseLogProps) {
  // Sort responses by timestamp descending (most recent first)
  const sortedResponses = [...responses].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  if (sortedResponses.length === 0) {
    if (!showEmpty) return null;
    
    return (
      <div class="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 text-center text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700">
        <p>No responses recorded yet</p>
      </div>
    );
  }

  return (
    <div class="space-y-3">
      <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100">Response History</h3>
      
      <div class="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 divide-y divide-gray-200 dark:divide-gray-700">
        {sortedResponses.map((response) => (
          <div key={response.id} class="p-4 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
            <div class="flex items-start justify-between">
              <div class="flex-1">
                <div class="flex items-center gap-2 mb-1">
                  <span class={`px-2 py-1 text-xs font-medium rounded-full ${getResponseColor(response.responseType)}`}>
                    {formatResponseType(response.responseType)}
                  </span>
                  <span class="text-sm text-gray-600 dark:text-gray-400">
                    by User {response.userId.slice(0, 8)}...
                  </span>
                </div>
                
                <p class="text-sm text-gray-500 dark:text-gray-400">
                  {formatTimestamp(response.timestamp)}
                </p>
                
                {response.messageId && (
                  <p class="text-xs text-gray-400 dark:text-gray-500 mt-1">
                    Message ID: {response.messageId}
                  </p>
                )}
                
                {response.metadata && Object.keys(response.metadata).length > 0 && (
                  <details class="mt-2">
                    <summary class="text-xs text-gray-600 dark:text-gray-400 cursor-pointer hover:text-gray-800 dark:hover:text-gray-300">
                      Additional Details
                    </summary>
                    <pre class="mt-1 text-xs bg-gray-100 dark:bg-gray-900 p-2 rounded overflow-x-auto border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100">
                      {JSON.stringify(response.metadata, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
      
      <div class="text-sm text-gray-500 dark:text-gray-400 text-center">
        {sortedResponses.length} {sortedResponses.length === 1 ? 'response' : 'responses'} recorded
      </div>
    </div>
  );
}
