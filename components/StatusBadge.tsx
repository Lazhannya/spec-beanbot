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
    [ReminderStatus.PENDING]: "bg-yellow-100 text-yellow-800 border-yellow-200",
    [ReminderStatus.SENT]: "bg-blue-100 text-blue-800 border-blue-200",
    [ReminderStatus.ACKNOWLEDGED]: "bg-green-100 text-green-800 border-green-200",
    [ReminderStatus.DECLINED]: "bg-red-100 text-red-800 border-red-200",
    [ReminderStatus.ESCALATED]: "bg-purple-100 text-purple-800 border-purple-200",
    [ReminderStatus.ESCALATED_ACK]: "bg-green-100 text-green-800 border-green-200",
    [ReminderStatus.ESCALATED_DECLINED]: "bg-red-100 text-red-800 border-red-200",
    [ReminderStatus.FAILED]: "bg-orange-100 text-orange-800 border-orange-200",
    [ReminderStatus.CANCELLED]: "bg-gray-100 text-gray-800 border-gray-200",
    [ReminderStatus.EXPIRED]: "bg-gray-100 text-gray-600 border-gray-200"
  };
  return colors[status] || "bg-gray-100 text-gray-800 border-gray-200";
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
