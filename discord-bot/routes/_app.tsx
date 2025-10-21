/** @jsx h */
import { h } from "preact";
import type { PageProps } from "$fresh/server.ts";

export default function App({ Component }: PageProps) {
  return (
    <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Discord Assistant Bot</title>
        <link rel="stylesheet" href="/styles.css" />
      </head>
      <body>
        <div class="min-h-screen bg-gray-100">
          <nav class="bg-blue-600 text-white p-4">
            <div class="container mx-auto">
              <h1 class="text-xl font-bold">🤖 Discord Assistant Bot</h1>
              <div class="mt-2">
                <a href="/" class="mr-4 hover:underline">Home</a>
                <a href="/reminders" class="mr-4 hover:underline">Reminders</a>
                <a href="/patterns" class="mr-4 hover:underline">Patterns</a>
                <a href="/dashboard" class="mr-4 hover:underline">Dashboard</a>
              </div>
            </div>
          </nav>
          <main class="container mx-auto px-4 py-8">
            <Component />
          </main>
        </div>
      </body>
    </html>
  );
}