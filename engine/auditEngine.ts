/**
 * ICD-10-CM AUDIT ENGINE - Rule Orchestrator
 * 
 * Enforces EXCLUDE > QUERY > CODE hierarchy.
 * First-match-wins decision logic.
 */

import { DecisionState, AuditRiskLevel } from './decision';
import { AuditResult, createAuditResult, formatAuditResult } from './auditResult';

// Rule Group Imports
import { evaluateConflictingDocumentation, evaluateNonDefinitiveLanguage, ConflictCheck } from './rules/ruleGroup1_conflictingDocs';
import { evaluateSepsisWithoutOrganDysfunction, evaluateSevereSepsisLanguage, evaluateSepticShockCriteria, evaluateInfectionWithSIRS, SepsisContext } from './rules/ruleGroup2_sepsis';
import { evaluateNonSpecificRenalTerms, evaluateCKDStaging, evaluateLabsWithoutDiagnosis, RenalContext } from './rules/ruleGroup3_renalDetermination';
import { evaluateConditionAddressed, ConditionAddressedContext } from './rules/ruleGroup6_hccExclusion';

export interface ClinicalCase {
    caseNumber?: number;
    narrative: string;
    providerDiagnoses: string[];
    // Add more structured fields as needed
}

export class AuditEngine {
    /**
     * Evaluate a clinical case through all rule groups.
     * 
     * Decision hierarchy (first match wins):
     * 1. Conflicting documentation? → BLOCK_AND_QUERY
     * 2. Not documented/not addressed? → AUTO_EXCLUDE  
     * 3. Missing required specificity? → AUTO_QUERY
     * 4. Non-definitive language? → AUTO_EXCLUDE
     * 5. All criteria met? → AUTO_CODE
     * 6. Default → AUTO_EXCLUDE
     */
    evaluate(clinicalCase: ClinicalCase): AuditResult {
        const rulesEvaluated: (AuditResult | null)[] = [];

        // PRIORITY 1: Check for conflicting documentation (BLOCK_AND_QUERY)
        // ... (Would need to extract conflict checks from narrative)

        // PRIORITY 2: Check if not documented (AUTO_EXCLUDE)
        // ... (Would need to parse narrative for absence of diagnoses)

        // PRIORITY 3: Check for missing specificity (AUTO_QUERY)
        // ... (Would need to identify incomplete diagnoses)

        // If no rules triggered, allow auto-code (if diagnosis is valid)
        // ... (Would need full diagnosis validation logic)

        // For now, return a placeholder
        return createAuditResult(
            DecisionState.AUTO_EXCLUDE,
            AuditRiskLevel.LOW,
            'Default exclusion - no valid diagnosis detected',
            ['Default Rule']
        );
    }

    /**
     * Evaluate sepsis-specific case
     */
    evaluateSepsisCase(sepsisContext: SepsisContext): AuditResult {
        // Rule Group 2 evaluation in priority order
        const rules = [
            () => evaluateSevereSepsisLanguage(sepsisContext), // BLOCK_AND_QUERY has priority
            () => evaluateSepticShockCriteria(sepsisContext),  // AUTO_QUERY
            () => evaluateSepsisWithoutOrganDysfunction(sepsisContext), // AUTO_CODE
        ];

        for (const rule of rules) {
            const result = rule();
            if (result !== null) {
                return result; // First match wins
            }
        }

        // No sepsis rules triggered
        return createAuditResult(
            DecisionState.AUTO_EXCLUDE,
            AuditRiskLevel.LOW,
            'No sepsis diagnosis validated',
            []
        );
    }

    /**
     * Evaluate renal-specific case
     */
    evaluateRenalCase(renalContext: RenalContext): AuditResult {
        const rules = [
            () => evaluateLabsWithoutDiagnosis(renalContext), // AUTO_EXCLUDE (high priority)
            () => evaluateNonSpecificRenalTerms(renalContext), // AUTO_QUERY
            () => evaluateCKDStaging(renalContext), // AUTO_QUERY
        ];

        for (const rule of rules) {
            const result = rule();
            if (result !== null) {
                return result;
            }
        }

        return createAuditResult(
            DecisionState.AUTO_EXCLUDE,
            AuditRiskLevel.LOW,
            'No renal diagnosis validated',
            []
        );
    }

    /**
     * Evaluate HCC recapture case
     */
    evaluateHCCCase(conditionContext: ConditionAddressedContext): AuditResult {
        const result = evaluateConditionAddressed(conditionContext);

        if (result !== null) {
            return result;
        }

        // Condition was addressed, allow coding
        return createAuditResult(
            DecisionState.AUTO_CODE,
            AuditRiskLevel.LOW,
            'Condition evaluated/treated/monitored - appropriate to code',
            ['Rule Group 6: Condition Addressed']
        );
    }
}

// Export singleton instance
export const auditEngine = new AuditEngine();
