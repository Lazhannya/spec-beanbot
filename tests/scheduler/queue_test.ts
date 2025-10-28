/**
 * Test suite for delivery queue types and interfaces
 * Validates queue data structures and configuration
 */

import { assertEquals } from "$std/assert/mod.ts";
import type { DeliveryQueueItem, QueueStats, RetryConfig } from "../../discord-bot/lib/scheduler/queue.ts";

Deno.test("DeliveryQueueItem interface", () => {
  const queueItem: DeliveryQueueItem = {
    id: "item-123",
    reminderId: "reminder-456", 
    userId: "user-789",
    scheduledUtc: new Date("2024-12-25T10:00:00Z"),
    scheduledTimezone: "Europe/Berlin",
    userDisplayTime: "2024-12-25T11:00",
    messageContent: "Test reminder message",
    attempt: 1,
    maxAttempts: 3,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  assertEquals(typeof queueItem.id, "string");
  assertEquals(typeof queueItem.reminderId, "string");
  assertEquals(typeof queueItem.userId, "string");
  assertEquals(queueItem.scheduledUtc instanceof Date, true);
  assertEquals(typeof queueItem.scheduledTimezone, "string");
  assertEquals(typeof queueItem.messageContent, "string");
  assertEquals(typeof queueItem.attempt, "number");
  assertEquals(typeof queueItem.maxAttempts, "number");
});

Deno.test("QueueStats interface", () => {
  const stats: QueueStats = {
    pending: 5,
    scheduled: 10,
    failed: 2,
    delivered: 100,
    retrying: 1
  };

  assertEquals(typeof stats.pending, "number");
  assertEquals(typeof stats.scheduled, "number"); 
  assertEquals(typeof stats.failed, "number");
  assertEquals(typeof stats.delivered, "number");
  assertEquals(typeof stats.retrying, "number");
});

Deno.test("RetryConfig interface", () => {
  const config: RetryConfig = {
    maxAttempts: 3,
    baseDelayMs: 60000,
    maxDelayMs: 3600000,
    exponentialBase: 2
  };

  assertEquals(typeof config.maxAttempts, "number");
  assertEquals(typeof config.baseDelayMs, "number");
  assertEquals(typeof config.maxDelayMs, "number");
  assertEquals(typeof config.exponentialBase, "number");
  assertEquals(config.maxAttempts > 0, true);
  assertEquals(config.baseDelayMs > 0, true);
  assertEquals(config.maxDelayMs > config.baseDelayMs, true);
  assertEquals(config.exponentialBase > 1, true);
});