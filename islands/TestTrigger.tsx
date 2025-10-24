/**
 * TestTrigger Island Component
 * Interactive component for manually testing reminder delivery
 */

import { useState } from "preact/hooks";
import { JSX } from "preact";

interface TestTriggerProps {
  reminderId: string;
  onTestComplete?: (success: boolean, message: string) => void;
  isDisabled?: boolean;
}

export default function TestTrigger({ 
  reminderId, 
  onTestComplete, 
  isDisabled = false 
}: TestTriggerProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [lastTestResult, setLastTestResult] = useState<{
    success: boolean;
    message: string;
    timestamp: Date;
  } | null>(null);

  const handleTestTrigger = async () => {
    if (isLoading || isDisabled) return;

    setIsLoading(true);
    const timestamp = new Date();

    try {
      const response = await fetch(`/api/reminders/${reminderId}/test`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          testType: 'immediate_delivery',
          preserveSchedule: true
        }),
      });

      if (response.ok) {
        const result = await response.json();
        const successMessage = `Test delivery successful! ${result.message || 'Reminder sent immediately.'}`;
        
        setLastTestResult({
          success: true,
          message: successMessage,
          timestamp
        });

        if (onTestComplete) {
          onTestComplete(true, successMessage);
        }
      } else {
        const error = await response.json();
        const errorMessage = `Test failed: ${error.error || 'Unknown error occurred'}`;
        
        setLastTestResult({
          success: false,
          message: errorMessage,
          timestamp
        });

        if (onTestComplete) {
          onTestComplete(false, errorMessage);
        }
      }
    } catch (error) {
      const errorMessage = `Network error: ${error instanceof Error ? error.message : 'Unknown error'}`;
      
      setLastTestResult({
        success: false,
        message: errorMessage,
        timestamp
      });

      if (onTestComplete) {
        onTestComplete(false, errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const formatTimestamp = (timestamp: Date) => {
    return timestamp.toLocaleTimeString();
  };

  return (
    <div class="test-trigger-container">
      {/* Test Button */}
      <button
        onClick={handleTestTrigger}
        disabled={isLoading || isDisabled}
        class={`inline-flex items-center px-3 py-2 text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors ${
          isLoading || isDisabled
            ? 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
            : 'bg-blue-600 dark:bg-blue-700 text-white hover:bg-blue-700 dark:hover:bg-blue-600 focus:ring-blue-500'
        }`}
        title="Send this reminder immediately for testing (preserves original schedule)"
      >
        {isLoading ? (
          <>
            <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Testing...
          </>
        ) : (
          <>
            <svg class="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
            </svg>
            Test Now
          </>
        )}
      </button>

      {/* Test Result */}
      {lastTestResult && (
        <div class={`mt-2 p-2 rounded-md text-xs ${
          lastTestResult.success 
            ? 'bg-green-50 dark:bg-green-900 dark:bg-opacity-30 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800' 
            : 'bg-red-50 dark:bg-red-900 dark:bg-opacity-30 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800'
        }`}>
          <div class="flex items-start">
            <div class="flex-shrink-0 mr-2">
              {lastTestResult.success ? (
                <svg class="h-4 w-4 text-green-500 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                </svg>
              ) : (
                <svg class="h-4 w-4 text-red-500 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              )}
            </div>
            <div class="flex-1">
              <p class="font-medium">
                {lastTestResult.success ? 'Success' : 'Failed'}
              </p>
              <p class="mt-1">{lastTestResult.message}</p>
              <p class="mt-1 text-xs opacity-75">
                {formatTimestamp(lastTestResult.timestamp)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Help Text */}
      <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
        This will send the reminder immediately for testing purposes without affecting the original scheduled time.
      </p>
    </div>
  );
}