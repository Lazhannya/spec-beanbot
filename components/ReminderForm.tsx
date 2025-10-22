/**
 * ReminderForm Component
 * Form for creating new reminders with validation and escalation options
 */

import { useState } from "preact/hooks";
import { JSX } from "preact";

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
  enableEscalation: boolean;
  escalationUserId: string;
  escalationTimeoutMinutes: number;
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
    enableEscalation: initialData?.enableEscalation || false,
    escalationUserId: initialData?.escalationUserId || "",
    escalationTimeoutMinutes: initialData?.escalationTimeoutMinutes || 60,
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
      newErrors.content = "Content cannot exceed 2000 characters";
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
      
      const maxFuture = new Date();
      maxFuture.setFullYear(maxFuture.getFullYear() + 1);
      if (scheduledDate > maxFuture) {
        newErrors.scheduledTime = "Scheduled time cannot be more than 1 year in the future";
      }
    }

    // Escalation validation
    if (formData.enableEscalation) {
      if (!formData.escalationUserId.trim()) {
        newErrors.escalationUserId = "Escalation user ID is required when escalation is enabled";
      } else if (!/^\d{17,19}$/.test(formData.escalationUserId)) {
        newErrors.escalationUserId = "Invalid Discord user ID format";
      } else if (formData.escalationUserId === formData.targetUserId) {
        newErrors.escalationUserId = "Escalation user must be different from target user";
      }

      if (formData.escalationTimeoutMinutes < 1 || formData.escalationTimeoutMinutes > 10080) {
        newErrors.escalationTimeoutMinutes = "Timeout must be between 1 minute and 1 week";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = (e: JSX.TargetedEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (validateForm() && onSubmit) {
      onSubmit(formData);
    }
  };

  // Handle field changes
  const handleChange = (field: keyof ReminderFormData, value: string | boolean | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  // Get default datetime value (1 hour from now)
  const getDefaultDateTime = (): string => {
    const date = new Date();
    date.setHours(date.getHours() + 1);
    return date.toISOString().slice(0, 16);
  };

  return (
    <form onSubmit={handleSubmit} class="space-y-6 max-w-2xl">
      {/* Content Field */}
      <div>
        <label htmlFor="content" class="block text-sm font-medium text-gray-700 mb-2">
          Reminder Content *
        </label>
        <textarea
          id="content"
          rows={4}
          class={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${ 
            errors.content ? 'border-red-500' : 'border-gray-300'
          }`}
          placeholder="Enter the reminder message..."
          value={formData.content}
          onInput={(e) => handleChange('content', (e.target as HTMLTextAreaElement).value)}
          disabled={isLoading}
        />
        {errors.content && (
          <p class="mt-1 text-sm text-red-600">{errors.content}</p>
        )}
        <p class="mt-1 text-sm text-gray-500">
          {formData.content.length}/2000 characters
        </p>
      </div>

      {/* Target User Field */}
      <div>
        <label htmlFor="targetUserId" class="block text-sm font-medium text-gray-700 mb-2">
          Target User ID *
        </label>
        <input
          type="text"
          id="targetUserId"
          class={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            errors.targetUserId ? 'border-red-500' : 'border-gray-300'
          }`}
          placeholder="Discord user ID (e.g., 123456789012345678)"
          value={formData.targetUserId}
          onInput={(e) => handleChange('targetUserId', (e.target as HTMLInputElement).value)}
          disabled={isLoading}
        />
        {errors.targetUserId && (
          <p class="mt-1 text-sm text-red-600">{errors.targetUserId}</p>
        )}
        <p class="mt-1 text-sm text-gray-500">
          17-19 digit Discord user ID
        </p>
      </div>

      {/* Scheduled Time Field */}
      <div>
        <label htmlFor="scheduledTime" class="block text-sm font-medium text-gray-700 mb-2">
          Scheduled Time *
        </label>
        <input
          type="datetime-local"
          id="scheduledTime"
          class={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            errors.scheduledTime ? 'border-red-500' : 'border-gray-300'
          }`}
          value={formData.scheduledTime || getDefaultDateTime()}
          onInput={(e) => handleChange('scheduledTime', (e.target as HTMLInputElement).value)}
          disabled={isLoading}
        />
        {errors.scheduledTime && (
          <p class="mt-1 text-sm text-red-600">{errors.scheduledTime}</p>
        )}
      </div>

      {/* Escalation Toggle */}
      <div class="border-t pt-6">
        <div class="flex items-center mb-4">
          <input
            type="checkbox"
            id="enableEscalation"
            class="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            checked={formData.enableEscalation}
            onChange={(e) => handleChange('enableEscalation', (e.target as HTMLInputElement).checked)}
            disabled={isLoading}
          />
          <label htmlFor="enableEscalation" class="ml-2 text-sm font-medium text-gray-700">
            Enable Escalation
          </label>
        </div>
        <p class="text-sm text-gray-500 mb-4">
          Automatically escalate to another user if no response is received
        </p>

        {/* Escalation Fields */}
        {formData.enableEscalation && (
          <div class="space-y-4 pl-6 border-l-2 border-gray-200">
            {/* Escalation User */}
            <div>
              <label htmlFor="escalationUserId" class="block text-sm font-medium text-gray-700 mb-2">
                Escalation User ID *
              </label>
              <input
                type="text"
                id="escalationUserId"
                class={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.escalationUserId ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Discord user ID for escalation"
                value={formData.escalationUserId}
                onInput={(e) => handleChange('escalationUserId', (e.target as HTMLInputElement).value)}
                disabled={isLoading}
              />
              {errors.escalationUserId && (
                <p class="mt-1 text-sm text-red-600">{errors.escalationUserId}</p>
              )}
            </div>

            {/* Escalation Timeout */}
            <div>
              <label htmlFor="escalationTimeout" class="block text-sm font-medium text-gray-700 mb-2">
                Escalation Timeout (minutes) *
              </label>
              <input
                type="number"
                id="escalationTimeout"
                min="1"
                max="10080"
                class={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.escalationTimeoutMinutes ? 'border-red-500' : 'border-gray-300'
                }`}
                value={formData.escalationTimeoutMinutes}
                onInput={(e) => handleChange('escalationTimeoutMinutes', parseInt((e.target as HTMLInputElement).value) || 0)}
                disabled={isLoading}
              />
              {errors.escalationTimeoutMinutes && (
                <p class="mt-1 text-sm text-red-600">{errors.escalationTimeoutMinutes}</p>
              )}
              <p class="mt-1 text-sm text-gray-500">
                Time to wait before escalating (1-10080 minutes)
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Form Actions */}
      <div class="flex justify-end space-x-4 pt-6 border-t">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            disabled={isLoading}
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          class="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={isLoading}
        >
          {isLoading ? 'Creating...' : 'Create Reminder'}
        </button>
      </div>
    </form>
  );
}