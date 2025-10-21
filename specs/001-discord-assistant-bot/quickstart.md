# Quickstart Guide: Personal Assistant Discord Bot

**Feature**: Personal Assistant Discord Bot  
**Created**: 2025-10-21  
**Prerequisites**: Deno 2.0+, Discord Bot Token, n8n webhook endpoint, Deno Deploy account

## Overview

This guide provides step-by-step instructions for setting up and testing the Personal Assistant Discord Bot locally and deploying to Deno Deploy.

## Development Setup

### 1. Environment Configuration

Create `.env` file in project root:

```env
# Discord Configuration
DISCORD_BOT_TOKEN=your_bot_token_here
DISCORD_CLIENT_ID=your_client_id_here
DISCORD_CLIENT_SECRET=your_client_secret_here

# Webhook Configuration
N8N_WEBHOOK_URL=https://your-n8n-instance.com/webhook/discord-mention
WEBHOOK_SECRET=your_webhook_signature_secret

# Web Interface Configuration
SESSION_SECRET=your_session_secret_key

# Logging Configuration
LOG_LEVEL=info
```

### 2. Fresh Application Setup

```bash
# Initialize Fresh application
deno task dev

# The application will start on http://localhost:8000
# Discord bot will initialize automatically when the app starts
```

### 3. Data Module Configuration

Edit embedded data files:

```bash
# Configure reminder templates
vim data/reminder-templates.ts

# Configure text patterns  
vim data/text-patterns.ts
```

## Testing Scenarios

### Scenario 1: Discord Mention Integration (User Story 1 - P1)

**Objective**: Verify bot forwards mentions to n8n webhook

**Setup**:
1. Invite bot to test Discord server with appropriate permissions
2. Configure n8n webhook endpoint or use test webhook server
3. Start bot with valid Discord token

**Test Steps**:
1. Open Discord and navigate to test server
2. Send message: `@BeanBot help me with this task`
3. Verify webhook receives POST request with message data
4. Check bot logs for successful webhook delivery

**Expected Results**:
- Bot processes mention within 2 seconds
- Webhook receives JSON payload with message content and metadata
- Bot logs show successful webhook call with 200 status
- n8n workflow triggers (if using real n8n instance)

**Verification**:
```bash
# Check Deno KV data
deno run --allow-read --allow-env scripts/dev/check-kv.ts

# View bot interaction logs
deno run --allow-read --allow-env scripts/dev/view-logs.ts --type=mention
```

### Scenario 2: Web Reminder Management (User Story 2 - P2)

**Objective**: Create and manage reminders via web interface

**Setup**:
1. Start web interface server
2. Configure Discord OAuth2 application
3. Ensure database is initialized

**Test Steps**:
1. Navigate to `http://localhost:8000`
2. Click "Login with Discord" and complete OAuth2 flow
3. Create reminder:
   - Target user: Select from Discord server members
   - Message: "Time to take your medication!"
   - Schedule: 2 minutes from now
   - Timeout: 1 minute
   - Secondary user: Select escalation contact
4. Wait for reminder to trigger
5. Verify message sent to target user
6. Wait for timeout period
7. Verify escalation message sent to secondary user

**Expected Results**:
- OAuth2 login completes successfully
- Reminder creation form validates all inputs
- Reminder stored in database with correct schedule
- Target user receives reminder message at scheduled time
- Secondary user receives escalation after timeout
- Web interface shows reminder status updates

**Verification**:
```bash
# Check reminder status in Deno KV
deno run --allow-read --allow-env scripts/dev/check-reminders.ts --user=target_discord_id

# Verify Discord messages sent
deno run --allow-read --allow-env scripts/dev/verify-messages.ts --reminder-id=uuid
```

### Scenario 3: Text Pattern Recognition (User Story 3 - P3)

**Objective**: Configure and test automated pattern responses

**Setup**:
1. Bot running with pattern recognition enabled
2. Web interface accessible for pattern management
3. Test Discord channel available

**Test Steps**:
1. Login to web interface
2. Navigate to "Text Patterns" section
3. Create pattern:
   - Pattern: "hello|hi|hey"  
   - Match type: "regex"
   - Response: "Hello! How can I help you today?"
   - Priority: 10
   - Active: true
4. Send Discord message: "hey there bot"
5. Verify bot responds with configured message
6. Test pattern priority by creating conflicting pattern
7. Disable pattern and verify no response

**Expected Results**:
- Pattern creation succeeds with validation
- Bot recognizes matching text in messages
- Bot responds with configured message
- Higher priority patterns take precedence
- Inactive patterns don't trigger responses
- Pattern usage statistics update correctly

**Verification**:
```bash
# Check pattern match logs in Deno KV
deno run --allow-read --allow-env scripts/dev/check-patterns.ts --pattern-id=uuid

# View pattern statistics
deno run --allow-read --allow-env scripts/dev/pattern-stats.ts
```

## Integration Testing

### End-to-End Reminder Flow

**Complete User Journey**:
1. User logs into web interface via Discord OAuth2
2. User creates reminder for medication at 8 PM daily using template
3. Bot sends reminder message at scheduled time
4. User acknowledges reminder (react with ✅)
5. If no acknowledgment within 15 minutes, escalate to family member
6. Log all interactions in Deno KV for monitoring

**Test Command**:
```bash
deno test --allow-all tests/integration/reminder-flow.test.ts
```

### Multi-User Conflict Testing

**Scenario**: Multiple users creating overlapping reminders
1. User A creates reminder for User C at 3:00 PM
2. User B creates reminder for User C at 3:01 PM  
3. Verify both reminders delivered correctly
4. Test simultaneous escalations

**Test Command**:
```bash
deno test --allow-all tests/integration/concurrent-reminders.test.ts
```

### Pattern vs Mention Priority

**Scenario**: Message matches pattern and mentions bot
1. Configure pattern for "help" in data/text-patterns.ts
2. Send message: "@BeanBot help me please"
3. Verify webhook forwarding takes priority over pattern
4. Ensure no duplicate responses

**Test Command**:
```bash
deno test --allow-all tests/integration/priority-handling.test.ts
```

## Deno Deploy Deployment

### 1. Prepare for Deployment

```bash
# Ensure all environment variables are configured for Deno Deploy
# Check deno.json for proper task configuration
cat deno.json

# Verify Fresh build works
deno task build
```

### 2. Deploy to Deno Deploy

```bash
# Option 1: Deploy via CLI
deployctl deploy --project=your-bot-project routes/index.tsx

# Option 2: Git integration (recommended)
# Push to GitHub and link repository in Deno Deploy dashboard
git add .
git commit -m "Initial Discord bot deployment"
git push origin main
```

### 3. Configure Deno Deploy Environment

Set environment variables in Deno Deploy dashboard:
- `DISCORD_BOT_TOKEN`
- `DISCORD_CLIENT_ID` 
- `DISCORD_CLIENT_SECRET`
- `N8N_WEBHOOK_URL`
- `WEBHOOK_SECRET`
- `SESSION_SECRET`

### 4. Custom Domain Setup (Optional)

```bash
# Configure custom domain in Deno Deploy dashboard
# Update Discord OAuth2 redirect URLs to use custom domain
# https://your-bot-domain.com/auth/callback
```

### 4. Health Checks

**Bot Health Check**:
```bash
curl http://localhost:8001/health
# Expected: {"status": "healthy", "bot": "online", "database": "connected"}
```

**Web Interface Health Check**:
```bash  
curl http://localhost:8000/api/health
# Expected: {"status": "healthy", "auth": "ready", "database": "connected"}
```

## Monitoring & Troubleshooting

### Key Metrics to Monitor

1. **Discord Bot Status**: Online/offline, latency
2. **Webhook Success Rate**: Delivery success percentage  
3. **Reminder Accuracy**: On-time delivery percentage
4. **Database Performance**: Query response times
5. **Memory Usage**: Bot and web server memory consumption

### Common Issues

**Bot Not Responding to Mentions**:
1. Check Discord token validity
2. Verify bot permissions in server
3. Check network connectivity to Discord API
4. Review bot logs for errors

**Webhooks Failing**:
1. Verify n8n endpoint accessibility
2. Check webhook signature configuration
3. Review retry logic and exponential backoff
4. Monitor rate limiting

**Reminders Not Delivering**:
1. Check reminder scheduler is running
2. Verify target user permissions  
3. Check Discord API rate limits
4. Review database connection

### Debug Commands

```bash
# Check bot status
deno run scripts/debug/bot-status.ts

# Test webhook connectivity
deno run scripts/debug/test-webhook.ts

# Validate database integrity
deno run scripts/debug/db-check.ts

# Export system metrics
deno run scripts/debug/export-metrics.ts
```

## CLI Usage

Each module provides CLI access per constitutional requirements:

### Webhook CLI

```bash
# Test webhook call
deno run bot/src/cli/webhook.ts call --url="$N8N_WEBHOOK_URL" --data='{"test": true}'

# Verify webhook signature
deno run bot/src/cli/webhook.ts verify --secret="$WEBHOOK_SECRET" --payload="data"
```

### Reminder CLI  

```bash
# Create reminder
deno run bot/src/cli/reminder.ts create \
  --target="123456789" \
  --message="Take medication" \
  --time="2025-10-21T20:00:00Z" \
  --timeout=15

# List pending reminders
deno run bot/src/cli/reminder.ts list --status=pending

# Cancel reminder
deno run bot/src/cli/reminder.ts cancel --id="uuid"
```

### Pattern CLI

```bash
# Create text pattern
deno run bot/src/cli/pattern.ts create \
  --pattern="hello|hi" \
  --response="Hello there!" \
  --type=regex

# Test pattern match
deno run bot/src/cli/pattern.ts test --text="hello world"

# List active patterns
deno run bot/src/cli/pattern.ts list --active-only
```

## Performance Validation

### Load Testing

```bash
# Test concurrent webhook calls
deno run tests/load/webhook-load.test.ts --concurrent=100

# Test reminder delivery under load
deno run tests/load/reminder-load.test.ts --reminders=1000

# Test pattern recognition performance
deno run tests/load/pattern-load.test.ts --messages=10000
```

### Success Criteria Verification

Run validation script to check all success criteria:

```bash
deno run scripts/validate/success-criteria.ts
```

This script verifies:
- ✅ SC-001: 99% webhook delivery within 5 seconds
- ✅ SC-002: 95% reminder accuracy within 1 minute  
- ✅ SC-003: Web interface loads under 3 seconds
- ✅ SC-004: 100 concurrent reminders without delays >30s
- ✅ SC-005: 99% webhook retry success within 15 minutes
- ✅ SC-006: Web interface response under 3 seconds
- ✅ SC-007: Pattern responses within 2 seconds
- ✅ SC-008: 99.9% uptime maintained
- ✅ SC-009: Escalation within 5 minutes of timeout
- ✅ SC-010: OAuth2 completion under 30 seconds