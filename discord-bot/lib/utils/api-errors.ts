/**
 * API Error Handling Utilities
 * Standardized error responses and error types for API endpoints
 */

/**
 * Standard API error codes
 */
export enum ApiErrorCode {
  // Client errors (4xx)
  BAD_REQUEST = "BAD_REQUEST",
  UNAUTHORIZED = "UNAUTHORIZED",
  FORBIDDEN = "FORBIDDEN",
  NOT_FOUND = "NOT_FOUND",
  CONFLICT = "CONFLICT",
  VALIDATION_ERROR = "VALIDATION_ERROR",
  RATE_LIMIT_EXCEEDED = "RATE_LIMIT_EXCEEDED",
  
  // Server errors (5xx)
  INTERNAL_SERVER_ERROR = "INTERNAL_SERVER_ERROR",
  SERVICE_UNAVAILABLE = "SERVICE_UNAVAILABLE",
  DATABASE_ERROR = "DATABASE_ERROR",
  EXTERNAL_SERVICE_ERROR = "EXTERNAL_SERVICE_ERROR",
}

/**
 * API Error class with structured error information
 */
export class ApiError extends Error {
  constructor(
    public code: ApiErrorCode,
    public override message: string,
    public statusCode: number,
    public details?: unknown
  ) {
    super(message);
    this.name = "ApiError";
  }

  /**
   * Convert to JSON response
   */
  toJSON() {
    return {
      error: {
        code: this.code,
        message: this.message,
        details: this.details,
      },
    };
  }
}

/**
 * Predefined error factories
 */
export const ApiErrors = {
  badRequest: (message: string, details?: unknown) =>
    new ApiError(ApiErrorCode.BAD_REQUEST, message, 400, details),

  unauthorized: (message = "Authentication required") =>
    new ApiError(ApiErrorCode.UNAUTHORIZED, message, 401),

  forbidden: (message = "Access forbidden") =>
    new ApiError(ApiErrorCode.FORBIDDEN, message, 403),

  notFound: (resource: string) =>
    new ApiError(ApiErrorCode.NOT_FOUND, `${resource} not found`, 404),

  conflict: (message: string, details?: unknown) =>
    new ApiError(ApiErrorCode.CONFLICT, message, 409, details),

  validationError: (message: string, details?: unknown) =>
    new ApiError(ApiErrorCode.VALIDATION_ERROR, message, 422, details),

  rateLimitExceeded: (message = "Rate limit exceeded. Please try again later.") =>
    new ApiError(ApiErrorCode.RATE_LIMIT_EXCEEDED, message, 429),

  internalServerError: (message = "Internal server error", details?: unknown) =>
    new ApiError(ApiErrorCode.INTERNAL_SERVER_ERROR, message, 500, details),

  serviceUnavailable: (message = "Service temporarily unavailable") =>
    new ApiError(ApiErrorCode.SERVICE_UNAVAILABLE, message, 503),

  databaseError: (message = "Database operation failed", details?: unknown) =>
    new ApiError(ApiErrorCode.DATABASE_ERROR, message, 500, details),

  externalServiceError: (service: string, details?: unknown) =>
    new ApiError(
      ApiErrorCode.EXTERNAL_SERVICE_ERROR,
      `External service error: ${service}`,
      502,
      details
    ),
};

/**
 * Error response builder
 */
export function createErrorResponse(error: unknown): Response {
  // Handle ApiError instances
  if (error instanceof ApiError) {
    return new Response(JSON.stringify(error.toJSON()), {
      status: error.statusCode,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Handle standard Error instances
  if (error instanceof Error) {
    console.error("Unhandled error:", error);
    return new Response(
      JSON.stringify({
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: error.message,
        },
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  // Handle unknown errors
  console.error("Unknown error type:", error);
  return new Response(
    JSON.stringify({
      error: {
        code: ApiErrorCode.INTERNAL_SERVER_ERROR,
        message: "An unexpected error occurred",
      },
    }),
    {
      status: 500,
      headers: { "Content-Type": "application/json" },
    }
  );
}

/**
 * Success response builder
 */
export function createSuccessResponse<T>(
  data: T,
  status = 200,
  headers: Record<string, string> = {}
): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
  });
}

/**
 * Async error handler wrapper for API handlers
 * Automatically catches and formats errors
 */
export function withErrorHandling<T>(
  handler: () => Promise<Response>
): Promise<Response> {
  return handler().catch((error) => {
    return createErrorResponse(error);
  });
}

/**
 * Validation error helper
 */
export function validateRequired(
  fields: Record<string, unknown>,
  requiredFields: string[]
): void {
  const missing: string[] = [];

  for (const field of requiredFields) {
    if (fields[field] === undefined || fields[field] === null || fields[field] === "") {
      missing.push(field);
    }
  }

  if (missing.length > 0) {
    throw ApiErrors.validationError(`Missing required fields: ${missing.join(", ")}`, {
      missingFields: missing,
    });
  }
}

/**
 * Parse JSON body with error handling
 */
export async function parseJsonBody<T>(req: Request): Promise<T> {
  try {
    const body = await req.json();
    return body as T;
  } catch (error) {
    throw ApiErrors.badRequest("Invalid JSON in request body", {
      parseError: error instanceof Error ? error.message : "Unknown parse error",
    });
  }
}

/**
 * Log error with context
 */
export function logError(
  context: string,
  error: unknown,
  additionalData?: Record<string, unknown>
): void {
  console.error(`[ERROR] ${context}:`, {
    error: error instanceof Error ? {
      name: error.name,
      message: error.message,
      stack: error.stack,
    } : error,
    ...additionalData,
    timestamp: new Date().toISOString(),
  });
}
