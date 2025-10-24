/**
 * Logout Route
 * Handles session termination and redirects to home page
 */

import { Handlers } from "$fresh/server.ts";

export const handler: Handlers = {
  async GET(req) {
    // Get session ID from cookie
    const cookies = req.headers.get("cookie") || "";
    const sessionIdMatch = cookies.match(/session_id=([^;]+)/);
    const sessionId = sessionIdMatch ? sessionIdMatch[1] : null;

    // Clear session from KV if exists
    if (sessionId) {
      try {
        const kv = await Deno.openKv();
        await kv.delete(["sessions", sessionId]);
        await kv.close();
      } catch (error) {
        console.error("Error clearing session:", error);
        // Continue with logout even if session cleanup fails
      }
    }

    // Clear session cookie and redirect to home
    const headers = new Headers({
      "Location": "/",
      "Set-Cookie": "session_id=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0",
    });

    return new Response(null, {
      status: 302,
      headers,
    });
  },
};
