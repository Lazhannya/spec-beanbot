# spec-beanbot Development Guidelines

Auto-generated from all feature plans. Last updated: 2025-10-22

## Active Technologies
- TypeScript 5.2+ with Deno 1.40+ + Fresh 1.6+, Deno KV, Discord API (native fetch) (001-reminder-management-interface)
- Deno Deploy Cron API, Enhanced Timezone Handling (Intl.DateTimeFormat), KV Delivery Queue, System Health Monitoring (002-fix-scheduled-delivery)

## Project Structure
```
discord-bot/
  lib/
    scheduler/          # NEW: Delivery scheduling system
    reminder/          # Enhanced reminder logic
  _fresh/             # Fresh framework application
  tests/
    scheduler/        # NEW: Scheduling system tests
    timezone/        # NEW: Timezone conversion tests
```

## Commands
deno task dev && deno test && deno lint

## Code Style
TypeScript 5.2+ with Deno 1.40+: Follow standard conventions, modular design under 200 lines per module

## Recent Changes
- master: Added Enhanced delivery system with timezone accuracy and autonomous operation
- 002-fix-scheduled-delivery: Added Deno Deploy Cron API, Enhanced Timezone Handling (Intl.DateTimeFormat), KV Delivery Queue, System Health Monitoring
- 001-reminder-management-interface: Added TypeScript 5.2+ with Deno 1.40+ + Fresh 1.6+, Deno KV, Discord API (native fetch)

<!-- MANUAL ADDITIONS START -->
<!-- MANUAL ADDITIONS END -->
