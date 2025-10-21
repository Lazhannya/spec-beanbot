# Reminder API Documentation

This document describes the REST API endpoints for the reminder system.

## Authentication

All API endpoints require authentication via session cookies. Users must be
logged in via Discord OAuth2.

## Base URL

```
http://localhost:8001/api/reminders
```

## Endpoints

### List Reminders

**GET** `/api/reminders`

Get a paginated list of reminders for the authenticated user.

**Query Parameters:**

- `page` - Page number (default: 1)
- `limit` - Items per page (default: 20, max: 100)
- `status` - Filter by status (comma-separated):
  `draft,active,paused,completed,expired,failed,cancelled`
- `category` - Filter by category (comma-separated):
  `health,medication,work,personal,appointment,task,custom`
- `priority` - Filter by priority (comma-separated): `low,normal,high,urgent`
- `tags` - Filter by tags (comma-separated)
- `search` - Text search in title, message, notes
- `templateId` - Filter by template ID
- `sortBy` - Sort field: `createdAt,nextDeliveryAt,priority,title`
- `sortOrder` - Sort direction: `asc,desc` (default: desc)
- `createdAfter` - Filter by creation date (ISO string)
- `createdBefore` - Filter by creation date (ISO string)
- `nextDeliveryAfter` - Filter by next delivery date (ISO string)
- `nextDeliveryBefore` - Filter by next delivery date (ISO string)

**Response:**

```json
{
  "success": true,
  "data": [...reminders],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

### Create Reminder

**POST** `/api/reminders`

Create a new reminder.

**Request Body:**

```json
{
  "title": "Take medication",
  "message": "Remember to take your daily vitamins",
  "category": "health",
  "targetUser": "discord_user_id",
  "schedule": {
    "type": "daily",
    "time": "09:00"
  },
  "timezone": "America/New_York",
  "escalation": {
    "enabled": true,
    "delayMinutes": 60,
    "maxEscalations": 3,
    "escalationTargets": ["manager_user_id"],
    "stopOnAcknowledgment": true
  },
  "priority": "normal",
  "tags": ["health", "daily"],
  "notes": "Optional notes"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    ...reminder_object
  }
}
```

### Get Specific Reminder

**GET** `/api/reminders/{id}`

Get details of a specific reminder, including delivery history.

**Response:**

```json
{
  "success": true,
  "data": {
    "reminder": {...reminder_object},
    "deliveries": [...delivery_history]
  }
}
```

### Update Reminder

**PUT** `/api/reminders/{id}`

Update an existing reminder.

**Request Body:**

```json
{
  "title": "Updated title",
  "isActive": false,
  "schedule": {
    "time": "10:00"
  }
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    ...updated_reminder_object
  }
}
```

### Delete Reminder

**DELETE** `/api/reminders/{id}`

Delete a specific reminder.

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "reminder_id",
    "deleted": true
  }
}
```

### Bulk Operations

**POST** `/api/reminders/bulk`

Perform bulk operations on multiple reminders.

**Request Body:**

```json
{
  "operation": "delete|pause|resume|complete|update",
  "reminderIds": ["id1", "id2", "id3"],
  "updateData": {...} // Required for update operation
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "operation": "delete",
    "processed": 3,
    "total": 3,
    "errors": []
  }
}
```

### Get Statistics

**GET** `/api/reminders/stats`

Get reminder statistics and analytics for the authenticated user.

**Response:**

```json
{
  "success": true,
  "data": {
    "stats": {
      "totalReminders": 50,
      "activeReminders": 25,
      "completedReminders": 20,
      "acknowledgmentRate": 0.85,
      "categoryBreakdown": {
        "health": 15,
        "work": 20,
        "personal": 15
      }
    },
    "recentActivity": {
      "recentReminders": [...],
      "upcomingReminders": [...]
    },
    "summary": {
      "totalReminders": 50,
      "activeReminders": 25,
      "completedReminders": 20,
      "acknowledgmentRate": 85,
      "topCategory": "work"
    }
  }
}
```

### List Templates

**GET** `/api/reminders/templates`

Get all available reminder templates.

**Query Parameters:**

- `category` - Filter by category

**Response:**

```json
{
  "success": true,
  "data": {
    "templates": [...template_objects],
    "total": 10,
    "categories": ["health", "work", "personal"]
  }
}
```

### Get Specific Template

**GET** `/api/reminders/templates/{id}`

Get details of a specific reminder template.

**Response:**

```json
{
  "success": true,
  "data": {
    ...template_object
  }
}
```

## Error Responses

All endpoints return standardized error responses:

```json
{
  "success": false,
  "error": "Error message",
  "errors": ["Detailed error 1", "Detailed error 2"]
}
```

**HTTP Status Codes:**

- `200` - Success
- `201` - Created
- `207` - Partial Success (bulk operations)
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `500` - Internal Server Error

## Rate Limiting

API endpoints are subject to rate limiting based on session. Excessive requests
may be throttled.

## Data Types

### Reminder Object

```typescript
interface Reminder {
  id: string;
  createdBy: string;
  targetUser: string;
  title: string;
  message: string;
  category: ReminderCategory;
  templateId?: string;
  customFields?: Record<string, unknown>;
  schedule: ReminderSchedule;
  timezone: string;
  status: ReminderStatus;
  isActive: boolean;
  escalation: EscalationConfig;
  createdAt: Date;
  updatedAt: Date;
  lastDeliveredAt?: Date;
  nextDeliveryAt?: Date;
  completedAt?: Date;
  tags?: string[];
  notes?: string;
  priority: ReminderPriority;
}
```

### Schedule Types

- `once` - Single execution
- `daily` - Every day
- `weekly` - Specific days of week
- `monthly` - Monthly on specific day
- `yearly` - Annual reminder
- `interval` - Every N days/weeks/months
- `custom` - Cron expression

### Status Types

- `draft` - Created but not activated
- `active` - Scheduled and running
- `paused` - Temporarily disabled
- `completed` - Manually marked as done
- `expired` - Past end date or max occurrences
- `failed` - Delivery failures exceeded threshold
- `cancelled` - Manually cancelled

### Priority Types

- `low`
- `normal`
- `high`
- `urgent`

### Category Types

- `health`
- `medication`
- `work`
- `personal`
- `appointment`
- `task`
- `custom`
