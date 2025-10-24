/**
 * Dashboard Page - Main Admin Interface
 * Shows reminder statistics and list with filtering
 */

import { PageProps } from "$fresh/server.ts";

export default function DashboardPage(_props: PageProps) {
  
  return (
    <div class="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <div class="bg-gradient-to-r from-blue-600 to-blue-700 dark:from-blue-900 dark:to-blue-800 shadow-lg">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="flex justify-between items-center py-8">
            <div class="flex items-center space-x-3">
              <div class="w-10 h-10 bg-white bg-opacity-20 dark:bg-opacity-30 rounded-lg flex items-center justify-center">
                <span class="text-2xl">🔔</span>
              </div>
              <div>
                <h1 class="text-3xl font-bold text-white">Reminder Dashboard</h1>
                <p class="text-blue-100 dark:text-blue-200 text-sm mt-1">Manage and monitor your Discord reminders</p>
              </div>
            </div>
            <nav class="flex space-x-4">
              <a
                href="/admin/reminders/new"
                class="bg-white text-blue-600 dark:bg-blue-700 dark:text-white px-6 py-3 rounded-lg text-sm font-semibold hover:bg-blue-50 dark:hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-blue-600 dark:focus:ring-offset-blue-800 transition-all duration-200 shadow-md hover:shadow-lg"
              >
                ➕ Create Reminder
              </a>
            </nav>
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <div class="max-w-7xl mx-auto py-8 sm:px-6 lg:px-8">
        <div class="px-4 sm:px-0">
          {/* Statistics Cards */}
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
            <div id="stats-pending" class="bg-white dark:bg-gray-800 overflow-hidden shadow-md rounded-xl hover:shadow-lg transition-shadow duration-200 border border-gray-200 dark:border-gray-700">
              <div class="p-6">
                <div class="flex items-center">
                  <div class="flex-shrink-0">
                    <div class="w-12 h-12 bg-gradient-to-br from-yellow-400 to-yellow-500 rounded-xl flex items-center justify-center shadow-sm">
                      <span class="text-white text-xl font-bold">⏳</span>
                    </div>
                  </div>
                  <div class="ml-5 w-0 flex-1">
                    <dl>
                      <dt class="text-sm font-semibold text-gray-600 dark:text-gray-300 truncate">Pending</dt>
                      <dd class="text-2xl font-bold text-gray-900 dark:text-gray-100">-</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div id="stats-sent" class="bg-white dark:bg-gray-800 overflow-hidden shadow-md rounded-xl hover:shadow-lg transition-shadow duration-200 border border-gray-200 dark:border-gray-700">
              <div class="p-6">
                <div class="flex items-center">
                  <div class="flex-shrink-0">
                    <div class="w-12 h-12 bg-gradient-to-br from-blue-400 to-blue-500 rounded-xl flex items-center justify-center shadow-sm">
                      <span class="text-white text-xl font-bold">📤</span>
                    </div>
                  </div>
                  <div class="ml-5 w-0 flex-1">
                    <dl>
                      <dt class="text-sm font-semibold text-gray-600 dark:text-gray-300 truncate">Sent</dt>
                      <dd class="text-2xl font-bold text-gray-900 dark:text-gray-100">-</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div id="stats-acknowledged" class="bg-white dark:bg-gray-800 overflow-hidden shadow-md rounded-xl hover:shadow-lg transition-shadow duration-200 border border-gray-200 dark:border-gray-700">
              <div class="p-6">
                <div class="flex items-center">
                  <div class="flex-shrink-0">
                    <div class="w-12 h-12 bg-gradient-to-br from-green-400 to-green-500 rounded-xl flex items-center justify-center shadow-sm">
                      <span class="text-white text-xl font-bold">✅</span>
                    </div>
                  </div>
                  <div class="ml-5 w-0 flex-1">
                    <dl>
                      <dt class="text-sm font-semibold text-gray-600 dark:text-gray-300 truncate">Acknowledged</dt>
                      <dd class="text-2xl font-bold text-gray-900 dark:text-gray-100">-</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div id="stats-responses" class="bg-white dark:bg-gray-800 overflow-hidden shadow-md rounded-xl hover:shadow-lg transition-shadow duration-200 border border-gray-200 dark:border-gray-700">
              <div class="p-6">
                <div class="flex items-center">
                  <div class="flex-shrink-0">
                    <div class="w-12 h-12 bg-gradient-to-br from-purple-400 to-purple-500 rounded-xl flex items-center justify-center shadow-sm">
                      <span class="text-white text-xl font-bold">💬</span>
                    </div>
                  </div>
                  <div class="ml-5 w-0 flex-1">
                    <dl>
                      <dt class="text-sm font-semibold text-gray-600 dark:text-gray-300 truncate">Responses</dt>
                      <dd class="text-2xl font-bold text-gray-900 dark:text-gray-100">-</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div id="stats-total" class="bg-white dark:bg-gray-800 overflow-hidden shadow-md rounded-xl hover:shadow-lg transition-shadow duration-200 border border-gray-200 dark:border-gray-700">
              <div class="p-6">
                <div class="flex items-center">
                  <div class="flex-shrink-0">
                    <div class="w-12 h-12 bg-gradient-to-br from-gray-400 to-gray-500 rounded-xl flex items-center justify-center shadow-sm">
                      <span class="text-white text-xl font-bold">📊</span>
                    </div>
                  </div>
                  <div class="ml-5 w-0 flex-1">
                    <dl>
                      <dt class="text-sm font-semibold text-gray-600 dark:text-gray-300 truncate">Total</dt>
                      <dd class="text-2xl font-bold text-gray-900 dark:text-gray-100">-</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Reminder List */}
          <div id="reminder-list-container">
            <div class="bg-white dark:bg-gray-800 shadow-lg rounded-xl border border-gray-200 dark:border-gray-700">
              <div class="px-6 py-5 border-b border-gray-200 dark:border-gray-700">
                <h2 class="text-xl font-bold text-gray-900 dark:text-gray-100">Loading reminders...</h2>
              </div>
              <div class="px-6 py-12 text-center">
                <div class="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 dark:border-blue-400"></div>
                <p class="mt-3 text-sm text-gray-600 dark:text-gray-400">Please wait...</p>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div class="mt-8 bg-white dark:bg-gray-800 shadow-lg rounded-xl border border-gray-200 dark:border-gray-700">
            <div class="px-6 py-5 border-b border-gray-200 dark:border-gray-700">
              <h3 class="text-xl font-bold text-gray-900 dark:text-gray-100">Quick Actions</h3>
            </div>
            <div class="px-6 py-6">
              <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                <a
                  href="/admin/reminders/new"
                  class="flex items-center p-5 border-2 border-gray-200 dark:border-gray-700 rounded-xl hover:border-blue-300 dark:hover:border-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900 dark:hover:bg-opacity-30 transition-all duration-200 group"
                >
                  <div class="flex-shrink-0">
                    <div class="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow">
                      <span class="text-white text-xl font-bold">➕</span>
                    </div>
                  </div>
                  <div class="ml-4">
                    <p class="text-base font-semibold text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">Create Reminder</p>
                    <p class="text-sm text-gray-600 dark:text-gray-400 mt-1">Schedule a new Discord reminder</p>
                  </div>
                </a>

                <button
                  type="button"
                  id="refresh-all"
                  class="flex items-center p-5 border-2 border-gray-200 dark:border-gray-700 rounded-xl hover:border-green-300 dark:hover:border-green-600 hover:bg-green-50 dark:hover:bg-green-900 dark:hover:bg-opacity-30 transition-all duration-200 group"
                >
                  <div class="flex-shrink-0">
                    <div class="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow">
                      <span class="text-white text-xl font-bold">🔄</span>
                    </div>
                  </div>
                  <div class="ml-4">
                    <p class="text-base font-semibold text-gray-900 dark:text-gray-100 group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors">Refresh Data</p>
                    <p class="text-sm text-gray-600 dark:text-gray-400 mt-1">Update all reminder information</p>
                  </div>
                </button>

                <a
                  href="/admin/settings"
                  class="flex items-center p-5 border-2 border-gray-200 dark:border-gray-700 rounded-xl hover:border-gray-400 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 group"
                >
                  <div class="flex-shrink-0">
                    <div class="w-12 h-12 bg-gradient-to-br from-gray-500 to-gray-600 rounded-xl flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow">
                      <span class="text-white text-xl font-bold">⚙️</span>
                    </div>
                  </div>
                  <div class="ml-4">
                    <p class="text-base font-semibold text-gray-900 dark:text-gray-100 group-hover:text-gray-700 dark:group-hover:text-gray-300 transition-colors">Settings</p>
                    <p class="text-sm text-gray-600 dark:text-gray-400 mt-1">Configure admin preferences</p>
                  </div>
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* JavaScript for dynamic functionality */}
      <script
        dangerouslySetInnerHTML={{
          __html: `
            // Global state
            let reminders = [];
            let currentFilter = 'all';
            let isLoading = false;

            // Helper function to format dates in timezone
            function formatDateInTimezone(dateString, timezone) {
              try {
                const date = new Date(dateString);
                if (isNaN(date.getTime())) {
                  return 'Invalid Date';
                }
                return new Intl.DateTimeFormat('en-US', {
                  timeZone: timezone || 'Europe/Berlin',
                  year: 'numeric',
                  month: '2-digit',
                  day: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                  hour12: false
                }).format(date);
              } catch (error) {
                console.error('Error formatting date:', error);
                return new Date(dateString).toLocaleString();
              }
            }

            // Load reminders and statistics
            async function loadData() {
              if (isLoading) return;
              isLoading = true;

              try {
                // Load reminders
                const response = await fetch('/api/reminders?limit=50');
                if (!response.ok) throw new Error('Failed to load reminders');
                
                const data = await response.json();
                reminders = data.reminders || [];
                
                // Update statistics
                updateStatistics();
                
                // Render reminder list
                renderReminderList();
                
              } catch (error) {
                console.error('Error loading data:', error);
                showError('Failed to load reminder data');
              } finally {
                isLoading = false;
              }
            }

            // Update statistics cards
            function updateStatistics() {
              // Calculate response count (total responses across all reminders)
              const totalResponses = reminders.reduce((count, r) => {
                return count + (r.responses ? r.responses.length : 0);
              }, 0);

              const stats = {
                pending: reminders.filter(r => r.status === 'pending').length,
                sent: reminders.filter(r => r.status === 'sent').length,
                acknowledged: reminders.filter(r => r.status === 'acknowledged' || r.status === 'escalated_acknowledged').length,
                responses: totalResponses,
                total: reminders.length
              };

              // Update DOM
              updateStatCard('stats-pending', stats.pending);
              updateStatCard('stats-sent', stats.sent);
              updateStatCard('stats-acknowledged', stats.acknowledged);
              updateStatCard('stats-responses', stats.responses);
              updateStatCard('stats-total', stats.total);
              updateStatCard('stats-total', stats.total);
            }

            function updateStatCard(id, value) {
              const card = document.getElementById(id);
              if (card) {
                const dd = card.querySelector('dd');
                if (dd) dd.textContent = value.toString();
              }
            }

            // Render reminder list
            function renderReminderList() {
              const container = document.getElementById('reminder-list-container');
              if (!container) return;

              // Filter reminders based on current filter
              const filteredReminders = currentFilter === 'all' 
                ? reminders 
                : reminders.filter(r => r.status === currentFilter);

              // Create reminder list HTML (simplified version)
              const html = \`
                <div class="bg-white dark:bg-gray-800 shadow rounded-lg border border-gray-200 dark:border-gray-700">
                  <div class="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                    <div class="flex justify-between items-center">
                      <h2 class="text-lg font-medium text-gray-900 dark:text-gray-100">
                        Reminders (\${filteredReminders.length})
                      </h2>
                      <select id="status-filter" class="border border-gray-300 dark:border-gray-600 rounded-md px-3 py-1 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100">
                        <option value="all">All Reminders</option>
                        <option value="pending">Pending</option>
                        <option value="sent">Sent</option>
                        <option value="acknowledged">Acknowledged</option>
                        <option value="declined">Declined</option>
                        <option value="failed">Failed</option>
                      </select>
                    </div>
                  </div>
                  <div class="divide-y divide-gray-200 dark:divide-gray-700">
                    \${filteredReminders.length === 0 ? \`
                      <div class="px-6 py-8 text-center">
                        <p class="text-gray-500 dark:text-gray-400">No reminders found</p>
                      </div>
                    \` : filteredReminders.map(reminder => \`
                      <div class="px-6 py-4 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                        <div class="flex items-start justify-between">
                          <div class="flex-1 min-w-0">
                            <div class="flex items-start justify-between mb-2">
                              <p class="text-sm text-gray-900 dark:text-gray-100 font-medium">
                                \${reminder.content.length > 100 ? reminder.content.substring(0, 100) + '...' : reminder.content}
                              </p>
                              <span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full 
                                \${getStatusColor(reminder.status)}">
                                \${formatStatus(reminder.status)}
                              </span>
                            </div>
                            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-xs text-gray-500 dark:text-gray-400">
                              <div><span class="font-medium">Target:</span> \${reminder.targetUserId}</div>
                              <div><span class="font-medium">Scheduled:</span> \${formatDateInTimezone(reminder.scheduledTime, reminder.timezone)}</div>
                              <div><span class="font-medium">Created:</span> \${formatDateInTimezone(reminder.createdAt, reminder.timezone)}</div>
                              <div><span class="font-medium">Attempts:</span> \${reminder.deliveryAttempts}</div>
                            </div>
                          </div>
                          <div class="ml-4 flex flex-col space-y-1">
                            \${reminder.status === 'pending' ? \`
                              <button onclick="editReminder('\${reminder.id}')" class="px-2 py-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300">Edit</button>
                            \` : ''}
                            <button onclick="testReminder('\${reminder.id}')" class="px-2 py-1 text-xs font-medium text-green-600 dark:text-green-400 hover:text-green-500 dark:hover:text-green-300">Test</button>
                            \${reminder.status === 'pending' ? \`
                              <button onclick="deleteReminder('\${reminder.id}')" class="px-2 py-1 text-xs font-medium text-red-600 dark:text-red-400 hover:text-red-500 dark:hover:text-red-300">Delete</button>
                            \` : ''}
                          </div>
                        </div>
                      </div>
                    \`).join('')}
                  </div>
                </div>
              \`;

              container.innerHTML = html;

              // Set up filter handler
              const filterSelect = document.getElementById('status-filter');
              if (filterSelect) {
                filterSelect.value = currentFilter;
                filterSelect.addEventListener('change', (e) => {
                  currentFilter = e.target.value;
                  renderReminderList();
                });
              }
            }

            // Helper functions
            function getStatusColor(status) {
              switch (status) {
                case 'pending': return 'bg-yellow-100 dark:bg-yellow-900 dark:bg-opacity-30 text-yellow-800 dark:text-yellow-300';
                case 'sent': return 'bg-blue-100 dark:bg-blue-900 dark:bg-opacity-30 text-blue-800 dark:text-blue-300';
                case 'acknowledged': return 'bg-green-100 dark:bg-green-900 dark:bg-opacity-30 text-green-800 dark:text-green-300';
                case 'declined': return 'bg-red-100 dark:bg-red-900 dark:bg-opacity-30 text-red-800 dark:text-red-300';
                case 'escalated': return 'bg-purple-100 dark:bg-purple-900 dark:bg-opacity-30 text-purple-800 dark:text-purple-300';
                case 'failed': return 'bg-red-100 dark:bg-red-900 dark:bg-opacity-30 text-red-800 dark:text-red-300';
                default: return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300';
              }
            }

            function formatStatus(status) {
              return status.split('_').map(word => 
                word.charAt(0).toUpperCase() + word.slice(1)
              ).join(' ');
            }

            function showError(message) {
              const container = document.getElementById('reminder-list-container');
              if (container) {
                container.innerHTML = \`
                  <div class="bg-white dark:bg-gray-800 shadow rounded-lg border border-gray-200 dark:border-gray-700">
                    <div class="px-6 py-8 text-center">
                      <p class="text-red-500 dark:text-red-400">\${message}</p>
                      <button onclick="loadData()" class="mt-2 px-4 py-2 text-sm bg-blue-600 dark:bg-blue-700 text-white rounded-md hover:bg-blue-700 dark:hover:bg-blue-600">
                        Retry
                      </button>
                    </div>
                  </div>
                \`;
              }
            }

            // Action handlers
            function editReminder(id) {
              window.location.href = \`/admin/reminders/\${id}/edit\`;
            }

            function testReminder(id) {
              const button = event.target;
              const originalText = button.textContent;
              
              // Show loading state
              button.textContent = 'Testing...';
              button.disabled = true;
              
              // Call test API
              fetch(\`/api/reminders/\${id}/test\`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  testType: 'immediate_delivery',
                  preserveSchedule: true
                })
              })
              .then(response => response.json())
              .then(data => {
                if (data.success) {
                  alert(\`Test successful: \${data.message}\`);
                } else {
                  alert(\`Test failed: \${data.error || 'Unknown error'}\`);
                }
              })
              .catch(error => {
                console.error('Test error:', error);
                alert('Test failed: Network error');
              })
              .finally(() => {
                // Reset button state
                button.textContent = originalText;
                button.disabled = false;
              });
            }

            async function deleteReminder(id) {
              if (!confirm('Are you sure you want to delete this reminder?')) return;

              try {
                const response = await fetch(\`/api/reminders/\${id}\`, { method: 'DELETE' });
                if (response.ok) {
                  await loadData(); // Refresh data
                } else {
                  alert('Failed to delete reminder');
                }
              } catch (error) {
                console.error('Error deleting reminder:', error);
                alert('Failed to delete reminder');
              }
            }

            // Event listeners
            document.addEventListener('DOMContentLoaded', loadData);
            
            const refreshButton = document.getElementById('refresh-all');
            if (refreshButton) {
              refreshButton.addEventListener('click', loadData);
            }
          `,
        }}
      />
    </div>
  );
}