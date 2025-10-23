/**
 * ReminderForm Island Component
 * Interactive form for creating new reminders with validation and escalation options
 */

import { useState } from "preact/hooks";
import { JSX } from "preact";
import { DEFAULT_TIMEZONE, getTimezonesByRegion } from "../discord-bot/lib/utils/timezone.ts";

interface ReminderFormProps {
  onSubmit?: (data: ReminderFormData) => void;
  onCancel?: () => void;
  isLoading?: boolean;
  initialData?: Partial<ReminderFormData>;
}

export interface ReminderFormData {
  content: string;
  targetUserId: string;
  scheduledTime: string; // ISO string
  timezone: string; // IANA timezone (default: Europe/Berlin)
  enableEscalation: boolean;
  escalationUserId: string;
  escalationTimeoutMinutes: number;
  // Repeat settings
  enableRepeat: boolean;
  repeatFrequency: string; // 'daily' | 'weekly' | 'monthly' | 'yearly'
  repeatInterval: number;
  repeatEndCondition: string; // 'never' | 'date_based' | 'count_based'
  repeatEndDate: string; // ISO string
  repeatMaxOccurrences: number;
}

export default function ReminderForm({ 
  onSubmit, 
  onCancel, 
  isLoading = false,
  initialData 
}: ReminderFormProps) {
  // Form state
  const [formData, setFormData] = useState<ReminderFormData>({
    content: initialData?.content || "",
    targetUserId: initialData?.targetUserId || "",
    scheduledTime: initialData?.scheduledTime || "",
    timezone: initialData?.timezone || DEFAULT_TIMEZONE,
    enableEscalation: initialData?.enableEscalation || false,
    escalationUserId: initialData?.escalationUserId || "",
    escalationTimeoutMinutes: initialData?.escalationTimeoutMinutes || 60,
    // Repeat settings
    enableRepeat: initialData?.enableRepeat || false,
    repeatFrequency: initialData?.repeatFrequency || "weekly",
    repeatInterval: initialData?.repeatInterval || 1,
    repeatEndCondition: initialData?.repeatEndCondition || "never",
    repeatEndDate: initialData?.repeatEndDate || "",
    repeatMaxOccurrences: initialData?.repeatMaxOccurrences || 10,
  });

  // Form errors
  const [errors, setErrors] = useState<Partial<Record<keyof ReminderFormData, string>>>({});

  // Validation functions
  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof ReminderFormData, string>> = {};

    // Content validation
    if (!formData.content.trim()) {
      newErrors.content = "Reminder content is required";
    } else if (formData.content.length > 2000) {
      newErrors.content = "Content must be less than 2000 characters";
    }

    // Target user validation
    if (!formData.targetUserId.trim()) {
      newErrors.targetUserId = "Target user ID is required";
    } else if (!/^\d{17,19}$/.test(formData.targetUserId)) {
      newErrors.targetUserId = "Invalid Discord user ID format";
    }

    // Scheduled time validation
    if (!formData.scheduledTime) {
      newErrors.scheduledTime = "Scheduled time is required";
    } else {
      const scheduledDate = new Date(formData.scheduledTime);
      const now = new Date();
      if (scheduledDate <= now) {
        newErrors.scheduledTime = "Scheduled time must be in the future";
      }
    }

    // Escalation validation
    if (formData.enableEscalation) {
      if (!formData.escalationUserId.trim()) {
        newErrors.escalationUserId = "Escalation user ID is required when escalation is enabled";
      } else if (!/^\d{17,19}$/.test(formData.escalationUserId)) {
        newErrors.escalationUserId = "Invalid Discord user ID format";
      }
      
      if (formData.escalationTimeoutMinutes < 5) {
        newErrors.escalationTimeoutMinutes = "Escalation timeout must be at least 5 minutes";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Form handlers
  const handleSubmit = async (e: JSX.TargetedEvent<HTMLFormElement, Event>) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    if (onSubmit) {
      onSubmit(formData);
    } else {
      // Default submission via API
      try {
        const response = await fetch('/api/reminders', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(formData),
        });

        if (response.ok) {
          // Reset form or redirect
          setFormData({
            content: "",
            targetUserId: "",
            scheduledTime: "",
            timezone: DEFAULT_TIMEZONE,
            enableEscalation: false,
            escalationUserId: "",
            escalationTimeoutMinutes: 60,
            // Reset repeat settings
            enableRepeat: false,
            repeatFrequency: "weekly",
            repeatInterval: 1,
            repeatEndCondition: "never",
            repeatEndDate: "",
            repeatMaxOccurrences: 10,
          });
          alert('Reminder created successfully!');
        } else {
          const error = await response.json();
          alert(`Error creating reminder: ${error.error || 'Unknown error'}`);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        alert(`Error creating reminder: ${message}`);
      }
    }
  };

  const handleInputChange = (field: keyof ReminderFormData, value: string | boolean | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: undefined
      }));
    }
  };

  // Get current datetime for min attribute
  const getCurrentDateTime = () => {
    const now = new Date();
    now.setMinutes(now.getMinutes() + 1); // At least 1 minute in the future
    return now.toISOString().slice(0, 16); // Format for datetime-local input
  };

  return (
    <div class="max-w-2xl mx-auto">
      <form onSubmit={handleSubmit} class="space-y-6">
        {/* Reminder Content */}
        <div>
          <label htmlFor="content" class="block text-sm font-medium text-gray-700 mb-2">
            Reminder Content *
          </label>
          <textarea
            id="content"
            name="content"
            value={formData.content}
            onInput={(e) => handleInputChange('content', (e.target as HTMLTextAreaElement).value)}
            class={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.content ? 'border-red-500' : 'border-gray-300'
            }`}
            rows={4}
            placeholder="Enter the reminder message..."
            disabled={isLoading}
            maxLength={2000}
          />
          {errors.content && (
            <p class="mt-1 text-sm text-red-600">{errors.content}</p>
          )}
          <p class="mt-1 text-sm text-gray-500">
            {formData.content.length}/2000 characters
          </p>
        </div>

        {/* Target User ID */}
        <div>
          <label htmlFor="targetUserId" class="block text-sm font-medium text-gray-700 mb-2">
            Target User ID *
          </label>
          <input
            type="text"
            id="targetUserId"
            name="targetUserId"
            value={formData.targetUserId}
            onInput={(e) => handleInputChange('targetUserId', (e.target as HTMLInputElement).value)}
            class={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.targetUserId ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="Discord user ID (17-19 digits)"
            disabled={isLoading}
          />
          {errors.targetUserId && (
            <p class="mt-1 text-sm text-red-600">{errors.targetUserId}</p>
          )}
          <p class="mt-1 text-sm text-gray-500">
            Enter the Discord user ID of the person to remind
          </p>
        </div>

        {/* Scheduled Time */}
        <div>
          <label htmlFor="scheduledTime" class="block text-sm font-medium text-gray-700 mb-2">
            Scheduled Time *
          </label>
          <input
            type="datetime-local"
            id="scheduledTime"
            name="scheduledTime"
            value={formData.scheduledTime}
            onInput={(e) => handleInputChange('scheduledTime', (e.target as HTMLInputElement).value)}
            class={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.scheduledTime ? 'border-red-500' : 'border-gray-300'
            }`}
            min={getCurrentDateTime()}
            disabled={isLoading}
          />
          {errors.scheduledTime && (
            <p class="mt-1 text-sm text-red-600">{errors.scheduledTime}</p>
          )}
          <p class="mt-1 text-sm text-gray-500">
            When should this reminder be sent?
          </p>
        </div>

        {/* Timezone */}
        <div>
          <label htmlFor="timezone" class="block text-sm font-medium text-gray-700 mb-2">
            Timezone *
          </label>
          <select
            id="timezone"
            name="timezone"
            value={formData.timezone}
            onChange={(e) => handleInputChange('timezone', (e.target as HTMLSelectElement).value)}
            class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isLoading}
          >
            {Object.entries(getTimezonesByRegion()).map(([region, timezones]) => (
              <optgroup key={region} label={region}>
                {timezones.map((tz) => (
                  <option key={tz} value={tz}>
                    {tz}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
          <p class="mt-1 text-sm text-gray-500">
            Timezone for the scheduled time (default: Europe/Berlin)
          </p>
        </div>

        {/* Escalation Settings */}
        <div class="border border-gray-200 rounded-md p-4">
          <div class="flex items-center mb-4">
            <input
              type="checkbox"
              id="enableEscalation"
              name="enableEscalation"
              checked={formData.enableEscalation}
              onChange={(e) => handleInputChange('enableEscalation', (e.target as HTMLInputElement).checked)}
              class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              disabled={isLoading}
            />
            <label htmlFor="enableEscalation" class="ml-2 block text-sm font-medium text-gray-700">
              Enable Escalation
            </label>
          </div>

          {formData.enableEscalation && (
            <div class="space-y-4">
              {/* Escalation User ID */}
              <div>
                <label htmlFor="escalationUserId" class="block text-sm font-medium text-gray-700 mb-2">
                  Escalation User ID *
                </label>
                <input
                  type="text"
                  id="escalationUserId"
                  name="escalationUserId"
                  value={formData.escalationUserId}
                  onInput={(e) => handleInputChange('escalationUserId', (e.target as HTMLInputElement).value)}
                  class={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.escalationUserId ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Discord user ID for escalation"
                  disabled={isLoading}
                />
                {errors.escalationUserId && (
                  <p class="mt-1 text-sm text-red-600">{errors.escalationUserId}</p>
                )}
              </div>

              {/* Escalation Timeout */}
              <div>
                <label htmlFor="escalationTimeoutMinutes" class="block text-sm font-medium text-gray-700 mb-2">
                  Escalation Timeout (minutes) *
                </label>
                <input
                  type="number"
                  id="escalationTimeoutMinutes"
                  name="escalationTimeoutMinutes"
                  value={formData.escalationTimeoutMinutes}
                  onInput={(e) => handleInputChange('escalationTimeoutMinutes', parseInt((e.target as HTMLInputElement).value) || 0)}
                  class={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.escalationTimeoutMinutes ? 'border-red-500' : 'border-gray-300'
                  }`}
                  min="5"
                  max="1440"
                  disabled={isLoading}
                />
                {errors.escalationTimeoutMinutes && (
                  <p class="mt-1 text-sm text-red-600">{errors.escalationTimeoutMinutes}</p>
                )}
                <p class="mt-1 text-sm text-gray-500">
                  How long to wait before escalating if no response (5-1440 minutes)
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Repeat Settings */}
        <div class="border border-gray-200 rounded-md p-4">
          <div class="flex items-center mb-4">
            <input
              type="checkbox"
              id="enableRepeat"
              name="enableRepeat"
              checked={formData.enableRepeat}
              onChange={(e) => handleInputChange('enableRepeat', (e.target as HTMLInputElement).checked)}
              class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              disabled={isLoading}
            />
            <label htmlFor="enableRepeat" class="ml-2 block text-sm font-medium text-gray-700">
              Make this a Recurring Reminder
            </label>
          </div>

          {formData.enableRepeat && (
            <div class="space-y-4">
              {/* Repeat Frequency and Interval */}
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="repeatFrequency" class="block text-sm font-medium text-gray-700 mb-2">
                    Frequency *
                  </label>
                  <select
                    id="repeatFrequency"
                    name="repeatFrequency"
                    value={formData.repeatFrequency}
                    onChange={(e) => handleInputChange('repeatFrequency', (e.target as HTMLSelectElement).value)}
                    class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={isLoading}
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="repeatInterval" class="block text-sm font-medium text-gray-700 mb-2">
                    Every * (number)
                  </label>
                  <input
                    type="number"
                    id="repeatInterval"
                    name="repeatInterval"
                    value={formData.repeatInterval}
                    onInput={(e) => handleInputChange('repeatInterval', parseInt((e.target as HTMLInputElement).value) || 1)}
                    class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    min="1"
                    max="365"
                    disabled={isLoading}
                  />
                </div>
              </div>

              <p class="text-sm text-gray-500">
                This reminder will repeat every {formData.repeatInterval} {formData.repeatFrequency === 'daily' ? 'day(s)' : formData.repeatFrequency === 'weekly' ? 'week(s)' : formData.repeatFrequency === 'monthly' ? 'month(s)' : 'year(s)'}
              </p>

              {/* End Condition */}
              <div>
                <label htmlFor="repeatEndCondition" class="block text-sm font-medium text-gray-700 mb-2">
                  End Condition *
                </label>
                <select
                  id="repeatEndCondition"
                  name="repeatEndCondition"
                  value={formData.repeatEndCondition}
                  onChange={(e) => handleInputChange('repeatEndCondition', (e.target as HTMLSelectElement).value)}
                  class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={isLoading}
                >
                  <option value="never">Never (continue indefinitely)</option>
                  <option value="date_based">End on specific date</option>
                  <option value="count_based">End after X occurrences</option>
                </select>
              </div>

              {/* Conditional End Fields */}
              {formData.repeatEndCondition === 'date_based' && (
                <div>
                  <label htmlFor="repeatEndDate" class="block text-sm font-medium text-gray-700 mb-2">
                    End Date *
                  </label>
                  <input
                    type="date"
                    id="repeatEndDate"
                    name="repeatEndDate"
                    value={formData.repeatEndDate}
                    onInput={(e) => handleInputChange('repeatEndDate', (e.target as HTMLInputElement).value)}
                    class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    min={new Date().toISOString().split('T')[0]}
                    disabled={isLoading}
                  />
                </div>
              )}

              {formData.repeatEndCondition === 'count_based' && (
                <div>
                  <label htmlFor="repeatMaxOccurrences" class="block text-sm font-medium text-gray-700 mb-2">
                    Maximum Occurrences *
                  </label>
                  <input
                    type="number"
                    id="repeatMaxOccurrences"
                    name="repeatMaxOccurrences"
                    value={formData.repeatMaxOccurrences}
                    onInput={(e) => handleInputChange('repeatMaxOccurrences', parseInt((e.target as HTMLInputElement).value) || 1)}
                    class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    min="1"
                    max="1000"
                    disabled={isLoading}
                  />
                  <p class="mt-1 text-sm text-gray-500">
                    Total number of times this reminder will be sent (including the first one)
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Form Actions */}
        <div class="flex justify-end space-x-4">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isLoading}
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            class="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isLoading}
          >
            {isLoading ? 'Creating...' : 'Create Reminder'}
          </button>
        </div>
      </form>
    </div>
  );
}