/**
 * DEBUG ENDPOINT - TEMPORARY
 * This endpoint logs everything without signature verification
 * Use ONLY for debugging Discord connection issues
 * DELETE after debugging is complete
 */

import { Handlers } from "$fresh/server.ts";

export const handler: Handlers = {
  async POST(req) {
    const timestamp = new Date().toISOString();
    
    console.log("╔════════════════════════════════════════════════════════════════╗");
    console.log("║  🔥 DEBUG ENDPOINT HIT - NO SIGNATURE VERIFICATION             ║");
    console.log("╚════════════════════════════════════════════════════════════════╝");
    console.log(`Timestamp: ${timestamp}`);
    console.log(`URL: ${req.url}`);
    console.log(`Method: ${req.method}`);
    
    // Log ALL headers
    console.log("\n📋 Headers:");
    req.headers.forEach((value, key) => {
      console.log(`  ${key}: ${value}`);
    });
    
    // Get body
    const body = await req.text();
    console.log("\n📦 Body:");
    console.log(`  Length: ${body.length} bytes`);
    console.log(`  Content: ${body}`);
    
    try {
      const parsed = JSON.parse(body);
      console.log("\n✅ Parsed JSON:");
      console.log(JSON.stringify(parsed, null, 2));
      
      // Check interaction type
      if (parsed.type === 1) {
        console.log("\n🏓 This is a PING from Discord!");
        console.log("Responding with PONG...");
        
        return new Response(
          JSON.stringify({ type: 1 }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }
        );
      }
      
      if (parsed.type === 3) {
        console.log("\n🔘 This is a BUTTON CLICK from Discord!");
        console.log(`Custom ID: ${parsed.data?.custom_id}`);
        
        return new Response(
          JSON.stringify({
            type: 7,
            data: {
              content: "Debug: Button click received!",
              components: []
            }
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }
        );
      }
      
      console.log("\n⚠️ Unknown interaction type:", parsed.type);
      
    } catch (e) {
      console.error("\n❌ Failed to parse JSON:", e);
    }
    
    console.log("╚════════════════════════════════════════════════════════════════╝\n");
    
    return new Response(
      JSON.stringify({ 
        status: "debug endpoint received request",
        timestamp 
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  },
  
  GET(_req) {
    return new Response(
      JSON.stringify({
        status: "debug",
        message: "This is a DEBUG endpoint with NO signature verification",
        warning: "DELETE THIS ENDPOINT after debugging!",
        usage: "Set Discord Interactions Endpoint URL to this endpoint temporarily",
        timestamp: new Date().toISOString()
      }, null, 2),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};
