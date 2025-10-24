#!/usr/bin/env -S deno run --allow-net --allow-read --allow-env
/**
 * Webhook Verification Script
 * Tests Discord webhook handler integrity after Phase 9 implementation
 */

import { Reminder, ReminderStatus } from "./discord-bot/types/reminder.ts";

console.log("=== Discord Webhook Integrity Verification ===\n");

// Test 1: Verify button custom_id format
console.log("Test 1: Button Custom ID Format");
console.log("--------------------------------");

const testReminder: Reminder = {
  id: "test-123-abc-456",
  content: "This is a test reminder",
  targetUserId: "123456789012345678",
  scheduledTime: new Date(),
  timezone: "Europe/Berlin",
  createdAt: new Date(),
  updatedAt: new Date(),
  status: ReminderStatus.PENDING,
  responses: [],
  testExecutions: [],
  createdBy: "admin-user-id",
  deliveryAttempts: 0,
};

// Simulate button creation (same logic as delivery.ts)
const acknowledgeButtonId = testReminder.id ? `acknowledge_reminder_${testReminder.id}` : "acknowledge_reminder";
const declineButtonId = testReminder.id ? `decline_reminder_${testReminder.id}` : "decline_reminder";

console.log(`✓ Acknowledge button custom_id: ${acknowledgeButtonId}`);
console.log(`✓ Decline button custom_id: ${declineButtonId}`);
console.log(`✓ Reminder ID embedded: ${testReminder.id}`);

// Test 2: Verify webhook custom_id parsing
console.log("\nTest 2: Webhook Custom ID Parsing");
console.log("----------------------------------");

const customIdRegex = /^(acknowledge|decline)_reminder(?:_(.+))?$/;

const testCases = [
  { customId: acknowledgeButtonId, expectedAction: "acknowledge", expectedId: testReminder.id },
  { customId: declineButtonId, expectedAction: "decline", expectedId: testReminder.id },
  { customId: "acknowledge_reminder", expectedAction: "acknowledge", expectedId: undefined },
  { customId: "decline_reminder", expectedAction: "decline", expectedId: undefined },
];

let passedTests = 0;
let failedTests = 0;

for (const testCase of testCases) {
  const match = testCase.customId.match(customIdRegex);
  
  if (match) {
    const action = match[1];
    const reminderId = match[2];
    
    const actionMatches = action === testCase.expectedAction;
    const idMatches = reminderId === testCase.expectedId;
    
    if (actionMatches && idMatches) {
      console.log(`✓ PASS: "${testCase.customId}" → action="${action}", id="${reminderId || 'undefined'}"`);
      passedTests++;
    } else {
      console.log(`✗ FAIL: "${testCase.customId}" → Expected action="${testCase.expectedAction}", id="${testCase.expectedId}" but got action="${action}", id="${reminderId}"`);
      failedTests++;
    }
  } else {
    console.log(`✗ FAIL: "${testCase.customId}" → No match found`);
    failedTests++;
  }
}

// Test 3: Verify Phase 9 didn't break reminder ID passing
console.log("\nTest 3: Phase 9 Compatibility Check");
console.log("------------------------------------");

// Check if sendReminder passes reminder.id to sendMessage
console.log("Checking DiscordDeliveryService.sendReminder()...");

// Read the actual implementation
const deliveryCode = await Deno.readTextFile("./discord-bot/lib/discord/delivery.ts");

const hasReminderIdParam = deliveryCode.includes("reminder.id");
const hasSendMessageCall = deliveryCode.includes("this.sendMessage(");
const passesReminderIdToSendMessage = deliveryCode.includes("reminder.id)") && 
                                       deliveryCode.includes("this.sendMessage(dmChannel.channelId!, reminder.content, reminder.id)");

console.log(`✓ References reminder.id: ${hasReminderIdParam ? "YES" : "NO"}`);
console.log(`✓ Calls sendMessage: ${hasSendMessageCall ? "YES" : "NO"}`);
console.log(`✓ Passes reminder.id to sendMessage: ${passesReminderIdToSendMessage ? "YES" : "NO"}`);

if (!passesReminderIdToSendMessage) {
  console.log("⚠️  WARNING: sendReminder may not be passing reminder.id correctly!");
  failedTests++;
} else {
  passedTests++;
}

// Test 4: Verify webhook handler processes reminder ID
console.log("\nTest 4: Webhook Handler Verification");
console.log("-------------------------------------");

const webhookCode = await Deno.readTextFile("./routes/api/webhook/discord.ts");

const hasCustomIdParsing = webhookCode.includes("customIdMatch");
const extractsReminderId = webhookCode.includes("const reminderId = customIdMatch[2]");
const callsRecordResponse = webhookCode.includes("recordUserResponse");
const passesReminderIdToRecord = webhookCode.includes("processReminderResponse(userId, action, reminderId");

console.log(`✓ Parses custom_id: ${hasCustomIdParsing ? "YES" : "NO"}`);
console.log(`✓ Extracts reminder ID: ${extractsReminderId ? "YES" : "NO"}`);
console.log(`✓ Calls recordUserResponse: ${callsRecordResponse ? "YES" : "NO"}`);
console.log(`✓ Passes reminder ID to processing: ${passesReminderIdToRecord ? "YES" : "NO"}`);

if (!hasCustomIdParsing || !extractsReminderId || !passesReminderIdToRecord) {
  console.log("⚠️  WARNING: Webhook handler may not be processing reminder ID correctly!");
  failedTests++;
} else {
  passedTests++;
}

// Test 5: Check for Phase 9 repeat reminder interference
console.log("\nTest 5: Phase 9 Repeat Reminder Check");
console.log("--------------------------------------");

const schedulerCode = await Deno.readTextFile("./discord-bot/lib/reminder/scheduler.ts");

const schedulerSendsReminder = schedulerCode.includes("sendReminder(currentReminder)");
const usesCurrentReminder = schedulerCode.includes("const currentReminder = currentResult.data");
const currentReminderHasId = schedulerCode.includes("currentReminder") && schedulerCode.includes("reminder.id");

console.log(`✓ Scheduler calls sendReminder: ${schedulerSendsReminder ? "YES" : "NO"}`);
console.log(`✓ Uses currentReminder: ${usesCurrentReminder ? "YES" : "NO"}`);
console.log(`✓ currentReminder includes ID: ${currentReminderHasId ? "YES" : "NO"}`);

if (!schedulerSendsReminder || !usesCurrentReminder) {
  console.log("⚠️  WARNING: Scheduler may not be passing complete reminder object!");
  failedTests++;
} else {
  passedTests++;
}

// Summary
console.log("\n=== Verification Summary ===");
console.log(`Total Tests: ${passedTests + failedTests}`);
console.log(`Passed: ${passedTests} ✓`);
console.log(`Failed: ${failedTests} ✗`);

if (failedTests === 0) {
  console.log("\n✅ All webhook integrity checks passed!");
  console.log("The webhook functionality should be working correctly.");
  Deno.exit(0);
} else {
  console.log("\n⚠️  Some checks failed!");
  console.log("Please review the failed tests above for details.");
  Deno.exit(1);
}
