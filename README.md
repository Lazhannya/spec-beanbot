# Discord Assistant Bot

A sophisticated Discord bot built with Deno Fresh that provides reminder
management, pattern-based text recognition, and webhook integration with n8n
workflows.

## 🚀 Quick Deploy to Deno Deploy

[![Deploy](https://deno.com/deno-deploy-button.svg)](https://dash.deno.com/new?url=https://github.com/Lazhannya/spec-beanbot&env=DISCORD_TOKEN,APP_ID,PUBLIC_KEY,DISCORD_CLIENT_ID)

## Features

### 📅 Reminder Management

- **Web Interface**: Create and manage reminders through a user-friendly web
  interface
- **CLI Interface**: Command-line tools for power users
- **Smart Scheduling**: Flexible scheduling with templates and escalation
- **Discord Integration**: Receive reminders directly in Discord channels

### 🤖 Pattern Recognition

- **Text Analysis**: Automatically detect patterns in Discord messages
- **Configurable Responses**: Set up automated reactions, messages, or webhook
  calls
- **Category-Based**: Organize patterns by help, emergency, greeting, etc.
- **Regex Support**: Advanced pattern matching with regular expressions

### 🔗 Webhook Integration

- **n8n Workflows**: Forward Discord mentions to n8n for complex automation
- **Retry Logic**: Robust delivery with exponential backoff
- **Signature Verification**: Secure webhook authentication

### 🔐 Authentication

- **Discord OAuth2**: Secure login with Discord accounts
- **Session Management**: Persistent user sessions
- **Permission Control**: User-based access control

## 🛠️ Technology Stack

- **Runtime**: [Deno](https://deno.land/) with TypeScript
- **Framework**: [Fresh](https://fresh.deno.dev/) for server-side rendering
- **Database**: [Deno KV](https://deno.com/kv) for edge-optimized storage
- **Deployment**: [Deno Deploy](https://deno.com/deploy) for global edge hosting
- **Discord**: Discord.js for bot interactions

## 📋 Prerequisites

- Discord Application with Bot Token
- Deno Deploy account (for deployment)
- Optional: n8n instance for webhook automation

## 🚀 Deployment

### Option 1: One-Click Deploy

Click the deploy button above and follow the setup wizard.

### Option 2: Manual Setup

1. **Clone and Deploy**
   ```bash
   git clone https://github.com/Lazhannya/spec-beanbot.git
   cd spec-beanbot
   ```

2. **Environment Setup**
   ```bash
   cp .env.example .env
   # Edit .env with your Discord bot credentials
   ```

3. **Deploy to Deno Deploy**
   ```bash
   deno task deploy
   ```

For detailed deployment instructions, see [DEPLOYMENT.md](docs/DEPLOYMENT.md).

## 🔧 Development

### Local Development

```bash
# Clone the repository
git clone https://github.com/Lazhannya/spec-beanbot.git
cd spec-beanbot

# Copy environment template
cp .env.example .env

# Edit .env with your Discord credentials
# Start development server
deno task dev
```

The application will be available at `http://localhost:8001`.

### Project Structure

```
spec-beanbot/
├── discord-bot/           # Main application
│   ├── main.ts           # Entry point
│   ├── routes/           # Fresh routes
│   ├── lib/              # Core logic
│   ├── data/             # Templates and patterns
│   └── scripts/          # CLI tools
├── docs/                 # Documentation
├── specs/                # Project specifications
└── .github/workflows/    # CI/CD
```

### Available Commands

```bash
# Development
deno task dev              # Start development server
deno task check            # Run linting and type checking

# Production
deno task start            # Start production server
deno task deploy           # Deploy to Deno Deploy

# CLI Tools
deno task reminder         # Reminder management CLI
```

## 📚 Documentation

- [Deployment Guide](docs/DEPLOYMENT.md) - Complete deployment instructions
- [API Documentation](discord-bot/docs/API.md) - REST API reference
- [CLI Documentation](discord-bot/docs/CLI.md) - Command-line interface guide

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes and test them
4. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file
for details.

## 🆘 Support

- **Documentation**: Check the [docs/](docs/) directory
- **Issues**: Report bugs via
  [GitHub Issues](https://github.com/Lazhannya/spec-beanbot/issues)
- **Discord**: Join our Discord server for community support

## 🎯 Project Status

This project is actively developed and maintained. See
[tasks.md](specs/001-discord-assistant-bot/tasks.md) for current development
progress.

### Completed Features

- ✅ Discord webhook integration
- ✅ Reminder management system
- ✅ Pattern recognition engine
- ✅ Web interface
- ✅ CLI tools
- ✅ Deno Deploy optimization

### Planned Features

- 🔄 Advanced pattern management UI
- 🔄 Enhanced notification escalation
- 🔄 Analytics dashboard
- 🔄 Multi-server support

---

Made with ❤️ using [Deno](https://deno.land/) and
[Fresh](https://fresh.deno.dev/)
