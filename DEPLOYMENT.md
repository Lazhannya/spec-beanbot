# Deno Deploy Configuration Guide

## Environment Variables Required

For successful deployment to Deno Deploy, ensure the following environment variables are set in your Deno Deploy project settings:

### Required (Production)
```bash
# Discord Bot Configuration
APP_ID=your_actual_discord_app_id
DISCORD_TOKEN=your_actual_discord_bot_token
PUBLIC_KEY=your_actual_discord_public_key

# OAuth2 Configuration
DISCORD_CLIENT_ID=your_actual_discord_client_id
DISCORD_CLIENT_SECRET=your_actual_discord_client_secret
DISCORD_REDIRECT_URI=https://your-deployment-url.deno.dev/auth/callback

# Admin Configuration
ADMIN_USER_IDS=comma,separated,discord,user,ids
```

### Optional (Will use defaults if not set)
```bash
# Webhook Configuration
WEBHOOK_URL=your_webhook_url_if_needed
WEBHOOK_SECRET=your_webhook_secret

# Web Interface Configuration  
SESSION_SECRET=your_secure_random_session_secret

# Logging Configuration
LOG_LEVEL=info
LOG_PRETTY_PRINT=false

# Session Configuration
SESSION_TIMEOUT_HOURS=24
SESSION_REFRESH_THRESHOLD_HOURS=2
```

## Deployment Steps

1. **Set Environment Variables**: In your Deno Deploy project dashboard, go to Settings → Environment Variables and add all required variables.

2. **Deploy**: Push your code to the connected repository or use the CLI:
   ```bash
   deployctl deploy --project=your-project-name --entrypoint=main.ts
   ```

3. **Verify**: Check the deployment logs to ensure no environment variable errors.

## Notes

- The application uses `setup-env.ts` to provide safe defaults for optional variables
- Required variables (Discord credentials, admin user IDs) must be set in production
- The app will automatically detect if running on Deno Deploy via `DENO_DEPLOYMENT_ID` environment variable
- All environment variables are validated on startup with helpful error messages

## Security

- Never commit actual secrets to your repository
- Use different Discord applications for development vs production
- Rotate secrets regularly
- Limit admin user IDs to trusted users only