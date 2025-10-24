/**
 * Status Badge Component
 * Reusable badge for displaying reminder status
 */

import { ReminderStatus } from "../discord-bot/types/reminder.ts";

interface StatusBadgeProps {
  status: ReminderStatus;
  size?: "sm" | "md" | "lg";
}

/**
 * Format status for display
 */
function formatStatus(status: ReminderStatus): string {
  const labels: Record<ReminderStatus, string> = {
    [ReminderStatus.PENDING]: "Pending",
    [ReminderStatus.SENT]: "Sent",
    [ReminderStatus.ACKNOWLEDGED]: "Acknowledged",
    [ReminderStatus.DECLINED]: "Declined",
    [ReminderStatus.ESCALATED]: "Escalated",
    [ReminderStatus.ESCALATED_ACK]: "Escalated (Ack)",
    [ReminderStatus.ESCALATED_DECLINED]: "Escalated (Declined)",
    [ReminderStatus.FAILED]: "Failed",
    [ReminderStatus.CANCELLED]: "Cancelled",
    [ReminderStatus.EXPIRED]: "Expired"
  };
  return labels[status] || status;
}

/**
 * Get color classes for status
 */
function getStatusColor(status: ReminderStatus): string {
  const colors: Record<ReminderStatus, string> = {
    [ReminderStatus.PENDING]: "bg-yellow-100 dark:bg-yellow-900 dark:bg-opacity-30 text-yellow-800 dark:text-yellow-300 border-yellow-200 dark:border-yellow-700",
    [ReminderStatus.SENT]: "bg-blue-100 dark:bg-blue-900 dark:bg-opacity-30 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-700",
    [ReminderStatus.ACKNOWLEDGED]: "bg-green-100 dark:bg-green-900 dark:bg-opacity-30 text-green-800 dark:text-green-300 border-green-200 dark:border-green-700",
    [ReminderStatus.DECLINED]: "bg-red-100 dark:bg-red-900 dark:bg-opacity-30 text-red-800 dark:text-red-300 border-red-200 dark:border-red-700",
    [ReminderStatus.ESCALATED]: "bg-purple-100 dark:bg-purple-900 dark:bg-opacity-30 text-purple-800 dark:text-purple-300 border-purple-200 dark:border-purple-700",
    [ReminderStatus.ESCALATED_ACK]: "bg-green-100 dark:bg-green-900 dark:bg-opacity-30 text-green-800 dark:text-green-300 border-green-200 dark:border-green-700",
    [ReminderStatus.ESCALATED_DECLINED]: "bg-red-100 dark:bg-red-900 dark:bg-opacity-30 text-red-800 dark:text-red-300 border-red-200 dark:border-red-700",
    [ReminderStatus.FAILED]: "bg-orange-100 dark:bg-orange-900 dark:bg-opacity-30 text-orange-800 dark:text-orange-300 border-orange-200 dark:border-orange-700",
    [ReminderStatus.CANCELLED]: "bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300 border-gray-200 dark:border-gray-600",
    [ReminderStatus.EXPIRED]: "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-600"
  };
  return colors[status] || "bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300 border-gray-200 dark:border-gray-600";
}

/**
 * Get size classes
 */
function getSizeClasses(size: "sm" | "md" | "lg"): string {
  const sizes = {
    sm: "px-2 py-0.5 text-xs",
    md: "px-3 py-1 text-sm",
    lg: "px-4 py-1.5 text-base"
  };
  return sizes[size];
}

/**
 * Status Badge Component
 */
export default function StatusBadge({ status, size = "md" }: StatusBadgeProps) {
  return (
    <span 
      class={`inline-flex items-center font-medium rounded-full border ${getSizeClasses(size)} ${getStatusColor(status)}`}
    >
      {formatStatus(status)}
    </span>
  );
}
