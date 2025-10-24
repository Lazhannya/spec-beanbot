# Quick Start: Reply-Based Acknowledgement

## What You Need to Do Next

### 1. Enable MESSAGE_CONTENT Intent (5 minutes)

1. Go to: https://discord.com/developers/applications
2. Select your bot application
3. Click **Bot** in left sidebar
4. Scroll to **Privileged Gateway Intents**
5. Toggle **ON**: `MESSAGE CONTENT INTENT`
6. Click **Save Changes**

⚠️ **Important**: If your bot is in 100+ servers, you'll need to request verification first.

### 2. Set Environment Variable (Already Done?)

Check if `DISCORD_BOT_TOKEN` is set in Deno Deploy:
- https://dash.deno.com/projects/spec-beanbot/settings

If not set:
```
DISCORD_BOT_TOKEN=your_bot_token_here
```

### 3. Gateway Event Forwarding (Choose One)

**Option A: Simple Discord.js Bot** (Recommended for testing)

Create a simple bot that forwards MESSAGE_CREATE events:

```javascript
// forward-events.js
const { Client, GatewayIntentBits } = require('discord.js');
const fetch = require('node-fetch');

const client = new Client({
  intents: [
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.MessageContent
  ]
});

client.on('messageCreate', async (message) => {
  if (message.channel.type === 1) { // DM channel
    await fetch('https://spec-beanbot.lazhannya.deno.net/api/gateway/discord-messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        channel_type: 1,
        author: {
          id: message.author.id,
          bot: message.author.bot
        },
        content: message.content
      })
    });
  }
});

client.login(process.env.DISCORD_BOT_TOKEN);
```

Run it:
```bash
npm install discord.js node-fetch
node forward-events.js
```

**Option B: Host on Deno Deploy**

Deploy a Deno script that runs a Discord bot and forwards events (requires long-running process support).

**Option C: Use Existing Bot**

If you already have a Discord bot running, add the MESSAGE_CREATE event handler to forward to your endpoint.

### 4. Test It!

1. Create a reminder in web interface: https://spec-beanbot.lazhannya.deno.net
2. Wait for delivery (or use test trigger)
3. Check your Discord DMs
4. Reply with: `okay`
5. Bot should confirm: ✅ Reminder acknowledged!
6. Check web interface - status should update

## Testing Without Full Gateway Setup

You can test the API endpoint directly:

```bash
# Simulate a Discord MESSAGE_CREATE event
curl -X POST https://spec-beanbot.lazhannya.deno.net/api/gateway/discord-messages \
  -H "Content-Type: application/json" \
  -d '{
    "channel_type": 1,
    "author": {
      "id": "YOUR_DISCORD_USER_ID",
      "bot": false
    },
    "content": "okay"
  }'
```

## What Changed for Users

**Before** (buttons):
```
🔔 Reminder
Complete the quarterly report

[Acknowledge] [Decline]
```

**Now** (reply):
```
🔔 **Reminder**

Complete the quarterly report

📝 **To respond:**
Reply with `okay` to acknowledge or `decline` to decline this reminder.
```

Users now type their response instead of clicking buttons.

## Supported Reply Keywords

### To Acknowledge
`okay`, `ok`, `yes`, `acknowledge`, `ack`, `done`, `✓`, `✅`

### To Decline
`decline`, `no`, `nope`, `skip`, `cancel`, `❌`

**Note**: Case doesn't matter! `OKAY`, `Okay`, and `okay` all work.

## Troubleshooting

### "Bot not responding to my messages"
→ Check MESSAGE_CONTENT intent is enabled  
→ Verify Gateway forwarding is running  
→ Check Deno Deploy logs for errors  

### "No pending reminder found"
→ Create a new reminder first  
→ Make sure reminder status is PENDING  
→ Verify you're the target user  

### "How do I see if it's working?"
→ Check Deno Deploy logs: https://dash.deno.com/projects/spec-beanbot/logs  
→ Look for: "=== DISCORD MESSAGE RECEIVED ==="  
→ Check "DM processing result" in logs  

## Need Help?

1. Read: `REPLY_BASED_ACKNOWLEDGEMENT_SETUP.md` (detailed guide)
2. Check: `IMPLEMENTATION_SUMMARY.md` (technical details)
3. Logs: https://dash.deno.com/projects/spec-beanbot/logs

## Why This Change?

**Problem**: Discord webhook verification kept failing with "interactions endpoint url could not be verified"

**Solution**: Eliminated webhooks entirely - now uses simple DM replies instead

**Benefits**:
- No more webhook configuration
- No more PUBLIC_KEY issues
- Simpler to debug
- More reliable

**Trade-off**: Users type instead of clicking buttons (but it's more reliable!)

## Timeline

- **2025-10-24**: Implemented reply-based system
- **Commit**: 6ad8e91
- **Status**: ✅ Code deployed, ⬜ Gateway setup needed

---

**Next Action**: Enable MESSAGE_CONTENT intent in Discord Developer Portal (Step 1 above)
