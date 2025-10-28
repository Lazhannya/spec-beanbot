/**
 * EditReminderForm Island Component
 * Interactive form for editing existing reminders with validation
 */

import { useState } from "preact/hooks";
import type { Reminder } from "../discord-bot/types/reminder.ts";
import { DEFAULT_TIMEZONE, isValidTimezone } from "../discord-bot/lib/utils/timezone.ts";
import TimezoneSelector from "../components/TimezoneSelector.tsx";

interface EditReminderFormProps {
  reminder: Reminder;
  onSubmit?: (data: EditReminderFormData) => void;
  onCancel?: () => void;
  isLoading?: boolean;
}

export interface EditReminderFormData {
  content: string;
  targetUserId: string;
  scheduledTime: string; // ISO string
  timezone: string; // IANA timezone
  // Repeat settings
  enableRepeat: boolean;
  repeatFrequency: string;
  repeatInterval: number;
  repeatEndCondition: string;
  repeatEndDate: string;
  repeatMaxOccurrences: number;
  // Escalation settings
  enableEscalation: boolean;
  escalationUserId: string;
  escalationTimeoutMinutes: number;
}

export default function EditReminderForm({
  reminder,
  onSubmit,
  onCancel,
  isLoading = false,
}: EditReminderFormProps) {
  // Convert stored UTC time back to local timezone for datetime-local input
  const convertUtcToLocalTimeString = (utcDate: Date, timezone: string) => {
    // Format the UTC date in the target timezone
    const localDateTime = new Intl.DateTimeFormat('sv-SE', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit', 
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    }).format(utcDate);
    
    // sv-SE format is "YYYY-MM-DD HH:mm" which we need to convert to "YYYY-MM-DDTHH:mm"
    return localDateTime.replace(' ', 'T');
  };

  // Initialize form data from reminder
  const [formData, setFormData] = useState<EditReminderFormData>({
    content: reminder.content,
    targetUserId: reminder.targetUserId,
    scheduledTime: convertUtcToLocalTimeString(
      new Date(reminder.scheduledTime), 
      reminder.timezone || DEFAULT_TIMEZONE
    ),
    timezone: reminder.timezone || DEFAULT_TIMEZONE,
    enableRepeat: !!reminder.repeatRule,
    repeatFrequency: reminder.repeatRule?.frequency || "weekly",
    repeatInterval: reminder.repeatRule?.interval || 1,
    repeatEndCondition: reminder.repeatRule?.endCondition || "never",
    repeatEndDate: reminder.repeatRule?.endDate 
      ? new Date(reminder.repeatRule.endDate).toISOString().slice(0, 16)
      : "",
    repeatMaxOccurrences: reminder.repeatRule?.maxOccurrences || 10,
    enableEscalation: !!reminder.escalation?.isActive,
    escalationUserId: reminder.escalation?.secondaryUserId || "",
    escalationTimeoutMinutes: reminder.escalation?.timeoutMinutes || 60,
  });

  const [errors, setErrors] = useState<Partial<Record<keyof EditReminderFormData, string>>>({});

  // Validation
  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof EditReminderFormData, string>> = {};

    if (!formData.content.trim()) {
      newErrors.content = "Content is required";
    } else if (formData.content.length > 2000) {
      newErrors.content = "Content must be less than 2000 characters";
    }

    if (!formData.targetUserId.trim()) {
      newErrors.targetUserId = "Target user ID is required";
    } else if (!/^\d{17,19}$/.test(formData.targetUserId)) {
      newErrors.targetUserId = "Invalid Discord user ID format";
    }

    if (!formData.scheduledTime) {
      newErrors.scheduledTime = "Scheduled time is required";
    } else {
      const scheduledDate = new Date(formData.scheduledTime);
      const now = new Date();
      if (scheduledDate <= now) {
        newErrors.scheduledTime = "Scheduled time must be in the future";
      }
    }

    // Timezone validation
    if (!formData.timezone) {
      newErrors.timezone = "Timezone is required";
    } else if (!isValidTimezone(formData.timezone)) {
      newErrors.timezone = "Invalid timezone selected";
    }

    if (formData.enableEscalation) {
      if (!formData.escalationUserId.trim()) {
        newErrors.escalationUserId = "Escalation user ID required";
      } else if (!/^\d{17,19}$/.test(formData.escalationUserId)) {
        newErrors.escalationUserId = "Invalid Discord user ID format";
      } else if (formData.escalationUserId === formData.targetUserId) {
        newErrors.escalationUserId = "Escalation user must be different from target user";
      }

      if (formData.escalationTimeoutMinutes < 1 || formData.escalationTimeoutMinutes > 10080) {
        newErrors.escalationTimeoutMinutes = "Timeout must be between 1-10080 minutes";
      }
    }

    if (formData.enableRepeat) {
      if (formData.repeatInterval < 1) {
        newErrors.repeatInterval = "Interval must be at least 1";
      }

      if (formData.repeatEndCondition === "date_based" && !formData.repeatEndDate) {
        newErrors.repeatEndDate = "End date required for date-based repeat";
      }

      if (formData.repeatEndCondition === "count_based" && formData.repeatMaxOccurrences < 1) {
        newErrors.repeatMaxOccurrences = "Max occurrences must be at least 1";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: Event) => {
    e.preventDefault();
    if (validateForm() && onSubmit) {
      onSubmit(formData);
    }
  };

  const handleChange = (field: keyof EditReminderFormData, value: string | number | boolean) => {
    setFormData(prev => {
      const newData = { ...prev, [field]: value };
      
      // Handle timezone change with time conversion
      if (field === 'timezone' && typeof value === 'string' && prev.scheduledTime) {
        try {
          // Parse the current datetime-local value as if it's in the previous timezone
          const currentTime = new Date(prev.scheduledTime);
          
          // Create a date in the previous timezone
          const utcTime = new Date(currentTime.toLocaleString('en-US', { timeZone: 'UTC' }));
          
          // Convert to new timezone
          const convertedTime = convertUtcToLocalTimeString(utcTime, value);
          newData.scheduledTime = convertedTime;
        } catch (error) {
          console.warn('Failed to convert timezone:', error);
          // Keep the original time if conversion fails
        }
      }
      
      return newData;
    });
    
    // Clear error when user types
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }

    // Additional validation for timezone changes
    if (field === 'timezone' && typeof value === 'string') {
      // Log timezone changes for debugging
      if (formData.timezone !== value) {
        console.log('[TIMEZONE] User changed timezone in edit form', {
          from: formData.timezone,
          to: value,
          scheduledTime: formData.scheduledTime,
          originalTime: formData.scheduledTime
        });
      }
      
      if (!isValidTimezone(value)) {
        console.warn('[TIMEZONE] Invalid timezone selected in edit form', { timezone: value });
        setErrors(prev => ({
          ...prev,
          timezone: "Invalid timezone selected"
        }));
      }
    }
  };

  return (
    <form onSubmit={handleSubmit} class="space-y-6">
      {/* Status Warning */}
      {reminder.status !== "pending" && (
        <div class="bg-yellow-50 border border-yellow-200 rounded-md p-4">
          <p class="text-yellow-800">
            <strong>Note:</strong> This reminder has status "{reminder.status}". Only pending reminders can be fully edited.
          </p>
        </div>
      )}

      {/* Content */}
      <div>
        <label for="content" class="block text-sm font-medium text-gray-700 mb-2">
          Reminder Content *
        </label>
        <textarea
          id="content"
          value={formData.content}
          onInput={(e) => handleChange("content", (e.target as HTMLTextAreaElement).value)}
          rows={4}
          class={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 ${
            errors.content ? "border-red-500" : "border-gray-300"
          }`}
          placeholder="Enter reminder message..."
          disabled={isLoading}
        />
        {errors.content && <p class="mt-1 text-sm text-red-600">{errors.content}</p>}
        <p class="mt-1 text-sm text-gray-500">{formData.content.length}/2000 characters</p>
      </div>

      {/* Target User */}
      <div>
        <label for="targetUserId" class="block text-sm font-medium text-gray-700 mb-2">
          Target Discord User ID *
        </label>
        <input
          type="text"
          id="targetUserId"
          value={formData.targetUserId}
          onInput={(e) => handleChange("targetUserId", (e.target as HTMLInputElement).value)}
          class={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 ${
            errors.targetUserId ? "border-red-500" : "border-gray-300"
          }`}
          placeholder="123456789012345678"
          disabled={isLoading}
        />
        {errors.targetUserId && <p class="mt-1 text-sm text-red-600">{errors.targetUserId}</p>}
      </div>

      {/* Scheduled Time */}
      <div>
        <label for="scheduledTime" class="block text-sm font-medium text-gray-700 mb-2">
          Scheduled Time *
        </label>
        <input
          type="datetime-local"
          id="scheduledTime"
          value={formData.scheduledTime}
          onInput={(e) => handleChange("scheduledTime", (e.target as HTMLInputElement).value)}
          class={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 ${
            errors.scheduledTime ? "border-red-500" : "border-gray-300"
          }`}
          disabled={isLoading}
        />
        {errors.scheduledTime && <p class="mt-1 text-sm text-red-600">{errors.scheduledTime}</p>}
      </div>

      {/* Timezone */}
      <div>
        <TimezoneSelector
          value={formData.timezone}
          onChange={(timezone) => handleChange("timezone", timezone)}
          disabled={isLoading}
          label="Timezone"
          showLabel
          className="w-full"
        />
        <p class="mt-1 text-sm text-blue-600">
          💡 Changing timezone will automatically convert the scheduled time to maintain the same moment in time.
        </p>
      </div>

      {/* Repeat Configuration */}
      <div class="border-t pt-4">
        <label class="flex items-center space-x-2 mb-4">
          <input
            type="checkbox"
            checked={formData.enableRepeat}
            onChange={(e) => handleChange("enableRepeat", (e.target as HTMLInputElement).checked)}
            class="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            disabled={isLoading}
          />
          <span class="text-sm font-medium text-gray-700">Enable Recurring Reminder</span>
        </label>

        {formData.enableRepeat && (
          <div class="space-y-4 ml-6 p-4 bg-gray-50 rounded-md">
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label for="repeatFrequency" class="block text-sm font-medium text-gray-700 mb-2">
                  Frequency
                </label>
                <select
                  id="repeatFrequency"
                  value={formData.repeatFrequency}
                  onChange={(e) => handleChange("repeatFrequency", (e.target as HTMLSelectElement).value)}
                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                  disabled={isLoading}
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                </select>
              </div>

              <div>
                <label for="repeatInterval" class="block text-sm font-medium text-gray-700 mb-2">
                  Every X {formData.repeatFrequency}
                </label>
                <input
                  type="number"
                  id="repeatInterval"
                  value={formData.repeatInterval}
                  onInput={(e) => handleChange("repeatInterval", parseInt((e.target as HTMLInputElement).value) || 1)}
                  min="1"
                  class={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 ${
                    errors.repeatInterval ? "border-red-500" : "border-gray-300"
                  }`}
                  disabled={isLoading}
                />
                {errors.repeatInterval && <p class="mt-1 text-sm text-red-600">{errors.repeatInterval}</p>}
              </div>
            </div>

            <div>
              <label for="repeatEndCondition" class="block text-sm font-medium text-gray-700 mb-2">
                End Condition
              </label>
              <select
                id="repeatEndCondition"
                value={formData.repeatEndCondition}
                onChange={(e) => handleChange("repeatEndCondition", (e.target as HTMLSelectElement).value)}
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                disabled={isLoading}
              >
                <option value="never">Never (until manually stopped)</option>
                <option value="date_based">Until specific date</option>
                <option value="count_based">After number of occurrences</option>
              </select>
            </div>

            {formData.repeatEndCondition === "date_based" && (
              <div>
                <label for="repeatEndDate" class="block text-sm font-medium text-gray-700 mb-2">
                  End Date
                </label>
                <input
                  type="datetime-local"
                  id="repeatEndDate"
                  value={formData.repeatEndDate}
                  onInput={(e) => handleChange("repeatEndDate", (e.target as HTMLInputElement).value)}
                  class={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 ${
                    errors.repeatEndDate ? "border-red-500" : "border-gray-300"
                  }`}
                  disabled={isLoading}
                />
                {errors.repeatEndDate && <p class="mt-1 text-sm text-red-600">{errors.repeatEndDate}</p>}
              </div>
            )}

            {formData.repeatEndCondition === "count_based" && (
              <div>
                <label for="repeatMaxOccurrences" class="block text-sm font-medium text-gray-700 mb-2">
                  Maximum Occurrences
                </label>
                <input
                  type="number"
                  id="repeatMaxOccurrences"
                  value={formData.repeatMaxOccurrences}
                  onInput={(e) => handleChange("repeatMaxOccurrences", parseInt((e.target as HTMLInputElement).value) || 10)}
                  min="1"
                  class={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 ${
                    errors.repeatMaxOccurrences ? "border-red-500" : "border-gray-300"
                  }`}
                  disabled={isLoading}
                />
                {errors.repeatMaxOccurrences && <p class="mt-1 text-sm text-red-600">{errors.repeatMaxOccurrences}</p>}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Escalation Configuration */}
      <div class="border-t pt-4">
        <label class="flex items-center space-x-2 mb-4">
          <input
            type="checkbox"
            checked={formData.enableEscalation}
            onChange={(e) => handleChange("enableEscalation", (e.target as HTMLInputElement).checked)}
            class="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            disabled={isLoading}
          />
          <span class="text-sm font-medium text-gray-700">Enable Escalation</span>
        </label>

        {formData.enableEscalation && (
          <div class="space-y-4 ml-6 p-4 bg-gray-50 rounded-md">
            <div>
              <label for="escalationUserId" class="block text-sm font-medium text-gray-700 mb-2">
                Secondary User ID *
              </label>
              <input
                type="text"
                id="escalationUserId"
                value={formData.escalationUserId}
                onInput={(e) => handleChange("escalationUserId", (e.target as HTMLInputElement).value)}
                class={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 ${
                  errors.escalationUserId ? "border-red-500" : "border-gray-300"
                }`}
                placeholder="123456789012345678"
                disabled={isLoading}
              />
              {errors.escalationUserId && <p class="mt-1 text-sm text-red-600">{errors.escalationUserId}</p>}
            </div>

            <div>
              <label for="escalationTimeoutMinutes" class="block text-sm font-medium text-gray-700 mb-2">
                Timeout (minutes) *
              </label>
              <input
                type="number"
                id="escalationTimeoutMinutes"
                value={formData.escalationTimeoutMinutes}
                onInput={(e) => handleChange("escalationTimeoutMinutes", parseInt((e.target as HTMLInputElement).value) || 60)}
                min="1"
                max="10080"
                class={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 ${
                  errors.escalationTimeoutMinutes ? "border-red-500" : "border-gray-300"
                }`}
                disabled={isLoading}
              />
              {errors.escalationTimeoutMinutes && <p class="mt-1 text-sm text-red-600">{errors.escalationTimeoutMinutes}</p>}
              <p class="mt-1 text-sm text-gray-500">Time before escalating to secondary user</p>
            </div>
          </div>
        )}
      </div>

      {/* Form Actions */}
      <div class="flex justify-end gap-4 pt-4 border-t">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            class="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={isLoading || reminder.status !== "pending"}
          class="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? "Saving..." : "Save Changes"}
        </button>
      </div>

      {reminder.status !== "pending" && (
        <p class="text-sm text-gray-500 text-center">
          Only pending reminders can be edited
        </p>
      )}
    </form>
  );
}
