/**
 * ICD-10-CM AUDIT ENGINE - Decision State Types
 * Enforces EXCLUDE > QUERY > CODE hierarchy
 */

export enum DecisionState {
  /** Clear documentation, criteria met, no conflicts - automatically assign code */
  AUTO_CODE = 'AUTO_CODE',
  
  /** Not documented, not addressed, or intentionally excluded - do not assign code */
  AUTO_EXCLUDE = 'AUTO_EXCLUDE',
  
  /** Missing required specificity or clarification needed - generate query */
  AUTO_QUERY = 'AUTO_QUERY',
  
  /** Conflicting documentation, cannot proceed - hard stop, mandatory query */
  BLOCK_AND_QUERY = 'BLOCK_AND_QUERY',
}

export enum AuditRiskLevel {
  LOW = 'LOW',       // >95% audit confidence
  MEDIUM = 'MEDIUM', // 75-95% audit confidence
  HIGH = 'HIGH',     // <75% audit confidence - requires intervention
}

export interface DiagnosisCode {
  code: string;
  description: string;
  position: 'Primary' | 'Secondary';
}

export interface ExcludedConcept {
  concept: string;
  reason: 'not documented' | 'not supported' | 'not addressed' | 'conflicting evidence';
}

export interface QueryRequirement {
  concept: string;
  query: string;
  ruleGroup: string;
}
