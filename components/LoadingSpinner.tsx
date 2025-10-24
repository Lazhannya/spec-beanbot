/**
 * Loading Spinner Component
 * Reusable loading indicator for async operations
 */

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  message?: string;
  fullscreen?: boolean;
}

/**
 * Loading Spinner - Shows a spinner with optional message
 */
export default function LoadingSpinner({ 
  size = "md", 
  message,
  fullscreen = false
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-8 w-8",
    lg: "h-12 w-12",
  };

  const spinner = (
    <div class="flex flex-col items-center justify-center">
      <svg
        class={`animate-spin ${sizeClasses[size]} text-blue-600`}
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
        <p class="mt-2 text-sm text-gray-600">{message}</p>
      )}
    </div>
  );

  if (fullscreen) {
    return (
      <div class="fixed inset-0 bg-gray-50 bg-opacity-75 flex items-center justify-center z-50">
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
