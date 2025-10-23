/**
 * Dashboard Page - Main Admin Interface
 * Shows reminder statistics and list with filtering
 */

import { PageProps } from "$fresh/server.ts";
import ReminderList from "../components/ReminderList.tsx";

export default function DashboardPage({ url }: PageProps) {
  
  return (
    <div class="min-h-screen bg-gray-50">
      {/* Header */}
      <div class="bg-white shadow">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="flex justify-between items-center py-6">
            <div class="flex items-center">
              <h1 class="text-2xl font-bold text-gray-900">Reminder Dashboard</h1>
            </div>
            <nav class="flex space-x-4">
              <a
                href="/admin/reminders/new"
                class="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Create Reminder
              </a>
            </nav>
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <div class="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div class="px-4 sm:px-0">
          {/* Statistics Cards */}
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div id="stats-pending" class="bg-white overflow-hidden shadow rounded-lg">
              <div class="p-5">
                <div class="flex items-center">
                  <div class="flex-shrink-0">
                    <div class="w-8 h-8 bg-yellow-500 rounded-md flex items-center justify-center">
                      <span class="text-white text-sm font-bold">⏳</span>
                    </div>
                  </div>
                  <div class="ml-5 w-0 flex-1">
                    <dl>
                      <dt class="text-sm font-medium text-gray-500 truncate">Pending</dt>
                      <dd class="text-lg font-medium text-gray-900">-</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div id="stats-sent" class="bg-white overflow-hidden shadow rounded-lg">
              <div class="p-5">
                <div class="flex items-center">
                  <div class="flex-shrink-0">
                    <div class="w-8 h-8 bg-blue-500 rounded-md flex items-center justify-center">
                      <span class="text-white text-sm font-bold">📤</span>
                    </div>
                  </div>
                  <div class="ml-5 w-0 flex-1">
                    <dl>
                      <dt class="text-sm font-medium text-gray-500 truncate">Sent</dt>
                      <dd class="text-lg font-medium text-gray-900">-</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div id="stats-acknowledged" class="bg-white overflow-hidden shadow rounded-lg">
              <div class="p-5">
                <div class="flex items-center">
                  <div class="flex-shrink-0">
                    <div class="w-8 h-8 bg-green-500 rounded-md flex items-center justify-center">
                      <span class="text-white text-sm font-bold">✅</span>
                    </div>
                  </div>
                  <div class="ml-5 w-0 flex-1">
                    <dl>
                      <dt class="text-sm font-medium text-gray-500 truncate">Acknowledged</dt>
                      <dd class="text-lg font-medium text-gray-900">-</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div id="stats-total" class="bg-white overflow-hidden shadow rounded-lg">
              <div class="p-5">
                <div class="flex items-center">
                  <div class="flex-shrink-0">
                    <div class="w-8 h-8 bg-gray-500 rounded-md flex items-center justify-center">
                      <span class="text-white text-sm font-bold">📊</span>
                    </div>
                  </div>
                  <div class="ml-5 w-0 flex-1">
                    <dl>
                      <dt class="text-sm font-medium text-gray-500 truncate">Total</dt>
                      <dd class="text-lg font-medium text-gray-900">-</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Reminder List */}
          <div id="reminder-list-container">
            <div class="bg-white shadow rounded-lg">
              <div class="px-6 py-4 border-b border-gray-200">
                <h2 class="text-lg font-medium text-gray-900">Loading reminders...</h2>
              </div>
              <div class="px-6 py-8 text-center">
                <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <p class="mt-2 text-sm text-gray-500">Please wait...</p>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div class="mt-8 bg-white shadow rounded-lg">
            <div class="px-6 py-4 border-b border-gray-200">
              <h3 class="text-lg font-medium text-gray-900">Quick Actions</h3>
            </div>
            <div class="px-6 py-4">
              <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                <a
                  href="/admin/reminders/new"
                  class="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div class="flex-shrink-0">
                    <div class="w-8 h-8 bg-blue-500 rounded-md flex items-center justify-center">
                      <span class="text-white text-sm font-bold">+</span>
                    </div>
                  </div>
                  <div class="ml-3">
                    <p class="text-sm font-medium text-gray-900">Create Reminder</p>
                    <p class="text-xs text-gray-500">Schedule a new Discord reminder</p>
                  </div>
                </a>

                <button
                  id="refresh-all"
                  class="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div class="flex-shrink-0">
                    <div class="w-8 h-8 bg-green-500 rounded-md flex items-center justify-center">
                      <span class="text-white text-sm font-bold">🔄</span>
                    </div>
                  </div>
                  <div class="ml-3">
                    <p class="text-sm font-medium text-gray-900">Refresh Data</p>
                    <p class="text-xs text-gray-500">Update all reminder information</p>
                  </div>
                </button>

                <a
                  href="/admin/settings"
                  class="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div class="flex-shrink-0">
                    <div class="w-8 h-8 bg-gray-500 rounded-md flex items-center justify-center">
                      <span class="text-white text-sm font-bold">⚙️</span>
                    </div>
                  </div>
                  <div class="ml-3">
                    <p class="text-sm font-medium text-gray-900">Settings</p>
                    <p class="text-xs text-gray-500">Configure admin preferences</p>
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
              const stats = {
                pending: reminders.filter(r => r.status === 'pending').length,
                sent: reminders.filter(r => r.status === 'sent').length,
                acknowledged: reminders.filter(r => r.status === 'acknowledged' || r.status === 'escalated_acknowledged').length,
                total: reminders.length
              };

              // Update DOM
              updateStatCard('stats-pending', stats.pending);
              updateStatCard('stats-sent', stats.sent);
              updateStatCard('stats-acknowledged', stats.acknowledged);
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
                <div class="bg-white shadow rounded-lg">
                  <div class="px-6 py-4 border-b border-gray-200">
                    <div class="flex justify-between items-center">
                      <h2 class="text-lg font-medium text-gray-900">
                        Reminders (\${filteredReminders.length})
                      </h2>
                      <select id="status-filter" class="border border-gray-300 rounded-md px-3 py-1 text-sm">
                        <option value="all">All Reminders</option>
                        <option value="pending">Pending</option>
                        <option value="sent">Sent</option>
                        <option value="acknowledged">Acknowledged</option>
                        <option value="declined">Declined</option>
                        <option value="failed">Failed</option>
                      </select>
                    </div>
                  </div>
                  <div class="divide-y divide-gray-200">
                    \${filteredReminders.length === 0 ? \`
                      <div class="px-6 py-8 text-center">
                        <p class="text-gray-500">No reminders found</p>
                      </div>
                    \` : filteredReminders.map(reminder => \`
                      <div class="px-6 py-4 hover:bg-gray-50">
                        <div class="flex items-start justify-between">
                          <div class="flex-1 min-w-0">
                            <div class="flex items-start justify-between mb-2">
                              <p class="text-sm text-gray-900 font-medium">
                                \${reminder.content.length > 100 ? reminder.content.substring(0, 100) + '...' : reminder.content}
                              </p>
                              <span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full 
                                \${getStatusColor(reminder.status)}">
                                \${formatStatus(reminder.status)}
                              </span>
                            </div>
                            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-xs text-gray-500">
                              <div><span class="font-medium">Target:</span> \${reminder.targetUserId}</div>
                              <div><span class="font-medium">Scheduled:</span> \${formatDateInTimezone(reminder.scheduledTime, reminder.timezone)}</div>
                              <div><span class="font-medium">Created:</span> \${formatDateInTimezone(reminder.createdAt, reminder.timezone)}</div>
                              <div><span class="font-medium">Attempts:</span> \${reminder.deliveryAttempts}</div>
                            </div>
                          </div>
                          <div class="ml-4 flex flex-col space-y-1">
                            \${reminder.status === 'pending' ? \`
                              <button onclick="editReminder('\${reminder.id}')" class="px-2 py-1 text-xs font-medium text-blue-600 hover:text-blue-500">Edit</button>
                            \` : ''}
                            <button onclick="testReminder('\${reminder.id}')" class="px-2 py-1 text-xs font-medium text-green-600 hover:text-green-500">Test</button>
                            \${reminder.status === 'pending' ? \`
                              <button onclick="deleteReminder('\${reminder.id}')" class="px-2 py-1 text-xs font-medium text-red-600 hover:text-red-500">Delete</button>
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
                case 'pending': return 'bg-yellow-100 text-yellow-800';
                case 'sent': return 'bg-blue-100 text-blue-800';
                case 'acknowledged': return 'bg-green-100 text-green-800';
                case 'declined': return 'bg-red-100 text-red-800';
                case 'escalated': return 'bg-purple-100 text-purple-800';
                case 'failed': return 'bg-red-100 text-red-800';
                default: return 'bg-gray-100 text-gray-800';
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
                  <div class="bg-white shadow rounded-lg">
                    <div class="px-6 py-8 text-center">
                      <p class="text-red-500">\${message}</p>
                      <button onclick="loadData()" class="mt-2 px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700">
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