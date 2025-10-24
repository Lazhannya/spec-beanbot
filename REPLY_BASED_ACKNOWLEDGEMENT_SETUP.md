# Reply-Based Acknowledgement Setup Guide

**Implemented**: 2025-10-24  
**Alternative to**: Discord webhook button interactions  
**Advantage**: No Interactions Endpoint URL needed - avoids webhook verification issues

## Overview

This implementation replaces Discord button-based acknowledgement with a simple DM reply system:

1. Bot sends reminder to user with text instructions
2. User replies with `okay` or `decline` in the DM
3. Bot processes the reply and updates reminder status
4. Bot sends confirmation message

**No webhook configuration required** - uses Discord Gateway events instead!

## Requirements

### 1. MESSAGE_CONTENT Privileged Intent

This is **CRITICAL** - without this intent, the bot cannot read message content.

#### How to Enable:

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Select your application
3. Go to **Bot** section in left sidebar
4. Scroll to **Privileged Gateway Intents**
5. Enable **MESSAGE CONTENT INTENT**
6. Click **Save Changes**

⚠️ **Important**: If your bot is in 100+ servers, you'll need to apply for verification first.

### 2. Discord Bot Token

Set the `DISCORD_BOT_TOKEN` environment variable in Deno Deploy:

```bash
# In Deno Deploy dashboard:
# Project Settings > Environment Variables
DISCORD_BOT_TOKEN=your_bot_token_here
```

### 3. Gateway Webhook Setup

You need to configure Discord to send MESSAGE_CREATE events to your endpoint.

**Option A: Use Discord.js or similar library** (Running separately)
- Run a Discord bot instance that listens to Gateway events
- Forward MESSAGE_CREATE events to `/api/gateway/discord-messages`

**Option B: Use Discord HTTP Interactions** (Recommended for Deno Deploy)
- Configure a message event forwarder service
- Point it to: `https://your-app.deno.net/api/gateway/discord-messages`

## Implementation Details

### Modified Files

#### 1. `discord-bot/lib/discord/delivery.ts`

**Changed**: Removed Discord button components  
**Now sends**: Text instructions for reply-based acknowledgement

```typescript
// Old: Buttons
components: [{ type: 1, components: [
  { type: 2, label: "Acknowledge", ... },
  { type: 2, label: "Decline", ... }
]}]

// New: Text instructions
messageContent += `\n\n📝 **To respond:**\nReply with \`okay\` to acknowledge or \`decline\` to decline this reminder.`;
```

#### 2. `discord-bot/lib/discord/dm-listener.ts` (NEW)

Handles incoming DM messages and processes acknowledgements:

- Checks for acknowledgement keywords: `okay`, `ok`, `yes`, `acknowledge`, `ack`, `done`, `✓`, `✅`
- Checks for decline keywords: `decline`, `no`, `nope`, `skip`, `cancel`, `❌`
- Finds latest pending reminder for the user
- Updates reminder status
- Sends confirmation message

#### 3. `discord-bot/lib/reminder/service.ts`

Added three new methods:

- `getLatestPendingReminderForUser(userId)` - Find most recent pending reminder
- `acknowledgeReminder(reminderId, userId)` - Mark reminder as acknowledged
- `declineReminder(reminderId, userId)` - Mark reminder as declined (triggers escalation if configured)

#### 4. `routes/api/gateway/discord-messages.ts` (NEW)

API endpoint that receives MESSAGE_CREATE events:

- POST: Processes incoming DM messages
- GET: Health check endpoint

## User Experience

### What Users See

**Before** (with buttons):
```
🔔 Reminder
Complete the quarterly report

[Acknowledge] [Decline]
```

**Now** (with reply):
```
🔔 **Reminder**

Complete the quarterly report

📝 **To respond:**
Reply with `okay` to acknowledge or `decline` to decline this reminder.
```

**After user replies with "okay":**
```
✅ Reminder acknowledged!
```

## Testing

### 1. Test the Gateway Endpoint

```bash
# Health check
curl https://your-app.deno.net/api/gateway/discord-messages

# Should return:
# {
#   "status": "ok",
#   "message": "Discord message gateway endpoint is accessible",
#   ...
# }
```

### 2. Test DM Processing

```bash
# Simulate a Discord MESSAGE_CREATE event
curl -X POST https://your-app.deno.net/api/gateway/discord-messages \
  -H "Content-Type: application/json" \
  -d '{
    "channel_type": 1,
    "author": {
      "id": "123456789",
      "bot": false
    },
    "content": "okay"
  }'

# Should return:
# {
#   "ok": true,
#   "processed": true,
#   "action": "acknowledged",
#   "reminderId": "..."
# }
```

### 3. Test Full Flow

1. Create a reminder through the web interface
2. Wait for delivery (or use test trigger)
3. Check your Discord DMs - you should see the reminder with reply instructions
4. Reply with `okay` or `decline`
5. Bot should respond with confirmation
6. Check web interface - reminder status should be updated

## Supported Keywords

### Acknowledge
- `okay`
- `ok`
- `yes`
- `acknowledge`
- `ack`
- `done`
- `✓`
- `✅`

### Decline
- `decline`
- `no`
- `nope`
- `skip`
- `cancel`
- `❌`

Keywords are **case-insensitive** and can appear anywhere in the message.

## Advantages Over Buttons

✅ **No webhook verification issues** - Avoids the "interactions endpoint url could not be verified" error  
✅ **Simpler deployment** - No PUBLIC_KEY or signature verification needed  
✅ **More reliable** - Not dependent on Discord's webhook infrastructure  
✅ **Platform independent** - Works with any Discord bot hosting solution  
✅ **Easier debugging** - Simple HTTP endpoints, clear logs  

## Disadvantages

❌ **Requires MESSAGE_CONTENT intent** - Needs privileged intent approval for 100+ servers  
❌ **More typing** - Users need to type keywords instead of clicking buttons  
❌ **Requires Gateway connection** - Need a separate service to forward events (or run a bot instance)  
❌ **Latency** - Slight delay compared to instant button interactions  

## Troubleshooting

### "Bot not responding to my messages"

1. **Check MESSAGE_CONTENT intent is enabled** in Discord Developer Portal
2. **Verify DISCORD_BOT_TOKEN** is set in environment variables
3. **Check Gateway webhook is configured** to forward events
4. **Look at Deno Deploy logs** for error messages

### "Message processed but status not updated"

1. **Check reminder exists and is in PENDING status**
2. **Verify user ID matches** the reminder's target user
3. **Check Deno Deploy logs** for service errors

### "Bot says 'No pending reminder found'"

1. **Create a new reminder** for that user
2. **Wait for delivery** before testing acknowledgement
3. **Check reminder status** in web interface

## Migration Notes

### If You Were Using Buttons

1. **Deploy this update** - the changes are backward compatible
2. **Existing buttons won't work anymore** - they'll do nothing when clicked
3. **New reminders will have text instructions** instead of buttons
4. **Old reminders in flight** will still show buttons but won't respond

### Rollback Plan

If you need to rollback to buttons:

```bash
git revert HEAD
git push
```

Then re-configure the Interactions Endpoint URL in Discord Developer Portal.

## Next Steps

1. ✅ Deploy to Deno Deploy
2. ⬜ Enable MESSAGE_CONTENT intent in Discord Developer Portal
3. ⬜ Configure Gateway event forwarding
4. ⬜ Test DM acknowledgement flow
5. ⬜ Monitor logs for any issues
6. ⬜ Update user documentation

## Support

If you encounter issues:

1. Check Deno Deploy logs: `https://dash.deno.com/projects/spec-beanbot/logs`
2. Test the gateway endpoint: `GET /api/gateway/discord-messages`
3. Verify MESSAGE_CONTENT intent is enabled
4. Check environment variables are configured

## References

- Discord MESSAGE_CONTENT Intent: https://discord.com/developers/docs/topics/gateway#message-content-intent
- Discord Gateway Events: https://discord.com/developers/docs/topics/gateway-events#message-create
- Implementation Details: ALTERNATIVES_TO_WEBHOOKS.md (Option 2)
