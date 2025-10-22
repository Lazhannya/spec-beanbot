// Error handling utilities with Result<T, Error> types

export type Result<T, E = Error> = 
  | { success: true; data: T }
  | { success: false; error: E };

export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public context?: Record<string, unknown>,
    cause?: Error
  ) {
    super(message);
    this.name = "AppError";
    this.cause = cause;
  }
}

// Result helpers
export function success<T>(data: T): Result<T, never> {
  return { success: true, data };
}

export function failure<E>(error: E): Result<never, E> {
  return { success: false, error };
}

export function isSuccess<T, E>(result: Result<T, E>): result is { success: true; data: T } {
  return result.success;
}

export function isFailure<T, E>(result: Result<T, E>): result is { success: false; error: E } {
  return !result.success;
}

// Async result wrappers
export async function tryAsync<T>(
  fn: () => Promise<T>,
  errorCode: string = "ASYNC_ERROR",
  context?: Record<string, unknown>
): Promise<Result<T, AppError>> {
  try {
    const data = await fn();
    return success(data);
  } catch (error) {
    const appError = new AppError(
      error instanceof Error ? error.message : "Unknown error",
      errorCode,
      context,
      error instanceof Error ? error : undefined
    );
    return failure(appError);
  }
}

export function trySync<T>(
  fn: () => T,
  errorCode: string = "SYNC_ERROR", 
  context?: Record<string, unknown>
): Result<T, AppError> {
  try {
    const data = fn();
    return success(data);
  } catch (error) {
    const appError = new AppError(
      error instanceof Error ? error.message : "Unknown error",
      errorCode,
      context,
      error instanceof Error ? error : undefined
    );
    return failure(appError);
  }
}

// Error types for different domains
export class ValidationError extends AppError {
  constructor(message: string, field?: string, value?: unknown) {
    super(message, "VALIDATION_ERROR", { field, value });
    this.name = "ValidationError";
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, id?: string) {
    super(`${resource} not found`, "NOT_FOUND", { resource, id });
    this.name = "NotFoundError";
  }
}

export class ConflictError extends AppError {
  constructor(message: string, resource?: string) {
    super(message, "CONFLICT", { resource });
    this.name = "ConflictError";
  }
}

export class PermissionError extends AppError {
  constructor(action: string, resource?: string) {
    super(`Permission denied: ${action}`, "PERMISSION_DENIED", { action, resource });
    this.name = "PermissionError";
  }
}

export class ExternalServiceError extends AppError {
  constructor(service: string, operation: string, statusCode?: number) {
    super(
      `External service error: ${service} ${operation}`,
      "EXTERNAL_SERVICE_ERROR",
      { service, operation, statusCode }
    );
    this.name = "ExternalServiceError";
  }
}

// Error logging helper
export function logError(error: Error | AppError, operation: string): void {
  const logData = {
    timestamp: new Date().toISOString(),
    operation,
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack,
    },
  };

  if (error instanceof AppError) {
    logData.error = {
      ...logData.error,
      code: error.code,
      context: error.context,
    };
  }

  console.error("Application Error:", JSON.stringify(logData, null, 2));
}

// HTTP error response helper
export function errorToResponse(error: Error | AppError): Response {
  if (error instanceof ValidationError) {
    return new Response(
      JSON.stringify({
        error: "Validation failed",
        message: error.message,
        field: error.context?.field,
      }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  if (error instanceof NotFoundError) {
    return new Response(
      JSON.stringify({
        error: "Not found",
        message: error.message,
      }),
      { status: 404, headers: { "Content-Type": "application/json" } }
    );
  }

  if (error instanceof ConflictError) {
    return new Response(
      JSON.stringify({
        error: "Conflict",
        message: error.message,
      }),
      { status: 409, headers: { "Content-Type": "application/json" } }
    );
  }

  if (error instanceof PermissionError) {
    return new Response(
      JSON.stringify({
        error: "Permission denied",
        message: error.message,
      }),
      { status: 403, headers: { "Content-Type": "application/json" } }
    );
  }

  if (error instanceof ExternalServiceError) {
    return new Response(
      JSON.stringify({
        error: "External service error",
        message: "Service temporarily unavailable",
      }),
      { status: 503, headers: { "Content-Type": "application/json" } }
    );
  }

  // Generic error
  logError(error, "HTTP_RESPONSE");
  return new Response(
    JSON.stringify({
      error: "Internal server error",
      message: "An unexpected error occurred",
    }),
    { status: 500, headers: { "Content-Type": "application/json" } }
  );
}

// Chain operations with automatic error handling
export function chain<T, R>(
  result: Result<T, AppError>,
  fn: (data: T) => Result<R, AppError>
): Result<R, AppError> {
  if (isFailure(result)) {
    return result;
  }
  return fn(result.data);
}

export async function chainAsync<T, R>(
  result: Result<T, AppError>,
  fn: (data: T) => Promise<Result<R, AppError>>
): Promise<Result<R, AppError>> {
  if (isFailure(result)) {
    return result;
  }
  return await fn(result.data);
}