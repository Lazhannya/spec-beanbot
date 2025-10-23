# Production URLs - Quick Reference

## ✅ Correct Production URL

**Production Deployment**: `https://spec-beanbot.lazhannya.deno.net`

## Discord Interactions Endpoint URL

Set this in Discord Developer Portal > General Information > Interactions Endpoint URL:

```
https://spec-beanbot.lazhannya.deno.net/api/webhook/discord
```

## Quick Tests

```bash
# Health check
curl https://spec-beanbot.lazhannya.deno.net/api/health

# Webhook endpoint
curl https://spec-beanbot.lazhannya.deno.net/api/webhook/discord

# Debug endpoint (no signature verification)
curl https://spec-beanbot.lazhannya.deno.net/api/webhook/discord-debug
```

## Deno Deploy Dashboard

- **Project**: https://dash.deno.com/projects/spec-beanbot
- **Deployments**: https://dash.deno.com/projects/spec-beanbot/deployments
- **Logs**: https://dash.deno.com/projects/spec-beanbot/logs
- **Settings**: https://dash.deno.com/projects/spec-beanbot/settings

## Next Steps

1. Go to Discord Developer Portal: https://discord.com/developers/applications
2. Click your application
3. Go to **General Information**
4. Set **Interactions Endpoint URL** to:
   ```
   https://spec-beanbot.lazhannya.deno.net/api/webhook/discord
   ```
5. Click **Save Changes**
6. Watch Deno Deploy logs for PING verification
7. Test button clicks!

---

**Note**: The old URL `https://spec-beanbot-dpmetz5387en.lazhannya.deno.net` was a preview deployment URL. Now that master is the production branch, use the simpler URL: `https://spec-beanbot.lazhannya.deno.net`
