/** @jsx h */
import { h } from "preact";

export default function Home() {
  return (
    <div>
      <div class="text-center mb-8">
        <h1 class="text-4xl font-bold text-gray-800 mb-4">🤖 Discord Assistant Bot</h1>
        <p class="text-xl text-gray-600 mb-8">
          Your personal assistant for Discord reminders and automated responses
        </p>
        
        <div class="bg-white rounded-lg shadow-md p-6 max-w-2xl mx-auto">
          <h2 class="text-2xl font-semibold mb-4">Features</h2>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div class="text-center p-4">
              <div class="text-3xl mb-2">🔔</div>
              <h3 class="font-semibold">Smart Reminders</h3>
              <p class="text-sm text-gray-600">
                Create and manage reminders with escalation support
              </p>
            </div>
            <div class="text-center p-4">
              <div class="text-3xl mb-2">🎯</div>
              <h3 class="font-semibold">Pattern Recognition</h3>
              <p class="text-sm text-gray-600">
                Automatically respond to text patterns in Discord
              </p>
            </div>
            <div class="text-center p-4">
              <div class="text-3xl mb-2">🔗</div>
              <h3 class="font-semibold">n8n Integration</h3>
              <p class="text-sm text-gray-600">
                Forward mentions to your n8n workflows
              </p>
            </div>
          </div>
        </div>
      </div>

      <div class="text-center">
        <div class="space-x-4">
          <a 
            href="/auth/discord" 
            class="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Login with Discord
          </a>
          <a 
            href="/dashboard" 
            class="bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700 transition-colors"
          >
            View Dashboard
          </a>
        </div>
      </div>

      <div class="mt-12 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <h3 class="font-semibold text-yellow-800 mb-2">🚧 Development Status</h3>
        <p class="text-yellow-700">
          This bot is currently in development. Core features are being implemented.
        </p>
      </div>
    </div>
  );
}