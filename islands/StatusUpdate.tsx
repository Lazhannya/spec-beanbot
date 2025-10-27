/**
 * Status Update Island
 * Real-time status polling for reminder updates
 */

import { useEffect, useState } from "preact/hooks";
import { ReminderStatus } from "../discord-bot/types/reminder.ts";
import StatusBadge from "../components/StatusBadge.tsx";

interface StatusUpdateProps {
  reminderId: string;
  initialStatus: ReminderStatus;
  pollInterval?: number; // milliseconds, default 5000
}

/**
 * Status Update Island - Polls for status changes
 */
export default function StatusUpdate({ 
  reminderId, 
  initialStatus, 
  pollInterval = 5000 
}: StatusUpdateProps) {
  const [status, setStatus] = useState<ReminderStatus>(initialStatus);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [error, setError] = useState<string | null>(null);
  const [isPolling, setIsPolling] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!isPolling) return;

    const pollStatus = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(`/api/reminders/${reminderId}`);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch status: ${response.statusText}`);
        }

        const data = await response.json();
        
        if (data.reminder && data.reminder.status !== status) {
          setStatus(data.reminder.status);
          setLastUpdated(new Date());
        }
        
        setError(null);
      } catch (err) {
        console.error("Error polling status:", err);
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setIsLoading(false);
      }
    };

    // Initial poll
    pollStatus();

    // Set up interval
    const intervalId = setInterval(pollStatus, pollInterval);

    // Cleanup
    return () => clearInterval(intervalId);
  }, [reminderId, status, pollInterval, isPolling]);

  const formatLastUpdated = () => {
    const now = new Date();
    const diff = Math.floor((now.getTime() - lastUpdated.getTime()) / 1000);
    
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    return `${Math.floor(diff / 3600)}h ago`;
  };

  return (
    <div class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
      <div class="flex items-center justify-between mb-2">
        <h3 class="text-sm font-semibold text-gray-700 dark:text-gray-300">Current Status</h3>
        <div class="flex items-center gap-2">
          {isLoading && (
            <span class="text-xs text-gray-400 dark:text-gray-500" title="Updating...">
              ⟳
            </span>
          )}
          <button
            type="button"
            onClick={() => setIsPolling(!isPolling)}
            class="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            title={isPolling ? "Pause updates" : "Resume updates"}
          >
            {isPolling ? "⏸" : "▶"}
          </button>
        </div>
      </div>

      <div class="flex items-center justify-between">
        <StatusBadge status={status} size="lg" />
        
        <div class="text-right">
          <p class="text-xs text-gray-500 dark:text-gray-400">
            Updated {formatLastUpdated()}
          </p>
          {isPolling && (
            <p class="text-xs text-gray-400 dark:text-gray-500">
              Checking every {pollInterval / 1000}s
            </p>
          )}
        </div>
      </div>

      {error && (
        <div class="mt-2 p-2 bg-red-50 dark:bg-red-900 dark:bg-opacity-20 border border-red-200 dark:border-red-700 rounded text-xs text-red-700 dark:text-red-200">
          {error}
        </div>
      )}
    </div>
  );
}
