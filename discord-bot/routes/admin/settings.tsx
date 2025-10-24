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
} from "../../lib/utils/timezone.ts";

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
    <div class="min-h-screen bg-gray-50">
      {/* Header */}
      <div class="bg-white shadow">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="flex justify-between items-center py-6">
            <div class="flex items-center">
              <h1 class="text-2xl font-bold text-gray-900">Settings</h1>
            </div>
            <nav class="flex space-x-4">
              <a
                href="/"
                class="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
              >
                Dashboard
              </a>
              <a
                href="/admin/reminders/new"
                class="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
              >
                New Reminder
              </a>
              <a
                href="/auth/logout"
                class="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
              >
                Logout
              </a>
            </nav>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div class="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div class="px-4 sm:px-0">
          <div class="max-w-2xl mx-auto">
            <h1 class="text-3xl font-bold text-gray-900 mb-6">Admin Settings</h1>

            {data.saveSuccess && (
              <div class="mb-6 bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg">
                <strong>Success!</strong> Your settings have been saved.
              </div>
            )}

            {data.error && (
              <div class="mb-6 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
                <strong>Error:</strong> {data.error}
              </div>
            )}

            <form method="POST" class="bg-white shadow-md rounded-lg p-6">
              <div class="space-y-6">
                {/* Timezone Preference */}
                <div>
                  <h2 class="text-xl font-semibold text-gray-900 mb-4">Display Preferences</h2>
                  
                  <div>
                    <label htmlFor="timezone" class="block text-sm font-medium text-gray-700 mb-2">
                      Default Timezone
                    </label>
                    <select
                      id="timezone"
                      name="timezone"
                      class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                    <p class="mt-2 text-sm text-gray-500">
                      All reminder times will be displayed in your selected timezone. Default is Europe/Berlin.
                    </p>
                  </div>

                  <div class="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p class="text-sm text-blue-800">
                      <strong>Current timezone:</strong> {data.settings.timezone}
                      <br />
                      <strong>Current time:</strong> {new Date().toLocaleString("en-US", {
                        timeZone: data.settings.timezone,
                        dateStyle: "full",
                        timeStyle: "long",
                      })}
                    </p>
                  </div>
                </div>

                {/* Save Button */}
                <div class="pt-4 border-t border-gray-200">
                  <button
                    type="submit"
                    class="w-full bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                  >
                    Save Settings
                  </button>
                </div>
              </div>
            </form>

            {/* Additional Settings Sections (Future) */}
            <div class="mt-8 bg-gray-50 border border-gray-200 rounded-lg p-6">
              <h2 class="text-xl font-semibold text-gray-900 mb-3">Coming Soon</h2>
              <ul class="space-y-2 text-gray-600">
                <li class="flex items-center">
                  <span class="mr-2">🔔</span>
                  Notification preferences
                </li>
                <li class="flex items-center">
                  <span class="mr-2">⏰</span>
                  Default reminder duration
                </li>
                <li class="flex items-center">
                  <span class="mr-2">👥</span>
                  Team management
                </li>
                <li class="flex items-center">
                  <span class="mr-2">🎨</span>
                  UI customization
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
