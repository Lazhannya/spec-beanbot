# Deno Deploy Deployment Guide

This guide explains how to deploy the Discord Assistant Bot to Deno Deploy.

## Quick Start

1. **Fork this repository** to your GitHub account
2. **Create a Deno Deploy project** at [dash.deno.com](https://dash.deno.com)
3. **Connect your GitHub repository** to the Deno Deploy project
4. **Configure environment variables** (see below)
5. **Deploy automatically** via GitHub Actions

## Environment Variables

Configure these environment variables in your Deno Deploy project dashboard:

### Required Discord Configuration
```bash
APP_ID=your_discord_app_id
DISCORD_TOKEN=your_discord_bot_token
PUBLIC_KEY=your_discord_public_key
DISCORD_CLIENT_ID=your_discord_client_id
DISCORD_REDIRECT_URI=https://your-deploy-url.deno.dev/auth/callback
```

### Webhook Configuration (Optional)
```bash
WEBHOOK_URL=https://your-n8n-instance.com/webhook/beanbot-mentions
WEBHOOK_SECRET=your_webhook_signature_secret
```

### Web Interface Configuration
```bash
SESSION_SECRET=your_secure_session_secret_key
```

### Logging Configuration
```bash
LOG_LEVEL=info
```

## Setup Instructions

### 1. Discord Bot Setup

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Create a new application
3. Go to "Bot" section and create a bot
4. Copy the bot token for `DISCORD_TOKEN`
5. Copy the application ID for `APP_ID` and `DISCORD_CLIENT_ID`
6. Go to "General Information" and copy the public key for `PUBLIC_KEY`

### 2. Deno Deploy Project Setup

1. Visit [Deno Deploy Dashboard](https://dash.deno.com)
2. Click "New Project"
3. Connect your GitHub account and select this repository
4. Set the entry point to: `discord-bot/main.ts`
5. Configure environment variables (see above)

### 3. GitHub Actions Setup

The repository includes a GitHub Actions workflow (`.github/workflows/deploy.yml`) that automatically deploys to Deno Deploy when you push to the main branch.

**Important**: Update the project name in `.github/workflows/deploy.yml`:
```yaml
project: "your-deno-deploy-project-name" # Replace with your actual project name
```

### 4. Discord Redirect URI

After deployment, update your Discord application's redirect URI:
1. Go to Discord Developer Portal → Your App → OAuth2
2. Add redirect URI: `https://your-deploy-url.deno.dev/auth/callback`

## Manual Deployment

You can also deploy manually using the Deno CLI:

```bash
# Install deployctl
deno install -A --global https://deno.land/x/deployctl/deployctl.ts

# Deploy from project root
deno task deploy
```

## Project Structure

```
/
├── .github/workflows/
│   └── deploy.yml          # GitHub Actions deployment workflow
├── discord-bot/            # Main application directory
│   ├── main.ts             # Entry point for Deno Deploy
│   ├── routes/             # Fresh routes
│   ├── lib/                # Core application logic
│   └── data/               # Embedded data (patterns, templates)
├── deno.json               # Root Deno configuration
├── .env.example            # Environment variable template
└── README.md
```

## Monitoring and Logs

- **Deno Deploy Dashboard**: Monitor deployments and view logs at [dash.deno.com](https://dash.deno.com)
- **Application Logs**: Available in the Deno Deploy project dashboard
- **GitHub Actions**: Monitor deployment status in your repository's Actions tab

## Troubleshooting

### Common Issues

1. **Environment Variables Not Set**
   - Ensure all required environment variables are configured in Deno Deploy
   - Check that variable names match exactly (case-sensitive)

2. **Discord Bot Not Responding**
   - Verify `DISCORD_TOKEN` is correct and the bot is in your server
   - Check that the bot has necessary permissions in your Discord server

3. **OAuth2 Redirect Errors**
   - Ensure `DISCORD_REDIRECT_URI` matches your deployed URL
   - Update Discord application's redirect URI settings

4. **Deployment Failures**
   - Check GitHub Actions logs for detailed error messages
   - Ensure `deno check` passes locally before pushing

### Health Check

The application includes a health check endpoint at `/api/health` that you can use to verify the deployment is working.

## Scaling and Performance

Deno Deploy automatically handles scaling, but consider these optimization tips:

1. **Deno KV**: The application uses Deno KV for data storage, which is optimized for edge computing
2. **Static Assets**: Cached automatically by Deno Deploy's CDN
3. **Cold Starts**: Minimal due to Deno's fast startup time

## Security Notes

- Never commit `.env` files to the repository
- Use strong, random values for `SESSION_SECRET` and `WEBHOOK_SECRET`
- Regularly rotate Discord bot tokens
- Monitor Deno Deploy logs for suspicious activity

## Support

For deployment issues:
- Check [Deno Deploy Documentation](https://deno.com/deploy/docs)
- Review [Fresh Framework Documentation](https://fresh.deno.dev)
- Check GitHub Actions logs for deployment errors