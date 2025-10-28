/**
 * Service factory for creating ReminderService instances with proper dependencies
 * Centralized creation to ensure all dependencies are properly injected
 */

import { ReminderService } from "../reminder/service.ts";
import { ReminderRepository } from "../reminder/repository.ts";
import { DeliveryQueue } from "../scheduler/queue.ts";

/**
 * Create a ReminderService instance with all required dependencies
 */
export async function createReminderService(kv?: Deno.Kv): Promise<ReminderService> {
  // Use provided KV or open new connection
  const kvStore = kv || await Deno.openKv();
  
  // Create dependencies
  const repository = new ReminderRepository(kvStore);
  const deliveryQueue = new DeliveryQueue(kvStore);
  
  // Create and return service
  return new ReminderService(repository, deliveryQueue);
}

/**
 * Create ReminderService with existing repository (for backwards compatibility)
 */
export function createReminderServiceWithRepository(
  repository: ReminderRepository,
  kv: Deno.Kv
): ReminderService {
  const deliveryQueue = new DeliveryQueue(kv);
  return new ReminderService(repository, deliveryQueue);
}