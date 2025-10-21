// Text pattern data for the Discord bot
// This module contains embedded data for text pattern recognition and automated responses

export interface TextPattern {
  id: string;
  name: string;
  description: string;
  category: "help" | "emergency" | "greeting" | "status" | "keyword" | "question" | "sentiment";
  patterns: string[]; // Regex patterns or simple text matches
  isRegex: boolean;
  caseSensitive: boolean;
  wholeWordsOnly: boolean;
  enabled: boolean;
  response: {
    type: "message" | "reaction" | "webhook" | "both";
    message?: string;
    reaction?: string; // Unicode emoji
    webhookAction?: string; // Action to send to n8n
  };
  priority: number; // Higher number = higher priority
  cooldownMinutes: number; // Prevent spam
  restrictToChannels?: string[]; // Discord channel IDs, empty = all channels
  restrictToUsers?: string[]; // Discord user IDs, empty = all users
  metadata: {
    createdAt: string;
    lastTriggered?: string;
    triggerCount: number;
    isActive: boolean;
  };
}

// Pre-defined text patterns for automated responses
export const textPatterns: TextPattern[] = [
  {
    id: "help-request",
    name: "Help Request",
    description: "Detects when someone asks for help",
    category: "help",
    patterns: [
      "\\b(help|assist|support)\\b",
      "\\b(can you help|need help|help me)\\b",
      "\\b(how do i|how to)\\b"
    ],
    isRegex: true,
    caseSensitive: false,
    wholeWordsOnly: false,
    enabled: true,
    response: {
      type: "both",
      message: "👋 I'm here to help! What can I assist you with? You can also use `/help` to see available commands.",
      reaction: "🤝",
      webhookAction: "help_request"
    },
    priority: 8,
    cooldownMinutes: 5,
    restrictToChannels: [],
    restrictToUsers: [],
    metadata: {
      createdAt: "2024-01-01T00:00:00.000Z",
      triggerCount: 0,
      isActive: true
    }
  },
  {
    id: "emergency-keywords",
    name: "Emergency Keywords",
    description: "Detects emergency or urgent situations",
    category: "emergency",
    patterns: [
      "\\b(emergency|urgent|asap|911)\\b",
      "\\b(crisis|critical|immediate)\\b",
      "\\b(help me|panic|scared)\\b"
    ],
    isRegex: true,
    caseSensitive: false,
    wholeWordsOnly: false,
    enabled: true,
    response: {
      type: "webhook",
      webhookAction: "emergency_alert"
    },
    priority: 10,
    cooldownMinutes: 0, // No cooldown for emergencies
    restrictToChannels: [],
    restrictToUsers: [],
    metadata: {
      createdAt: "2024-01-01T00:00:00.000Z",
      triggerCount: 0,
      isActive: true
    }
  },
  {
    id: "greeting-responses",
    name: "Greeting Responses",
    description: "Responds to common greetings",
    category: "greeting",
    patterns: [
      "\\b(hello|hi|hey|good morning|good afternoon|good evening)\\b",
      "\\b(whats up|how are you|howdy)\\b"
    ],
    isRegex: true,
    caseSensitive: false,
    wholeWordsOnly: false,
    enabled: true,
    response: {
      type: "reaction",
      reaction: "👋"
    },
    priority: 3,
    cooldownMinutes: 30,
    restrictToChannels: [],
    restrictToUsers: [],
    metadata: {
      createdAt: "2024-01-01T00:00:00.000Z",
      triggerCount: 0,
      isActive: true
    }
  },
  {
    id: "gratitude-response",
    name: "Gratitude Response",
    description: "Responds to thanks and appreciation",
    category: "sentiment",
    patterns: [
      "\\b(thank you|thanks|thx|appreciate)\\b",
      "\\b(grateful|awesome|amazing|great job)\\b"
    ],
    isRegex: true,
    caseSensitive: false,
    wholeWordsOnly: false,
    enabled: true,
    response: {
      type: "reaction",
      reaction: "❤️"
    },
    priority: 4,
    cooldownMinutes: 15,
    restrictToChannels: [],
    restrictToUsers: [],
    metadata: {
      createdAt: "2024-01-01T00:00:00.000Z",
      triggerCount: 0,
      isActive: true
    }
  },
  {
    id: "bot-status-check",
    name: "Bot Status Check",
    description: "Responds to status inquiries about the bot",
    category: "status",
    patterns: [
      "\\b(bot status|are you online|are you working)\\b",
      "\\b(ping|alive|respond|working)\\b"
    ],
    isRegex: true,
    caseSensitive: false,
    wholeWordsOnly: false,
    enabled: true,
    response: {
      type: "message",
      message: "🤖 I'm online and ready to help! Current status: Active ✅"
    },
    priority: 5,
    cooldownMinutes: 10,
    restrictToChannels: [],
    restrictToUsers: [],
    metadata: {
      createdAt: "2024-01-01T00:00:00.000Z",
      triggerCount: 0,
      isActive: true
    }
  },
  {
    id: "medication-keywords",
    name: "Medication Keywords",
    description: "Detects medication-related discussions",
    category: "keyword",
    patterns: [
      "\\b(medication|pills|prescription|dose)\\b",
      "\\b(forgot to take|missed dose|medicine)\\b",
      "\\b(pharmacy|refill|side effects)\\b"
    ],
    isRegex: true,
    caseSensitive: false,
    wholeWordsOnly: false,
    enabled: true,
    response: {
      type: "webhook",
      webhookAction: "medication_discussion"
    },
    priority: 7,
    cooldownMinutes: 60,
    restrictToChannels: [],
    restrictToUsers: [],
    metadata: {
      createdAt: "2024-01-01T00:00:00.000Z",
      triggerCount: 0,
      isActive: true
    }
  },
  {
    id: "reminder-keywords",
    name: "Reminder Keywords",
    description: "Detects when someone wants to set up reminders",
    category: "keyword",
    patterns: [
      "\\b(remind me|set reminder|don't forget)\\b",
      "\\b(schedule|appointment|meeting)\\b",
      "\\b(deadline|due date|task)\\b"
    ],
    isRegex: true,
    caseSensitive: false,
    wholeWordsOnly: false,
    enabled: true,
    response: {
      type: "both",
      message: "📅 I can help you set up reminders! Use the web interface or mention me with your reminder details.",
      reaction: "📅",
      webhookAction: "reminder_request"
    },
    priority: 6,
    cooldownMinutes: 30,
    restrictToChannels: [],
    restrictToUsers: [],
    metadata: {
      createdAt: "2024-01-01T00:00:00.000Z",
      triggerCount: 0,
      isActive: true
    }
  },
  {
    id: "question-detection",
    name: "Question Detection",
    description: "Detects questions that might need forwarding",
    category: "question",
    patterns: [
      "\\?$",
      "\\b(what|how|why|when|where|who)\\b.*\\?",
      "\\b(can you|could you|would you)\\b"
    ],
    isRegex: true,
    caseSensitive: false,
    wholeWordsOnly: false,
    enabled: true,
    response: {
      type: "webhook",
      webhookAction: "question_detected"
    },
    priority: 2,
    cooldownMinutes: 5,
    restrictToChannels: [],
    restrictToUsers: [],
    metadata: {
      createdAt: "2024-01-01T00:00:00.000Z",
      triggerCount: 0,
      isActive: true
    }
  }
];

// Helper function to get pattern by ID
export function getPatternById(id: string): TextPattern | undefined {
  return textPatterns.find(pattern => pattern.id === id);
}

// Helper function to get patterns by category
export function getPatternsByCategory(category: TextPattern["category"]): TextPattern[] {
  return textPatterns.filter(pattern => pattern.category === category);
}

// Helper function to get enabled patterns sorted by priority
export function getEnabledPatterns(): TextPattern[] {
  return textPatterns
    .filter(pattern => pattern.enabled && pattern.metadata.isActive)
    .sort((a, b) => b.priority - a.priority);
}

// Helper function to get all available categories
export function getPatternCategories(): TextPattern["category"][] {
  return ["help", "emergency", "greeting", "status", "keyword", "question", "sentiment"];
}

// Helper function to check if a pattern should be triggered (respecting cooldown)
export function canTriggerPattern(pattern: TextPattern): boolean {
  if (!pattern.enabled || !pattern.metadata.isActive) {
    return false;
  }

  if (pattern.cooldownMinutes === 0) {
    return true; // No cooldown
  }

  if (!pattern.metadata.lastTriggered) {
    return true; // Never triggered before
  }

  const lastTriggered = new Date(pattern.metadata.lastTriggered);
  const now = new Date();
  const cooldownMs = pattern.cooldownMinutes * 60 * 1000;

  return (now.getTime() - lastTriggered.getTime()) >= cooldownMs;
}

// Helper function to update pattern trigger metadata
export function updatePatternTrigger(patternId: string): void {
  const pattern = getPatternById(patternId);
  if (pattern) {
    pattern.metadata.lastTriggered = new Date().toISOString();
    pattern.metadata.triggerCount += 1;
  }
}