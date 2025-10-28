````markdown
---
description: "Task list for reminder management web interface implementation with recurring reminder fix"
---

# Tasks: Reminder Management Web Interface (Updated with Recurring Fix)

**Input**: Design documents from `/specs/001-reminder-management-interface/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Issue Fixed**: The function to make reminders recurring doesn't work correctly at all, as acknowledging a reminder will just leave them on that status.

**Tests**: Tests are not explicitly requested in the feature specification, so focusing on implementation tasks.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)  
- Include exact file paths in descriptions
- **Module Focus**: Each task should create focused modules under 200 lines
- **Quality Gates**: Include code review checkpoints for modularity, readability, and UI cleanliness

## Path Conventions
- Fresh web application integrated with existing Discord bot
- Paths based on plan.md structure: `discord-bot/_fresh/`, `discord-bot/lib/`, etc.

## Phase 1: Setup (Shared Infrastructure) ✅ COMPLETE

**Purpose**: Project initialization and basic Fresh/Deno structure

- [x] T001 Create Fresh application structure in discord-bot/_fresh/ directory
- [x] T002 [P] Initialize deno.json with Fresh 1.6+ dependencies and configuration  
- [x] T003 [P] Create main.ts entry point with Fresh server initialization
- [x] T004 [P] Setup TypeScript interfaces in discord-bot/types/ from data model
- [x] T005 [P] Create base directory structure for lib/, routes/, components/, islands/

---

## Phase 2: Foundational (Blocking Prerequisites) ✅ COMPLETE

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T006 Implement Deno KV connection wrapper in discord-bot/lib/kv/connection.ts
- [x] T007 [P] Create KV schema operations for reminder keys in discord-bot/lib/kv/schema.ts
- [x] T008 [P] Implement Discord client wrapper with dependency injection in discord-bot/lib/discord/client.ts
- [x] T009 [P] Setup Discord OAuth2 authentication flow in discord-bot/lib/auth/oauth.ts
- [x] T010 [P] Create session management with KV storage in discord-bot/lib/auth/session.ts
- [x] T011 [P] Implement authentication middleware for Fresh routes in discord-bot/_fresh/middleware/auth.ts
- [x] T012 [P] Create error handling utilities with Result<T, Error> types in discord-bot/lib/utils/result.ts
- [x] T013 [P] Setup structured logging system in discord-bot/lib/utils/logger.ts
- [x] T014 Create base Fresh layout component in discord-bot/_fresh/components/Layout.tsx

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Create Basic Reminder (Priority: P1) 🎯 MVP ✅ COMPLETE

**Goal**: Administrator can create and schedule reminders that are delivered to Discord users

**Independent Test**: Create reminder with future timestamp, verify it appears in interface, confirm Discord delivery

### Implementation for User Story 1

- [x] T015 [P] [US1] Create Reminder entity interface in discord-bot/types/reminder.ts
- [x] T016 [P] [US1] Create ReminderStatus enum and related types in discord-bot/types/reminder.ts  
- [x] T017 [US1] Implement ReminderRepository with KV operations in discord-bot/lib/reminder/repository.ts
- [x] T018 [US1] Create ReminderService for business logic in discord-bot/lib/reminder/service.ts
- [x] T019 [US1] Implement reminder scheduling logic in discord-bot/lib/reminder/scheduler.ts
- [x] T020 [US1] Create Discord delivery service in discord-bot/lib/discord/delivery.ts
- [x] T021 [P] [US1] Build create reminder form component in discord-bot/_fresh/components/ReminderForm.tsx
- [x] T022 [P] [US1] Create reminder list component in discord-bot/_fresh/components/ReminderList.tsx
- [x] T023 [US1] Implement GET/POST /api/reminders endpoints in discord-bot/_fresh/routes/api/reminders/index.ts
- [x] T024 [US1] Create new reminder page in discord-bot/_fresh/routes/admin/reminders/new.tsx
- [x] T025 [US1] Create dashboard with reminder list in discord-bot/_fresh/routes/index.tsx
- [x] T026 [US1] Create form validation utilities in discord-bot/lib/validation.ts

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently

---

## Phase 4: User Story 2 - Edit and Manage Existing Reminders (Priority: P2) ✅ COMPLETE

**Goal**: Administrator can view, edit, and delete pending reminders through the interface

**Independent Test**: Create several reminders, edit content/schedule, delete one, verify persistence

### Implementation for User Story 2

- [x] T027 [P] [US2] Create reminder detail component in discord-bot/_fresh/components/ReminderDetail.tsx
- [x] T028 [P] [US2] Build edit reminder form component in discord-bot/_fresh/components/EditReminderForm.tsx
- [x] T029 [US2] Implement GET/PUT/DELETE /api/reminders/{id} endpoints in discord-bot/_fresh/routes/api/reminders/[id]/index.ts
- [x] T030 [US2] Create reminder detail page in discord-bot/_fresh/routes/admin/reminders/[id]/index.tsx
- [x] T031 [US2] Create reminder edit page in discord-bot/_fresh/routes/admin/reminders/[id]/edit.tsx
- [x] T032 [US2] Add filtering and pagination to reminder list in discord-bot/_fresh/components/ReminderList.tsx
- [x] T033 [US2] Implement reminder update logic in discord-bot/lib/reminder/service.ts
- [x] T034 [US2] Add reminder deletion with schedule cleanup in discord-bot/lib/reminder/repository.ts

**Checkpoint**: At this point, User Story 2 should be fully functional and testable independently

---

## Phase 5: User Story 3 - Escalation Management (Priority: P3) ✅ COMPLETE

**Goal**: Administrator can configure escalation rules with custom messages for timeout and decline scenarios

**Independent Test**: Create reminder with escalation and custom messages, simulate timeout/decline, verify secondary user receives appropriate contextual message

### Implementation for User Story 3

- [x] T035 [P] [US3] Create EscalationRule interface with timeoutMessage and declineMessage fields in discord-bot/types/escalation.ts
- [x] T036 [P] [US3] Create ResponseLog interface in discord-bot/types/response.ts
- [x] T037 [US3] Implement escalation configuration with custom message inputs in reminder form in discord-bot/_fresh/components/ReminderForm.tsx
- [x] T038 [US3] Create escalation processing service with message selection logic in discord-bot/lib/reminder/escalation.ts
- [x] T039 [US3] Implement timeout monitoring in discord-bot/lib/reminder/scheduler.ts
- [x] T040 [US3] Add Discord webhook endpoint for user responses in discord-bot/_fresh/routes/api/webhook/discord.ts
- [x] T041 [US3] Create response tracking in discord-bot/lib/reminder/response-tracker.ts
- [x] T042 [US3] Update reminder service with escalation logic and custom message handling in discord-bot/lib/reminder/service.ts
- [x] T043 [US3] Add escalation status and custom message display to reminder components in discord-bot/_fresh/components/ReminderDetail.tsx

**Checkpoint**: All escalation functionality with customizable contextual messages should work independently

---

## Phase 6: User Story 4 - User Response Tracking (Priority: P4) ✅ COMPLETE

**Goal**: Administrator can view response history and audit trails for sent reminders

**Independent Test**: Send reminders, simulate user responses, verify tracking in interface

### Implementation for User Story 4

- [x] T044 [P] [US4] Create response log component in discord-bot/_fresh/components/ResponseLog.tsx
- [x] T045 [P] [US4] Create status badge component in discord-bot/_fresh/components/StatusBadge.tsx
- [x] T046 [US4] Implement response history API in discord-bot/_fresh/routes/api/reminders/[id]/responses.ts
- [x] T047 [P] [US4] Add real-time status updates island in discord-bot/_fresh/islands/StatusUpdate.tsx
- [x] T048 [US4] Update reminder detail page with response tracking in discord-bot/_fresh/routes/admin/reminders/[id]/index.tsx
- [x] T049 [US4] Enhance dashboard with response statistics in discord-bot/_fresh/routes/index.tsx
- [x] T050 [US4] Add response processing to webhook handler in discord-bot/_fresh/routes/api/webhook/discord.ts

**Checkpoint**: All response tracking and audit functionality should work

---

## Phase 7: User Story 5 - Test Reminder Triggers (Priority: P5) ✅ COMPLETE

**Goal**: Administrator can manually trigger reminders for testing without affecting schedules

**Independent Test**: Create reminder, use test trigger, verify immediate delivery preserves original schedule

### Implementation for User Story 5

- [x] T051 [P] [US5] Create TestExecution interface in discord-bot/types/reminder.ts
- [x] T052 [P] [US5] Create test trigger component in islands/TestTrigger.tsx
- [x] T053 [US5] Implement test execution service in discord-bot/lib/reminder/test-service.ts
- [x] T054 [US5] Create test reminder API endpoint in routes/api/reminders/[id]/test.ts
- [x] T055 [P] [US5] Add test progress island for real-time feedback in islands/TestProgress.tsx
- [x] T056 [US5] Integrate test triggers into reminder detail page in routes/admin/reminders/[id]/index.tsx
- [x] T057 [US5] Add test execution logging and tracking in discord-bot/lib/reminder/test-service.ts
- [x] T058 [US5] Update reminder service to handle test deliveries in discord-bot/lib/reminder/service.ts

**Checkpoint**: All testing functionality should work independently

---

## Phase 8: Extended Features - Recurring Reminders (Priority: P6) ✅ COMPLETE

**Goal**: Enhanced reminder functionality with recurring schedules

**Independent Test**: Create recurring reminder, verify it repeats at scheduled intervals, test end conditions

### Implementation for Extended Features

- [x] T059 [P] [EXT] Extend Reminder interface with RepeatRule in discord-bot/types/reminder.ts
- [x] T060 [P] [EXT] Add RepeatFrequency and RepeatEndCondition enums in discord-bot/types/reminder.ts
- [x] T061 [EXT] Update ReminderForm component with repeat configuration options in islands/ReminderForm.tsx
- [x] T062 [EXT] Extend CreateReminderOptions interface in discord-bot/lib/reminder/service.ts
- [x] T063 [EXT] Implement calculateNextRepeatTime method in discord-bot/lib/reminder/service.ts
- [x] T064 [EXT] Add scheduleNextRepeatOccurrence method in discord-bot/lib/reminder/service.ts
- [x] T065 [EXT] Update scheduler to handle repeat reminders in discord-bot/lib/reminder/scheduler.ts

**Checkpoint**: Extended features fully functional - reminders can repeat regularly

---

## Phase 9: Discord Link-Based Acknowledgement (Priority: P7) ✅ COMPLETE

**Goal**: Enable Discord acknowledgement via clickable links (replacing complex webhook interactions)

**Why Links**: Discord webhook verification unreliable. Link-based approach works immediately without additional services.

**Independent Test**: Send reminder, click [Acknowledge] or [Decline] link in Discord DM, verify status updates

### Implementation for Link-Based Acknowledgement

- [x] T066 [P] [LINK] Create token generation utilities in discord-bot/lib/utils/ack-token.ts
- [x] T067 [P] [LINK] Implement generateAcknowledgementToken with SHA-256 hashing
- [x] T068 [P] [LINK] Implement verifyAcknowledgementToken for security
- [x] T069 [P] [LINK] Create generateAcknowledgementUrl helper function
- [x] T070 [LINK] Update delivery service to generate secure acknowledgement URLs in discord-bot/lib/discord/delivery.ts
- [x] T071 [LINK] Replace reply instructions with clickable [Acknowledge] and [Decline] links
- [x] T072 [P] [LINK] Create acknowledgement page route in routes/ack/[id].tsx
- [x] T073 [P] [LINK] Add token verification in acknowledgement page handler
- [x] T074 [P] [LINK] Implement acknowledgement processing (call ReminderService)
- [x] T075 [P] [LINK] Implement decline processing with escalation trigger
- [x] T076 [P] [LINK] Create success page UI with confirmation message
- [x] T077 [P] [LINK] Create error page UI for invalid tokens/reminders

**Checkpoint**: Link-based acknowledgement fully functional - works immediately, no extra services needed

---

## Phase 10: Deno.cron Automatic Delivery (Priority: P8) ✅ COMPLETE

**Goal**: Replace setInterval-based scheduler with Deno.cron for automatic reminder delivery without requiring user traffic

**Why This Was Needed**: Original scheduler used `setInterval()` which only runs when users access the website. Reminders were NOT being sent automatically at their scheduled times if no one was using the website.

**Independent Test**: Deploy to Deno Deploy, create reminder with future time, close browser, wait for scheduled time, verify reminder is delivered automatically

### Implementation for Deno.cron Migration

- [x] T078 [P] [CRON] Create top-level Deno.cron() definitions in cron-jobs.ts
- [x] T079 [P] [CRON] Register "Check due reminders" cron job running every minute ("* * * * *")
- [x] T080 [P] [CRON] Register "Check timeout escalations" cron job running every 2 minutes ("*/2 * * * *")
- [x] T081 [CRON] Update main.ts to import cron-jobs.ts for automatic registration
- [x] T082 [CRON] Add --unstable-cron flags to deno.json configuration
- [x] T083 [CRON] Add build environment detection to prevent cron execution during builds

**Checkpoint**: Reminders are delivered automatically at scheduled times without requiring user traffic

---

## Phase 11: UI Polish - Modern Professional Design (Priority: P9) ✅ COMPLETE

**Goal**: Transform basic UI into modern, professional interface with better visual hierarchy, spacing, and design elements

**Independent Test**: Navigate through all pages, verify improved visual appeal, professional design, proper spacing, shadows, and color depth without breaking any existing features

### Implementation for Modern UI

- [x] T084 [P] [UI] Enhance dashboard header with gradient background and better typography in routes/index.tsx
- [x] T085 [P] [UI] Improve statistics cards with proper shadows, hover effects, and better visual hierarchy in routes/index.tsx
- [x] T086 [P] [UI] Add professional card styling to reminder list with subtle shadows and spacing in components/ReminderList.tsx
- [x] T087 [P] [UI] Enhance reminder detail page with better card layouts and visual sections in components/ReminderDetail.tsx
- [x] T088 [P] [UI] Improve form styling with better input focus states and visual grouping in islands/ReminderForm.tsx
- [x] T089 [P] [UI] Add better button designs with proper hover and active states across all components
- [x] T090 [P] [UI] Implement proper color palette with primary, secondary, and accent colors
- [x] T091 [P] [UI] Add subtle transitions and animations for interactive elements
- [x] T092 [P] [UI] Implement dark mode as default with light mode toggle in routes/_app.tsx
- [x] T093 [P] [UI] Add theme persistence using localStorage in islands/ThemeToggle.tsx
- [x] T094 [P] [UI] Update all components to support dark mode color schemes

**Checkpoint**: UI has modern, professional appearance with depth, proper spacing, and visual hierarchy

---

## Phase 12: Reminder Management Improvements (Priority: P10) ✅ COMPLETE

**Goal**: Fix issue where reminders become uneditable/unmanageable after test triggers or status changes

**Independent Test**: Create reminder, fire test trigger, verify Edit and Delete buttons still appear and function correctly

### Implementation for Management Improvements

- [x] T095 [P] [MGMT] Create POST /api/reminders/[id]/reset endpoint in routes/api/reminders/[id]/reset.ts
- [x] T096 [P] [MGMT] Implement ResetToPending Island component with confirmation and auto-reload in islands/ResetToPending.tsx
- [x] T097 [MGMT] Add ResetToPending component to reminder detail page in routes/admin/reminders/[id]/index.tsx
- [x] T098 [P] [MGMT] Update edit page to allow editing reminders in any status except acknowledged/declined in routes/admin/reminders/[id]/edit.tsx
- [x] T099 [P] [MGMT] Remove status restriction from DELETE endpoint - allow deletion in any status in routes/api/reminders/[id]/index.ts
- [x] T100 [P] [MGMT] Fix ReminderDetail component Edit/Delete buttons with case-insensitive logic in components/ReminderDetail.tsx
- [x] T101 [MGMT] Wire up onEdit and onDelete callbacks in detail page in routes/admin/reminders/[id]/index.tsx
- [x] T102 [P] [MGMT] Create flush all reminders API endpoint in routes/api/reminders/flush.ts
- [x] T103 [MGMT] Add Flush All button to dashboard with double confirmation in routes/index.tsx

**Checkpoint**: Reminders fully manageable from dashboard list AND detail page, with database flush capability

---

## Phase 13: 🚨 CRITICAL FIX - Recurring Reminder Bug (Priority: CRITICAL)

**Goal**: Fix critical bug where recurring reminders stay 'acknowledged' after user acknowledgment instead of scheduling next occurrence

**Root Cause**: scheduleNextRepeatOccurrence() was only called on delivery, not on user acknowledgment/decline

**Independent Test**: 
1. Create recurring reminder (daily, 3 occurrences)
2. Wait for delivery → verify status=SENT
3. Click acknowledge link → verify:
   - Original status=ACKNOWLEDGED  
   - New reminder created with status=PENDING
   - New reminder scheduled for next day
4. Repeat for second occurrence
5. Third occurrence should not create 4th (max reached)

### Implementation for Recurring Reminder Fix

- [ ] T104 [P] [CRITICAL] Analyze recurring reminder workflow and identify missing scheduleNextRepeatOccurrence calls
- [ ] T105 [CRITICAL] Update acknowledgeReminder method in discord-bot/lib/reminder/service.ts to call scheduleNextRepeatOccurrence for recurring reminders
- [ ] T106 [CRITICAL] Update declineReminder method in discord-bot/lib/reminder/service.ts to call scheduleNextRepeatOccurrence for recurring reminders (only if not escalated)
- [ ] T107 [P] [CRITICAL] Add proper logging with [RECURRING] prefix for all recurring reminder operations
- [ ] T108 [P] [CRITICAL] Add error handling to ensure acknowledgment/decline doesn't fail if recurring scheduling fails
- [ ] T109 [CRITICAL] Test recurring reminder acknowledgment flow end-to-end to verify next occurrence scheduling

**Checkpoint**: Recurring reminders now properly schedule next occurrence when acknowledged or declined

**Behavior Changes**:

Before Fix:
- Delivery: [PENDING] → [SENT] → scheduleNext() ✓
- Acknowledge: [SENT] → [ACKNOWLEDGED] ❌ (no scheduleNext)
- Decline: [SENT] → [DECLINED] ❌ (no scheduleNext)

After Fix:
- Delivery: [PENDING] → [SENT] → scheduleNext() ✓
- Acknowledge: [SENT] → [ACKNOWLEDGED] → scheduleNext() ✅
- Decline: [SENT] → [DECLINED] → scheduleNext() ✅
- Decline+Escalate: [SENT] → [ESCALATED] (no scheduleNext, wait for escalation response)

**Edge Cases Handled**:
- If scheduleNextRepeatOccurrence fails → logs error, doesn't fail ack/decline
- If repeat rule reached end condition → logs completion message  
- If escalation triggered on decline → only schedules next if status=DECLINED (not ESCALATED)
- Original reminder stays acknowledged/declined (proper audit trail)

---

## Phase 14: Polish & Cross-Cutting Concerns ✅ COMPLETE

**Purpose**: Improvements that affect multiple user stories

- [x] T110 [P] Add comprehensive error handling across all API endpoints
- [x] T111 [P] Implement rate limiting for Discord API calls in discord-bot/lib/discord/client.ts
- [x] T112 [P] Add input sanitization and validation utilities in discord-bot/lib/utils/validation.ts
- [x] T113 [P] Create admin settings page with timezone preference in discord-bot/_fresh/routes/admin/settings.tsx
- [x] T114 [P] Implement proper logout functionality in discord-bot/_fresh/routes/auth/logout.tsx
- [x] T115 [P] Add loading states and error boundaries to components
- [x] T116 Code review for modularity: Verify all modules under 200 lines
- [x] T117 Performance optimization: Review KV query patterns and indexing
- [x] T118 Security review: Validate Discord OAuth implementation and session handling
- [x] T119 Run quickstart.md validation and deployment testing

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately ✅
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories ✅
- **User Stories (Phases 3-7)**: All depend on Foundational phase completion ✅
- **Extended Features (Phase 8)**: Depends on User Stories 1-5 completion ✅
- **Discord Links (Phase 9)**: Can run in parallel with other phases ✅
- **Deno.cron (Phase 10)**: Can run in parallel with UI work ✅
- **UI Polish (Phase 11)**: Can start after Phase 2, improves all user stories ✅
- **Management (Phase 12)**: Can run after User Stories complete ✅
- **🚨 CRITICAL FIX (Phase 13)**: HIGH PRIORITY - Should be implemented ASAP ⚠️
- **Polish (Phase 14)**: Depends on all desired user stories being complete ✅

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories ✅
- **User Story 2 (P2)**: Can start after Foundational (Phase 2) - Uses US1 components but independently testable ✅
- **User Story 3 (P3)**: Can start after Foundational (Phase 2) - Extends US1 reminders but independently testable ✅
- **User Story 4 (P4)**: Can start after Foundational (Phase 2) - Uses response data but independently testable ✅
- **User Story 5 (P5)**: Can start after Foundational (Phase 2) - Uses existing reminders but independently testable ✅

### Critical Fix Priority

The recurring reminder bug fix (Phase 13) should be implemented immediately as it affects core functionality. All other phases are complete.

### Parallel Opportunities

- All Setup tasks marked [P] can run in parallel
- All Foundational tasks marked [P] can run in parallel (within Phase 2)
- Once Foundational phase completes, all user stories can start in parallel (if team capacity allows)
- Within each user story, tasks marked [P] can run in parallel
- Different user stories can be worked on in parallel by different team members

---

## Implementation Strategy

### Current Status: MVP+ Complete with Critical Bug

The system is fully functional with all user stories implemented, modern UI, automatic Deno.cron scheduling, and professional management capabilities. However, **the recurring reminder bug needs immediate attention**.

### Immediate Priority: Fix Recurring Bug

1. ⚠️ **CRITICAL**: Implement Phase 13 (Recurring Reminder Fix) immediately
2. The bug prevents recurring reminders from working as expected
3. Users expect: acknowledge reminder → next occurrence automatically scheduled
4. Current behavior: acknowledge reminder → stays acknowledged, no next occurrence

### Post-Fix Validation

1. Test recurring reminders with acknowledgment flow
2. Test recurring reminders with decline flow  
3. Test recurring reminders with escalation flow
4. Verify end conditions work correctly (date-based, count-based)
5. Deploy to production and monitor logs for [RECURRING] messages

### MVP Definition (Already Achieved + Bug Fix)

- ✅ User Story 1: Create Basic Reminder
- ✅ User Story 2: Edit and Manage Existing Reminders  
- ✅ User Story 3: Escalation Management
- ✅ User Story 4: User Response Tracking
- ✅ User Story 5: Test Reminder Triggers
- ✅ Extended: Recurring Reminders (with bug)
- ✅ Discord: Link-based Acknowledgement
- ✅ Infrastructure: Deno.cron Automatic Delivery
- ✅ UI: Modern Professional Design
- ✅ Management: Full Administrative Control
- ⚠️ **PENDING**: Recurring Bug Fix

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability  
- Each user story should be independently completable and testable
- Fresh Islands used minimally (only for real-time updates)
- All modules must stay under 200 lines per constitutional requirements
- KV operations use atomic transactions for consistency
- Discord integration uses native fetch for optimal performance
- **Timezone Management**: Europe/Berlin is the mandatory default timezone for all time displays and scheduling
- **🚨 CRITICAL**: Phase 13 (Recurring Bug Fix) should be implemented immediately
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Avoid: vague tasks, same file conflicts, cross-story dependencies that break independence

````