# Discord Webhook Troubleshooting Guide

**Error:** "The specified interactions endpoint url could not be verified"  
**URL:** https://spec-beanbot.lazhannya.deno.net/api/webhook/discord

## Diagnosis Summary

✅ **Endpoint is accessible** - GET request returns 200 OK  
✅ **Public key is configured** - Environment variable PUBLIC_KEY is set  
✅ **Public key length is correct** - 64 characters (hex string)  
✅ **Code implementation is correct** - PING handler returns proper PONG response  
❌ **Discord verification failing** - PUBLIC_KEY mismatch likely

## Most Likely Cause

The PUBLIC_KEY environment variable in Deno Deploy does NOT match the Public Key shown in Discord Developer Portal.

## Step-by-Step Fix

### 1. Get the Correct Public Key from Discord

1. Go to Discord Developer Portal: https://discord.com/developers/applications
2. Select your application (spec-beanbot)
3. Go to "General Information" (left sidebar)
4. Find the "Public Key" field
5. Click "Copy" to copy the 64-character hex string
6. **IMPORTANT:** Make sure you copy the exact value with no extra spaces, newlines, or characters

### 2. Update Environment Variable in Deno Deploy

1. Go to Deno Deploy: https://dash.deno.com
2. Select your project: spec-beanbot
3. Go to "Settings" tab
4. Find the "Environment Variables" section
5. Look for `PUBLIC_KEY` variable
6. Click "Edit" or "Add" if it doesn't exist
7. **Paste the Public Key EXACTLY as copied from Discord**
8. Click "Save"

### 3. Redeploy (if needed)

Deno Deploy should automatically reload environment variables, but if not:

1. Make a small commit to trigger redeployment, or
2. Use Deno Deploy dashboard to manually redeploy

### 4. Test the Webhook in Discord Developer Portal

1. Go back to Discord Developer Portal
2. Go to "General Information"
3. Find "Interactions Endpoint URL"
4. Enter: `https://spec-beanbot.lazhannya.deno.net/api/webhook/discord`
5. Click "Save Changes"
6. Discord will send a PING request to verify
7. If successful, the URL will be saved
8. If it fails, check the next steps

### 5. Check Deno Deploy Logs

If verification still fails:

1. Go to Deno Deploy: https://dash.deno.com/projects/spec-beanbot/logs
2. Look for log entries when you click "Save Changes" in Discord portal
3. You should see:
   ```
   === DISCORD WEBHOOK RECEIVED ===
   Request URL: ...
   Signature verification result: true/false
   ```
4. If you see `Signature verification result: false`, the PUBLIC_KEY is still wrong

### 6. Common Mistakes

❌ **Extra whitespace:** The PUBLIC_KEY has spaces or newlines at the beginning/end  
❌ **Wrong application:** You copied the Public Key from a different Discord application  
❌ **Regenerated key:** Discord regenerated the Public Key (old one won't work)  
❌ **Case sensitivity:** The hex string is case-sensitive (usually lowercase)  
❌ **Copy/paste issue:** Some characters were missed or corrupted during copy

### 7. Verification Checklist

Before setting the webhook URL in Discord:

- [ ] PUBLIC_KEY in Deno Deploy is 64 characters long
- [ ] PUBLIC_KEY matches exactly what's in Discord Developer Portal
- [ ] No extra spaces/newlines in the environment variable
- [ ] Environment variable changes have been saved
- [ ] Deployment has reloaded (check logs for recent activity)
- [ ] GET request to webhook URL returns 200 OK (use test-discord-ping.ts)

### 8. Testing Script

Run this to verify webhook configuration:

```bash
./test-discord-ping.ts
```

Expected output:
```
✅ Endpoint is accessible
Public Key Configured: true
Public Key Length: 64
✅ Public key is configured with correct length
```

## Technical Details

### Why This Error Happens

When you save the Interactions Endpoint URL in Discord Developer Portal:

1. Discord sends a POST request to your endpoint
2. The request includes:
   - Body: `{"type": 1}` (PING interaction)
   - Headers:
     - `X-Signature-Ed25519`: Ed25519 signature of (timestamp + body)
     - `X-Signature-Timestamp`: Unix timestamp when request was sent
3. Your endpoint must:
   - Verify the signature using your Public Key
   - Respond with `{"type": 1}` (PONG) within 3 seconds
   - Return HTTP 200 status

If signature verification fails, Discord rejects the URL.

### Signature Verification Process

```typescript
// 1. Read raw body
const body = await req.text(); // '{"type":1}'

// 2. Get headers
const signature = req.headers.get("X-Signature-Ed25519");
const timestamp = req.headers.get("X-Signature-Timestamp");

// 3. Verify signature
const message = timestamp + body; // "1234567890{"type":1}"
const isValid = await crypto.subtle.verify(
  "Ed25519",
  publicKey, // This MUST match Discord's Public Key
  signatureBytes,
  messageBytes
);

// 4. If valid, respond with PONG
if (isValid && interaction.type === 1) {
  return new Response('{"type":1}', {
    status: 200,
    headers: {"Content-Type": "application/json"}
  });
}
```

### Why PUBLIC_KEY Must Match

The signature is created using Discord's **Private Key** (which Discord keeps secret).  
The signature can only be verified using the matching **Public Key** (which Discord shows you).

If the PUBLIC_KEY in your environment doesn't match Discord's Public Key:
- ❌ Signature verification will **always fail**
- ❌ Discord will **reject the webhook URL**
- ❌ Interactions will **not work**

## Recent Changes Investigation

The webhook code has NOT changed in the most recent commits:
- Latest commit: `b941d0f` (P8 Security Implementations)
- Webhook file unchanged since: `f5ffa39` (Redundant Webhook Endpoint Removal)

If it was working before and stopped working recently, possible causes:
1. ⚠️ Discord regenerated your Public Key (check Discord portal)
2. ⚠️ Environment variable was accidentally changed/deleted
3. ⚠️ Deployment was rolled back to an older version
4. ⚠️ Discord changed their verification algorithm (unlikely)

## Need More Help?

If you've followed all steps and it still doesn't work:

1. Check if Discord is having outages: https://discordstatus.com
2. Try regenerating the Public Key in Discord Developer Portal (you'll need to update PUBLIC_KEY again)
3. Check Deno Deploy logs for error messages
4. Verify your Discord application is not in a suspended/limited state

## Success Indicators

When everything is working:

✅ Discord Developer Portal shows green checkmark next to Interactions Endpoint URL  
✅ Deno Deploy logs show: `Signature verification result: true`  
✅ Deno Deploy logs show: `🏓 Responding to Discord PING verification`  
✅ Clicking buttons in Discord DMs triggers webhook handler  
✅ Reminder responses are recorded in the database  

---

**Last Updated:** 2025-10-24  
**Created By:** Automated troubleshooting script  
**Next Steps:** Follow Step 1-4 above to fix the PUBLIC_KEY mismatch
