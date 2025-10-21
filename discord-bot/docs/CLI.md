# Reminder CLI Usage Guide

The Reminder CLI provides a command-line interface for managing reminders in the Discord bot system.

## Quick Start

```bash
# Show help
deno task reminder help

# List reminders
deno task reminder list

# List templates
deno task reminder templates

# Create a reminder
deno task reminder create \
  --title "Take medication" \
  --message "Don't forget your daily vitamins" \
  --category health \
  --target "discord_user_id"

# Show reminder details
deno task reminder show <reminder_id>

# Update a reminder
deno task reminder update <reminder_id> --priority high

# Delete a reminder
deno task reminder delete <reminder_id>
```

## Available Commands

### List Commands
- `list` - List reminders with filtering and pagination
- `templates` - List available reminder templates
- `stats [user-id]` - Show reminder statistics

### Management Commands
- `create` - Create a new reminder
- `show <id>` - Show detailed reminder information
- `update <id>` - Update an existing reminder
- `delete <id>` - Delete a reminder
- `activate <id>` - Activate a paused reminder
- `deactivate <id>` - Deactivate a reminder

### Utility Commands
- `test-delivery <id>` - Test reminder delivery (simulation)
- `cleanup` - Clean up expired/completed reminders
- `help` - Show help information

## Filtering and Options

### List Filtering
```bash
# Show only active reminders
deno task reminder list --active-only

# Filter by status
deno task reminder list --status "active,paused"

# Filter by category
deno task reminder list --category "health,work"

# Filter by priority
deno task reminder list --priority "high,urgent"

# Text search
deno task reminder list --search "medication"

# Pagination
deno task reminder list --page 2 --limit 10
```

### Output Formats
```bash
# Verbose output
deno task reminder list --verbose

# JSON output
deno task reminder list --json

# JSON statistics
deno task reminder stats --json
```

## Creating Reminders

### Basic Reminder
```bash
deno task reminder create \
  --title "Meeting Reminder" \
  --message "Team standup in conference room" \
  --category work \
  --target "123456789012345678" \
  --time "09:00" \
  --priority normal
```

### Using Templates
```bash
# List available templates
deno task reminder templates

# Create from template
deno task reminder create \
  --template "medication-daily" \
  --target "123456789012345678"
```

### Advanced Options
```bash
deno task reminder create \
  --title "Complex Reminder" \
  --message "This is a complex reminder" \
  --category personal \
  --target "123456789012345678" \
  --time "14:30" \
  --timezone "America/New_York" \
  --priority high \
  --tags "important,urgent" \
  --notes "Additional context notes"
```

## Status Management

```bash
# Activate a paused reminder
deno task reminder activate <reminder_id>

# Deactivate a reminder
deno task reminder deactivate <reminder_id>

# Update status directly
deno task reminder update <reminder_id> --status active
```

## Maintenance

### Cleanup
```bash
# See what would be cleaned up
deno task reminder cleanup

# Actually perform cleanup
deno task reminder cleanup --force
```

### Testing
```bash
# Test reminder delivery (simulation only)
deno task reminder test-delivery <reminder_id>
```

## Configuration

The CLI uses these default settings:
- Default user ID: `cli-user`
- Default timezone: `UTC`
- Default time: `09:00`
- Default priority: `normal`
- Default category: `task`

## Error Handling

The CLI provides detailed error messages and supports verbose output for debugging:

```bash
# Show detailed error information
deno task reminder create --title "Test" --verbose
```

## Examples

### Daily Workflow
```bash
# Check today's reminders
deno task reminder list --active-only

# Create a quick reminder
deno task reminder create \
  --title "Call client" \
  --message "Follow up on project status" \
  --category work \
  --target "123456789012345678"

# Update reminder priority
deno task reminder update <id> --priority urgent

# Mark as completed
deno task reminder update <id> --status completed
```

### Batch Operations
```bash
# Find old completed reminders
deno task reminder list --status "completed,expired" --json

# Clean up old reminders
deno task reminder cleanup --force

# Get statistics
deno task reminder stats --json
```

## Integration with CI/CD

The CLI can be used in scripts and automation:

```bash
#!/bin/bash
# Create deployment reminder
REMINDER_ID=$(deno task reminder create \
  --title "Deployment Complete" \
  --message "Check deployment status" \
  --category work \
  --target "$TEAM_LEAD_ID" \
  --json | jq -r '.data.id')

echo "Created reminder: $REMINDER_ID"
```