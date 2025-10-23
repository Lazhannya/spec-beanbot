/**
 * Test Progress Island
 * Real-time feedback for test execution progress
 */

import { useState } from "preact/hooks";

interface TestProgressProps {
  reminderId: string;
  testType?: "immediate_delivery" | "escalation_flow" | "validation";
  onComplete?: (success: boolean) => void;
}

interface TestExecution {
  id: string;
  testType: string;
  executedAt: Date;
  result: "success" | "failed" | "partial";
  preservedSchedule: boolean;
  errorMessage?: string;
}

/**
 * Test Progress Island - Shows real-time test execution progress
 */
export default function TestProgress({ 
  reminderId, 
  testType = "immediate_delivery",
  onComplete 
}: TestProgressProps) {
  const [isExecuting, setIsExecuting] = useState(false);
  const [progress, setProgress] = useState<number>(0);
  const [status, setStatus] = useState<string>("Ready");
  const [result, setResult] = useState<TestExecution | null>(null);
  const [error, setError] = useState<string | null>(null);

  const executeTest = async () => {
    setIsExecuting(true);
    setProgress(0);
    setStatus("Initializing test...");
    setResult(null);
    setError(null);

    try {
      // Stage 1: Request initiated
      setProgress(10);
      setStatus("Sending test request...");

      const response = await fetch(`/api/reminders/${reminderId}/test`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          testType,
          preserveSchedule: true
        }),
      });

      // Stage 2: Response received
      setProgress(40);
      setStatus("Processing response...");

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error ${response.status}`);
      }

      const data = await response.json();

      // Stage 3: Parse result
      setProgress(70);
      setStatus("Validating result...");

      if (data.testExecution) {
        setResult({
          ...data.testExecution,
          executedAt: new Date(data.testExecution.executedAt)
        });
      }

      // Stage 4: Complete
      setProgress(100);
      setStatus(data.success ? "Test completed successfully!" : "Test failed");

      if (onComplete) {
        onComplete(data.success);
      }

      if (!data.success && data.error) {
        setError(data.error);
      }

    } catch (err) {
      setProgress(0);
      setStatus("Test failed");
      setError(err instanceof Error ? err.message : "Unknown error occurred");
      
      if (onComplete) {
        onComplete(false);
      }
    } finally {
      setIsExecuting(false);
    }
  };

  const formatTestType = (type: string): string => {
    return type
      .split("_")
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  const formatTimestamp = (date: Date): string => {
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  return (
    <div class="test-progress-container bg-white border border-gray-200 rounded-lg p-4">
      {/* Header */}
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-sm font-semibold text-gray-700">Test Execution</h3>
        <button
          type="button"
          onClick={executeTest}
          disabled={isExecuting}
          class={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
            isExecuting
              ? "bg-gray-300 text-gray-500 cursor-not-allowed"
              : "bg-blue-600 text-white hover:bg-blue-700"
          }`}
        >
          {isExecuting ? "Running..." : "Run Test"}
        </button>
      </div>

      {/* Progress Bar */}
      {isExecuting && (
        <div class="mb-4">
          <div class="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
            <div
              class="bg-blue-600 h-full transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p class="text-xs text-gray-600 mt-1">{status}</p>
        </div>
      )}

      {/* Test Result */}
      {result && !isExecuting && (
        <div class={`p-3 rounded-md border ${
          result.result === "success"
            ? "bg-green-50 border-green-200"
            : result.result === "partial"
            ? "bg-yellow-50 border-yellow-200"
            : "bg-red-50 border-red-200"
        }`}>
          <div class="flex items-start gap-2">
            <div class="flex-shrink-0 mt-0.5">
              {result.result === "success" ? (
                <svg class="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : result.result === "partial" ? (
                <svg class="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              ) : (
                <svg class="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
            </div>
            
            <div class="flex-1">
              <p class={`text-sm font-medium ${
                result.result === "success"
                  ? "text-green-800"
                  : result.result === "partial"
                  ? "text-yellow-800"
                  : "text-red-800"
              }`}>
                {formatTestType(result.testType)} - {result.result}
              </p>
              
              <p class="text-xs text-gray-600 mt-1">
                Executed at {formatTimestamp(result.executedAt)}
              </p>
              
              {result.preservedSchedule && (
                <p class="text-xs text-gray-600 mt-1">
                  ✓ Original schedule preserved
                </p>
              )}
              
              {result.errorMessage && (
                <p class="text-xs text-red-700 mt-2 font-medium">
                  {result.errorMessage}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && !isExecuting && (
        <div class="p-3 rounded-md bg-red-50 border border-red-200">
          <div class="flex items-start gap-2">
            <svg class="w-5 h-5 text-red-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            <div class="flex-1">
              <p class="text-sm font-medium text-red-800">Test Failed</p>
              <p class="text-xs text-red-700 mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Help Text */}
      <p class="text-xs text-gray-500 mt-3">
        This will execute a test of the reminder delivery system. The test will use real Discord API calls but won't affect the original reminder schedule.
      </p>
    </div>
  );
}
