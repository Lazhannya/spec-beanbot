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

  useEffect(() => {
    if (!isPolling) return;

    const pollStatus = async () => {
      try {
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
    <div class="bg-white border border-gray-200 rounded-lg p-4">
      <div class="flex items-center justify-between mb-2">
        <h3 class="text-sm font-semibold text-gray-700">Current Status</h3>
        <button
          type="button"
          onClick={() => setIsPolling(!isPolling)}
          class="text-xs text-gray-500 hover:text-gray-700"
          title={isPolling ? "Pause updates" : "Resume updates"}
        >
          {isPolling ? "⏸" : "▶"}
        </button>
      </div>

      <div class="flex items-center justify-between">
        <StatusBadge status={status} size="lg" />
        
        <div class="text-right">
          <p class="text-xs text-gray-500">
            Updated {formatLastUpdated()}
          </p>
          {isPolling && (
            <p class="text-xs text-gray-400">
              Checking every {pollInterval / 1000}s
            </p>
          )}
        </div>
      </div>

      {error && (
        <div class="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
          {error}
        </div>
      )}
    </div>
  );
}
