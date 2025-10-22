<!--
=== SYNC IMPACT REPORT ===
Version change: 1.0.0 → 1.1.0
Modified principles: 
- I. Deno-First Architecture → I. Lightweight Modular Design
- II. Discord Bot Integration → II. Discord-Native Integration
- III. Deployment-Ready Simplicity → III. Deno Deploy Optimized
- IV. Reminder-Centric Design (retained with clarity enhancements)
- V. Security by Default → V. Readable Debuggable Code
Added sections: Code Quality Standards, enhanced Integration Standards, comprehensive Development Workflow
Removed sections: Basic Technical Standards (replaced with comprehensive quality focus)
Templates requiring updates:
✅ Updated plan-template.md with modular design constitution checks
✅ Updated spec-template.md with code quality requirements section  
✅ Updated tasks-template.md with module focus and quality gates
Follow-up TODOs: None - all templates updated for code quality and modularity focus
=============================
-->

# Spec Beanbot Constitution

## Core Principles

### I. Lightweight Modular Design
Every module MUST have a single, clear responsibility with minimal dependencies. Functions MUST be pure where possible with explicit side effects. Module size MUST remain under 200 lines; larger modules MUST be split into focused submodules. All imports MUST use explicit file extensions and avoid circular dependencies.

**Rationale**: Modular design enables independent testing, debugging, and maintenance. Small modules are easier to understand, modify, and deploy efficiently on Deno Deploy's edge runtime.

### II. Discord-Native Integration
Discord API interactions MUST use native fetch with proper error handling and retry logic. Bot commands MUST respond within Discord's 3-second timeout with immediate acknowledgments for longer operations. All Discord types MUST be explicitly defined with TypeScript interfaces matching API responses.

**Rationale**: Native Discord integration ensures optimal performance and reduces external dependencies while maintaining responsive user experience within Discord's constraints.

### III. Deno Deploy Optimized
Code MUST use only Deno's built-in APIs and JSR-compatible packages. Bundle size MUST remain minimal for fast cold starts. Environment configuration MUST work seamlessly across local development and Deno Deploy without modification. All imports MUST be statically analyzable.

**Rationale**: Deno Deploy optimization ensures fast startup times and reliable deployments while leveraging Deno's security model and modern JavaScript features.

### IV. Reminder-Centric Clarity
Every function and module MUST clearly indicate its role in the reminder lifecycle (create, schedule, deliver, manage). Database queries MUST be explicit and optimized for time-based operations. No abstraction layers beyond what directly supports reminder operations.

**Rationale**: Clear reminder-focused design prevents feature creep and makes the codebase immediately understandable to new developers working on scheduling systems.

### V. Readable Debuggable Code
All functions MUST have descriptive names explaining their purpose and side effects. Error messages MUST include context for debugging (user ID, reminder ID, operation type). Logging MUST be structured with consistent levels. Complex logic MUST be broken into named intermediate steps with clear variable names.

**Rationale**: Readable code reduces maintenance burden and enables rapid debugging of production issues, especially critical for time-sensitive reminder delivery.

## Code Quality Standards

### Module Architecture
Each module MUST export a single primary function or class with clear TypeScript interfaces. Helper functions MUST be private unless reused across modules. Module boundaries MUST align with reminder domain concepts (scheduling, delivery, persistence, authentication). Cross-module communication MUST use explicit dependency injection patterns.

### Error Handling and Debugging
All functions MUST return Result<T, Error> types for error-prone operations. Error objects MUST include operation context, timestamp, and user-identifiable information. Debug logs MUST be structured JSON with consistent field names. Production errors MUST be traceable to specific user actions and system states.

### Performance and Efficiency  
Functions MUST avoid nested loops and prefer streaming for data processing. Database queries MUST use prepared statements and proper indexing. Memory allocation MUST be minimized through object reuse and streaming responses. Bundle analysis MUST verify no unnecessary dependencies are included.

## Integration Standards

### Fresh Framework Integration
Web interface MUST use server-side rendering with minimal client-side JavaScript. Islands MUST be used only for real-time features (reminder status updates). Component props MUST use strict TypeScript interfaces. Routes MUST handle errors gracefully with user-friendly messages.

### Discord Bot Integration  
Command handlers MUST be pure functions accepting Discord interaction objects. Response formatting MUST be separated from business logic. Rate limiting MUST use Discord's built-in mechanisms with graceful degradation. Webhook validation MUST occur in dedicated middleware modules.

### Data Persistence
Database operations MUST be wrapped in transaction-like abstractions for consistency. Schema changes MUST be versioned and backward compatible. Query interfaces MUST use domain types rather than raw SQL strings. Connection management MUST handle Deno Deploy's edge runtime constraints.

## Development Workflow

### Code Review Standards
All code MUST be reviewed for modularity, readability, and debugging clarity before merge. Reviewers MUST verify module responsibilities are single-focused and dependencies are minimal. Complex functions MUST be rejected if they cannot be understood in 5 minutes of reading.

### Quality Assurance Process
Every module MUST pass `deno lint` and `deno fmt` with zero warnings. TypeScript strict mode MUST be enforced with explicit types for all function signatures. Code coverage MUST focus on critical reminder operations rather than arbitrary percentage targets.

### Testing Philosophy
Tests MUST verify business logic correctness and error handling paths. Integration tests MUST use real Discord API responses in test fixtures. Performance tests MUST validate cold-start performance on Deno Deploy constraints. Test names MUST clearly describe the scenario being validated.

### Documentation Requirements
Every public function MUST have JSDoc with examples showing typical usage patterns. README MUST include troubleshooting guide for common deployment issues. Code comments MUST explain "why" decisions were made, not "what" the code does. Architecture decisions MUST be documented in spec templates.

## Governance

### Compliance Verification
This constitution supersedes all other coding practices and style guides. All pull requests MUST include a checklist verifying adherence to each principle. Code that violates modularity or readability principles MUST be refactored before merge, regardless of functionality correctness.

### Amendment Process  
Constitution changes require updating dependent templates and validating backward compatibility with existing reminder functionality. Principle modifications MUST include migration guide for existing code. Version increments MUST follow semantic versioning with clear rationale for the change level.

### Exception Handling
Temporary violations MUST be documented with GitHub issues and target resolution dates. Technical debt from violations MUST be tracked and prioritized in sprint planning. No exceptions allowed for core reminder functionality or Discord integration code.

**Version**: 1.1.0 | **Ratified**: 2024-10-22 | **Last Amended**: 2025-10-22
