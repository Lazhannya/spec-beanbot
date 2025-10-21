# Tasks: Personal Assistant Discord Bot

**Input**: Design documents from `/specs/001-discord-assistant-bot/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/, quickstart.md

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions
- **Fresh app**: `routes/`, `islands/`, `lib/`, `data/`
- Paths reference the unified Fresh application structure for Deno Deploy

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure for Deno Deploy

- [x] T001 Create Fresh application structure per plan.md (routes/, islands/, lib/, data/, etc.)
- [x] T002 Initialize Deno project with deno.json and Fresh configuration
- [ ] T003 [P] Setup Deno Deploy configuration (deploy.yml)
- [x] T004 [P] Create environment variable templates and Deno Deploy secrets setup
- [x] T005 [P] Configure TypeScript strict mode and linting (deno.json)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T006 Setup embedded data modules structure in data/ directory
- [x] T007 [P] Implement Discord OAuth2 authentication system in lib/auth/
- [x] T008 [P] Create shared TypeScript types in lib/types/
- [x] T009 Create base embedded data templates (reminder templates, text patterns) in data/
- [x] T010 Setup Deno KV connection and utilities in lib/kv/
- [x] T011 Configure environment management and validation in lib/config/
- [x] T012 [P] Setup health check API routes in routes/api/health.ts
- [x] T013 Create Discord client initialization in lib/discord/client.ts

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Discord Mention Webhook Integration (Priority: P1) 🎯 MVP

**Goal**: Forward Discord mentions to n8n workflow via webhooks with retry logic

**Independent Test**: Bot processes mentions and successfully POSTs to webhook endpoint

### Tests for User Story 1 (OPTIONAL - only if tests requested) ⚠️

**NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [ ] T014 [P] [US1] Contract test for webhook payload format in tests/contract/test_webhook_api.ts
- [ ] T015 [P] [US1] Integration test for Discord mention handling in tests/integration/test_mention_flow.ts
- [ ] T016 [P] [US1] Unit test for retry logic in tests/unit/test_webhook_retry.ts

### Implementation for User Story 1

- [x] T017 [P] [US1] Create webhook call types and utilities in lib/types/webhook.ts
- [x] T018 [P] [US1] Create bot interaction logging in lib/kv/interactions.ts
- [x] T019 [US1] Implement webhook service with retry logic in lib/webhooks/client.ts (depends on T017, T018)
- [x] T020 [US1] Create Discord mention handler in lib/discord/handlers.ts
- [x] T021 [US1] Implement signature verification for webhook security in lib/webhooks/auth.ts
- [x] T022 [US1] Add webhook API route in routes/api/discord/webhook.ts
- [x] T023 [US1] Create Discord bot message processing in lib/discord/processor.ts
- [x] T024 [US1] Add comprehensive error handling and logging for webhook operations

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently

---

## Phase 4: User Story 2 - Web-Based Reminder Management (Priority: P2)

**Goal**: Web interface for creating, managing, and monitoring reminders with escalation

**Independent Test**: Users can create reminders via web interface and receive Discord messages

### Tests for User Story 2 (OPTIONAL - only if tests requested) ⚠️

- [ ] T025 [P] [US2] Contract test for reminder API endpoints in tests/integration/test_reminder_api.ts
- [ ] T026 [P] [US2] Integration test for reminder scheduling and delivery in tests/integration/test_reminder_flow.ts
- [ ] T027 [P] [US2] Unit test for escalation logic in tests/unit/test_reminder_escalation.ts

### Implementation for User Story 2

- [x] T028 [P] [US2] Create reminder templates in data/reminder-templates.ts
- [x] T029 [US2] Implement reminder service with Deno KV storage in lib/reminders/service.ts
- [x] T030 [US2] Create Fresh API routes for reminders in routes/api/reminders/
- [x] T031 [P] [US2] Build reminder creation form island in islands/ReminderForm.tsx
- [x] T032 [P] [US2] Create reminder list component in components/ReminderList.tsx
- [x] T033 [US2] Implement Discord message sending for reminders in lib/discord/messenger.ts
- [x] T034 [US2] Add reminder CLI interface in scripts/cli/reminder.ts
- [x] T035 [US2] Create scheduled job system for reminder processing in lib/reminders/scheduler.ts
- [x] T036 [US2] Implement escalation logic for unacknowledged reminders
- [x] T037 [US2] Add reminder status tracking and web interface updates

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently

---

## Phase 5: User Story 3 - Pattern-Based Text Recognition (Priority: P3)

**Goal**: Configurable text pattern matching with automated responses

**Independent Test**: Bot recognizes configured patterns and responds appropriately

### Tests for User Story 3 (OPTIONAL - only if tests requested) ⚠️

- [ ] T038 [P] [US3] Contract test for pattern API endpoints in tests/integration/test_pattern_api.ts
- [ ] T039 [P] [US3] Integration test for pattern matching accuracy in tests/integration/test_pattern_matching.ts
- [ ] T040 [P] [US3] Unit test for regex pattern safety in tests/unit/test_pattern_security.ts

### Implementation for User Story 3

- [x] T041 [P] [US3] Create text pattern definitions in data/text-patterns.ts
- [x] T042 [US3] Implement pattern matching service in lib/patterns/matcher.ts
- [x] T043 [US3] Create pattern management API routes in routes/api/patterns/
- [ ] T044 [P] [US3] Build pattern creation form island in islands/PatternForm.tsx
- [ ] T045 [P] [US3] Create pattern list management component in components/PatternList.tsx
- [ ] T046 [US3] Integrate pattern matching into Discord message handler in lib/discord/processor.ts
- [ ] T047 [US3] Add pattern CLI interface in scripts/cli/pattern.ts
- [ ] T048 [US3] Implement pattern priority and conflict resolution
- [ ] T049 [US3] Add pattern usage statistics tracking in Deno KV

**Checkpoint**: All user stories should now be independently functional

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] T050 [P] Add comprehensive API documentation in docs/api/
- [ ] T051 Code cleanup and refactoring across all modules
- [ ] T052 Performance optimization for Deno Deploy edge runtime
- [ ] T053 [P] Add unit tests for shared utilities in tests/unit/
- [ ] T054 Security hardening and input validation review
- [ ] T055 [P] Create Deno Deploy deployment documentation in docs/deployment/
- [ ] T056 Run quickstart.md validation and integration testing
- [x] T057 [P] Setup monitoring and logging for Deno Deploy
- [ ] T058 Create data backup and migration procedures for Deno KV
- [ ] T059 Performance benchmarking and Deno Deploy optimization

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3+)**: All depend on Foundational phase completion
  - User stories can then proceed in parallel (if staffed)
  - Or sequentially in priority order (P1 → P2 → P3)
- **Polish (Final Phase)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P2)**: Can start after Foundational (Phase 2) - May integrate with US1 but should be independently testable
- **User Story 3 (P3)**: Can start after Foundational (Phase 2) - May integrate with US1/US2 but should be independently testable

### Within Each User Story

- Tests (if included) MUST be written and FAIL before implementation
- Models before services
- Services before handlers/routes
- Core implementation before CLI interfaces
- Story complete before moving to next priority

### Parallel Opportunities

- All Setup tasks marked [P] can run in parallel
- All Foundational tasks marked [P] can run in parallel (within Phase 2)
- Once Foundational phase completes, all user stories can start in parallel (if team capacity allows)
- All tests for a user story marked [P] can run in parallel
- Models within a story marked [P] can run in parallel
- Different user stories can be worked on in parallel by different team members

---

## Parallel Example: User Story 1

```bash
# Launch all tests for User Story 1 together (if tests requested):
Task: "Contract test for webhook payload format in bot/tests/contract/test_webhook_api.ts"
Task: "Integration test for Discord mention handling in bot/tests/integration/test_mention_flow.ts"
Task: "Unit test for retry logic in bot/tests/unit/test_webhook_retry.ts"

# Launch all models for User Story 1 together:
Task: "Create WebhookCall model in bot/src/models/webhook_call.ts"
Task: "Create BotInteraction model in bot/src/models/bot_interaction.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Test User Story 1 independently
5. Deploy/demo if ready

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → Deploy/Demo (MVP!)
3. Add User Story 2 → Test independently → Deploy/Demo
4. Add User Story 3 → Test independently → Deploy/Demo
5. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 1
   - Developer B: User Story 2
   - Developer C: User Story 3
3. Stories complete and integrate independently

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Verify tests fail before implementing (if tests included)
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Follow constitution requirements: CLI-first, TDD, modular architecture, observability