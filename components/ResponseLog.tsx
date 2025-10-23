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
    [ResponseType.ACKNOWLEDGED]: "bg-green-100 text-green-800",
    [ResponseType.DECLINED]: "bg-red-100 text-red-800",
    [ResponseType.DELIVERED]: "bg-blue-100 text-blue-800",
    [ResponseType.FAILED_DELIVERY]: "bg-orange-100 text-orange-800",
    [ResponseType.ESCALATED]: "bg-purple-100 text-purple-800",
    [ResponseType.CANCELLED]: "bg-gray-100 text-gray-800"
  };
  return colors[type] || "bg-gray-100 text-gray-800";
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
      <div class="bg-gray-50 rounded-lg p-4 text-center text-gray-500">
        <p>No responses recorded yet</p>
      </div>
    );
  }

  return (
    <div class="space-y-3">
      <h3 class="text-lg font-semibold text-gray-900">Response History</h3>
      
      <div class="bg-white rounded-lg border border-gray-200 divide-y divide-gray-200">
        {sortedResponses.map((response) => (
          <div key={response.id} class="p-4 hover:bg-gray-50 transition-colors">
            <div class="flex items-start justify-between">
              <div class="flex-1">
                <div class="flex items-center gap-2 mb-1">
                  <span class={`px-2 py-1 text-xs font-medium rounded-full ${getResponseColor(response.responseType)}`}>
                    {formatResponseType(response.responseType)}
                  </span>
                  <span class="text-sm text-gray-600">
                    by User {response.userId.slice(0, 8)}...
                  </span>
                </div>
                
                <p class="text-sm text-gray-500">
                  {formatTimestamp(response.timestamp)}
                </p>
                
                {response.messageId && (
                  <p class="text-xs text-gray-400 mt-1">
                    Message ID: {response.messageId}
                  </p>
                )}
                
                {response.metadata && Object.keys(response.metadata).length > 0 && (
                  <details class="mt-2">
                    <summary class="text-xs text-gray-600 cursor-pointer hover:text-gray-800">
                      Additional Details
                    </summary>
                    <pre class="mt-1 text-xs bg-gray-100 p-2 rounded overflow-x-auto">
                      {JSON.stringify(response.metadata, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
      
      <div class="text-sm text-gray-500 text-center">
        {sortedResponses.length} {sortedResponses.length === 1 ? 'response' : 'responses'} recorded
      </div>
    </div>
  );
}
