---
description: "Task list for reminder management web interface implementation"
---

# Tasks: Reminder Management Web Interface

**Input**: Design documents from `/specs/001-reminder-management-interface/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

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

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic Fresh/Deno structure

- [x] T001 Create Fresh application structure in discord-bot/_fresh/ directory
- [x] T002 [P] Initialize deno.json with Fresh 1.6+ dependencies and configuration  
- [x] T003 [P] Create main.ts entry point with Fresh server initialization
- [x] T004 [P] Setup TypeScript interfaces in discord-bot/types/ from data model
- [x] T004a [P] Add timezone field to Reminder interface with Europe/Berlin default in discord-bot/types/reminder.ts
- [x] T005 [P] Create base directory structure for lib/, routes/, components/, islands/

---

## Phase 2: Foundational (Blocking Prerequisites)

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
- [x] T013a [P] Create timezone utility functions with Europe/Berlin default in discord-bot/lib/utils/timezone.ts
- [x] T014 Create base Fresh layout component in discord-bot/_fresh/components/Layout.tsx

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Create Basic Reminder (Priority: P1) 🎯 MVP

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
- [x] T021a: Add timezone selector to reminder form Island component
- [x] T022 [P] [US1] Create reminder list component in discord-bot/_fresh/components/ReminderList.tsx
- [x] T023 [US1] Implement GET/POST /api/reminders endpoints in discord-bot/_fresh/routes/api/reminders/index.ts
- [x] T024: Create new reminder page (`discord-bot/_fresh/routes/admin/reminders/new.tsx`) - Basic form layout and submission handling
- [x] T024a: Add timezone conversion to POST /api/reminders endpoint
- [x] T025: Create dashboard with reminder list (`discord-bot/_fresh/routes/index.tsx`) - Main interface with statistics and navigation
- [x] T025a: Display times in user timezone on dashboard (routes/index.tsx)
- [x] T026: Create form validation utilities (`discord-bot/lib/validation.ts`) - Reusable validation functions for reminder data
- [x] T026a: Add timezone validation utilities (uses isSupportedTimezone, isValidTimezone)

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently

**Note**: Fixed useState hook error by converting ReminderForm to Fresh Island component (moved from components/ to islands/ directory). Fresh framework requires useState hooks to be in Island components only for client-side interactivity.

---

## Phase 4: User Story 2 - Edit and Manage Existing Reminders (Priority: P2)

**Goal**: Administrator can view, edit, and delete pending reminders through the interface

**Independent Test**: Create several reminders, edit content/schedule, delete one, verify persistence

### Implementation for User Story 2

- [x] T027 [P] [US2] Create reminder detail component in discord-bot/_fresh/components/ReminderDetail.tsx
- [x] T028 [P] [US2] Build edit reminder form component in discord-bot/_fresh/components/EditReminderForm.tsx
- [x] T028a: Add timezone selector to EditReminderForm Island
- [x] T029 [US2] Implement GET/PUT/DELETE /api/reminders/{id} endpoints in discord-bot/_fresh/routes/api/reminders/[id]/index.ts
- [x] T030 [US2] Create reminder detail page in discord-bot/_fresh/routes/admin/reminders/[id]/index.tsx
- [x] T030a: Display times in user timezone on detail page (components/ReminderDetail.tsx)
- [x] T031 [US2] Create reminder edit page in discord-bot/_fresh/routes/admin/reminders/[id]/edit.tsx
- [x] T032 [US2] Add filtering and pagination to reminder list in discord-bot/_fresh/components/ReminderList.tsx
- [x] T033 [US2] Implement reminder update logic in discord-bot/lib/reminder/service.ts
- [x] T034 [US2] Add reminder deletion with schedule cleanup in discord-bot/lib/reminder/repository.ts

**Checkpoint**: At this point, User Story 2 should be fully functional and testable independently

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently

---

## Phase 5: User Story 3 - Escalation Management (Priority: P3)

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
- [x] T091 [P] [US3] Add validation for escalation message length and format in discord-bot/lib/utils/validation.ts
- [x] T092 [US3] Implement default escalation message templates for undefined custom messages in discord-bot/lib/reminder/escalation.ts

**Checkpoint**: All escalation functionality with customizable contextual messages should work independently

---

## Phase 6: User Story 4 - User Response Tracking (Priority: P4)

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

## Phase 7: User Story 5 - Test Reminder Triggers (Priority: P5)

**Goal**: Administrator can manually trigger reminders for testing without affecting schedules

**Independent Test**: Create reminder, use test trigger, verify immediate delivery preserves original schedule

### Implementation for User Story 5

- [x] T051 [P] [US5] TestExecution interface already exists in discord-bot/types/reminder.ts (verified)
- [x] T052 [P] [US5] Test trigger component already implemented as T076 in islands/TestTrigger.tsx
- [x] T053 [US5] Implement test execution service in discord-bot/lib/reminder/test-service.ts
- [x] T054 [US5] Test reminder API endpoint already implemented as T077 in routes/api/reminders/[id]/test.ts
- [x] T055 [P] [US5] Add test progress island for real-time feedback in islands/TestProgress.tsx
- [x] T056 [US5] Integrate test triggers into reminder detail page in routes/admin/reminders/[id]/index.tsx
- [x] T057 [US5] Add test execution logging and tracking (integrated into test-service.ts via logTestExecution method)
- [x] T058 [US5] Update reminder service to handle test deliveries (getReminder method already supports test-service.ts)

**Checkpoint**: All testing functionality should work independently

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [x] T059 [P] Add comprehensive error handling across all API endpoints
- [x] T060 [P] Implement rate limiting for Discord API calls in discord-bot/lib/discord/client.ts
- [x] T061 [P] Add input sanitization and validation utilities in discord-bot/lib/utils/validation.ts
- [x] T062 [P] Create admin settings page in discord-bot/_fresh/routes/admin/settings.tsx
- [x] T062a [P] Add timezone preference setting to admin settings page with Europe/Berlin default in routes/admin/settings.tsx
- [x] T062b [P] Implement timezone preference storage in user session/KV in discord-bot/lib/auth/session.ts
- [x] T063 [P] Implement proper logout functionality in discord-bot/_fresh/routes/auth/logout.tsx
- [x] T064 [P] Add loading states and error boundaries to components
- [x] T065 Code review for modularity: Verify all modules under 200 lines
- [x] T066 Performance optimization: Review KV query patterns and indexing
- [x] T067 Security review: Validate Discord OAuth implementation and session handling
- [x] T068 Run quickstart.md validation and deployment testing

---

## Phase 9: Extended Features - Recurring Reminders and Testing (Priority: P6)

**Goal**: Enhanced reminder functionality with recurring schedules and manual testing capabilities

### Implementation for Extended Features

- [x] T069 [P] [EXT] Extend Reminder interface with RepeatRule in discord-bot/types/reminder.ts
- [x] T070 [P] [EXT] Add RepeatFrequency and RepeatEndCondition enums in discord-bot/types/reminder.ts
- [x] T071 [EXT] Update ReminderForm component with repeat configuration options in islands/ReminderForm.tsx
- [x] T072 [EXT] Extend CreateReminderOptions interface in discord-bot/lib/reminder/service.ts
- [x] T073 [EXT] Implement calculateNextRepeatTime method in discord-bot/lib/reminder/service.ts
- [x] T074 [EXT] Add scheduleNextRepeatOccurrence method in discord-bot/lib/reminder/service.ts
- [x] T075 [EXT] Update scheduler to handle repeat reminders in discord-bot/lib/reminder/scheduler.ts
- [x] T076 [P] [EXT] Create TestTrigger Island component in islands/TestTrigger.tsx
- [x] T077 [EXT] Create test reminder API endpoint in routes/api/reminders/[id]/test.ts
- [x] T078 [EXT] Update dashboard with test trigger functionality in routes/index.tsx

**Checkpoint**: Extended features fully functional - reminders can repeat regularly and be tested manually

---

## Phase 10: Discord Interactions - Button Response Handling (Priority: P7)

**Goal**: Enable Discord button interactions (Acknowledge/Decline) with proper webhook handling

**⚠️ INTEGRITY FIX (2025-10-23)**: Removed redundant `discord-debug.ts` file that was causing routing conflicts with the production webhook endpoint.

### Implementation for Discord Interactions

- [x] T079 [P] [INT] Create Discord webhook endpoint in routes/api/webhook/discord.ts
- [x] T080 [P] [INT] Implement Ed25519 signature verification in discord-bot/lib/discord/verify.ts
- [x] T081 [INT] Update sendMessage to include reminder ID in button custom_id in discord-bot/lib/discord/delivery.ts
- [x] T082 [INT] Add PING/MESSAGE_COMPONENT interaction handlers in routes/api/webhook/discord.ts
- [x] T083 [INT] Implement immediate response pattern (< 3 seconds) for Discord interactions
- [x] T084 [P] [INT] Add comprehensive debugging logs to webhook endpoint
- [x] T085 [P] [INT] Add debugging logs to signature verification
- [x] T086 [P] [INT] Create health check endpoint in routes/api/health.ts
- [x] T087 [P] [INT] Create webhook test script in test-webhook.sh
- [x] T088 [P] [INT] Create Discord interactions setup documentation in DISCORD_INTERACTIONS_SETUP.md
- [x] T089 [P] [INT] Create debugging guide in DEBUGGING_INTERACTIONS.md
- [x] T090 [P] [INT] Create implementation summary in DISCORD_BUTTONS_FIX.md

**Checkpoint**: Discord button interactions functional with comprehensive debugging

**Deployment Requirements**:
- PUBLIC_KEY environment variable must be set in production
- Interactions Endpoint URL configured in Discord Developer Portal
- HTTPS endpoint required (Deno Deploy provides this automatically)

**Testing Checklist**:
- [ ] Health check endpoint returns valid configuration: `GET /api/health`
- [ ] Webhook endpoint is accessible: `GET /api/webhook/discord`
- [ ] Discord PING verification succeeds when saving Interactions Endpoint URL
- [ ] Button clicks trigger webhook with proper logs
- [ ] Signature verification passes (check logs)
- [ ] Messages update within 3 seconds of button click
- [ ] Buttons disappear after interaction
- [ ] No "interaction failed" errors in Discord

---

## Phase 11: Link-Based Acknowledgement (Priority: P8) ✅ IMPLEMENTED

**Goal**: Replace Discord webhook button interactions with clickable acknowledgement links

**Why**: Discord webhook verification unreliable. Reply-based approach requires Gateway forwarding. Link-based is simpler and works immediately.

**Independent Test**: Send reminder, click [Acknowledge] or [Decline] link in Discord DM, verify status updates

### Implementation for Link-Based Acknowledgement

- [x] T106 [P] [LINK] Create token generation utilities in discord-bot/lib/utils/ack-token.ts
- [x] T107 [P] [LINK] Implement generateAcknowledgementToken with SHA-256 hashing
- [x] T108 [P] [LINK] Implement verifyAcknowledgementToken for security
- [x] T109 [P] [LINK] Create generateAcknowledgementUrl helper function
- [x] T110 [LINK] Update delivery service to generate secure acknowledgement URLs in discord-bot/lib/discord/delivery.ts
- [x] T111 [LINK] Replace reply instructions with clickable [Acknowledge] and [Decline] links
- [x] T112 [P] [LINK] Create acknowledgement page route in routes/ack/[id].tsx
- [x] T113 [P] [LINK] Add token verification in acknowledgement page handler
- [x] T114 [P] [LINK] Implement acknowledgement processing (call ReminderService)
- [x] T115 [P] [LINK] Implement decline processing with escalation trigger
- [x] T115a [LINK] Fix escalation message delivery - send escalation DM when reminder declined (routes/ack/[id].tsx)
- [x] T116 [P] [LINK] Create success page UI with confirmation message
- [x] T117 [P] [LINK] Create error page UI for invalid tokens/reminders
- [x] T118 [P] [LINK] Add optional ACK_TOKEN_SECRET environment variable for production
- [x] T119 [P] [LINK] Add BASE_URL environment variable for link generation

**Checkpoint**: Link-based acknowledgement fully functional - works immediately, no extra services needed

**Requirements**:
- DISCORD_BOT_TOKEN environment variable (already configured)
- Optional: ACK_TOKEN_SECRET for custom token security (defaults to built-in)
- Optional: BASE_URL for custom domain (defaults to spec-beanbot.lazhannya.deno.net)

**Advantages** (Why This is Better):
- ✅ **No Gateway needed** - works immediately without additional services
- ✅ **No webhook verification** - eliminates "endpoint could not be verified" errors
- ✅ **Mobile-friendly** - links work on all devices
- ✅ **Simple deployment** - just push code, no configuration
- ✅ **Better UX** - clear visual feedback on web page
- ✅ **Secure** - SHA-256 token prevents unauthorized acknowledgements

**User Experience**:
```
🔔 **Reminder**

Complete the quarterly report

📝 **To respond, click a link:**
✅ [Acknowledge]
❌ [Decline]
```

Click link → Opens web page → Shows confirmation → Done!

**vs Previous Approaches**:
- ❌ Buttons: Required webhook verification (broken)
- ❌ Reply: Required Gateway forwarding service (complex)
- ✅ Links: Works immediately (simple)

---

## Phase 12: UI Polish - Clean Minimal Design (Priority: P9) ✅ COMPLETE

**Goal**: Enhance user interface with clean, minimal design following constitutional principle VI

**Independent Test**: Navigate through all pages, verify visual consistency, clean layouts, no rendering bugs, and intuitive navigation (max 3 clicks to any feature)

### Implementation for UI Improvements

- [x] T122 [P] [UI] Audit all UI components for simplicity - replace complex elements with Unicode/CSS in routes/admin/reminders/[id]/index.tsx
- [x] T123 [P] [UI] Review and simplify navigation arrows - ensure Unicode characters used consistently in routes/admin/reminders/[id]/edit.tsx
- [x] T124 [P] [UI] Standardize form layouts - ensure consistent spacing and alignment in islands/ReminderForm.tsx
- [x] T125 [P] [UI] Standardize form layouts - ensure consistent spacing and alignment in islands/EditReminderForm.tsx
- [x] T126 [P] [UI] Improve validation feedback - add clear, immediate error messages in islands/ReminderForm.tsx
- [x] T127 [P] [UI] Improve validation feedback - add clear, immediate error messages in islands/EditReminderForm.tsx
- [x] T128 [P] [UI] Enhance loading states - add clear loading indicators for all async operations in routes/index.tsx
- [x] T129 [P] [UI] Review color scheme - ensure clean, accessible color palette in components/ReminderList.tsx
- [x] T130 [P] [UI] Review color scheme - ensure clean, accessible color palette in components/ReminderDetail.tsx
- [x] T131 [P] [UI] Simplify dashboard - remove unnecessary visual elements in routes/index.tsx
- [x] T132 [P] [UI] Optimize button styles - use simple, proven button patterns in components/ReminderDetail.tsx
- [x] T133 [P] [UI] Clean up table layouts - ensure readable, accessible data tables in components/ReminderList.tsx
- [x] T134 [P] [UI] Remove complex SVG icons - replace with Unicode where appropriate across all routes and components
- [x] T135 [P] [UI] Test cross-browser compatibility - verify consistent rendering in Chrome, Firefox, Safari
- [x] T136 [UI] Create UI style guide - document minimal design patterns in docs/ui-guidelines.md

**Checkpoint**: UI meets clean minimal design requirements (UI-001 through UI-010)

**UI Quality Checklist**:
- [ ] All pages load and become interactive within 2 seconds
- [ ] Navigation is intuitive with max 3 clicks to any feature
- [ ] No complex graphics or animations that aren't essential
- [ ] Forms provide immediate, clear validation feedback
- [ ] Loading states are clear and immediate for all actions
- [ ] Visual appearance is consistent across Chrome, Firefox, Safari
- [ ] No SVG rendering bugs or giant symbols appearing
- [ ] All UI components use simple, proven patterns
- [ ] Interface is visually clean without unnecessary complexity
- [ ] Accessibility maintained (keyboard navigation, screen readers)

---

## Phase 13: Modern UI Enhancement (Priority: P10)

**Goal**: Transform basic UI into modern, professional interface with better visual hierarchy, spacing, and design elements while maintaining clean code and functionality

**Independent Test**: Navigate through all pages, verify improved visual appeal, professional design, proper spacing, shadows, and color depth without breaking any existing features

### Implementation for Modern UI

- [x] T137 [P] [UI] Enhance dashboard header with gradient background and better typography in routes/index.tsx
- [x] T138 [P] [UI] Improve statistics cards with proper shadows, hover effects, and better visual hierarchy in routes/index.tsx
- [x] T139 [P] [UI] Add professional card styling to reminder list with subtle shadows and spacing in components/ReminderList.tsx
- [x] T140 [P] [UI] Enhance reminder detail page with better card layouts and visual sections in components/ReminderDetail.tsx
- [x] T141 [P] [UI] Improve form styling with better input focus states and visual grouping in islands/ReminderForm.tsx (dark mode added to main fields)
- [x] T142 [P] [UI] Enhance form styling with consistent design in islands/EditReminderForm.tsx (shares same component structure)
- [x] T143 [P] [UI] Add better button designs with proper hover and active states across all components
- [x] T144 [P] [UI] Implement proper color palette with primary, secondary, and accent colors (using Tailwind classes)
- [x] T145 [P] [UI] Add subtle transitions and animations for interactive elements (buttons, cards, forms)
- [x] T146 [P] [UI] Enhance navigation with better visual hierarchy in routes/admin/reminders/[id]/edit.tsx
- [x] T147 [P] [UI] Add proper spacing system (use Tailwind spacing consistently) across all pages
- [x] T148 [P] [UI] Improve status badges with better colors and styling in components/StatusBadge.tsx
- [x] T149 [P] [UI] Add loading skeletons instead of simple spinners in components/LoadingSpinner.tsx
- [x] T150 [P] [UI] Enhance error states with better visual design in components/ErrorBoundary.tsx
- [x] T151 [P] [UI] Page headers already well-designed per-page (dedicated component not needed)
- [x] T152 [UI] Responsive design verified - all pages use responsive grids and breakpoints (sm, md, lg)
- [x] T153 [P] [UI] Implement dark mode as default with light mode toggle in routes/_app.tsx and all pages
- [x] T154 [P] [UI] Add theme persistence using localStorage in islands/ThemeToggle.tsx
- [x] T155 [P] [UI] Update all components to support dark mode color schemes (ReminderList, ResponseLog, TestTrigger, dashboard)

**Checkpoint**: UI has modern, professional appearance with depth, proper spacing, and visual hierarchy

**Modern UI Quality Checklist**:
- [x] Cards have appropriate shadows (shadow-sm, shadow-md) for depth
- [x] Color palette has proper visual hierarchy (not just gray-50 and white)
- [x] Buttons have clear hover, active, and focus states
- [x] Typography has clear hierarchy (varying font sizes and weights)
- [x] Spacing is consistent and generous (not cramped or overly sparse)
- [x] Dark mode implemented with theme toggle and localStorage persistence
- [x] Interactive elements have smooth transitions
- [x] Status indicators are visually distinct and clear
- [x] Forms have clear visual grouping and section separation
- [x] Dashboard has visual interest (gradients, colors, depth)
- [x] Mobile responsive design works well on small screens

**Phase 13 Status**: ✅ **COMPLETE** - All UI enhancement tasks finished

---

## Phase 14: Deno.cron Automatic Delivery (Priority: P11) ✅ COMPLETE

**Goal**: Replace setInterval-based scheduler with Deno.cron for automatic reminder delivery without requiring user traffic

**Why This Was Needed**: The original scheduler used `setInterval()` which only runs when:
- A user is actively accessing the website (keeping the isolate alive)
- HTTP requests are being processed

This meant reminders were NOT being sent automatically at their scheduled times if no one was using the website.

**The Solution**: Deno.cron is a built-in feature that:
- Runs automatically on Deno Deploy **without any user traffic**
- Is automatically detected and managed by Deno Deploy's global scheduler service
- Spins up isolates on-demand to run scheduled tasks
- Has zero configuration required
- Prevents overlapping executions (won't run twice if previous job still running)
- Appears in Deno Deploy dashboard "Cron" tab

**Independent Test**: Deploy to Deno Deploy, create reminder with future time, close browser/stop accessing website, wait for scheduled time, verify reminder is delivered automatically

### Implementation for Deno.cron Migration

- [x] T156 [P] [CRON] Create CronReminderScheduler class using Deno.cron() API in discord-bot/lib/reminder/cron-scheduler.ts
- [x] T157 [P] [CRON] Register "Check due reminders" cron job running every minute ("* * * * *")
- [x] T158 [P] [CRON] Register "Check timeout escalations" cron job running every 2 minutes ("*/2 * * * *")
- [x] T159 [P] [CRON] Create init-cron-scheduler.ts with initializeCronScheduler() function
- [x] T160 [CRON] Update main.ts to import and call initializeCronScheduler() instead of initializeScheduler()
- [x] T161 [CRON] Update dev.ts to use initializeCronScheduler() for local development

**Checkpoint**: Reminders are delivered automatically at scheduled times without requiring user traffic

**Technical Details**:

```typescript
// Deno.cron() usage - automatically detected by Deno Deploy
Deno.cron("Check due reminders", "* * * * *", async () => {
  console.log("[CRON] Checking for due reminders...");
  await this.checkDueReminders();
});
```

**How It Works on Deno Deploy**:
1. When you deploy, Deno Deploy evaluates your code's top-level scope
2. It discovers all `Deno.cron()` definitions
3. A global cron scheduler is updated with your cron jobs
4. At scheduled times, Deno Deploy spins up an on-demand isolate to run the handler
5. **No web server or incoming requests needed** - it just works!

**Benefits**:
- ✅ **Automatic execution** - reminders sent at scheduled times regardless of traffic
- ✅ **Zero configuration** - no external services or complex setup
- ✅ **Reliable** - managed by Deno Deploy's infrastructure
- ✅ **Visible** - shows up in Deno Deploy dashboard Cron tab
- ✅ **Non-overlapping** - prevents race conditions if job takes longer than interval
- ✅ **Production-ready** - enterprise-grade scheduling built into the platform

**Migration Notes**:
- Old scheduler (`scheduler.ts`) with `setInterval()` is now obsolete
- Old initialization (`init-scheduler.ts`) is replaced by `init-cron-scheduler.ts`
- Cron jobs check every minute (vs 30 seconds before) - acceptable tradeoff for reliability
- Can adjust cron frequency if needed (e.g., "*/30 * * * * *" for every 30 seconds requires custom cron syntax)

**Deployment Requirements**:
- DISCORD_TOKEN environment variable (already configured)
- Deno KV database (automatically available on Deno Deploy)
- Deno runtime 1.38+ (for Deno.cron support)

**Monitoring**:
- Check Deno Deploy dashboard → Your Project → Cron tab
- View logs showing "[CRON]" prefix for all cron job executions
- See last execution time and schedule for each job

**Phase 14 Status**: ✅ **COMPLETE** - Automatic reminder delivery now fully functional

---

## Phase 15: Reminder Management Improvements (Priority: P12) ✅ COMPLETE

**Goal**: Fix issue where reminders become uneditable/unmanageable after test triggers or status changes

**Problem Identified**: 
- Test trigger was available but reminders with non-pending status couldn't be edited or deleted
- Once a reminder's status changed (e.g., delivered, sent), it became permanently locked
- No way to reset a reminder back to pending for re-testing or corrections
- Overly restrictive status checks prevented legitimate management operations

**Independent Test**: 
1. Create reminder and fire test trigger
2. Verify "Reset to Pending" button appears for non-pending reminders
3. Reset reminder to pending
4. Verify reminder can now be edited and re-tested
5. Verify reminders can be deleted in any status

### Implementation for Management Improvements

- [x] T162 [P] [MGMT] Create POST /api/reminders/[id]/reset endpoint in routes/api/reminders/[id]/reset.ts
- [x] T163 [P] [MGMT] Implement ResetToPending Island component with confirmation and auto-reload in islands/ResetToPending.tsx
- [x] T164 [MGMT] Add ResetToPending component to reminder detail page in routes/admin/reminders/[id]/index.tsx
- [x] T165 [P] [MGMT] Update edit page to allow editing reminders in any status except acknowledged/declined in routes/admin/reminders/[id]/edit.tsx
- [x] T166 [P] [MGMT] Remove status restriction from DELETE endpoint - allow deletion in any status in routes/api/reminders/[id]/index.ts

**Checkpoint**: Reminders are fully manageable regardless of status - can be reset, edited, and deleted as needed

**Changes Made**:

1. **Reset to Pending Feature**:
   - New API endpoint: `POST /api/reminders/[id]/reset`
   - Resets reminder status to "pending"
   - Prevents resetting acknowledged/declined reminders (preserves data integrity)
   - Island component with confirmation dialog and auto-reload after success

2. **Relaxed Edit Restrictions**:
   - **Before**: Only "pending" reminders could be edited
   - **After**: Any reminder except "acknowledged" or "declined" can be edited
   - Allows corrections to sent/delivered reminders
   - Maintains data integrity for completed interactions

3. **Removed Delete Restrictions**:
   - **Before**: Only "pending" reminders could be deleted
   - **After**: Reminders in any status can be deleted
   - Useful for cleanup and testing
   - Provides full administrative control

**User Experience**:

When viewing a non-pending reminder:
1. See warning box explaining current status
2. Click "Reset to Pending" button
3. Confirm action in dialog
4. Page auto-reloads with reminder now in pending status
5. Test trigger and edit buttons now functional

**Benefits**:
- ✅ **No more locked reminders** - always manageable
- ✅ **Test-friendly** - can test repeatedly without issues
- ✅ **Correction-friendly** - can edit reminders after testing
- ✅ **Full control** - delete any reminder regardless of status
- ✅ **Data integrity** - still protects acknowledged/declined reminders from accidental resets

**Phase 15 Status**: ✅ **COMPLETE** - Full reminder management regardless of status

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-7)**: All depend on Foundational phase completion
  - User stories can then proceed in parallel (if staffed)
  - Or sequentially in priority order (P1 → P2 → P3 → P4 → P5)
- **Polish (Phase 8)**: Depends on all desired user stories being complete
- **Extended Features (Phase 9)**: Optional enhancements, depends on core user stories
- **Discord Interactions (Phase 10)**: Optional enhancement, can run in parallel with UI Polish
- **UI Polish (Phase 11)**: Can start after Phase 2, improves all user stories - recommended after core features complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P2)**: Can start after Foundational (Phase 2) - Uses US1 components but independently testable
- **User Story 3 (P3)**: Can start after Foundational (Phase 2) - Extends US1 reminders but independently testable
- **User Story 4 (P4)**: Can start after Foundational (Phase 2) - Uses response data but independently testable
- **User Story 5 (P5)**: Can start after Foundational (Phase 2) - Uses existing reminders but independently testable

### Within Each User Story

- TypeScript interfaces and types before implementation
- Repository/data layer before service layer
- Service layer before API endpoints
- API endpoints before UI components
- Core components before specialized components
- Pages before integration

### Parallel Opportunities

- All Setup tasks marked [P] can run in parallel
- All Foundational tasks marked [P] can run in parallel (within Phase 2)
- Once Foundational phase completes, all user stories can start in parallel (if team capacity allows)
- Within each user story, tasks marked [P] can run in parallel
- Different user stories can be worked on in parallel by different team members

---

## Parallel Example: User Story 1

```bash
# Launch interface definitions together:
Task: "Create Reminder entity interface in discord-bot/types/reminder.ts"
Task: "Create ReminderStatus enum and related types in discord-bot/types/reminder.ts"

# Launch components together (after interfaces complete):
Task: "Build create reminder form component in discord-bot/_fresh/components/ReminderForm.tsx"
Task: "Create reminder list component in discord-bot/_fresh/components/ReminderList.tsx"
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
7. Apply UI Polish (Phase 11) → Enhance visual design across all features
8. Each story adds value without breaking previous stories

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
- Fresh Islands used minimally (only for real-time updates)
- All modules must stay under 200 lines per constitutional requirements
- KV operations use atomic transactions for consistency
- Discord integration uses native fetch for optimal performance
- **Timezone Management**: Europe/Berlin is the mandatory default timezone for all time displays and scheduling
- Timezone selector available in reminder forms and admin settings for user preference
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Avoid: vague tasks, same file conflicts, cross-story dependencies that break independence