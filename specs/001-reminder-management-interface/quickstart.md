# Quickstart: Reminder Management Web Interface

**Feature**: Reminder Management Web Interface  
**Date**: 2025-10-22  
**Prerequisites**: Existing Discord bot, Deno Deploy account

## Development Setup

### 1. Install Deno
```bash
# Install Deno (if not already installed)
curl -fsSL https://deno.land/install.sh | sh

# Verify installation
deno --version
```

### 2. Clone and Navigate
```bash
cd /home/vitruvia/workspace/spec-beanbot
git checkout 001-reminder-management-interface
```

### 3. Environment Configuration
```bash
# Copy environment template
cp .env.example .env.local

# Edit environment variables
cat > .env.local << EOF
# Discord Bot Configuration
DISCORD_TOKEN=your_bot_token_here
DISCORD_CLIENT_ID=your_client_id_here
DISCORD_CLIENT_SECRET=your_client_secret_here
DISCORD_REDIRECT_URI=http://localhost:8000/auth/callback

# Web Interface Configuration
SESSION_SECRET=your_session_secret_key_here
ADMIN_GUILD_ID=your_discord_server_id_here

# Development Settings
LOG_LEVEL=debug
NODE_ENV=development
EOF
```

### 4. Initialize Fresh Application
```bash
# Create Fresh application structure
mkdir -p discord-bot/_fresh/{routes,islands,components,static}
mkdir -p discord-bot/lib/{reminder,discord,auth,kv}
mkdir -p discord-bot/types
mkdir -p discord-bot/tests/{unit,integration}

# Create deno.json configuration
cat > deno.json << EOF
{
  "tasks": {
    "start": "deno run -A --watch discord-bot/main.ts",
    "dev": "deno run -A --watch=static/,routes/ discord-bot/main.ts",
    "build": "deno run -A discord-bot/_fresh/dev.ts build",
    "preview": "deno run -A discord-bot/main.ts",
    "test": "deno test -A",
    "lint": "deno lint",
    "fmt": "deno fmt"
  },
  "imports": {
    "$fresh/": "https://deno.land/x/fresh@1.6.8/",
    "preact": "https://esm.sh/preact@10.19.6",
    "preact/": "https://esm.sh/preact@10.19.6/",
    "@preact/signals": "https://esm.sh/*@preact/signals@1.2.2",
    "@preact/signals-core": "https://esm.sh/*@preact/signals-core@1.5.1",
    "twind": "https://esm.sh/twind@0.16.19",
    "twind/": "https://esm.sh/twind@0.16.19/"
  },
  "compilerOptions": {
    "jsx": "react-jsx",
    "jsxImportSource": "preact",
    "strict": true
  },
  "exclude": ["**/_fresh/*"]
}
EOF
```

### 5. Start Development Server
```bash
# Start the development server
deno task dev

# Server will be available at http://localhost:8000
```

## Project Structure Verification

After setup, verify this structure exists:
```
discord-bot/
├── _fresh/                 # Fresh framework files
│   ├── routes/            # Fresh route handlers
│   ├── islands/          # Interactive components
│   ├── components/       # Server-side components
│   └── static/          # Static assets
├── lib/                 # Business logic modules
│   ├── reminder/        # Reminder domain logic
│   ├── discord/         # Discord API integration
│   ├── auth/           # Authentication utilities
│   └── kv/             # KV database abstractions
├── types/              # TypeScript interfaces
└── tests/              # Test files
    ├── unit/          # Unit tests
    └── integration/   # Integration tests
```

## Initial Implementation Checklist

### Phase 1: Core Infrastructure
- [ ] Fresh application bootstrap (`main.ts`)
- [ ] Deno KV connection and schema
- [ ] Discord OAuth authentication flow
- [ ] Basic routing structure
- [ ] TypeScript interfaces from data model

### Phase 2: Reminder CRUD
- [ ] Create reminder API endpoint
- [ ] List reminders API endpoint
- [ ] Update reminder API endpoint
- [ ] Delete reminder API endpoint
- [ ] Reminder form components

### Phase 3: Discord Integration
- [ ] Discord client wrapper
- [ ] Reminder delivery service
- [ ] Response webhook handler
- [ ] User validation utilities

### Phase 4: Web Interface
- [ ] Dashboard page with statistics
- [ ] Reminder list page with filtering
- [ ] Create/edit reminder forms
- [ ] Reminder detail page

### Phase 5: Testing Features
- [ ] Test trigger API endpoint
- [ ] Test execution tracking
- [ ] Test result display
- [ ] Error handling and logging

## Quick Commands

### Development
```bash
# Format code
deno fmt

# Lint code
deno lint

# Run tests
deno test -A

# Type check
deno check discord-bot/main.ts
```

### Testing Discord Integration
```bash
# Test Discord user validation
curl -X POST http://localhost:8000/api/discord/validate \
  -H "Content-Type: application/json" \
  -d '{"userId": "123456789012345678"}'

# Test reminder creation
curl -X POST http://localhost:8000/api/reminders \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $SESSION_TOKEN" \
  -d '{
    "content": "Test reminder message",
    "targetUserId": "123456789012345678",
    "scheduledTime": "2025-10-23T10:00:00Z"
  }'
```

### Debugging
```bash
# View KV database contents (development)
deno eval "
const kv = await Deno.openKv();
for await (const entry of kv.list({ prefix: ['reminders'] })) {
  console.log(entry.key, entry.value);
}
kv.close();
"

# Check Fresh route generation
deno run -A discord-bot/_fresh/dev.ts routes

# Monitor Discord webhook events
tail -f logs/discord-webhooks.log
```

## Deployment to Deno Deploy

### 1. Prepare for Deployment
```bash
# Ensure all environment variables are set
deno task lint
deno task test
deno task build
```

### 2. Deploy to Deno Deploy
```bash
# Using deployctl (install if needed)
deno install -A --unstable-kv https://deno.land/x/deploy/deployctl.ts

# Deploy to Deno Deploy
deployctl deploy \
  --project=spec-beanbot \
  --env-file=.env.production \
  discord-bot/main.ts
```

### 3. Configure Production Environment
```bash
# Set environment variables in Deno Deploy dashboard
DISCORD_TOKEN=your_production_bot_token
DISCORD_CLIENT_ID=your_production_client_id
DISCORD_CLIENT_SECRET=your_production_client_secret
DISCORD_REDIRECT_URI=https://your-project.deno.dev/auth/callback
SESSION_SECRET=your_production_session_secret
ADMIN_GUILD_ID=your_production_discord_server_id
LOG_LEVEL=info
NODE_ENV=production
```

## Verification Steps

### 1. Authentication Flow
1. Navigate to `http://localhost:8000/auth/login`
2. Complete Discord OAuth flow
3. Verify redirect to dashboard
4. Check admin session in browser cookies

### 2. Reminder Management
1. Create a test reminder with future timestamp
2. Verify reminder appears in list
3. Edit reminder content and schedule
4. Test reminder trigger functionality
5. Delete test reminder

### 3. Discord Integration
1. Verify Discord bot can send DMs
2. Test user response tracking
3. Validate escalation workflow
4. Check error handling for invalid users

### 4. Performance Validation
1. Load reminder list with 100+ items (<3s)
2. Create new reminder (<2min including form)
3. Test trigger execution (<15s)
4. Verify delivery timing (<30s for scheduled)

## Troubleshooting

### Common Issues

**Fresh Routes Not Found**
```bash
# Regenerate Fresh manifest
deno run -A discord-bot/_fresh/dev.ts build
```

**Discord OAuth Errors**
- Verify redirect URI matches exactly in Discord app settings
- Check Discord client ID and secret are correct
- Ensure bot has necessary permissions in target server

**KV Database Issues**
```bash
# Clear local KV database for fresh start
rm -rf ~/.cache/deno/location_data/
```

**Import Resolution Errors**
```bash
# Clear Deno cache and reinstall dependencies
deno cache --reload discord-bot/main.ts
```

### Performance Issues
- Check bundle size with `deno info discord-bot/main.ts`
- Verify KV queries use proper indexing
- Monitor cold start times in Deno Deploy dashboard
- Review Fresh island usage (should be minimal)

### Logging and Monitoring
```bash
# View structured logs in development
export LOG_LEVEL=debug
deno task dev

# Monitor production logs in Deno Deploy
# Access via Deno Deploy project dashboard
```