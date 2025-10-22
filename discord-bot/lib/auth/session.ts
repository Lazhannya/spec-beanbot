// Session management with KV storage

import type { KVConnection } from "../kv/connection.ts";
import { KVKeys } from "../kv/schema.ts";

export interface SessionData {
  userId: string;
  username: string;
  accessToken: string;
  refreshToken?: string;
  expiresAt: Date;
  createdAt: Date;
  lastAccessedAt: Date;
  isAdmin: boolean;
}

export interface SessionConfig {
  sessionTimeoutHours: number;
  refreshThresholdHours: number;
  adminUserIds: string[];
}

export class SessionError extends Error {
  constructor(message: string, cause?: Error) {
    super(message);
    this.name = "SessionError";
  }
}

export class SessionManager {
  constructor(
    private kv: KVConnection,
    private config: SessionConfig = {
      sessionTimeoutHours: 24,
      refreshThresholdHours: 2,
      adminUserIds: [],
    }
  ) {}

  async createSession(
    userId: string,
    username: string,
    accessToken: string,
    refreshToken?: string
  ): Promise<string> {
    const sessionId = crypto.randomUUID();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + this.config.sessionTimeoutHours * 60 * 60 * 1000);

    const sessionData: SessionData = {
      userId,
      username,
      accessToken,
      refreshToken,
      expiresAt,
      createdAt: now,
      lastAccessedAt: now,
      isAdmin: this.config.adminUserIds.includes(userId),
    };

    try {
      await this.kv.set(KVKeys.session(sessionId), sessionData);
      return sessionId;
    } catch (error) {
      throw new SessionError(
        `Failed to create session for user ${userId}`,
        error as Error
      );
    }
  }

  async getSession(sessionId: string): Promise<SessionData | null> {
    try {
      const result = await this.kv.get<SessionData>(KVKeys.session(sessionId));
      
      if (!result.value) {
        return null;
      }

      const session = result.value;
      
      // Check if session is expired
      if (new Date() > new Date(session.expiresAt)) {
        await this.deleteSession(sessionId);
        return null;
      }

      // Update last accessed time
      session.lastAccessedAt = new Date();
      await this.kv.set(KVKeys.session(sessionId), session);

      return session;
    } catch (error) {
      throw new SessionError(
        `Failed to get session ${sessionId}`,
        error as Error
      );
    }
  }

  async updateSession(sessionId: string, updates: Partial<SessionData>): Promise<void> {
    try {
      const existingSession = await this.getSession(sessionId);
      if (!existingSession) {
        throw new SessionError(`Session ${sessionId} not found`);
      }

      const updatedSession = {
        ...existingSession,
        ...updates,
        lastAccessedAt: new Date(),
      };

      await this.kv.set(KVKeys.session(sessionId), updatedSession);
    } catch (error) {
      if (error instanceof SessionError) {
        throw error;
      }
      throw new SessionError(
        `Failed to update session ${sessionId}`,
        error as Error
      );
    }
  }

  async deleteSession(sessionId: string): Promise<void> {
    try {
      await this.kv.delete(KVKeys.session(sessionId));
    } catch (error) {
      throw new SessionError(
        `Failed to delete session ${sessionId}`,
        error as Error
      );
    }
  }

  async validateSession(sessionId: string): Promise<SessionData | null> {
    const session = await this.getSession(sessionId);
    
    if (!session) {
      return null;
    }

    // Check if token needs refresh
    const now = new Date();
    const refreshThreshold = new Date(
      session.expiresAt.getTime() - this.config.refreshThresholdHours * 60 * 60 * 1000
    );

    if (now > refreshThreshold && session.refreshToken) {
      // Token should be refreshed, but we'll return the session
      // The caller can decide whether to refresh
      session.lastAccessedAt = now;
      await this.kv.set(KVKeys.session(sessionId), session);
    }

    return session;
  }

  async isAdmin(sessionId: string): Promise<boolean> {
    const session = await this.getSession(sessionId);
    return session?.isAdmin || false;
  }

  async cleanupExpiredSessions(): Promise<number> {
    let cleanedCount = 0;
    const now = new Date();

    try {
      for await (const entry of this.kv.list<SessionData>({ prefix: ["sessions"] })) {
        const session = entry.value;
        if (new Date(session.expiresAt) < now) {
          await this.kv.delete(entry.key);
          cleanedCount++;
        }
      }
    } catch (error) {
      throw new SessionError(
        "Failed to cleanup expired sessions",
        error as Error
      );
    }

    return cleanedCount;
  }

  async getUserSessions(userId: string): Promise<SessionData[]> {
    const sessions: SessionData[] = [];

    try {
      for await (const entry of this.kv.list<SessionData>({ prefix: ["sessions"] })) {
        const session = entry.value;
        if (session.userId === userId && new Date(session.expiresAt) > new Date()) {
          sessions.push(session);
        }
      }
    } catch (error) {
      throw new SessionError(
        `Failed to get sessions for user ${userId}`,
        error as Error
      );
    }

    return sessions;
  }
}

// Global session manager
let globalSessionManager: SessionManager | null = null;

export async function getSessionManager(): Promise<SessionManager> {
  if (!globalSessionManager) {
    const { getKVConnection } = await import("../kv/connection.ts");
    const kv = await getKVConnection();
    
    const config: SessionConfig = {
      sessionTimeoutHours: parseInt(Deno.env.get("SESSION_TIMEOUT_HOURS") || "24"),
      refreshThresholdHours: parseInt(Deno.env.get("SESSION_REFRESH_THRESHOLD_HOURS") || "2"),
      adminUserIds: (Deno.env.get("ADMIN_USER_IDS") || "").split(",").filter(Boolean),
    };
    
    globalSessionManager = new SessionManager(kv, config);
  }
  return globalSessionManager;
}

// For testing
export function setSessionManager(manager: SessionManager): void {
  globalSessionManager = manager;
}