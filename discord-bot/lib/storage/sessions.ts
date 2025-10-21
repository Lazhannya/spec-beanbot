// User session management for Discord OAuth2 authentication
import { 
  kvSet, 
  kvGet, 
  kvDelete, 
  kvExists,
  kvList,
  KV_KEYS,
  createUuidKey
} from "./kv.ts";
import type { DiscordUser } from "../discord/types.ts";

export interface UserSession {
  id: string;
  userId: string;
  userInfo: DiscordUser;
  accessToken: string;
  refreshToken?: string;
  tokenType: string;
  expiresAt: string; // ISO timestamp
  scope: string[];
  createdAt: string; // ISO timestamp
  lastAccessedAt: string; // ISO timestamp
  ipAddress?: string;
  userAgent?: string;
}

export interface SessionCreateOptions {
  accessToken: string;
  refreshToken?: string;
  tokenType: string;
  expiresIn: number; // seconds
  scope: string[];
  userInfo: DiscordUser;
  ipAddress?: string;
  userAgent?: string;
}

// Session configuration
const SESSION_EXPIRY_HOURS = 24 * 7; // 7 days
const CLEANUP_INTERVAL_HOURS = 24; // 24 hours

// Create a new user session
export async function createSession(
  options: SessionCreateOptions
): Promise<UserSession | null> {
  try {
    const sessionId = crypto.randomUUID();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + (options.expiresIn * 1000));

    const session: UserSession = {
      id: sessionId,
      userId: options.userInfo.id,
      userInfo: options.userInfo,
      accessToken: options.accessToken,
      refreshToken: options.refreshToken,
      tokenType: options.tokenType,
      expiresAt: expiresAt.toISOString(),
      scope: options.scope,
      createdAt: now.toISOString(),
      lastAccessedAt: now.toISOString(),
      ipAddress: options.ipAddress,
      userAgent: options.userAgent
    };

    // Store session by session ID
    const sessionStored = await kvSet(
      KV_KEYS.session(sessionId),
      session,
      { expireIn: SESSION_EXPIRY_HOURS * 60 * 60 * 1000 } // Convert to milliseconds
    );

    if (!sessionStored) {
      console.error("Failed to store session");
      return null;
    }

    // Store user session mapping (for finding sessions by user ID)
    const userSessionsKey = KV_KEYS.userSessions(options.userInfo.id);
    const existingSessions = await kvGet<string[]>(userSessionsKey) || [];
    
    // Add new session to user's session list
    existingSessions.push(sessionId);
    
    // Keep only the last 5 sessions per user
    const recentSessions = existingSessions.slice(-5);
    
    await kvSet(
      userSessionsKey,
      recentSessions,
      { expireIn: SESSION_EXPIRY_HOURS * 60 * 60 * 1000 }
    );

    console.log(`✅ Created session ${sessionId} for user ${options.userInfo.username}`);
    return session;

  } catch (error) {
    console.error("Error creating session:", error);
    return null;
  }
}

// Get a session by session ID
export async function getSession(sessionId: string): Promise<UserSession | null> {
  try {
    const session = await kvGet<UserSession>(KV_KEYS.session(sessionId));
    
    if (!session) {
      return null;
    }

    // Check if session has expired
    if (isSessionExpired(session)) {
      await deleteSession(sessionId);
      return null;
    }

    // Update last accessed time
    session.lastAccessedAt = new Date().toISOString();
    await kvSet(
      KV_KEYS.session(sessionId),
      session,
      { expireIn: SESSION_EXPIRY_HOURS * 60 * 60 * 1000 }
    );

    return session;

  } catch (error) {
    console.error("Error getting session:", error);
    return null;
  }
}

// Get all sessions for a user
export async function getUserSessions(userId: string): Promise<UserSession[]> {
  try {
    const sessionIds = await kvGet<string[]>(KV_KEYS.userSessions(userId)) || [];
    const sessions: UserSession[] = [];

    for (const sessionId of sessionIds) {
      const session = await getSession(sessionId);
      if (session) {
        sessions.push(session);
      }
    }

    return sessions;

  } catch (error) {
    console.error("Error getting user sessions:", error);
    return [];
  }
}

// Delete a session
export async function deleteSession(sessionId: string): Promise<boolean> {
  try {
    const session = await kvGet<UserSession>(KV_KEYS.session(sessionId));
    
    if (!session) {
      return false;
    }

    // Remove session
    const sessionDeleted = await kvDelete(KV_KEYS.session(sessionId));

    // Remove from user's session list
    const userSessionsKey = KV_KEYS.userSessions(session.userId);
    const userSessions = await kvGet<string[]>(userSessionsKey) || [];
    const updatedSessions = userSessions.filter(id => id !== sessionId);
    
    if (updatedSessions.length > 0) {
      await kvSet(userSessionsKey, updatedSessions);
    } else {
      await kvDelete(userSessionsKey);
    }

    console.log(`🗑️ Deleted session ${sessionId}`);
    return sessionDeleted;

  } catch (error) {
    console.error("Error deleting session:", error);
    return false;
  }
}

// Delete all sessions for a user
export async function deleteUserSessions(userId: string): Promise<number> {
  try {
    const sessionIds = await kvGet<string[]>(KV_KEYS.userSessions(userId)) || [];
    let deletedCount = 0;

    for (const sessionId of sessionIds) {
      const deleted = await deleteSession(sessionId);
      if (deleted) {
        deletedCount++;
      }
    }

    // Clean up user sessions list
    await kvDelete(KV_KEYS.userSessions(userId));

    console.log(`🗑️ Deleted ${deletedCount} sessions for user ${userId}`);
    return deletedCount;

  } catch (error) {
    console.error("Error deleting user sessions:", error);
    return 0;
  }
}

// Update session access token (for token refresh)
export async function updateSessionToken(
  sessionId: string,
  accessToken: string,
  refreshToken?: string,
  expiresIn?: number
): Promise<boolean> {
  try {
    const session = await kvGet<UserSession>(KV_KEYS.session(sessionId));
    
    if (!session) {
      return false;
    }

    // Update token information
    session.accessToken = accessToken;
    if (refreshToken) {
      session.refreshToken = refreshToken;
    }
    if (expiresIn) {
      const expiresAt = new Date(Date.now() + (expiresIn * 1000));
      session.expiresAt = expiresAt.toISOString();
    }
    session.lastAccessedAt = new Date().toISOString();

    const updated = await kvSet(
      KV_KEYS.session(sessionId),
      session,
      { expireIn: SESSION_EXPIRY_HOURS * 60 * 60 * 1000 }
    );

    if (updated) {
      console.log(`🔄 Updated token for session ${sessionId}`);
    }

    return updated;

  } catch (error) {
    console.error("Error updating session token:", error);
    return false;
  }
}

// Validate session and check if it's still valid
export async function validateSession(sessionId: string): Promise<{
  valid: boolean;
  session?: UserSession;
  reason?: string;
}> {
  try {
    if (!sessionId) {
      return { valid: false, reason: "No session ID provided" };
    }

    const session = await getSession(sessionId);
    
    if (!session) {
      return { valid: false, reason: "Session not found" };
    }

    if (isSessionExpired(session)) {
      await deleteSession(sessionId);
      return { valid: false, reason: "Session expired" };
    }

    return { valid: true, session };

  } catch (error) {
    console.error("Error validating session:", error);
    return { valid: false, reason: "Validation error" };
  }
}

// Check if a session has expired
export function isSessionExpired(session: UserSession): boolean {
  const now = new Date();
  const expiresAt = new Date(session.expiresAt);
  return now >= expiresAt;
}

// Cleanup expired sessions (background task)
export async function cleanupExpiredSessions(): Promise<number> {
  try {
    console.log("🧹 Starting session cleanup...");
    
    const allSessions = await kvList<UserSession>(["sessions"]);
    let cleanedUp = 0;

    for (const entry of allSessions) {
      if (isSessionExpired(entry.value)) {
        await deleteSession(entry.value.id);
        cleanedUp++;
      }
    }

    console.log(`🧹 Session cleanup completed: ${cleanedUp} expired sessions removed`);
    return cleanedUp;

  } catch (error) {
    console.error("Error during session cleanup:", error);
    return 0;
  }
}

// Get session statistics
export async function getSessionStats(): Promise<{
  totalSessions: number;
  activeSessions: number;
  expiredSessions: number;
  usersWithSessions: number;
}> {
  try {
    const allSessions = await kvList<UserSession>(["sessions"]);
    const userSessions = new Set<string>();
    
    let activeSessions = 0;
    let expiredSessions = 0;

    for (const entry of allSessions) {
      userSessions.add(entry.value.userId);
      
      if (isSessionExpired(entry.value)) {
        expiredSessions++;
      } else {
        activeSessions++;
      }
    }

    return {
      totalSessions: allSessions.length,
      activeSessions,
      expiredSessions,
      usersWithSessions: userSessions.size
    };

  } catch (error) {
    console.error("Error getting session stats:", error);
    return {
      totalSessions: 0,
      activeSessions: 0,
      expiredSessions: 0,
      usersWithSessions: 0
    };
  }
}

// Session middleware helper for Fresh routes
export async function getSessionFromRequest(req: Request): Promise<UserSession | null> {
  try {
    // Try to get session ID from cookie
    const cookies = req.headers.get("cookie");
    if (!cookies) {
      return null;
    }

    const sessionCookie = cookies
      .split(';')
      .find(cookie => cookie.trim().startsWith('session='));
    
    if (!sessionCookie) {
      return null;
    }

    const sessionId = sessionCookie.split('=')[1];
    return await getSession(sessionId);

  } catch (error) {
    console.error("Error getting session from request:", error);
    return null;
  }
}

// Helper to create session cookie
export function createSessionCookie(
  sessionId: string,
  options: {
    httpOnly?: boolean;
    secure?: boolean;
    sameSite?: "strict" | "lax" | "none";
    maxAge?: number;
    domain?: string;
    path?: string;
  } = {}
): string {
  const cookieOptions = {
    httpOnly: true,
    secure: true,
    sameSite: "lax" as const,
    maxAge: SESSION_EXPIRY_HOURS * 60 * 60, // Convert to seconds
    path: "/",
    ...options
  };

  const parts = [`session=${sessionId}`];
  
  if (cookieOptions.httpOnly) parts.push("HttpOnly");
  if (cookieOptions.secure) parts.push("Secure");
  if (cookieOptions.sameSite) parts.push(`SameSite=${cookieOptions.sameSite}`);
  if (cookieOptions.maxAge) parts.push(`Max-Age=${cookieOptions.maxAge}`);
  if (cookieOptions.domain) parts.push(`Domain=${cookieOptions.domain}`);
  if (cookieOptions.path) parts.push(`Path=${cookieOptions.path}`);

  return parts.join("; ");
}

// Start background cleanup task
export function startSessionCleanup(): void {
  // Clean up expired sessions every 24 hours
  setInterval(async () => {
    await cleanupExpiredSessions();
  }, CLEANUP_INTERVAL_HOURS * 60 * 60 * 1000);

  console.log(`🔄 Session cleanup task started (every ${CLEANUP_INTERVAL_HOURS} hours)`);
}