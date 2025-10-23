/**
 * ReminderDetail Component
 * Displays comprehensive details of a single reminder
 */

import type { Reminder } from "../discord-bot/types/reminder.ts";
import { formatDateTimeForDisplay, DEFAULT_TIMEZONE } from "../discord-bot/lib/utils/timezone.ts";

interface ReminderDetailProps {
  reminder: Reminder;
  onEdit?: () => void;
  onDelete?: () => void;
  onTest?: () => void;
}

export default function ReminderDetail({ reminder, onEdit, onDelete, onTest }: ReminderDetailProps) {
  const formatDate = (date: Date | string) => {
    const d = typeof date === "string" ? new Date(date) : date;
    const timezone = reminder.timezone || DEFAULT_TIMEZONE;
    return formatDateTimeForDisplay(d, timezone);
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      pending: "bg-yellow-100 text-yellow-800",
      sent: "bg-blue-100 text-blue-800",
      acknowledged: "bg-green-100 text-green-800",
      declined: "bg-red-100 text-red-800",
      escalated: "bg-purple-100 text-purple-800",
      escalated_acknowledged: "bg-green-100 text-green-800",
      failed: "bg-red-100 text-red-800",
      cancelled: "bg-gray-100 text-gray-800",
    };

    const bgColor = colors[status] || "bg-gray-100 text-gray-800";

    return (
      <span class={`px-3 py-1 rounded-full text-sm font-medium ${bgColor}`}>
        {status.replace(/_/g, " ").toUpperCase()}
      </span>
    );
  };

  return (
    <div class="bg-white shadow-md rounded-lg p-6 space-y-4">
      {/* Header with Status */}
      <div class="flex justify-between items-start">
        <div class="flex-1">
          <h2 class="text-2xl font-bold text-gray-900 mb-2">Reminder Details</h2>
          <div class="flex items-center gap-2">
            {getStatusBadge(reminder.status)}
            <span class="text-sm text-gray-500">ID: {reminder.id}</span>
          </div>
        </div>
        
        {/* Action Buttons */}
        <div class="flex gap-2">
          {reminder.status === "pending" && onEdit && (
            <button
              type="button"
              onClick={onEdit}
              class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Edit
            </button>
          )}
          {onTest && (
            <button
              type="button"
              onClick={onTest}
              class="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
            >
              Test
            </button>
          )}
          {reminder.status === "pending" && onDelete && (
            <button
              type="button"
              onClick={onDelete}
              class="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
            >
              Delete
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div class="border-t pt-4">
        <h3 class="text-sm font-semibold text-gray-700 mb-2">Message Content</h3>
        <p class="text-gray-900 whitespace-pre-wrap bg-gray-50 p-4 rounded border">
          {reminder.content}
        </p>
      </div>

      {/* Target User */}
      <div class="border-t pt-4">
        <h3 class="text-sm font-semibold text-gray-700 mb-2">Target User</h3>
        <p class="text-gray-900">Discord ID: <code class="bg-gray-100 px-2 py-1 rounded">{reminder.targetUserId}</code></p>
      </div>

      {/* Schedule Information */}
      <div class="border-t pt-4 grid grid-cols-2 gap-4">
        <div>
          <h3 class="text-sm font-semibold text-gray-700 mb-1">Scheduled Time</h3>
          <p class="text-gray-900">{formatDate(reminder.scheduledTime)}</p>
          <p class="text-xs text-gray-500 mt-1">Timezone: {reminder.timezone || DEFAULT_TIMEZONE}</p>
        </div>
        <div>
          <h3 class="text-sm font-semibold text-gray-700 mb-1">Created</h3>
          <p class="text-gray-900">{formatDate(reminder.createdAt)}</p>
        </div>
      </div>

      {/* Repeat Rule */}
      {reminder.repeatRule && (
        <div class="border-t pt-4">
          <h3 class="text-sm font-semibold text-gray-700 mb-2">Repeat Schedule</h3>
          <div class="bg-blue-50 p-4 rounded space-y-2">
            <p class="text-gray-900">
              <span class="font-medium">Frequency:</span> Every {reminder.repeatRule.interval} {reminder.repeatRule.frequency}
            </p>
            <p class="text-gray-900">
              <span class="font-medium">End Condition:</span> {reminder.repeatRule.endCondition.replace(/_/g, " ")}
            </p>
            {reminder.repeatRule.endCondition === "date_based" && reminder.repeatRule.endDate && (
              <p class="text-gray-900">
                <span class="font-medium">End Date:</span> {formatDate(reminder.repeatRule.endDate)}
              </p>
            )}
            {reminder.repeatRule.endCondition === "count_based" && (
              <p class="text-gray-900">
                <span class="font-medium">Occurrences:</span> {reminder.repeatRule.currentOccurrence || 0} / {reminder.repeatRule.maxOccurrences}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Escalation Configuration */}
      {reminder.escalation?.isActive && (
        <div class="border-t pt-4">
          <h3 class="text-sm font-semibold text-gray-700 mb-2">Escalation Settings</h3>
          <div class="bg-yellow-50 p-4 rounded space-y-3">
            <div>
              <p class="text-gray-900">
                <span class="font-medium">Secondary User:</span> <code class="bg-white px-2 py-1 rounded">{reminder.escalation.secondaryUserId}</code>
              </p>
              <p class="text-gray-900 mt-1">
                <span class="font-medium">Timeout:</span> {reminder.escalation.timeoutMinutes} minutes
              </p>
            </div>

            {/* Escalation Status */}
            {reminder.escalation.triggeredAt && (
              <div class="border-t border-yellow-200 pt-3">
                <div class="flex items-center gap-2 mb-2">
                  <span class="px-2 py-1 bg-purple-100 text-purple-800 rounded text-xs font-semibold">
                    ESCALATED
                  </span>
                  {reminder.escalation.triggerReason && (
                    <span class="text-sm text-gray-600">
                      Reason: {reminder.escalation.triggerReason}
                    </span>
                  )}
                </div>
                <p class="text-sm text-gray-600">
                  <span class="font-medium">Triggered:</span> {formatDate(reminder.escalation.triggeredAt)}
                </p>
              </div>
            )}

            {/* Custom Messages */}
            {(reminder.escalation.timeoutMessage || reminder.escalation.declineMessage) && (
              <div class="border-t border-yellow-200 pt-3">
                <h4 class="text-sm font-semibold text-gray-700 mb-2">Custom Escalation Messages</h4>
                
                {reminder.escalation.timeoutMessage && (
                  <div class="mb-2">
                    <p class="text-xs font-medium text-gray-600 mb-1">Timeout Message:</p>
                    <div class="bg-white p-2 rounded text-sm text-gray-900 border border-yellow-200">
                      {reminder.escalation.timeoutMessage}
                    </div>
                  </div>
                )}

                {reminder.escalation.declineMessage && (
                  <div>
                    <p class="text-xs font-medium text-gray-600 mb-1">Decline Message:</p>
                    <div class="bg-white p-2 rounded text-sm text-gray-900 border border-yellow-200">
                      {reminder.escalation.declineMessage}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Delivery Information */}
      <div class="border-t pt-4">
        <h3 class="text-sm font-semibold text-gray-700 mb-2">Delivery Status</h3>
        <div class="space-y-1 text-sm">
          <p class="text-gray-900">
            <span class="font-medium">Attempts:</span> {reminder.deliveryAttempts}
          </p>
          {reminder.lastDeliveryAttempt && (
            <p class="text-gray-900">
              <span class="font-medium">Last Attempt:</span> {formatDate(reminder.lastDeliveryAttempt)}
            </p>
          )}
          <p class="text-gray-900">
            <span class="font-medium">Created By:</span> {reminder.createdBy}
          </p>
        </div>
      </div>

      {/* Response History */}
      {reminder.responses && reminder.responses.length > 0 && (
        <div class="border-t pt-4">
          <h3 class="text-sm font-semibold text-gray-700 mb-2">Response History</h3>
          <div class="space-y-2">
            {reminder.responses.map((response) => (
              <div key={response.id} class="bg-gray-50 p-3 rounded border">
                <div class="flex justify-between items-start">
                  <span class="font-medium text-gray-900">{response.responseType}</span>
                  <span class="text-sm text-gray-500">{formatDate(response.timestamp)}</span>
                </div>
                <p class="text-sm text-gray-600 mt-1">User: {response.userId}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Test Executions */}
      {reminder.testExecutions && reminder.testExecutions.length > 0 && (
        <div class="border-t pt-4">
          <h3 class="text-sm font-semibold text-gray-700 mb-2">Test History</h3>
          <div class="space-y-2">
            {reminder.testExecutions.map((test) => (
              <div key={test.id} class="bg-gray-50 p-3 rounded border">
                <div class="flex justify-between items-start">
                  <div>
                    <span class="font-medium text-gray-900">{test.testType.replace(/_/g, " ")}</span>
                    <span class={`ml-2 text-sm ${test.result === "success" ? "text-green-600" : "text-red-600"}`}>
                      {test.result === "success" ? "✓ Success" : "✗ Failed"}
                    </span>
                  </div>
                  <span class="text-sm text-gray-500">{formatDate(test.executedAt)}</span>
                </div>
                {test.errorMessage && (
                  <p class="text-sm text-red-600 mt-1">{test.errorMessage}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
