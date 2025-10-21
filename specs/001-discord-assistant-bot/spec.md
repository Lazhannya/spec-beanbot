# Feature Specification: Personal Assistant Discord Bot

**Feature Branch**: `001-discord-assistant-bot`  
**Created**: 2025-10-21  
**Status**: Draft  
**Input**: User description: "I want to build a personal assistant Discord Bot with Deno and a Deno Fresh web interface, that can call on a webhook when pinged directly in my server or in DMs. The webhook is already set up to work in an existing n8n workflow and simply needs to POST the contents of the message that contains the mention. It should also have a web interface in deno fresh in which you are able to set reminders (for example for dog walks or medication) that will send a message to a specific user when triggered, and will then alert a secondary specified user when timed out. The bot should also have a modular ability to respond to recognizing certain text strings."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Discord Mention Webhook Integration (Priority: P1)

A user mentions the bot in a Discord server or DM, and the bot forwards the message content to an existing n8n workflow via webhook, enabling automated processing of user requests.

**Why this priority**: This is the core functionality that connects Discord interactions to external automation workflows. It provides immediate value and serves as the foundation for all other bot interactions.

**Independent Test**: Can be fully tested by mentioning the bot in Discord and verifying the webhook POST is sent to the n8n endpoint with correct message content.

**Acceptance Scenarios**:

1. **Given** the bot is online and configured with webhook URL, **When** a user mentions the bot in a server channel, **Then** the bot sends a POST request to the n8n webhook containing the full message content and metadata
2. **Given** the bot is online, **When** a user mentions the bot in a direct message, **Then** the bot processes the mention identically to server mentions and forwards to webhook
3. **Given** the webhook endpoint is unavailable, **When** a user mentions the bot, **Then** the bot retries the webhook call with exponential backoff and logs the failure

---

### User Story 2 - Web-Based Reminder Management (Priority: P2)

Users access a web interface to create, edit, and manage reminders that will send Discord messages to specified users at scheduled times, with timeout escalation to secondary users.

**Why this priority**: Provides the core personal assistant functionality for scheduling and managing important tasks like medication and dog walks, with built-in escalation for safety.

**Independent Test**: Can be fully tested by accessing the web interface, creating a reminder, and verifying the Discord message is sent at the scheduled time with proper escalation behavior.

**Acceptance Scenarios**:

1. **Given** a user accesses the web interface, **When** they create a reminder with target user and schedule, **Then** the system stores the reminder and sends a Discord message at the specified time
2. **Given** a reminder has been triggered, **When** the target user doesn't acknowledge within the timeout period, **Then** the system sends an alert to the specified secondary user
3. **Given** multiple reminders are scheduled, **When** their trigger times overlap, **Then** all reminders are delivered reliably without conflicts

---

### User Story 3 - Pattern-Based Text Recognition (Priority: P3)

The bot recognizes specific text patterns in Discord messages and responds with configurable automated responses, enabling customizable interactions beyond webhook forwarding.

**Why this priority**: Adds intelligent interaction capabilities that make the bot more useful for common queries and commands without requiring n8n workflow configuration for every interaction.

**Independent Test**: Can be fully tested by configuring text patterns via web interface and sending matching messages in Discord to verify appropriate responses.

**Acceptance Scenarios**:

1. **Given** text patterns are configured in the system, **When** a message matches a pattern, **Then** the bot responds with the associated message in the same channel
2. **Given** multiple patterns could match a message, **When** the message is received, **Then** the bot applies the most specific pattern match and responds appropriately
3. **Given** pattern-based responses are disabled, **When** matching text is received, **Then** the bot ignores the pattern and processes normally

### Edge Cases

- What happens when the n8n webhook endpoint is temporarily unavailable during high traffic periods?
- How does the system handle Discord API rate limiting when sending multiple reminder messages simultaneously?
- What occurs when a reminder target user has left the Discord server before the reminder triggers?
- How does the bot respond when mentioned in a thread vs. a main channel?
- What happens when the web interface is accessed during bot maintenance or restart?
- How does the system handle reminders scheduled during Discord outages?
- What occurs when text pattern recognition conflicts with webhook forwarding (e.g., mention + pattern match)?
- How does the bot handle extremely long messages that exceed Discord's character limits?
- What happens when multiple users try to create conflicting reminders for the same target user?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Bot MUST detect mentions in both Discord server channels and direct messages
- **FR-002**: System MUST POST message content and metadata to configurable webhook URL when bot is mentioned
- **FR-003**: Bot MUST implement retry logic with exponential backoff for failed webhook calls (minimum 3 retries)
- **FR-004**: Web interface MUST allow authenticated users to create reminders with target Discord user, message content, and schedule
- **FR-005**: System MUST send Discord messages to target users at scheduled reminder times
- **FR-006**: System MUST escalate unacknowledged reminders to secondary users after configurable timeout period
- **FR-007**: Bot MUST support configurable text pattern recognition with customizable responses
- **FR-008**: System MUST persist reminder data across application restarts
- **FR-009**: Web interface MUST authenticate users via Discord OAuth2
- **FR-010**: Bot MUST respect Discord API rate limits and implement appropriate throttling
- **FR-011**: System MUST log all bot interactions, webhook calls, and reminder activities for troubleshooting
- **FR-012**: Web interface MUST allow users to view, edit, and delete their created reminders
- **FR-013**: System MUST validate all user inputs for security and prevent code injection
- **FR-014**: Bot MUST handle webhook authentication and signature verification for secure communication with n8n
- **FR-015**: System MUST support multiple concurrent reminders without conflicts

### Key Entities *(include if feature involves data)*

- **User**: Discord user who can create reminders and receive messages, identified by Discord ID, has authentication status and permissions
- **Reminder**: Scheduled message with target user, content, trigger time, timeout duration, secondary user for escalation, and status (pending/triggered/escalated/completed)
- **TextPattern**: Configurable pattern-response pair with matching criteria, response message, and activation status
- **WebhookCall**: Record of webhook attempts including message content, timestamp, success/failure status, and retry attempts
- **BotInteraction**: Log of all bot activities including mentions received, messages sent, and system events for monitoring and debugging

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Bot successfully forwards 99% of mention messages to webhook within 5 seconds
- **SC-002**: Reminders are delivered with 95% accuracy within 1 minute of scheduled time
- **SC-003**: Users can create a reminder via web interface in under 3 minutes
- **SC-004**: System handles 100 concurrent reminder notifications without message delays exceeding 30 seconds
- **SC-005**: Webhook retry mechanism achieves 99% eventual delivery success rate within 15 minutes
- **SC-006**: Web interface loads and displays reminders list in under 3 seconds
- **SC-007**: Pattern-based responses trigger within 2 seconds of message receipt
- **SC-008**: System maintains 99.9% uptime for Discord bot presence and web interface availability
- **SC-009**: Escalation messages reach secondary users within 5 minutes of reminder timeout
- **SC-010**: Authentication via Discord OAuth2 completes successfully in under 30 seconds

