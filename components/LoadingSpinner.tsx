/**
 * Loading Spinner Component
 * Reusable loading indicator for async operations with spinner or skeleton modes
 */

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  message?: string;
  fullscreen?: boolean;
  variant?: "spinner" | "skeleton";
  skeletonType?: "card" | "list" | "text";
}

/**
 * Loading Spinner - Shows a spinner or skeleton with optional message
 */
export default function LoadingSpinner({ 
  size = "md", 
  message,
  fullscreen = false,
  variant = "spinner",
  skeletonType = "card"
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-8 w-8",
    lg: "h-12 w-12",
  };

  // Skeleton Loading States
  if (variant === "skeleton") {
    const skeleton = (
      <div class="animate-pulse">
        {skeletonType === "card" && (
          <div class="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-4"></div>
            <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-2"></div>
            <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6"></div>
          </div>
        )}
        {skeletonType === "list" && (
          <div class="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} class="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                <div class="flex items-start space-x-4">
                  <div class="h-12 w-12 bg-gray-200 dark:bg-gray-700 rounded"></div>
                  <div class="flex-1 space-y-2">
                    <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                    <div class="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        {skeletonType === "text" && (
          <div class="space-y-2">
            <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
            <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6"></div>
            <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded w-4/6"></div>
          </div>
        )}
      </div>
    );

    if (fullscreen) {
      return (
        <div class="fixed inset-0 bg-gray-50 dark:bg-gray-900 bg-opacity-75 dark:bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div class="max-w-2xl w-full">
            {skeleton}
          </div>
        </div>
      );
    }

    return <div class="p-4">{skeleton}</div>;
  }

  // Spinner Loading State
  const spinner = (
    <div class="flex flex-col items-center justify-center">
      <svg
        class={`animate-spin ${sizeClasses[size]} text-blue-600 dark:text-blue-400`}
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle
          class="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          class="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
      {message && (
        <p class="mt-2 text-sm text-gray-600 dark:text-gray-400">{message}</p>
      )}
    </div>
  );

  if (fullscreen) {
    return (
      <div class="fixed inset-0 bg-gray-50 dark:bg-gray-900 bg-opacity-75 dark:bg-opacity-75 flex items-center justify-center z-50">
        {spinner}
      </div>
    );
  }

  return (
    <div class="flex items-center justify-center p-4">
      {spinner}
    </div>
  );
}
