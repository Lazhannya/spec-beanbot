// Escalation module exports
// This module provides centralized access to escalation functionality

export {
  EscalationService,
  getEscalationService,
  initializeEscalationService,
  startEscalationService,
  stopEscalationService,
} from "./service.ts";

export type {
  EscalationBatchResult,
  EscalationConfig,
  EscalationLevel,
  EscalationResult,
} from "./service.ts";
