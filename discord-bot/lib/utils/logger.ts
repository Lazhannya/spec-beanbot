// Structured logging system

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  operation?: string;
  userId?: string;
  reminderId?: string;
  context?: Record<string, unknown>;
  error?: {
    name: string;
    message: string;
    stack?: string;
    code?: string;
  };
}

export interface LoggerConfig {
  level: LogLevel;
  includeCaller: boolean;
  prettyPrint: boolean;
}

class Logger {
  constructor(private config: LoggerConfig) {}

  private shouldLog(level: LogLevel): boolean {
    return level >= this.config.level;
  }

  private createLogEntry(
    level: LogLevel,
    message: string,
    context?: Partial<LogEntry>
  ): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...context,
    };
  }

  private formatOutput(entry: LogEntry): string {
    if (this.config.prettyPrint) {
      return JSON.stringify(entry, null, 2);
    }
    return JSON.stringify(entry);
  }

  private output(entry: LogEntry): void {
    const formatted = this.formatOutput(entry);
    
    switch (entry.level) {
      case LogLevel.DEBUG:
      case LogLevel.INFO:
        console.log(formatted);
        break;
      case LogLevel.WARN:
        console.warn(formatted);
        break;
      case LogLevel.ERROR:
        console.error(formatted);
        break;
    }
  }

  debug(message: string, context?: Partial<LogEntry>): void {
    if (!this.shouldLog(LogLevel.DEBUG)) return;
    this.output(this.createLogEntry(LogLevel.DEBUG, message, context));
  }

  info(message: string, context?: Partial<LogEntry>): void {
    if (!this.shouldLog(LogLevel.INFO)) return;
    this.output(this.createLogEntry(LogLevel.INFO, message, context));
  }

  warn(message: string, context?: Partial<LogEntry>): void {
    if (!this.shouldLog(LogLevel.WARN)) return;
    this.output(this.createLogEntry(LogLevel.WARN, message, context));
  }

  error(message: string, context?: Partial<LogEntry>): void {
    if (!this.shouldLog(LogLevel.ERROR)) return;
    this.output(this.createLogEntry(LogLevel.ERROR, message, context));
  }

  // Convenience methods for common operations
  reminderCreated(reminderId: string, userId: string, targetUserId: string): void {
    this.info("Reminder created", {
      operation: "reminder_create",
      reminderId,
      userId,
      context: { targetUserId },
    });
  }

  reminderDelivered(reminderId: string, targetUserId: string): void {
    this.info("Reminder delivered", {
      operation: "reminder_deliver", 
      reminderId,
      userId: targetUserId,
    });
  }

  reminderEscalated(reminderId: string, fromUserId: string, toUserId: string): void {
    this.warn("Reminder escalated", {
      operation: "reminder_escalate",
      reminderId,
      context: { fromUserId, toUserId },
    });
  }

  authenticationFailed(userId?: string, reason?: string): void {
    this.warn("Authentication failed", {
      operation: "auth_failed",
      userId,
      context: { reason },
    });
  }

  authenticationSuccess(userId: string, sessionId: string): void {
    this.info("Authentication successful", {
      operation: "auth_success",
      userId,
      context: { sessionId },
    });
  }

  apiRequest(method: string, path: string, userId?: string, status?: number): void {
    this.info("API request", {
      operation: "api_request",
      userId,
      context: { method, path, status },
    });
  }

  discordApiCall(endpoint: string, method: string, status?: number, rateLimited?: boolean): void {
    const level = rateLimited ? LogLevel.WARN : LogLevel.DEBUG;
    this.output(this.createLogEntry(level, "Discord API call", {
      operation: "discord_api",
      context: { endpoint, method, status, rateLimited },
    }));
  }

  databaseOperation(operation: string, table: string, key?: string, success?: boolean): void {
    const level = success === false ? LogLevel.ERROR : LogLevel.DEBUG;
    this.output(this.createLogEntry(level, "Database operation", {
      operation: "db_operation",
      context: { operation, table, key, success },
    }));
  }

  logError(error: Error, operation: string, context?: Record<string, unknown>): void {
    this.error("Operation failed", {
      operation,
      context,
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
        code: (error as any).code,
      },
    });
  }
}

// Global logger instance
let globalLogger: Logger | null = null;

export function getLogger(): Logger {
  if (!globalLogger) {
    const logLevel = LogLevel[Deno.env.get("LOG_LEVEL") as keyof typeof LogLevel] ?? LogLevel.INFO;
    const config: LoggerConfig = {
      level: logLevel,
      includeCaller: Deno.env.get("LOG_INCLUDE_CALLER") === "true",
      prettyPrint: Deno.env.get("LOG_PRETTY_PRINT") === "true",
    };
    globalLogger = new Logger(config);
  }
  return globalLogger;
}

// For testing
export function setLogger(logger: Logger): void {
  globalLogger = logger;
}

// Convenience exports
export const logger = getLogger();

// Performance timing helper
export class Timer {
  private start: number;

  constructor(private operation: string) {
    this.start = performance.now();
  }

  finish(context?: Record<string, unknown>): void {
    const duration = performance.now() - this.start;
    logger.debug("Operation completed", {
      operation: this.operation,
      context: { ...context, durationMs: Math.round(duration) },
    });
  }
}

// Usage: const timer = new Timer("reminder_creation"); ... timer.finish();