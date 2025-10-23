# Discord Interaction Debugging Guide

## Current Status
The webhook endpoint is deployed at:
```
https://spec-beanbot-adyp6j75vwy3.lazhannya.deno.net/api/webhook/discord
```

## Enhanced Debugging Logs

I've added comprehensive logging throughout the interaction flow. Here's what to look for:

### 1. Check Endpoint Accessibility

Test if the endpoint is reachable:
```bash
curl https://spec-beanbot-adyp6j75vwy3.lazhannya.deno.net/api/webhook/discord
```

Expected response:
```json
{
  "status": "ok",
  "message": "Discord webhook endpoint is accessible",
  "publicKeyConfigured": true,
  "endpoint": "/api/webhook/discord"
}
```

Or use the test script:
```bash
./test-webhook.sh https://spec-beanbot-adyp6j75vwy3.lazhannya.deno.net
```

### 2. Monitor Deno Deploy Logs

Go to: https://dash.deno.com/projects/spec-beanbot/logs

When you click a button in Discord, you should see:

#### Successful Flow:
```
=== DISCORD WEBHOOK RECEIVED ===
Request URL: https://...
Body length: 1234
Signature present: true
Timestamp present: true
--- Signature Verification Debug ---
Public key bytes length: 32
✅ Public key imported successfully
Verification result: ✅ VALID
✅ Interaction parsed successfully
Interaction type: 3
🔘 Button interaction detected
Button clicked - Custom ID: acknowledge_reminder_123, User: 987654321
✅ Parsed - Action: acknowledge, Reminder ID: 123
✅ Response sent successfully
```

#### Failed Signature Verification:
```
=== DISCORD WEBHOOK RECEIVED ===
Signature present: true
Timestamp present: true
--- Signature Verification Debug ---
Verification result: ❌ INVALID
❌ Invalid Discord signature
This could mean:
1. PUBLIC_KEY in .env doesn't match Discord Developer Portal
2. Request is not from Discord
3. Request was modified in transit
```

### 3. Common Issues and Solutions

#### Issue: "Invalid Discord signature"

**Cause**: PUBLIC_KEY mismatch

**Solution**:
1. Go to Discord Developer Portal: https://discord.com/developers/applications
2. Select your application
3. Go to **General Information**
4. Copy the **PUBLIC KEY** (should be 64 hex characters)
5. In Deno Deploy dashboard:
   - Go to Settings > Environment Variables
   - Set `PUBLIC_KEY` to the exact value (no spaces, no newlines)
   - Redeploy if needed

**Verify**:
```bash
# Check if PUBLIC_KEY is set correctly
curl https://spec-beanbot-adyp6j75vwy3.lazhannya.deno.net/api/webhook/discord | jq .publicKeyConfigured
# Should return: true
```

#### Issue: No logs appear when clicking button

**Cause**: Discord isn't sending requests to your endpoint

**Solution**:
1. Verify Interactions Endpoint URL in Discord Developer Portal
2. Go to your app > General Information
3. Check **Interactions Endpoint URL** is set to:
   ```
   https://spec-beanbot-adyp6j75vwy3.lazhannya.deno.net/api/webhook/discord
   ```
4. Click "Save Changes"
5. Discord will send a PING to verify - check logs for "🏓 Responding to Discord PING verification"

#### Issue: "This interaction failed"

**Cause**: Response took longer than 3 seconds OR invalid response format

**Check logs for**:
- Time between "DISCORD WEBHOOK RECEIVED" and "Response sent successfully"
- Should be < 3 seconds
- Any errors in signature verification or parsing

### 4. Testing Locally with ngrok

If you want to test locally before deploying:

```bash
# Terminal 1: Start the server
deno task start

# Terminal 2: Start ngrok
ngrok http 8000

# Copy the HTTPS URL (e.g., https://abc123.ngrok.io)
# Update Discord Developer Portal Interactions Endpoint URL to:
# https://abc123.ngrok.io/api/webhook/discord
```

Then watch the terminal for detailed logs.

### 5. Manual Test Flow

1. **Send a test reminder** via dashboard
2. **Check Discord DMs** for the message with buttons
3. **Click "Acknowledge"** button
4. **Check Deno Deploy logs** immediately

Expected log sequence:
```
=== DISCORD WEBHOOK RECEIVED ===
→ Signature verification
→ ✅ Interaction parsed
→ 🔘 Button interaction detected
→ ✅ Response sent successfully
```

### 6. Debugging Checklist

- [ ] Endpoint is accessible (GET request returns 200 OK)
- [ ] PUBLIC_KEY is configured in Deno Deploy
- [ ] PUBLIC_KEY matches Discord Developer Portal exactly
- [ ] Interactions Endpoint URL is set in Discord Portal
- [ ] Endpoint URL uses HTTPS (required by Discord)
- [ ] Button custom_id matches pattern: `acknowledge_reminder_*` or `decline_reminder_*`

### 7. What Each Log Means

| Log Message | Meaning |
|-------------|---------|
| `=== DISCORD WEBHOOK RECEIVED ===` | Discord sent a request to your endpoint |
| `Signature present: true` | Discord included security signature |
| `Public key configured: true` | Your app has PUBLIC_KEY set |
| `Verification result: ✅ VALID` | Signature verification passed |
| `Interaction type: 1` | PING (Discord testing endpoint) |
| `Interaction type: 3` | MESSAGE_COMPONENT (button click) |
| `🔘 Button interaction detected` | Button click recognized |
| `✅ Response sent successfully` | Your app responded to Discord in time |

### 8. Alternative: Bypass Webhooks (Not Recommended)

If webhooks continue to fail, you could theoretically:

**Option A: Remove buttons entirely**
- Just send text messages without interactive components
- Users reply with text instead of clicking buttons
- Requires Discord message intent permissions

**Option B: Use Discord bot commands**
- Users type `/acknowledge` commands
- Requires slash command registration
- More complex setup

**Option C: Poll for message reactions**
- Add emoji reactions instead of buttons
- Bot polls for reactions periodically
- Higher latency, less reliable

However, **webhooks are the recommended approach** and should work once configured correctly.

### 9. Next Debugging Step

If it's still failing after checking all the above:

1. **Share the Deno Deploy logs** from when you click the button
2. **Verify PUBLIC_KEY** in Discord Portal matches what's in Deno Deploy
3. **Test the PING** by clicking "Save Changes" in Discord Portal's Interactions Endpoint URL section

The detailed logs will show us exactly where it's failing!
