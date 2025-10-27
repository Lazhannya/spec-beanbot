/**
 * Admin Settings Page
 * Allows users to configure their preferences including timezone
 */

import { Handlers, PageProps } from "$fresh/server.ts";
import {
  DEFAULT_TIMEZONE,
  getTimezonesByRegion,
  getTimezoneFriendlyName,
  SUPPORTED_TIMEZONES,
} from "../../discord-bot/lib/utils/timezone.ts";

interface UserSettings {
  timezone: string;
}

interface SettingsData {
  settings: UserSettings;
  timezonesByRegion: Record<string, string[]>;
  saveSuccess?: boolean;
  error?: string;
}

export const handler: Handlers<SettingsData> = {
  async GET(_req, ctx) {
    const kv = await Deno.openKv();

    // Get admin settings from KV (using a simple admin key for now)
    const settingsKey = ["admin_settings", "default"];
    const settingsEntry = await kv.get<UserSettings>(settingsKey);

    const settings: UserSettings = settingsEntry.value || {
      timezone: DEFAULT_TIMEZONE,
    };

    await kv.close();

    return ctx.render({
      settings,
      timezonesByRegion: getTimezonesByRegion(),
    });
  },

  async POST(req, ctx) {
    const formData = await req.formData();
    const timezone = formData.get("timezone")?.toString() || DEFAULT_TIMEZONE;

    // Validate timezone
    const isValidTimezone = SUPPORTED_TIMEZONES.some((tz) => tz === timezone);
    if (!isValidTimezone) {
      return ctx.render({
        settings: {
          timezone: DEFAULT_TIMEZONE,
        },
        timezonesByRegion: getTimezonesByRegion(),
        error: "Invalid timezone selected",
      });
    }

    const kv = await Deno.openKv();

    try {
      // Save admin settings to KV
      const settings: UserSettings = {
        timezone,
      };

      const settingsKey = ["admin_settings", "default"];
      await kv.set(settingsKey, settings);

      await kv.close();

      return ctx.render({
        settings,
        timezonesByRegion: getTimezonesByRegion(),
        saveSuccess: true,
      });
    } catch (error) {
      await kv.close();
      console.error("Failed to save admin settings:", error);

      return ctx.render({
        settings: {
          timezone: DEFAULT_TIMEZONE,
        },
        timezonesByRegion: getTimezonesByRegion(),
        error: "Failed to save settings. Please try again.",
      });
    }
  },
};

export default function SettingsPage({ data }: PageProps<SettingsData>) {
  return (
    <div class="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <div class="bg-gradient-to-r from-blue-600 to-blue-700 dark:from-blue-900 dark:to-blue-800 shadow-lg">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="flex justify-between items-center py-8">
            <div class="flex items-center space-x-3">
              <div class="w-10 h-10 bg-white bg-opacity-20 dark:bg-opacity-30 rounded-lg flex items-center justify-center">
                <span class="text-2xl">⚙️</span>
              </div>
              <div>
                <h1 class="text-3xl font-bold text-white">Settings</h1>
                <p class="text-blue-100 dark:text-blue-200 text-sm mt-1">Configure your admin preferences</p>
              </div>
            </div>
            <nav class="flex space-x-4">
              <a
                href="/"
                class="bg-white bg-opacity-20 dark:bg-opacity-30 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-opacity-30 dark:hover:bg-opacity-40 transition-all duration-200"
              >
                🏠 Dashboard
              </a>
              <a
                href="/admin/reminders/new"
                class="bg-white bg-opacity-20 dark:bg-opacity-30 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-opacity-30 dark:hover:bg-opacity-40 transition-all duration-200"
              >
                ➕ New Reminder
              </a>
            </nav>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div class="max-w-7xl mx-auto py-8 sm:px-6 lg:px-8">
        <div class="px-4 sm:px-0">
          <div class="max-w-2xl mx-auto">
            {/* Success Message */}
            {data.saveSuccess && (
              <div class="mb-6 bg-green-50 dark:bg-green-900 dark:bg-opacity-30 border-2 border-green-200 dark:border-green-700 text-green-800 dark:text-green-300 px-6 py-4 rounded-xl shadow-sm">
                <div class="flex items-center">
                  <span class="text-2xl mr-3">✅</span>
                  <div>
                    <strong class="font-semibold">Success!</strong>
                    <p class="text-sm mt-1">Your settings have been saved successfully.</p>
                  </div>
                </div>
              </div>
            )}

            {/* Error Message */}
            {data.error && (
              <div class="mb-6 bg-red-50 dark:bg-red-900 dark:bg-opacity-30 border-2 border-red-200 dark:border-red-700 text-red-800 dark:text-red-300 px-6 py-4 rounded-xl shadow-sm">
                <div class="flex items-center">
                  <span class="text-2xl mr-3">❌</span>
                  <div>
                    <strong class="font-semibold">Error</strong>
                    <p class="text-sm mt-1">{data.error}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Settings Form */}
            <form method="POST" class="bg-white dark:bg-gray-800 shadow-lg rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div class="px-6 py-5 border-b border-gray-200 dark:border-gray-700">
                <h2 class="text-xl font-bold text-gray-900 dark:text-gray-100">Display Preferences</h2>
                <p class="text-sm text-gray-600 dark:text-gray-400 mt-1">Customize how reminders are displayed</p>
              </div>

              <div class="px-6 py-6 space-y-6">
                {/* Timezone Preference */}
                <div>
                  <label htmlFor="timezone" class="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                    Default Timezone
                  </label>
                  <select
                    id="timezone"
                    name="timezone"
                    class="w-full px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 transition-colors"
                    required
                  >
                    {Object.entries(data.timezonesByRegion).map(([region, timezones]) => (
                      <optgroup label={region} key={region}>
                        {timezones.map((tz) => (
                          <option
                            value={tz}
                            selected={tz === data.settings.timezone}
                            key={tz}
                          >
                            {getTimezoneFriendlyName(tz)}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                  <p class="mt-2 text-sm text-gray-500 dark:text-gray-400">
                    All reminder times will be displayed in your selected timezone. Default is Europe/Berlin.
                  </p>
                </div>

                {/* Current Time Display */}
                <div class="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900 dark:to-blue-800 dark:bg-opacity-30 border-2 border-blue-200 dark:border-blue-700 rounded-xl p-5 shadow-sm">
                  <div class="flex items-start">
                    <span class="text-3xl mr-4">🌍</span>
                    <div class="flex-1">
                      <p class="text-sm font-semibold text-blue-900 dark:text-blue-200 mb-2">Current Settings</p>
                      <div class="space-y-1 text-sm text-blue-800 dark:text-blue-300">
                        <p>
                          <strong>Timezone:</strong> {data.settings.timezone}
                        </p>
                        <p>
                          <strong>Local Time:</strong> {new Date().toLocaleString("en-US", {
                            timeZone: data.settings.timezone,
                            dateStyle: "full",
                            timeStyle: "long",
                          })}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Save Button */}
                <div class="pt-4 border-t border-gray-200 dark:border-gray-700">
                  <button
                    type="submit"
                    class="w-full bg-gradient-to-r from-blue-600 to-blue-700 dark:from-blue-700 dark:to-blue-800 text-white px-6 py-3 rounded-lg font-semibold hover:from-blue-700 hover:to-blue-800 dark:hover:from-blue-600 dark:hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 transition-all duration-200 shadow-md hover:shadow-lg"
                  >
                    💾 Save Settings
                  </button>
                </div>
              </div>
            </form>

            {/* Future Features */}
            <div class="mt-8 bg-white dark:bg-gray-800 shadow-lg rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div class="px-6 py-5 border-b border-gray-200 dark:border-gray-700">
                <h2 class="text-xl font-bold text-gray-900 dark:text-gray-100">Coming Soon</h2>
                <p class="text-sm text-gray-600 dark:text-gray-400 mt-1">Additional features in development</p>
              </div>
              <div class="px-6 py-6">
                <ul class="space-y-4">
                  <li class="flex items-start p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
                    <span class="text-2xl mr-4">🔔</span>
                    <div>
                      <p class="font-semibold text-gray-900 dark:text-gray-100">Notification Preferences</p>
                      <p class="text-sm text-gray-600 dark:text-gray-400 mt-1">Configure how you receive admin notifications</p>
                    </div>
                  </li>
                  <li class="flex items-start p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
                    <span class="text-2xl mr-4">⏰</span>
                    <div>
                      <p class="font-semibold text-gray-900 dark:text-gray-100">Default Reminder Duration</p>
                      <p class="text-sm text-gray-600 dark:text-gray-400 mt-1">Set default timeout and escalation settings</p>
                    </div>
                  </li>
                  <li class="flex items-start p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
                    <span class="text-2xl mr-4">👥</span>
                    <div>
                      <p class="font-semibold text-gray-900 dark:text-gray-100">Team Management</p>
                      <p class="text-sm text-gray-600 dark:text-gray-400 mt-1">Manage admin users and permissions</p>
                    </div>
                  </li>
                  <li class="flex items-start p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
                    <span class="text-2xl mr-4">🎨</span>
                    <div>
                      <p class="font-semibold text-gray-900 dark:text-gray-100">UI Customization</p>
                      <p class="text-sm text-gray-600 dark:text-gray-400 mt-1">Customize colors, themes, and layout preferences</p>
                    </div>
                  </li>
                  <li class="flex items-start p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
                    <span class="text-2xl mr-4">📊</span>
                    <div>
                      <p class="font-semibold text-gray-900 dark:text-gray-100">Analytics & Reports</p>
                      <p class="text-sm text-gray-600 dark:text-gray-400 mt-1">View reminder statistics and delivery reports</p>
                    </div>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
