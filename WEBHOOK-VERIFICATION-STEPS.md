# Webhook Verification Instructions

**Status:** Fix deployed to production  
**Commit:** b4f57f6  
**Date:** October 24, 2025

## What Was Fixed

The Discord webhook signature verification was switched back to **TweetNaCl** library from crypto.subtle, which was causing Discord's PING verification to fail.

## Verification Steps

### 1. Wait for Deno Deploy to Redeploy

- Go to: https://dash.deno.com/projects/spec-beanbot/deployments
- Wait for the latest deployment to complete (usually < 1 minute)
- Look for deployment with commit `b4f57f6`
- Status should show: ✅ **Success**

### 2. Test Discord Webhook URL

Once deployment is complete:

1. Go to Discord Developer Portal: https://discord.com/developers/applications
2. Select your application (spec-beanbot)
3. Go to "General Information" in the left sidebar
4. Scroll down to "Interactions Endpoint URL"
5. Enter: `https://spec-beanbot.lazhannya.deno.net/api/webhook/discord`
6. Click "Save Changes"

### Expected Result

✅ **Success** - The URL should be saved without errors

Discord will send a PING request to verify the endpoint:
- Your webhook receives: `{"type": 1}` (PING)
- Your webhook responds: `{"type": 1}` (PONG)
- Discord validates the Ed25519 signature using your PUBLIC_KEY
- Discord saves the URL if signature is valid

### 3. Check Deno Deploy Logs (Optional)

To see the verification in action:

1. Go to: https://dash.deno.com/projects/spec-beanbot/logs
2. When you click "Save Changes" in Discord portal, you should see:
   ```
   === DISCORD WEBHOOK RECEIVED ===
   --- Signature Verification (TweetNaCl) ---
   Verification result: ✅ VALID
   🏓 Responding to Discord PING verification
   ```

### 4. Verify Discord's Response

If successful, you'll see:
- ✅ Green checkmark next to Interactions Endpoint URL
- No error messages
- URL is saved and persisted

If it fails, you'll see:
- ❌ Error message: "The specified interactions endpoint url could not be verified"
- URL is not saved

## Troubleshooting

### If Verification Still Fails

1. **Check Deno Deploy deployment status**
   - Ensure latest commit (b4f57f6) is deployed
   - Check deployment logs for any errors

2. **Verify PUBLIC_KEY environment variable**
   - Go to: https://dash.deno.com/projects/spec-beanbot/settings
   - Check that PUBLIC_KEY is set
   - Verify it matches Discord Developer Portal exactly

3. **Check Deno Deploy logs**
   - Look for "Signature verification result: false"
   - If you see this, PUBLIC_KEY might still be wrong
   - Copy PUBLIC_KEY from Discord portal again and update

4. **Test endpoint accessibility**
   - Run: `./test-discord-ping.ts`
   - Should show: "✅ Endpoint is accessible"
   - Should show: "Public Key Configured: true"

### If You See "Unsupported algorithm" Error

This means TweetNaCl didn't load correctly. Check:
1. Internet connectivity to cdn.skypack.dev
2. Deno Deploy can access external dependencies
3. No firewall blocking cdn.skypack.dev

## What's Different Now?

**Before (Broken):**
- Used native `crypto.subtle.Ed25519` API
- Required async key import
- Had subtle compatibility issues with Discord

**After (Fixed):**
- Uses TweetNaCl library (official Deno Deploy recommendation)
- Synchronous verification
- Proven to work with Discord webhooks

## Testing Button Interactions

After webhook URL is verified:

1. Create a test reminder (scheduled for near future)
2. Wait for reminder to be delivered to Discord DM
3. Click "Acknowledge" or "Decline" button
4. Button should work without "Interaction Failed" error
5. Check admin panel to see response was recorded

## Success Indicators

✅ Discord Developer Portal shows green checkmark  
✅ No error message when saving URL  
✅ Deno Deploy logs show "Verification result: ✅ VALID"  
✅ Button interactions work in Discord  
✅ Responses are recorded in database  

## Need Help?

If issues persist after following these steps:

1. Check WEBHOOK-FIX-ROOT-CAUSE.md for technical details
2. Review Deno Deploy logs for error messages
3. Verify all environment variables are set correctly
4. Ensure latest code is deployed (commit b4f57f6)

---

**Last Updated:** October 24, 2025  
**Fix Verified:** Ready for testing  
**Next Step:** Follow verification steps above
