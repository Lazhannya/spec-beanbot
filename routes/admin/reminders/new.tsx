/**
 * New Reminder Page
 * Admin page for creating new reminders
 */

import { PageProps } from "$fresh/server.ts";
import ReminderForm, { ReminderFormData } from "../../../islands/ReminderForm.tsx";

export default function NewReminderPage({ url }: PageProps) {
  
  // Handle form submission
  const handleSubmit = async (data: ReminderFormData) => {
    try {
      const response = await fetch('/api/reminders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: data.content,
          targetUserId: data.targetUserId,
          scheduledTime: data.scheduledTime,
          enableEscalation: data.enableEscalation,
          escalationUserId: data.escalationUserId,
          escalationTimeoutMinutes: data.escalationTimeoutMinutes,
          createdBy: 'admin', // TODO: Get from session
        }),
      });

      if (response.ok) {
        // Redirect to dashboard on success
        window.location.href = '/';
      } else {
        const error = await response.json();
        alert(`Error creating reminder: ${error.error}`);
      }
    } catch (error) {
      console.error('Error creating reminder:', error);
      alert('Failed to create reminder. Please try again.');
    }
  };

  // Handle cancel
  const handleCancel = () => {
    window.location.href = '/';
  };

  return (
    <div class="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div class="bg-white dark:bg-gray-800 shadow border-b border-gray-200 dark:border-gray-700">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="flex justify-between items-center py-6">
            <div class="flex items-center">
              <h1 class="text-2xl font-bold text-gray-900 dark:text-gray-100">Create New Reminder</h1>
            </div>
            <nav class="flex space-x-4">
              <a
                href="/"
                class="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 px-3 py-2 rounded-md text-sm font-medium"
              >
                Dashboard
              </a>
              <a
                href="/admin/reminders"
                class="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 px-3 py-2 rounded-md text-sm font-medium"
              >
                All Reminders
              </a>
            </nav>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div class="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div class="px-4 py-6 sm:px-0">
          <div class="bg-white dark:bg-gray-800 shadow rounded-lg border border-gray-200 dark:border-gray-700">
            <div class="px-6 py-6">
              <div class="mb-6">
                <h2 class="text-lg font-medium text-gray-900 dark:text-gray-100">Reminder Details</h2>
                <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
                  Create a new reminder to be delivered to a Discord user at a specified time.
                </p>
              </div>

              {/* Reminder Form */}
              <ReminderForm
                onSubmit={handleSubmit}
                onCancel={handleCancel}
              />
            </div>
          </div>

          {/* Help Section */}
          <div class="mt-8 bg-blue-50 dark:bg-blue-900 dark:bg-opacity-30 border border-blue-200 dark:border-blue-800 rounded-lg">
            <div class="px-6 py-4">
              <h3 class="text-sm font-medium text-blue-900 dark:text-blue-200 mb-2">💡 Tips</h3>
              <ul class="text-sm text-blue-800 dark:text-blue-300 space-y-1">
                <li>• Discord user IDs are 17-19 digit numbers (e.g., 123456789012345678)</li>
                <li>• You can find user IDs by enabling Developer Mode in Discord and right-clicking users</li>
                <li>• Escalation will automatically send the reminder to a secondary user if no response is received</li>
                <li>• Test triggers allow you to preview how reminders will be delivered</li>
              </ul>
            </div>
          </div>

          {/* Recent Reminders Preview */}
          <div class="mt-8 bg-white dark:bg-gray-800 shadow rounded-lg border border-gray-200 dark:border-gray-700">
            <div class="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h3 class="text-lg font-medium text-gray-900 dark:text-gray-100">Recent Reminders</h3>
              <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
                Your most recently created reminders
              </p>
            </div>
            <div class="px-6 py-4">
              <div id="recent-reminders" class="space-y-3">
                <p class="text-sm text-gray-500 dark:text-gray-400">Loading recent reminders...</p>
              </div>
              <div class="mt-4">
                <a
                  href="/"
                  class="text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300"
                >
                  View all reminders →
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Load recent reminders */}
      <script
        dangerouslySetInnerHTML={{
          __html: `
            // Load recent reminders on page load
            async function loadRecentReminders() {
              try {
                const response = await fetch('/api/reminders?limit=3');
                if (!response.ok) throw new Error('Failed to load');
                
                const data = await response.json();
                const container = document.getElementById('recent-reminders');
                
                if (data.reminders && data.reminders.length > 0) {
                  container.innerHTML = data.reminders.map(reminder => \`
                    <div class="flex justify-between items-start p-3 bg-gray-50 rounded-md">
                      <div class="flex-1">
                        <p class="text-sm font-medium text-gray-900">
                          \${reminder.content.substring(0, 60)}\${reminder.content.length > 60 ? '...' : ''}
                        </p>
                        <p class="text-xs text-gray-500 mt-1">
                          To: \${reminder.targetUserId} • Scheduled: \${new Date(reminder.scheduledTime).toLocaleString()}
                        </p>
                      </div>
                      <span class="ml-2 inline-flex px-2 py-1 text-xs font-semibold rounded-full 
                        \${reminder.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 
                          reminder.status === 'sent' ? 'bg-blue-100 text-blue-800' : 
                          'bg-gray-100 text-gray-800'}">
                        \${reminder.status.charAt(0).toUpperCase() + reminder.status.slice(1)}
                      </span>
                    </div>
                  \`).join('');
                } else {
                  container.innerHTML = '<p class="text-sm text-gray-500">No reminders found</p>';
                }
              } catch (error) {
                console.error('Error loading recent reminders:', error);
                document.getElementById('recent-reminders').innerHTML = 
                  '<p class="text-sm text-red-500">Failed to load recent reminders</p>';
              }
            }
            
            // Load when page is ready
            if (document.readyState === 'loading') {
              document.addEventListener('DOMContentLoaded', loadRecentReminders);
            } else {
              loadRecentReminders();
            }
          `,
        }}
      />
    </div>
  );
}