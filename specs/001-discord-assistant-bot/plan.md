# Implementation Plan: Personal Assistant Discord Bot

**Branch**: `001-discord-assistant-bot` | **Date**: 2025-10-21 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/001-discord-assistant-bot/spec.md`

## Summary

Build a modular Discord bot using Deno and Deno Fresh that integrates with existing n8n workflows via webhooks, provides web-based reminder management with escalation capabilities, and supports configurable text pattern recognition. Deployed on Deno Deploy with embedded data modules for simplicity and ease of management.

## Technical Context

**Language/Version**: Deno 2.0+ with TypeScript strict mode  
**Primary Dependencies**: Deno Fresh, discord-deno library, @std/http for webhooks  
**Storage**: Embedded data modules for reminders and patterns, Deno KV for sessions and temporary data  
**Testing**: Deno's built-in test runner with std/testing assertions  
**Target Platform**: Deno Deploy (serverless edge runtime)  
**Project Type**: web - Single Fresh application with embedded Discord bot functionality  
**Performance Goals**: 99% webhook delivery within 5 seconds, 100 concurrent reminders, <3s web interface load  
**Constraints**: Deno Deploy limitations, Discord API rate limits, <200ms webhook response time, stateless deployment  
**Scale/Scope**: Single Discord server, <100 concurrent users, cloud-native architecture for Deno Deploy

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**✓ I. Modular Library Architecture**: Each feature (webhook handler, reminder system, text recognition) implemented as standalone libraries with clear interfaces

**✓ II. CLI-First Development**: All libraries expose CLI functionality before Discord integration (webhook CLI, reminder CLI, pattern CLI)

**✓ III. Test-Driven Development**: TDD mandatory with comprehensive test coverage for all modules and Discord API mocking

**✓ IV. Integration & Contract Testing**: Focus on Discord API contracts, webhook reliability, reminder flows, and Fresh interface integration

**✓ V. Observability & Reliability**: Structured logging, error tracking, webhook retry logic, and reminder delivery guarantees

**✓ Technology Stack Compliance**: Deno 2.0+, TypeScript strict mode, Fresh web framework, discord-deno library, Deno Deploy deployment

**✓ Security Requirements**: Discord OAuth2, input validation, webhook signature verification, XSS protection

**✓ Deployment Constraints**: Stateless architecture for Deno Deploy, embedded data for simplicity, Deno KV for persistence

## Project Structure

### Documentation (this feature)

```
specs/[###-feature]/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```
routes/                 # Fresh file-based routing
├── api/               # API endpoints for reminders, patterns, webhooks
│   ├── discord/       # Discord webhook handlers  
│   ├── reminders/     # Reminder CRUD operations
│   └── patterns/      # Text pattern management
├── auth/              # Discord OAuth2 authentication routes
├── admin/             # Admin interface routes
└── index.tsx          # Main dashboard page

islands/               # Interactive Fresh components
├── ReminderForm.tsx   # Reminder creation/editing
├── PatternForm.tsx    # Pattern management
├── ReminderList.tsx   # Active reminders display
└── PatternList.tsx    # Pattern configuration display

components/            # Reusable UI components
├── ui/               # Base UI components (buttons, forms, etc.)
├── layout/           # Layout components (nav, header, footer)
└── discord/          # Discord-specific components

lib/                  # Core business logic libraries
├── discord/          # Discord bot functionality
│   ├── client.ts     # Discord client setup
│   ├── handlers.ts   # Event handlers
│   └── commands.ts   # Bot commands
├── reminders/        # Reminder system
│   ├── scheduler.ts  # Reminder scheduling logic
│   ├── delivery.ts   # Message delivery system
│   └── escalation.ts # Timeout escalation
├── patterns/         # Text pattern recognition
│   ├── matcher.ts    # Pattern matching engine
│   ├── registry.ts   # Pattern registry
│   └── responses.ts  # Response handling
├── webhooks/         # n8n webhook integration
│   ├── client.ts     # Webhook HTTP client
│   ├── retry.ts      # Retry logic with backoff
│   └── auth.ts       # Signature verification
└── utils/            # Shared utilities
    ├── logger.ts     # Structured logging
    ├── config.ts     # Environment configuration
    └── validation.ts # Input validation

data/                 # Embedded data modules (editable)
├── reminders.ts      # In-memory reminder storage
├── patterns.ts       # Text pattern definitions
├── users.ts          # User session management
└── interactions.ts   # Bot interaction logs

static/               # Static assets
├── css/              # Stylesheets
├── js/               # Client-side JavaScript
└── images/           # Images and icons

tests/
├── integration/      # End-to-end tests
├── unit/            # Unit tests for individual modules
└── fixtures/        # Test data and mocks

scripts/
├── deploy/          # Deno Deploy deployment scripts
├── dev/             # Development utilities
└── cli/             # CLI interfaces for each module

deno.json            # Deno configuration
deploy.yml           # Deno Deploy configuration
README.md            # Project documentation
```

**Structure Decision**: Unified Fresh application structure optimized for Deno Deploy deployment. The Discord bot functionality is integrated into the web application rather than running as a separate service, leveraging Fresh's API routes for webhook handling and bot operations. Data is embedded in TypeScript modules for easy editing and version control, with Deno KV used for runtime state and sessions.

## Complexity Tracking

*Fill ONLY if Constitution Check has violations that must be justified*

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |

