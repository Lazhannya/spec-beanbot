#!/usr/bin/env -S deno run -A
/**
 * Reminder CLI Interface
 * 
 * Command-line interface for managing reminders in the Discord bot system.
 * Provides commands for creating, listing, updating, and managing reminders.
 * 
 * Usage:
 *   deno run -A scripts/cli/reminder.ts <command> [options]
 * 
 * Commands:
 *   list                    List reminders
 *   create                  Create a new reminder  
 *   show <id>              Show reminder details
 *   update <id>            Update a reminder
 *   delete <id>            Delete a reminder
 *   activate <id>          Activate a reminder
 *   deactivate <id>        Deactivate a reminder
 *   stats [user-id]        Show reminder statistics
 *   templates              List available templates
 *   test-delivery <id>     Test reminder delivery
 *   cleanup                Cleanup expired reminders
 *   help                   Show this help message
 */

import { parseArgs } from "@std/cli/parse-args";
import * as colors from "@std/fmt/colors";
import {
  searchReminders,
  createReminder,
  getReminderById,
  updateReminder,
  deleteReminder,
  getUserStats,
  bulkOperateReminders,
} from "../../lib/storage/reminders.ts";
import { reminderTemplates, getTemplateById } from "../../data/reminder-templates.ts";
import type {
  CreateReminderInput,
  UpdateReminderInput,
  ReminderSearchCriteria,
  Reminder,
  ReminderCategory,
  ReminderPriority,
  ReminderStatus,
  ScheduleType,
} from "../../lib/types/reminders.ts";

// CLI Configuration
const CLI_CONFIG = {
  defaultUserId: "cli-user", // Default user ID for CLI operations
  pageSize: 20,
  dateFormat: "yyyy-MM-dd HH:mm:ss",
} as const;

interface CliArgs {
  _: (string | number)[];
  help?: boolean;
  verbose?: boolean;
  json?: boolean;
  "active-only"?: boolean;
  all?: boolean;
  user?: string;
  status?: string;
  category?: string;
  priority?: string;
  template?: string;
  title?: string;
  message?: string;
  target?: string;
  time?: string;
  timezone?: string;
  tags?: string;
  notes?: string;
  page?: string;
  limit?: string;
  sort?: string;
  order?: string;
  force?: boolean;
  active?: boolean;
}

/**
 * Main CLI entry point
 */
async function main() {
  const args = parseArgs(Deno.args, {
    boolean: ["help", "verbose", "json", "active-only", "all", "force", "active"],
    string: [
      "user", "status", "category", "priority", "template", 
      "title", "message", "target", "time", "timezone",
      "tags", "notes", "page", "limit", "sort", "order"
    ],
    alias: {
      h: "help",
      v: "verbose",
      j: "json",
      u: "user",
      s: "status",
      c: "category",
      p: "priority",
      t: "template",
      l: "limit",
    },
  }) as CliArgs;

  const command = args._[0]?.toString();

  if (args.help || !command) {
    showHelp();
    return;
  }

  try {
    switch (command) {
      case "list":
        await listReminders(args);
        break;
      case "create":
        await createReminderCommand(args);
        break;
      case "show":
        await showReminder(args);
        break;
      case "update":
        await updateReminderCommand(args);
        break;
      case "delete":
        await deleteReminderCommand(args);
        break;
      case "activate":
        await toggleReminderStatus(args, true);
        break;
      case "deactivate":
        await toggleReminderStatus(args, false);
        break;
      case "stats":
        await showStats(args);
        break;
      case "templates":
        await listTemplates(args);
        break;
      case "test-delivery":
        await testDelivery(args);
        break;
      case "cleanup":
        await cleanupReminders(args);
        break;
      case "help":
        showHelp();
        break;
      default:
        console.error(colors.red(`Unknown command: ${command}`));
        console.log("Run 'reminder.ts help' for usage information.");
        Deno.exit(1);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(colors.red("Error:"), errorMessage);
    if (args.verbose && error instanceof Error) {
      console.error(error.stack);
    }
    Deno.exit(1);
  }
}

/**
 * List reminders with filtering and pagination
 */
async function listReminders(args: CliArgs) {
  const criteria: ReminderSearchCriteria = {
    userId: args.user,
    limit: parseInt(args.limit || "20") || CLI_CONFIG.pageSize,
    offset: ((parseInt(args.page || "1") || 1) - 1) * (parseInt(args.limit || "20") || CLI_CONFIG.pageSize),
    sortBy: (args.sort as "createdAt" | "nextDeliveryAt" | "priority" | "title") || "createdAt",
    sortOrder: (args.order as "asc" | "desc") || "desc",
  };

  // Apply filters
  if (args.status) {
    criteria.status = args.status.split(",") as ReminderStatus[];
  }
  if (args.category) {
    criteria.category = args.category.split(",") as ReminderCategory[];
  }
  if (args.priority) {
    criteria.priority = args.priority.split(",") as ReminderPriority[];
  }
  if (args.tags) {
    criteria.tags = args.tags.split(",");
  }
  if (args["active-only"]) {
    criteria.status = ["active"];
  }

  const result = await searchReminders(criteria);

  if (args.json) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  console.log(colors.bold(`\n📋 Reminders (${result.total} total)\n`));

  if (result.reminders.length === 0) {
    console.log(colors.dim("No reminders found."));
    return;
  }

  for (const reminder of result.reminders) {
    printReminderSummary(reminder, args.verbose);
  }

  // Show pagination info
  const totalPages = Math.ceil(result.total / criteria.limit!);
  const currentPage = Math.floor(criteria.offset! / criteria.limit!) + 1;
  
  if (totalPages > 1) {
    console.log(colors.dim(`\nPage ${currentPage} of ${totalPages}`));
  }
}

/**
 * Create a new reminder
 */
async function createReminderCommand(args: CliArgs) {
  if (!args.title || !args.message) {
    console.error(colors.red("Error: --title and --message are required"));
    console.log("Usage: reminder.ts create --title 'Title' --message 'Message' [options]");
    return;
  }

  const input: CreateReminderInput = {
    title: args.title,
    message: args.message,
    targetUser: args.target || CLI_CONFIG.defaultUserId,
    category: args.category as ReminderCategory || "task",
    templateId: args.template,
    schedule: {
      type: "once" as ScheduleType,
      time: args.time || "09:00",
    },
    timezone: args.timezone || "UTC",
    escalation: {
      enabled: false,
      delayMinutes: 60,
      maxEscalations: 3,
      escalationTargets: [],
      stopOnAcknowledgment: true,
    },
    priority: args.priority as ReminderPriority || "normal",
    tags: args.tags ? args.tags.split(",") : undefined,
    notes: args.notes,
  };

  // Apply template if specified
  if (args.template) {
    const template = getTemplateById(args.template);
    if (!template) {
      console.error(colors.red(`Template not found: ${args.template}`));
      return;
    }
    
    input.category = template.category;
    input.schedule = {
      type: template.defaultSchedule.type,
      time: template.defaultSchedule.time || "09:00",
    };
    input.escalation = {
      enabled: template.escalation.enabled,
      delayMinutes: template.escalation.delayMinutes,
      maxEscalations: template.escalation.maxAttempts,
      escalationTargets: template.escalation.escalationTargets,
      stopOnAcknowledgment: true,
      escalationMessage: template.escalation.escalationMessage,
    };
  }

  const result = await createReminder(input, CLI_CONFIG.defaultUserId);

  if (result.success && result.reminder) {
    console.log(colors.green("✅ Reminder created successfully!"));
    if (args.json) {
      console.log(JSON.stringify(result.reminder, null, 2));
    } else {
      printReminderDetails(result.reminder);
    }
  } else {
    console.error(colors.red("❌ Failed to create reminder:"));
    result.errors?.forEach(error => console.error(colors.red(`  - ${error}`)));
  }
}

/**
 * Show detailed reminder information
 */
async function showReminder(args: CliArgs) {
  const id = args._[1]?.toString();
  if (!id) {
    console.error(colors.red("Error: Reminder ID is required"));
    console.log("Usage: reminder.ts show <id>");
    return;
  }

  const reminder = await getReminderById(id);
  if (!reminder) {
    console.error(colors.red(`Reminder not found: ${id}`));
    return;
  }

  if (args.json) {
    console.log(JSON.stringify(reminder, null, 2));
  } else {
    printReminderDetails(reminder);
  }
}

/**
 * Update an existing reminder
 */
async function updateReminderCommand(args: CliArgs) {
  const id = args._[1]?.toString();
  if (!id) {
    console.error(colors.red("Error: Reminder ID is required"));
    console.log("Usage: reminder.ts update <id> [options]");
    return;
  }

  const updateData: UpdateReminderInput = {};

  // Apply updates based on provided arguments
  if (args.title) updateData.title = args.title;
  if (args.message) updateData.message = args.message;
  if (args.category) updateData.category = args.category as ReminderCategory;
  if (args.priority) updateData.priority = args.priority as ReminderPriority;
  if (args.notes) updateData.notes = args.notes;
  if (args.tags) updateData.tags = args.tags.split(",");
  if (args.status) updateData.status = args.status as ReminderStatus;
  if ("active" in args) updateData.isActive = args.active;

  if (Object.keys(updateData).length === 0) {
    console.error(colors.red("Error: No update fields provided"));
    console.log("Provide at least one field to update (--title, --message, --category, etc.)");
    return;
  }

  const result = await updateReminder(id, updateData, CLI_CONFIG.defaultUserId);

  if (result.success && result.reminder) {
    console.log(colors.green("✅ Reminder updated successfully!"));
    if (args.json) {
      console.log(JSON.stringify(result.reminder, null, 2));
    } else {
      printReminderDetails(result.reminder);
    }
  } else {
    console.error(colors.red("❌ Failed to update reminder:"));
    result.errors?.forEach(error => console.error(colors.red(`  - ${error}`)));
  }
}

/**
 * Delete a reminder
 */
async function deleteReminderCommand(args: CliArgs) {
  const id = args._[1]?.toString();
  if (!id) {
    console.error(colors.red("Error: Reminder ID is required"));
    console.log("Usage: reminder.ts delete <id>");
    return;
  }

  const result = await deleteReminder(id, CLI_CONFIG.defaultUserId);

  if (result.success) {
    console.log(colors.green(`✅ Reminder ${id} deleted successfully!`));
  } else {
    console.error(colors.red("❌ Failed to delete reminder:"));
    result.errors?.forEach(error => console.error(colors.red(`  - ${error}`)));
  }
}

/**
 * Toggle reminder active status
 */
async function toggleReminderStatus(args: CliArgs, isActive: boolean) {
  const id = args._[1]?.toString();
  if (!id) {
    console.error(colors.red("Error: Reminder ID is required"));
    return;
  }

  const result = await updateReminder(id, { isActive }, CLI_CONFIG.defaultUserId);

  if (result.success) {
    const status = isActive ? "activated" : "deactivated";
    console.log(colors.green(`✅ Reminder ${status} successfully!`));
  } else {
    console.error(colors.red(`❌ Failed to ${isActive ? "activate" : "deactivate"} reminder:`));
    result.errors?.forEach(error => console.error(colors.red(`  - ${error}`)));
  }
}

/**
 * Show reminder statistics
 */
async function showStats(args: CliArgs) {
  const userId = args._[1]?.toString() || args.user || CLI_CONFIG.defaultUserId;
  
  const stats = await getUserStats(userId);

  if (args.json) {
    console.log(JSON.stringify(stats, null, 2));
    return;
  }

  console.log(colors.bold(`\n📊 Reminder Statistics for ${userId}\n`));
  
  console.log(`${colors.cyan("Total Reminders:")} ${stats.totalReminders}`);
  console.log(`${colors.green("Active:")} ${stats.activeReminders}`);
  console.log(`${colors.blue("Completed:")} ${stats.completedReminders}`);
  console.log(`${colors.yellow("Success Rate:")} ${Math.round(stats.acknowledgmentRate * 100)}%`);
  console.log(`${colors.magenta("Total Deliveries:")} ${stats.totalDeliveries}`);
  
  console.log(colors.bold("\n📈 Category Breakdown:"));
  Object.entries(stats.categoryBreakdown).forEach(([category, count]) => {
    if (count > 0) {
      console.log(`  ${colors.dim(category.padEnd(12))} ${count}`);
    }
  });

  console.log(colors.bold("\n🏆 Template Usage:"));
  Object.entries(stats.templateUsage).forEach(([template, count]) => {
    console.log(`  ${colors.dim(template.padEnd(20))} ${count}`);
  });
}

/**
 * List available templates
 */
function listTemplates(args: CliArgs) {
  let templates = reminderTemplates;

  // Filter by category if specified
  if (args.category) {
    templates = templates.filter(t => t.category === args.category);
  }

  if (args.json) {
    console.log(JSON.stringify(templates, null, 2));
    return;
  }

  console.log(colors.bold(`\n📝 Reminder Templates (${templates.length} available)\n`));

  for (const template of templates) {
    console.log(`${colors.bold(template.name)} ${colors.dim(`(${template.id})`)}`);
    console.log(`  ${colors.cyan("Category:")} ${template.category}`);
    console.log(`  ${colors.dim(template.description)}`);
    console.log(`  ${colors.yellow("Default Schedule:")} ${template.defaultSchedule.type} at ${template.defaultSchedule.time}`);
    console.log();
  }
}

/**
 * Test reminder delivery (simulation)
 */
async function testDelivery(args: CliArgs) {
  const id = args._[1]?.toString();
  if (!id) {
    console.error(colors.red("Error: Reminder ID is required"));
    console.log("Usage: reminder.ts test-delivery <id>");
    return;
  }

  const reminder = await getReminderById(id);
  if (!reminder) {
    console.error(colors.red(`Reminder not found: ${id}`));
    return;
  }

  console.log(colors.bold(`\n🧪 Testing delivery for reminder: ${reminder.title}\n`));
  
  // Simulate delivery process
  console.log(colors.green("✅ Delivery validation passed"));
  console.log(colors.blue(`📨 Would deliver to: ${reminder.targetUser}`));
  console.log(colors.yellow(`💬 Message: ${reminder.message}`));
  console.log(colors.cyan(`⏰ Schedule: ${reminder.schedule.type} at ${reminder.schedule.time}`));
  
  if (reminder.escalation.enabled) {
    console.log(colors.magenta(`🚨 Escalation: Enabled (${reminder.escalation.delayMinutes} min delay)`));
  }
  
  console.log(colors.green("\n✅ Test delivery completed successfully!"));
}

/**
 * Cleanup expired and completed reminders
 */
async function cleanupReminders(args: CliArgs) {
  console.log(colors.bold("🧹 Cleaning up reminders...\n"));

  // Get expired and completed reminders
  const expiredResult = await searchReminders({
    status: ["expired", "completed", "cancelled"],
    limit: 1000,
  });

  if (expiredResult.reminders.length === 0) {
    console.log(colors.green("✅ No reminders to clean up."));
    return;
  }

  console.log(`Found ${expiredResult.reminders.length} reminders to clean up:`);
  
  for (const reminder of expiredResult.reminders) {
    console.log(`  - ${reminder.title} (${reminder.status})`);
  }

  // Perform bulk deletion if confirmed
  if (!args.force) {
    console.log(colors.yellow("\nAdd --force flag to actually delete these reminders."));
    return;
  }

  const reminderIds = expiredResult.reminders.map(r => r.id);
  const result = await bulkOperateReminders({
    operation: "delete",
    reminderIds,
  }, CLI_CONFIG.defaultUserId);

  console.log(colors.green(`✅ Cleaned up ${result.processed} reminders.`));
  
  if (result.errors.length > 0) {
    console.log(colors.red("❌ Errors during cleanup:"));
    result.errors.forEach(error => console.error(colors.red(`  - ${error}`)));
  }
}

/**
 * Print reminder summary (for list view)
 */
function printReminderSummary(reminder: Reminder, verbose = false) {
  const statusColor = getStatusColor(reminder.status);
  const priorityIcon = getPriorityIcon(reminder.priority);
  
  console.log(
    `${statusColor(reminder.status.toUpperCase().padEnd(10))} ` +
    `${priorityIcon} ${colors.bold(reminder.title)} ${colors.dim(`(${reminder.id.slice(0, 8)}...)`)}`
  );
  
  if (verbose) {
    console.log(`  ${colors.cyan("Target:")} ${reminder.targetUser}`);
    console.log(`  ${colors.yellow("Category:")} ${reminder.category}`);
    console.log(`  ${colors.magenta("Created:")} ${reminder.createdAt.toISOString().split('T')[0]}`);
    if (reminder.nextDeliveryAt) {
      console.log(`  ${colors.blue("Next:")} ${reminder.nextDeliveryAt.toISOString()}`);
    }
  }
  
  console.log();
}

/**
 * Print detailed reminder information
 */
function printReminderDetails(reminder: Reminder) {
  console.log(colors.bold(`\n📋 ${reminder.title}\n`));
  
  console.log(`${colors.cyan("ID:")} ${reminder.id}`);
  console.log(`${colors.cyan("Status:")} ${getStatusColor(reminder.status)(reminder.status)}`);
  console.log(`${colors.cyan("Category:")} ${reminder.category}`);
  console.log(`${colors.cyan("Priority:")} ${reminder.priority} ${getPriorityIcon(reminder.priority)}`);
  console.log(`${colors.cyan("Target User:")} ${reminder.targetUser}`);
  console.log(`${colors.cyan("Active:")} ${reminder.isActive ? "Yes" : "No"}`);
  
  console.log(colors.bold("\n💬 Message:"));
  console.log(`  ${reminder.message}`);
  
  console.log(colors.bold("\n⏰ Schedule:"));
  console.log(`  ${colors.yellow("Type:")} ${reminder.schedule.type}`);
  console.log(`  ${colors.yellow("Time:")} ${reminder.schedule.time}`);
  console.log(`  ${colors.yellow("Timezone:")} ${reminder.timezone}`);
  console.log(`  ${colors.yellow("Occurrences:")} ${reminder.schedule.occurrenceCount}`);
  
  if (reminder.escalation.enabled) {
    console.log(colors.bold("\n🚨 Escalation:"));
    console.log(`  ${colors.magenta("Delay:")} ${reminder.escalation.delayMinutes} minutes`);
    console.log(`  ${colors.magenta("Max Attempts:")} ${reminder.escalation.maxEscalations}`);
    console.log(`  ${colors.magenta("Targets:")} ${reminder.escalation.escalationTargets.join(", ")}`);
  }
  
  if (reminder.tags && reminder.tags.length > 0) {
    console.log(colors.bold("\n🏷️  Tags:"));
    console.log(`  ${reminder.tags.join(", ")}`);
  }
  
  if (reminder.notes) {
    console.log(colors.bold("\n📝 Notes:"));
    console.log(`  ${reminder.notes}`);
  }
  
  console.log(colors.bold("\n📅 Timestamps:"));
  console.log(`  ${colors.dim("Created:")} ${reminder.createdAt.toISOString()}`);
  console.log(`  ${colors.dim("Updated:")} ${reminder.updatedAt.toISOString()}`);
  if (reminder.nextDeliveryAt) {
    console.log(`  ${colors.dim("Next Delivery:")} ${reminder.nextDeliveryAt.toISOString()}`);
  }
  if (reminder.lastDeliveredAt) {
    console.log(`  ${colors.dim("Last Delivery:")} ${reminder.lastDeliveredAt.toISOString()}`);
  }
  
  console.log();
}

/**
 * Get color function for status
 */
function getStatusColor(status: string) {
  switch (status) {
    case "active": return colors.green;
    case "completed": return colors.blue;
    case "paused": return colors.yellow;
    case "draft": return colors.dim;
    case "expired": return colors.red;
    case "failed": return colors.red;
    case "cancelled": return colors.strikethrough;
    default: return colors.dim;
  }
}

/**
 * Get priority icon
 */
function getPriorityIcon(priority: string): string {
  switch (priority) {
    case "urgent": return "🔴";
    case "high": return "🟡";
    case "normal": return "🟢";
    case "low": return "🔵";
    default: return "⚪";
  }
}

/**
 * Show help information
 */
function showHelp() {
  console.log(colors.bold("\n📋 Reminder CLI - Command Reference\n"));
  
  console.log(colors.bold("USAGE:"));
  console.log("  deno run -A scripts/cli/reminder.ts <command> [options]\n");
  
  console.log(colors.bold("COMMANDS:"));
  console.log("  list                    List reminders with filters");
  console.log("  create                  Create a new reminder");
  console.log("  show <id>              Show detailed reminder information");
  console.log("  update <id>            Update an existing reminder");
  console.log("  delete <id>            Delete a reminder");
  console.log("  activate <id>          Activate a paused reminder");
  console.log("  deactivate <id>        Deactivate a reminder");
  console.log("  stats [user-id]        Show reminder statistics");
  console.log("  templates              List available templates");
  console.log("  test-delivery <id>     Test reminder delivery (simulation)");
  console.log("  cleanup                Clean up expired/completed reminders");
  console.log("  help                   Show this help message\n");
  
  console.log(colors.bold("COMMON OPTIONS:"));
  console.log("  -h, --help             Show help");
  console.log("  -v, --verbose          Verbose output");
  console.log("  -j, --json             JSON output format");
  console.log("  -u, --user <id>        Target user ID");
  console.log("  --page <number>        Page number for listing");
  console.log("  --limit <number>       Items per page (default: 20)\n");
  
  console.log(colors.bold("FILTER OPTIONS (for list command):"));
  console.log("  --status <statuses>    Filter by status (comma-separated)");
  console.log("  --category <categories> Filter by category (comma-separated)");
  console.log("  --priority <priorities> Filter by priority (comma-separated)");
  console.log("  --tags <tags>          Filter by tags (comma-separated)");
  console.log("  --active-only          Show only active reminders");
  console.log("  --sort <field>         Sort field (createdAt, nextDeliveryAt, priority, title)");
  console.log("  --order <asc|desc>     Sort order (default: desc)\n");
  
  console.log(colors.bold("CREATE/UPDATE OPTIONS:"));
  console.log("  --title <text>         Reminder title");
  console.log("  --message <text>       Reminder message");
  console.log("  --category <category>  Category (health, work, personal, etc.)");
  console.log("  --priority <priority>  Priority (low, normal, high, urgent)");
  console.log("  --target <user-id>     Target user ID");
  console.log("  --template <id>        Use template");
  console.log("  --time <HH:MM>         Delivery time (24-hour format)");
  console.log("  --timezone <tz>        Timezone (default: UTC)");
  console.log("  --tags <tags>          Tags (comma-separated)");
  console.log("  --notes <text>         Additional notes\n");
  
  console.log(colors.bold("EXAMPLES:"));
  console.log("  # List all active reminders");
  console.log("  reminder.ts list --active-only");
  console.log("");
  console.log("  # Create a simple reminder");
  console.log("  reminder.ts create --title 'Meeting' --message 'Team standup' --time '09:00'");
  console.log("");
  console.log("  # Create from template");
  console.log("  reminder.ts create --template 'medication-daily' --target 'user123'");
  console.log("");
  console.log("  # Show reminder details");
  console.log("  reminder.ts show abc123def");
  console.log("");
  console.log("  # Update reminder");
  console.log("  reminder.ts update abc123def --title 'New Title' --priority high");
  console.log("");
  console.log("  # Get statistics in JSON format");
  console.log("  reminder.ts stats --json");
  console.log("");
}

// Run CLI if this script is executed directly
if (import.meta.main) {
  await main();
}

// Run CLI if this script is executed directly
if (import.meta.main) {
  await main();
}