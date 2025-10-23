// Authentication middleware for Fresh routes

import type { MiddlewareHandlerContext } from "$fresh/server.ts";
import { getSessionManager, SessionData } from "../auth/session.ts";

export interface AuthState {
  session?: SessionData;
  isAuthenticated: boolean;
  isAdmin: boolean;
}

const EXCLUDED_PATHS = [
  "/auth/login",
  "/auth/callback", 
  "/auth/logout",
  "/api/webhook/discord",
  "/api/webhook/discord-debug", // Temporary debug endpoint
  "/api/health", // Health check endpoint
  "/_fresh",
  "/static",
];

const ADMIN_ONLY_PATHS = [
  "/admin",
  "/api/reminders",
];

export async function authMiddleware(
  req: Request,
  ctx: MiddlewareHandlerContext<AuthState>
) {
  const url = new URL(req.url);
  const pathname = url.pathname;
  
  // Skip auth for excluded paths
  if (EXCLUDED_PATHS.some(path => pathname.startsWith(path))) {
    ctx.state.isAuthenticated = false;
    ctx.state.isAdmin = false;
    return await ctx.next();
  }

  // Extract session from cookies
  const cookieHeader = req.headers.get("Cookie");
  const sessionId = extractSessionId(cookieHeader);

  if (!sessionId) {
    return redirectToLogin(url);
  }

  try {
    const sessionManager = await getSessionManager();
    const session = await sessionManager.validateSession(sessionId);

    if (!session) {
      return redirectToLogin(url);
    }

    // Check admin access for admin-only paths
    if (ADMIN_ONLY_PATHS.some(path => pathname.startsWith(path)) && !session.isAdmin) {
      return new Response("Forbidden", { status: 403 });
    }

    // Set auth state
    ctx.state.session = session;
    ctx.state.isAuthenticated = true;
    ctx.state.isAdmin = session.isAdmin;

    return await ctx.next();
  } catch (error) {
    console.error("Auth middleware error:", error);
    return redirectToLogin(url);
  }
}

function extractSessionId(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null;
  
  const cookies = parseCookies(cookieHeader);
  return cookies.get("session_id") || null;
}

function parseCookies(cookieHeader: string): Map<string, string> {
  const cookies = new Map<string, string>();
  
  for (const cookie of cookieHeader.split(";")) {
    const [name, value] = cookie.trim().split("=", 2);
    if (name && value) {
      cookies.set(name, decodeURIComponent(value));
    }
  }
  
  return cookies;
}

function redirectToLogin(url: URL): Response {
  const loginUrl = new URL("/auth/login", url.origin);
  loginUrl.searchParams.set("redirect", url.pathname + url.search);
  
  return new Response("", {
    status: 302,
    headers: {
      Location: loginUrl.toString(),
    },
  });
}

// Helper to create session cookie
export function createSessionCookie(sessionId: string, maxAge: number = 86400): string {
  return `session_id=${encodeURIComponent(sessionId)}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${maxAge}`;
}

// Helper to clear session cookie
export function clearSessionCookie(): string {
  return "session_id=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0";
}

// Get current user from context
export function getCurrentUser(ctx: { state: AuthState }): SessionData | null {
  return ctx.state.session || null;
}

// Check if current user is admin
export function isCurrentUserAdmin(ctx: { state: AuthState }): boolean {
  return ctx.state.isAdmin || false;
}

// Require authentication decorator
export function requireAuth<T extends Record<string, unknown>>(
  handler: (req: Request, ctx: MiddlewareHandlerContext<T & AuthState>) => Promise<Response>
) {
  return async (req: Request, ctx: MiddlewareHandlerContext<T & AuthState>) => {
    if (!ctx.state.isAuthenticated) {
      return redirectToLogin(new URL(req.url));
    }
    return handler(req, ctx);
  };
}

// Require admin decorator
export function requireAdmin<T extends Record<string, unknown>>(
  handler: (req: Request, ctx: MiddlewareHandlerContext<T & AuthState>) => Promise<Response>
) {
  return async (req: Request, ctx: MiddlewareHandlerContext<T & AuthState>) => {
    if (!ctx.state.isAuthenticated) {
      return redirectToLogin(new URL(req.url));
    }
    if (!ctx.state.isAdmin) {
      return new Response("Forbidden", { status: 403 });
    }
    return handler(req, ctx);
  };
}