// Reminder template data for the Discord bot
// This module contains embedded data for reminder templates and scheduling

export interface ScheduleConfig {
  type: "once" | "daily" | "weekly" | "monthly" | "custom";
  time?: string; // HH:MM format
  timezone?: string;
  daysOfWeek?: number[]; // 0=Sunday, 1=Monday, etc.
  dayOfMonth?: number; // 1-31
  cronExpression?: string; // For custom schedules
}

export interface EscalationConfig {
  enabled: boolean;
  delayMinutes: number;
  maxAttempts: number;
  escalationTargets: string[]; // Discord user IDs
  escalationMessage?: string;
}

export interface ReminderTemplate {
  id: string;
  name: string;
  description: string;
  category: "health" | "work" | "personal" | "medication" | "appointment" | "task";
  defaultMessage: string;
  defaultSchedule: ScheduleConfig;
  escalation: EscalationConfig;
  customFields: {
    name: string;
    type: "text" | "number" | "date" | "time" | "select";
    required: boolean;
    options?: string[]; // For select type
    placeholder?: string;
  }[];
  emoji: string;
  color: string; // Hex color for UI
}

// Pre-defined reminder templates
export const reminderTemplates: ReminderTemplate[] = [
  {
    id: "medication-daily",
    name: "Daily Medication",
    description: "Reminder to take daily medication",
    category: "medication",
    defaultMessage: "💊 Time to take your {medicationName}! Don't forget to take it with {instructions}.",
    defaultSchedule: {
      type: "daily",
      time: "08:00",
      timezone: "America/New_York"
    },
    escalation: {
      enabled: true,
      delayMinutes: 15,
      maxAttempts: 3,
      escalationTargets: [],
      escalationMessage: "⚠️ {userName} hasn't acknowledged their medication reminder. Please check in!"
    },
    customFields: [
      {
        name: "medicationName",
        type: "text",
        required: true,
        placeholder: "e.g., Vitamin D, Blood pressure medication"
      },
      {
        name: "instructions",
        type: "select",
        required: true,
        options: ["food", "water", "on empty stomach", "before bed"]
      }
    ],
    emoji: "💊",
    color: "#3B82F6"
  },
  {
    id: "water-reminder",
    name: "Hydration Reminder",
    description: "Stay hydrated throughout the day",
    category: "health",
    defaultMessage: "💧 Time to drink some water! You've got this! 🌟",
    defaultSchedule: {
      type: "daily",
      time: "10:00",
      timezone: "America/New_York"
    },
    escalation: {
      enabled: false,
      delayMinutes: 0,
      maxAttempts: 1,
      escalationTargets: []
    },
    customFields: [
      {
        name: "amount",
        type: "select",
        required: false,
        options: ["8oz glass", "16oz bottle", "32oz bottle", "full water bottle"]
      }
    ],
    emoji: "💧",
    color: "#06B6D4"
  },
  {
    id: "appointment-reminder",
    name: "Appointment Reminder",
    description: "Don't miss important appointments",
    category: "appointment",
    defaultMessage: "📅 Reminder: You have a {appointmentType} appointment at {time} with {provider}. Location: {location}",
    defaultSchedule: {
      type: "once",
      time: "09:00",
      timezone: "America/New_York"
    },
    escalation: {
      enabled: true,
      delayMinutes: 30,
      maxAttempts: 2,
      escalationTargets: [],
      escalationMessage: "🚨 {userName} has an appointment coming up and hasn't acknowledged the reminder!"
    },
    customFields: [
      {
        name: "appointmentType",
        type: "text",
        required: true,
        placeholder: "e.g., Doctor, Dentist, Therapy"
      },
      {
        name: "provider",
        type: "text",
        required: true,
        placeholder: "Dr. Smith, ABC Dental Clinic"
      },
      {
        name: "location",
        type: "text",
        required: true,
        placeholder: "123 Main St, Office Suite 456"
      },
      {
        name: "time",
        type: "time",
        required: true,
        placeholder: "2:30 PM"
      }
    ],
    emoji: "📅",
    color: "#F59E0B"
  },
  {
    id: "task-deadline",
    name: "Task Deadline",
    description: "Stay on top of important deadlines",
    category: "work",
    defaultMessage: "⏰ Deadline approaching! Don't forget: {taskName} is due {when}. Priority: {priority}",
    defaultSchedule: {
      type: "once",
      time: "09:00",
      timezone: "America/New_York"
    },
    escalation: {
      enabled: true,
      delayMinutes: 60,
      maxAttempts: 2,
      escalationTargets: [],
      escalationMessage: "📋 {userName} has a deadline coming up: {taskName}"
    },
    customFields: [
      {
        name: "taskName",
        type: "text",
        required: true,
        placeholder: "Complete project report, Submit tax documents"
      },
      {
        name: "when",
        type: "text",
        required: true,
        placeholder: "tomorrow, Friday by 5 PM, end of week"
      },
      {
        name: "priority",
        type: "select",
        required: true,
        options: ["Low", "Medium", "High", "Critical"]
      }
    ],
    emoji: "⏰",
    color: "#EF4444"
  },
  {
    id: "self-care-check",
    name: "Self-Care Check-in",
    description: "Regular self-care and mental health check-ins",
    category: "personal",
    defaultMessage: "🌸 Time for a self-care moment! How are you feeling today? Remember to {activity} 💖",
    defaultSchedule: {
      type: "daily",
      time: "18:00",
      timezone: "America/New_York"
    },
    escalation: {
      enabled: false,
      delayMinutes: 0,
      maxAttempts: 1,
      escalationTargets: []
    },
    customFields: [
      {
        name: "activity",
        type: "select",
        required: false,
        options: [
          "take deep breaths",
          "stretch for 5 minutes", 
          "write in your journal",
          "call a friend",
          "go for a short walk",
          "practice gratitude"
        ]
      }
    ],
    emoji: "🌸",
    color: "#EC4899"
  }
];

// Helper function to get template by ID
export function getTemplateById(id: string): ReminderTemplate | undefined {
  return reminderTemplates.find(template => template.id === id);
}

// Helper function to get templates by category
export function getTemplatesByCategory(category: ReminderTemplate["category"]): ReminderTemplate[] {
  return reminderTemplates.filter(template => template.category === category);
}

// Helper function to get all available categories
export function getCategories(): ReminderTemplate["category"][] {
  return ["health", "work", "personal", "medication", "appointment", "task"];
}