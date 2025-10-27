/**
 * ResetToPending Island Component
 * Allows resetting a reminder back to pending status for re-testing or editing
 */

import { useState } from "preact/hooks";

interface ResetToPendingProps {
  reminderId: string;
  currentStatus: string;
  onResetComplete?: (success: boolean, message: string) => void;
}

export default function ResetToPending({ 
  reminderId, 
  currentStatus,
  onResetComplete 
}: ResetToPendingProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  // Don't show reset button for acknowledged or declined reminders
  if (currentStatus === "acknowledged" || currentStatus === "declined") {
    return null;
  }

  // Don't show if already pending
  if (currentStatus === "pending") {
    return (
      <div class="bg-green-50 dark:bg-green-900 dark:bg-opacity-20 border border-green-200 dark:border-green-800 rounded-lg p-4">
        <p class="text-sm text-green-700 dark:text-green-300 flex items-center">
          <svg class="mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
          </svg>
          This reminder is already pending and can be edited or tested.
        </p>
      </div>
    );
  }

  const handleReset = async () => {
    if (isLoading) return;

    // Confirm action
    if (!confirm('Reset this reminder to pending status? This will allow you to edit and re-test it.')) {
      return;
    }

    setIsLoading(true);
    setResult(null);

    try {
      const response = await fetch(`/api/reminders/${reminderId}/reset`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        const successMessage = data.message || 'Reminder reset to pending status successfully!';
        
        setResult({
          success: true,
          message: successMessage
        });

        if (onResetComplete) {
          onResetComplete(true, successMessage);
        }

        // Reload page after 1 second to show updated status
        setTimeout(() => {
          globalThis.location.reload();
        }, 1000);
      } else {
        const error = await response.json();
        const errorMessage = error.error || 'Failed to reset reminder';
        
        setResult({
          success: false,
          message: errorMessage
        });

        if (onResetComplete) {
          onResetComplete(false, errorMessage);
        }
      }
    } catch (error) {
      const errorMessage = `Network error: ${error instanceof Error ? error.message : 'Unknown error'}`;
      
      setResult({
        success: false,
        message: errorMessage
      });

      if (onResetComplete) {
        onResetComplete(false, errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div class="reset-to-pending-container">
      {/* Warning Message */}
      <div class="bg-yellow-50 dark:bg-yellow-900 dark:bg-opacity-20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-4">
        <div class="flex items-start">
          <span class="text-yellow-600 dark:text-yellow-400 text-xl mr-3">⚠️</span>
          <div class="flex-1">
            <h4 class="text-sm font-semibold text-yellow-800 dark:text-yellow-200 mb-1">
              Reminder Status: {currentStatus.charAt(0).toUpperCase() + currentStatus.slice(1)}
            </h4>
            <p class="text-sm text-yellow-700 dark:text-yellow-300 leading-relaxed">
              This reminder cannot be edited or tested in its current status.
              Reset it to "pending" status to enable editing and testing again.
            </p>
          </div>
        </div>
      </div>

      {/* Reset Button */}
      <button
        type="button"
        onClick={handleReset}
        disabled={isLoading}
        class={`w-full md:w-auto inline-flex items-center justify-center px-4 py-2 text-sm font-medium rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all ${
          isLoading
            ? 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
            : 'bg-orange-600 dark:bg-orange-700 text-white hover:bg-orange-700 dark:hover:bg-orange-600 focus:ring-orange-500 shadow-sm hover:shadow-md'
        }`}
        title="Reset reminder to pending status"
      >
        {isLoading ? (
          <>
            <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Resetting...
          </>
        ) : (
          <>
            <svg class="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
            </svg>
            Reset to Pending
          </>
        )}
      </button>

      {/* Result Message */}
      {result && (
        <div class={`mt-4 p-3 rounded-lg text-sm ${
          result.success 
            ? 'bg-green-50 dark:bg-green-900 dark:bg-opacity-30 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800' 
            : 'bg-red-50 dark:bg-red-900 dark:bg-opacity-30 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800'
        }`}>
          <div class="flex items-start">
            <div class="flex-shrink-0 mr-2">
              {result.success ? (
                <svg class="h-5 w-5 text-green-500 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                </svg>
              ) : (
                <svg class="h-5 w-5 text-red-500 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              )}
            </div>
            <div class="flex-1">
              <p class="font-medium">
                {result.success ? 'Success!' : 'Error'}
              </p>
              <p class="mt-1">{result.message}</p>
              {result.success && (
                <p class="mt-2 text-xs opacity-75">
                  Page will reload automatically...
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
