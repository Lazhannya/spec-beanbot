# Discord Interactions Setup

This guide explains how to configure your Discord bot to handle button interactions (Acknowledge/Decline).

## Problem

When users click "Acknowledge" or "Decline" buttons on reminder messages, Discord shows "interaction failed" error.

## Solution

The bot needs an **Interactions Endpoint URL** configured in the Discord Developer Portal.

## Setup Steps

### 1. Get Your Application's Public Key

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Select your application
3. Go to **General Information**
4. Copy the **PUBLIC KEY**
5. Add it to your `.env` file:
   ```
   PUBLIC_KEY=your_public_key_here
   ```

### 2. Configure Interactions Endpoint URL

1. In the Discord Developer Portal (same application)
2. Go to **General Information**
3. Find **Interactions Endpoint URL**
4. Enter your webhook URL:
   ```
   https://your-domain.com/api/webhook/discord
   ```
   
   **For local development:**
   - You need to use a tunnel service like [ngrok](https://ngrok.com/)
   - Run: `ngrok http 8000` (or whatever port your app uses)
   - Use the ngrok HTTPS URL: `https://abc123.ngrok.io/api/webhook/discord`

5. Click **Save Changes**
6. Discord will send a PING request to verify the endpoint
   - If verification fails, check your server logs
   - Make sure `PUBLIC_KEY` is correct in your `.env`

### 3. Verify Configuration

1. Start your server
2. Check logs for: `"Responding to Discord PING"`
3. Send a test reminder through the dashboard
4. Click the "Acknowledge" or "Decline" button
5. You should see:
   - The button should work without "interaction failed" error
   - Message should update with confirmation
   - Buttons should disappear after clicking
   - Server logs should show: `"Button interaction: acknowledge_reminder_<id> from user <user_id>"`

## How It Works

1. **User clicks button** → Discord sends POST request to `/api/webhook/discord`
2. **Signature verification** → Validates request is from Discord using Ed25519 signature
3. **Immediate response** → Responds within 3 seconds to prevent timeout
4. **Update message** → Removes buttons and shows confirmation text
5. **Background processing** → Logs response (can be extended to update database)

## Troubleshooting

### "interaction failed" error
- Check if Interactions Endpoint URL is configured
- Verify URL is publicly accessible (use ngrok for local dev)
- Check server logs for signature verification errors
- Ensure `PUBLIC_KEY` matches the one in Discord portal

### Signature verification fails
- Double-check `PUBLIC_KEY` in `.env`
- Make sure there are no extra spaces or newlines
- Verify the key matches exactly in Discord portal

### Endpoint not receiving requests
- Confirm URL is publicly accessible
- Test with: `curl https://your-domain.com/api/webhook/discord`
- Check firewall/security group settings
- For ngrok, ensure tunnel is active

### Timeout errors
- Response must be sent within 3 seconds
- Current implementation responds immediately before processing
- Check server logs for slow database operations

## Environment Variables

Required in `.env`:

```bash
# Discord Bot Configuration
DISCORD_TOKEN=your_bot_token
PUBLIC_KEY=your_public_key
APP_ID=your_app_id
DISCORD_CLIENT_ID=your_client_id
DISCORD_CLIENT_SECRET=your_client_secret
```

## Testing

1. Create a reminder in the dashboard
2. Use "Test" button to send immediately
3. Check Discord DMs for the reminder message
4. Click "Acknowledge" button
5. Message should update with: ✅ **Reminder acknowledged!** Thank you for confirming.
6. Buttons should disappear

## Future Enhancements

The current implementation logs button clicks. To fully integrate:

1. **Update reminder status** in database when acknowledged/declined
2. **Cancel escalation** if reminder is acknowledged
3. **Track response history** for audit trail
4. **Send notifications** to admins when reminders are declined

See `routes/api/webhook/discord.ts` function `processReminderResponse()` for implementation details.
