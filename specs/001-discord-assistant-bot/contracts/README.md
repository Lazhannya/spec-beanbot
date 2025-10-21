# Discord Bot API Contracts

This directory contains API contract definitions for the Personal Assistant Discord Bot.

## Contract Files

- `webhook-api.yaml`: n8n webhook integration endpoints
- `web-api.yaml`: Fresh web interface API endpoints  
- `discord-events.yaml`: Discord bot event handling contracts

## Contract Testing

All contracts must have corresponding tests in `/bot/tests/contract/` and `/web/tests/integration/` following the TDD requirements from the constitution.

## Validation

Contracts are validated against:
1. Discord API specifications
2. n8n webhook requirements  
3. Deno Fresh routing conventions
4. OpenAPI 3.0 standards