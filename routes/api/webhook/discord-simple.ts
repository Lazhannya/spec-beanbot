/**
 * Simplified Discord Interactions Webhook for Testing
 * Minimal implementation to verify Discord can reach the endpoint
 */

import { Handlers } from "$fresh/server.ts";

export const handler: Handlers = {
  async POST(req) {
    try {
      // Log every request detail
      console.log("========================================");
      console.log("DISCORD WEBHOOK - Simple Test Endpoint");
      console.log("Time:", new Date().toISOString());
      console.log("URL:", req.url);
      console.log("Method:", req.method);
      console.log("Headers:", Object.fromEntries(req.headers.entries()));
      
      // Read body
      const body = await req.text();
      console.log("Body:", body);
      
      // Parse JSON
      let interaction;
      try {
        interaction = JSON.parse(body);
        console.log("Parsed interaction:", JSON.stringify(interaction, null, 2));
      } catch (e) {
        console.error("Failed to parse JSON:", e);
        return new Response("Invalid JSON", { status: 400 });
      }
      
      // Check if it's a PING
      if (interaction.type === 1) {
        console.log("✅ PING detected - responding with PONG");
        const response = { type: 1 };
        console.log("Response:", JSON.stringify(response));
        console.log("========================================");
        
        return new Response(
          JSON.stringify(response),
          {
            status: 200,
            headers: {
              "Content-Type": "application/json",
            },
          }
        );
      }
      
      // For any other interaction, just acknowledge
      console.log("Non-PING interaction received");
      console.log("========================================");
      
      return new Response(
        JSON.stringify({
          type: 4,
          data: {
            content: "Received interaction",
          },
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
      
    } catch (error) {
      console.error("ERROR:", error);
      console.log("========================================");
      return new Response("Internal error", { status: 500 });
    }
  },
};
