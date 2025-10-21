// Escalation module exports
// This module provides centralized access to escalation functionality

export {
  EscalationService,
  initializeEscalationService,
  getEscalationService,
  startEscalationService,
  stopEscalationService,
} from "./service.ts";

export type {
  EscalationConfig,
  EscalationLevel,
  EscalationResult,
  EscalationBatchResult,
} from "./service.ts";