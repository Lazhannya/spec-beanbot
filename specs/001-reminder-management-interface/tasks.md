# Tasks: Reminder Management Web Interface

**Input**: Design documents from `/specs/001-reminder-management-interface/`
**Prerequisites**: plan.md (tech stack), spec.md (user stories), data-model.md (entities), contracts/ (endpoints)

**Critical Fixes Applied**: This task list reflects the resolution of two critical bugs discovered during implementation:
1. **Timezone Display Bug**: EditReminderForm incorrectly converted UTC times, showing wrong schedule times
2. **Cron Delivery Bug**: Environment check in cron jobs completely prevented reminder delivery

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)  
- Include exact file paths in descriptions
- **Module Focus**: Each task should create focused modules under 200 lines
- **Quality Gates**: Include code review checkpoints for modularity, readability, and UI cleanliness

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [ ] T001 Create Fresh framework project structure in discord-bot/_fresh/
- [ ] T002 Initialize Deno project with Fresh 1.6+ dependencies in deno.json
- [ ] T003 [P] Configure TypeScript 5.2+ with strict mode in deno.json
- [ ] T004 [P] Setup development scripts and linting in deno.json
- [ ] T005 Create main application entry point in main.ts
- [ ] T006 [P] Initialize Fresh manifest generation in discord-bot/_fresh/fresh.gen.ts

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T007 Setup Deno KV database connection and configuration in discord-bot/lib/kv/connection.ts
- [ ] T008 [P] Implement core data models in discord-bot/types/reminder.ts
- [ ] T009 [P] Create KV key indexing utilities in discord-bot/lib/kv/indexing.ts
- [ ] T010 Setup timezone utilities with IANA timezone support in discord-bot/lib/utils/timezone.ts
- [ ] T011 [P] Implement Discord API client wrapper in discord-bot/lib/discord/client.ts
- [ ] T012 Create cron job registration system in cron-jobs.ts
- [ ] T013 [P] Setup authentication middleware for admin access in discord-bot/lib/auth/middleware.ts
- [ ] T014 [P] Configure error handling and logging infrastructure in discord-bot/lib/utils/errors.ts
- [ ] T015 Create base Fresh route handlers in discord-bot/_fresh/routes/_layout.tsx

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Create Basic Reminder (Priority: P1) 🎯 MVP

**Goal**: Admin creates reminders with Discord delivery at scheduled times

**Independent Test**: Create reminder with future timestamp, verify it appears in interface, confirm delivery to Discord user

### Implementation for User Story 1

- [ ] T016 [P] [US1] Create Reminder entity model in discord-bot/lib/reminder/models.ts
- [ ] T017 [P] [US1] Create ReminderStatus enum and types in discord-bot/types/reminder.ts
- [ ] T018 [US1] Implement ReminderService with create/get operations in discord-bot/lib/reminder/service.ts
- [ ] T019 [US1] Create reminder creation form component in discord-bot/_fresh/components/ReminderForm.tsx
- [ ] T020 [US1] Implement reminder list dashboard in discord-bot/_fresh/routes/admin/reminders/index.tsx
- [ ] T021 [US1] Create new reminder page in discord-bot/_fresh/routes/admin/reminders/new.tsx
- [ ] T022 [US1] Implement API endpoint for reminder creation in discord-bot/_fresh/routes/api/reminders/index.ts
- [ ] T023 [US1] Add Discord message delivery service in discord-bot/lib/discord/delivery.ts
- [ ] T024 [US1] Implement cron job for scheduled reminder delivery in cron-jobs.ts
- [ ] T025 [US1] Add reminder creation form validation and error handling
- [ ] T026 [US1] Add logging for reminder creation and delivery operations

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently

---

## Phase 4: User Story 2 - Edit and Manage Existing Reminders (Priority: P2)

**Goal**: Admin views, edits, and deletes reminders with status tracking

**Independent Test**: Create several reminders, verify they appear in list, edit one reminder's content and schedule, delete another, confirm changes persist

### Implementation for User Story 2

- [ ] T027 [P] [US2] Create reminder detail view component in discord-bot/_fresh/components/ReminderDetail.tsx
- [ ] T028 [P] [US2] Create reminder edit form component in discord-bot/_fresh/islands/EditReminderForm.tsx
- [ ] T029 [US2] Extend ReminderService with update/delete operations in discord-bot/lib/reminder/service.ts
- [ ] T030 [US2] Implement reminder detail page in discord-bot/_fresh/routes/admin/reminders/[id]/index.tsx
- [ ] T031 [US2] Implement reminder edit page in discord-bot/_fresh/routes/admin/reminders/[id]/edit.tsx
- [ ] T032 [US2] Create API endpoints for reminder update/delete in discord-bot/_fresh/routes/api/reminders/[id]/index.ts
- [ ] T033 [US2] Add status filtering and search to reminder list in discord-bot/_fresh/routes/admin/reminders/index.tsx
- [ ] T034 [US2] Implement reminder status display components in discord-bot/_fresh/components/ReminderStatus.tsx
- [ ] T035 [US2] Add timezone conversion utilities for edit forms in discord-bot/lib/utils/timezone.ts
- [ ] T036 [US2] Add validation for reminder edit operations and conflict handling

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently

---

## Phase 5: User Story 3 - Escalation Management (Priority: P3)

**Goal**: Admin sets up escalation rules with custom messages for timeout/decline scenarios

**Independent Test**: Create reminder with escalation settings including custom timeout and decline messages, have primary user decline or ignore, verify secondary user receives escalated reminder with appropriate custom message

### Implementation for User Story 3

- [ ] T037 [P] [US3] Create EscalationRule entity model in discord-bot/types/reminder.ts
- [ ] T038 [P] [US3] Create escalation configuration component in discord-bot/_fresh/components/EscalationConfig.tsx
- [ ] T039 [US3] Implement escalation service logic in discord-bot/lib/reminder/escalation.ts
- [ ] T040 [US3] Add escalation fields to reminder forms in discord-bot/_fresh/components/ReminderForm.tsx
- [ ] T041 [US3] Implement timeout-based escalation in cron job system in cron-jobs.ts
- [ ] T042 [US3] Create Discord response webhook for decline handling in discord-bot/_fresh/routes/api/webhook/discord.ts
- [ ] T043 [US3] Add escalation message customization to forms in discord-bot/_fresh/islands/EditReminderForm.tsx
- [ ] T044 [US3] Implement escalation status tracking in discord-bot/lib/reminder/service.ts
- [ ] T045 [US3] Add escalation history display to reminder details in discord-bot/_fresh/components/ReminderDetail.tsx
- [ ] T046 [US3] Create escalation notification delivery service in discord-bot/lib/discord/escalation.ts

**Checkpoint**: User Stories 1, 2, and 3 should all be independently functional

---

## Phase 6: User Story 4 - User Response Tracking (Priority: P4)

**Goal**: Web interface displays reminder status, user responses, and audit trail

**Independent Test**: Send reminders to test users, have them respond in different ways (acknowledge, decline, ignore), verify all responses are tracked in interface

### Implementation for User Story 4

- [ ] T047 [P] [US4] Create ResponseLog entity model in discord-bot/types/reminder.ts
- [ ] T048 [P] [US4] Create response tracking service in discord-bot/lib/reminder/responses.ts
- [ ] T049 [US4] Implement Discord bot response handlers in discord-bot/lib/discord/handlers.ts
- [ ] T050 [US4] Create response history component in discord-bot/_fresh/components/ResponseHistory.tsx
- [ ] T051 [US4] Add response tracking to reminder detail pages in discord-bot/_fresh/routes/admin/reminders/[id]/index.tsx
- [ ] T052 [US4] Implement real-time status updates API in discord-bot/_fresh/routes/api/reminders/status.ts
- [ ] T053 [US4] Create audit trail display component in discord-bot/_fresh/components/AuditTrail.tsx
- [ ] T054 [US4] Add response analytics to dashboard in discord-bot/_fresh/routes/index.tsx
- [ ] T055 [US4] Implement webhook endpoint for Discord response tracking in discord-bot/_fresh/routes/api/webhook/discord.ts
- [ ] T056 [US4] Add response timestamp and metadata tracking to service layer

**Checkpoint**: Full response tracking and audit capabilities functional

---

## Phase 7: User Story 5 - Test Reminder Triggers (Priority: P5)

**Goal**: Admin manually triggers reminders for testing, bypassing normal scheduling

**Independent Test**: Create reminder with future schedule, use test trigger to send immediately, verify all aspects (delivery, formatting, escalation options) work as expected

### Implementation for User Story 5

- [ ] T057 [P] [US5] Create TestExecution entity model in discord-bot/types/reminder.ts
- [ ] T058 [P] [US5] Create manual test trigger component in discord-bot/_fresh/components/TestTrigger.tsx
- [ ] T059 [US5] Implement test execution service in discord-bot/lib/reminder/testing.ts
- [ ] T060 [US5] Create test trigger API endpoint in discord-bot/_fresh/routes/api/reminders/[id]/test.ts
- [ ] T061 [US5] Add test trigger button to reminder detail pages in discord-bot/_fresh/routes/admin/reminders/[id]/index.tsx
- [ ] T062 [US5] Implement test execution tracking and logging in discord-bot/lib/reminder/service.ts
- [ ] T063 [US5] Create test execution history display in discord-bot/_fresh/components/TestHistory.tsx
- [ ] T064 [US5] Add test mode indicators to Discord messages in discord-bot/lib/discord/delivery.ts
- [ ] T065 [US5] Implement test escalation workflows in discord-bot/lib/reminder/testing.ts
- [ ] T066 [US5] Add test execution validation and error handling

**Checkpoint**: Complete testing capabilities with full workflow validation

---

## Phase 8: Critical Bug Fixes (COMPLETED - Reference Only)

**Purpose**: Resolution of critical production issues discovered during implementation

**⚠️ STATUS**: These bugs have been FIXED during the conversation but are documented here for reference

- [x] ~~T067 [FIXED] Fix timezone display bug in EditReminderForm.tsx - UTC to datetime-local conversion~~
- [x] ~~T068 [FIXED] Remove blocking environment check from cron-jobs.ts - DENO_DEPLOYMENT_ID condition~~
- [x] ~~T069 [FIXED] Add comprehensive debug logging to cron job delivery system~~
- [x] ~~T070 [FIXED] Verify cron job registration works in all environments~~

**Bug Details**:
1. **EditReminderForm Timezone Bug**: `new Date(reminder.scheduledTime).toISOString().slice(0, 16)` incorrectly converted UTC times, showing "14:00PM" instead of "12:00PM" for Europe/Berlin timezone. Fixed with proper `convertUtcToLocalTimeString()` function.
2. **Cron Delivery Bug**: `if (!Deno.env.get("DENO_DEPLOYMENT_ID")) return;` check completely prevented cron job execution in all environments. Removed to enable proper delivery system.

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] T071 [P] Add comprehensive error handling across all API endpoints
- [ ] T072 [P] Implement rate limiting for API endpoints in discord-bot/lib/auth/rateLimit.ts
- [ ] T073 [P] Add input sanitization and XSS protection to all forms
- [ ] T074 Create admin dashboard with system metrics in discord-bot/_fresh/routes/index.tsx
- [ ] T075 [P] Add export/import functionality for reminder backup
- [ ] T076 [P] Implement bulk operations for reminder management
- [ ] T077 Add comprehensive logging for all Discord API interactions
- [ ] T078 [P] Performance optimization for large reminder lists
- [ ] T079 Add system health check endpoints for monitoring
- [ ] T080 Create deployment documentation and configuration guide

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-7)**: All depend on Foundational phase completion
  - User stories can then proceed in parallel (if staffed)
  - Or sequentially in priority order (P1 → P2 → P3 → P4 → P5)
- **Bug Fixes (Phase 8)**: COMPLETED - Critical issues resolved during implementation
- **Polish (Phase 9)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P2)**: Can start after Foundational (Phase 2) - Extends US1 but independently testable
- **User Story 3 (P3)**: Can start after Foundational (Phase 2) - Uses US1 reminder model but independently testable
- **User Story 4 (P4)**: Can start after Foundational (Phase 2) - Integrates with all stories but independently testable
- **User Story 5 (P5)**: Can start after Foundational (Phase 2) - Uses existing reminder infrastructure but independently testable

### Within Each User Story

- Models before services (data layer foundation)
- Services before endpoints (business logic before API)
- Core implementation before UI integration
- Story complete before moving to next priority

### Parallel Opportunities

- All Setup tasks marked [P] can run in parallel
- All Foundational tasks marked [P] can run in parallel (within Phase 2)
- Once Foundational phase completes, all user stories can start in parallel (if team capacity allows)
- Models within a story marked [P] can run in parallel
- Different user stories can be worked on in parallel by different team members

---

## Parallel Example: User Story 1

```bash
# Launch all models for User Story 1 together:
Task: "Create Reminder entity model in discord-bot/lib/reminder/models.ts"
Task: "Create ReminderStatus enum and types in discord-bot/types/reminder.ts"

# Then launch dependent services:
Task: "Implement ReminderService with create/get operations in discord-bot/lib/reminder/service.ts"
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
5. Add User Story 4 → Test independently → Deploy/Demo
6. Add User Story 5 → Test independently → Deploy/Demo
7. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 1
   - Developer B: User Story 2
   - Developer C: User Story 3
3. Stories complete and integrate independently

---

## Critical Fixes Applied

**During Implementation**: Two critical bugs were discovered and resolved:

### 1. Timezone Display Bug (FIXED)
- **Issue**: EditReminderForm showing "14:00PM" instead of "12:00PM" for Europe/Berlin timezone
- **Root Cause**: `new Date(reminder.scheduledTime).toISOString().slice(0, 16)` incorrectly converted UTC to datetime-local
- **Fix**: Implemented proper `convertUtcToLocalTimeString()` function with Intl.DateTimeFormat
- **Files**: `discord-bot/_fresh/islands/EditReminderForm.tsx`

### 2. Cron Delivery System Bug (FIXED)  
- **Issue**: Reminders not delivered automatically - complete failure of cron job execution
- **Root Cause**: `if (!Deno.env.get("DENO_DEPLOYMENT_ID")) return;` check prevented execution in all environments
- **Fix**: Removed blocking environment check, added comprehensive debug logging
- **Files**: `cron-jobs.ts`

### 3. Debug Visibility (ADDED)
- **Enhancement**: Added comprehensive logging to cron job system for troubleshooting
- **Features**: Reminder counts, IDs, scheduled times, processing status, delivery attempts
- **Files**: `cron-jobs.ts`

These fixes ensure the reminder system works correctly for timezone display and automatic delivery.

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Phase 8 (Critical Bug Fixes) represents work ALREADY COMPLETED during implementation
- Timezone handling requires careful UTC storage vs local display conversion
- Cron jobs MUST be at top-level module scope for Deno Deploy detection
- Avoid: vague tasks, same file conflicts, cross-story dependencies that break independence