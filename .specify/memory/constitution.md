# [Deno_BeanBot] Constitution

Personal Assistant Discord Bot Constitution

## Core Principles

### I. Modular Library Architecture

Every bot feature starts as a standalone, reusable library; Each module
(reminder system, text recognition, webhook handlers) must be self-contained
with clear interfaces; Libraries must be independently testable and documented;
No feature coupling - modules communicate through well-defined contracts only

### II. CLI-First Development

Every library exposes core functionality via CLI before Discord integration;
Text-based I/O protocol: configuration via files/args → JSON/text output; All
bot commands must have corresponding CLI equivalents for testing and automation;
Human-readable and machine-readable output formats required

### III. Test-Driven Development (NON-NEGOTIABLE)

TDD mandatory for all features: Write tests → Get approval → Watch tests fail →
Implement to pass; Red-Green-Refactor cycle strictly enforced; No code
deployment without comprehensive test coverage; Mock Discord API interactions
for reliable testing

### IV. Integration & Contract Testing

Critical focus areas: Discord API contract tests, webhook reliability tests,
reminder system end-to-end flows, text recognition accuracy tests; Database
integration tests for reminder persistence; Cross-module communication
validation; Fresh web interface integration tests

### V. Observability & Reliability

Structured logging for all bot operations and user interactions; Error tracking
with Discord user context; Webhook delivery confirmation and retry logic;
Reminder system must guarantee delivery with escalation fallbacks; Performance
monitoring for response times and memory usage

## Technology Stack Requirements

**Runtime**: Deno 2.0+ required for all components; TypeScript strict mode
mandatory; ESM modules only - no CommonJS

**Web Framework**: Deno Fresh for web interface; Islands architecture for
interactive components; Server-side rendering with progressive enhancement

**Discord Integration**: Official Discord.js or discord-deno library;
Webhook-based architecture for reliability; Rate limiting and retry logic
built-in

**Database**: SQLite for development, PostgreSQL for production; Deno KV for
caching and sessions; Migration scripts required for schema changes

**Authentication**: Discord OAuth2 for web interface; Bot token security via
environment variables; User permission validation on all operations

**Deployment**: Docker containers preferred; Environment-specific configuration
files; Health check endpoints required; Graceful shutdown handling

**Security**: Input validation on all user data; SQL injection prevention; XSS
protection in web interface; Webhook signature verification mandatory

## Development Workflow & Quality Gates

**Feature Development Process**:

1. Design module interface and write comprehensive tests
2. Implement CLI version with full test coverage
3. Create Discord integration layer with mocked tests
4. Build web interface components (if applicable)
5. End-to-end integration testing
6. Documentation and deployment

**Code Review Requirements**: All code must pass automated tests; Security
review for Discord API interactions; Performance validation for reminder system;
Accessibility review for web interface components

**Testing Gates**: Unit tests must achieve 90%+ coverage; Integration tests for
all user-facing features; Load testing for webhook handling; Manual testing of
Discord bot interactions before deployment

**Deployment Process**: Staging environment deployment required; Bot testing in
private Discord server; Database migration validation; Production deployment
with rollback plan; Post-deployment monitoring and validation

**Documentation Standards**: README per module with examples; API documentation
for all public interfaces; Setup and deployment instructions; Troubleshooting
guides for common issues

## Governance

<!-- Example: Constitution supersedes all other practices; Amendments require documentation, approval, migration plan -->

Constitution supersedes all other development practices and decisions; All
feature implementations must verify compliance with these principles; Breaking
changes to core principles require documented justification and migration plan;
Regular architecture reviews to ensure ongoing compliance; Use this constitution
as the primary guidance for all development decisions and architectural choices

**Version**: 1.0.0 | **Ratified**: 2025-10-21 | **Last Amended**: 2025-10-21
