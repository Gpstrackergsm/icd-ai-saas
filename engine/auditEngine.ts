/**
 * ICD-10-CM AUDIT ENGINE - Rule Orchestrator
 * 
 * Enforces EXCLUDE > QUERY > CODE hierarchy.
 * First-match-wins decision logic with strict priority enforcement.
 */

import { DecisionState, AuditRiskLevel } from './decision';
import { AuditResult, createAuditResult, formatAuditResult } from './auditResult';

// Rule Group Imports
import { evaluateConflictingDocumentation, evaluateNonDefinitiveLanguage, evaluateAKIConflict, ConflictCheck, AKIConflictCheck } from './rules/ruleGroup1_conflictingDocs';
import { evaluateSepsisWithoutOrganDysfunction, evaluateSevereSepsisLanguage, evaluateSepticShockCriteria, evaluateInfectionWithSIRS, SepsisContext } from './rules/ruleGroup2_sepsis';
import { evaluateNonSpecificRenalTerms, evaluateCKDStaging, evaluateLabsWithoutDiagnosis, RenalContext } from './rules/ruleGroup3_renalDetermination';
import { evaluateDiabetesLinking, evaluateHeartFailureStatus, evaluateCOPDExacerbation, DiabetesLinkingContext, HeartFailureContext, COPDContext } from './rules/ruleGroup4_linkingSpecificity';
import { evaluateStrokeSequela, evaluateStrokeHistory, StrokeHistoryContext } from './rules/ruleGroup5_strokeSequela';
import { evaluateConditionAddressed, ConditionAddressedContext } from './rules/ruleGroup6_hccExclusion';

export interface ClinicalCase {
    caseNumber?: number;
    narrative: string;
    providerDiagnoses: string[];
}

/**
 * Priority order for decision state enforcement:
 * 1. BLOCK_AND_QUERY (highest priority - hard stop)
 * 2. AUTO_EXCLUDE (not documented/not addressed)
 * 3. AUTO_QUERY (missing specificity)
 * 4. AUTO_CODE (all criteria met)
 */
function getDSPriority(state: DecisionState): number {
    switch (state) {
        case DecisionState.BLOCK_AND_QUERY: return 1;
        case DecisionState.AUTO_EXCLUDE: return 2;
        case DecisionState.AUTO_QUERY: return 3;
        case DecisionState.AUTO_CODE: return 4;
    }
}

/**
 * Merge multiple audit results, respecting priority hierarchy
 */
function mergeResults(results: AuditResult[]): AuditResult {
    if (results.length === 0) {
        return createAuditResult(
            DecisionState.AUTO_EXCLUDE,
            AuditRiskLevel.LOW,
            'No valid diagnosis detected - default exclusion',
            ['Default Rule']
        );
    }

    if (results.length === 1) {
        return results[0];
    }

    // Sort by priority (BLOCK_AND_QUERY first)
    results.sort((a, b) => getDSPriority(a.decisionState) - getDSPriority(b.decisionState));

    // Take highest priority result as base
    const merged = { ...results[0] };

    // Merge codes, exclusions, and queries from all results
    for (let i = 1; i < results.length; i++) {
        merged.autoCoded.push(...results[i].autoCoded);
        merged.autoExcluded.push(...results[i].autoExcluded);
        merged.queriesRequired.push(...results[i].queriesRequired);
        merged.rulesTriggered.push(...results[i].rulesTriggered);
    }

    // Deduplicate
    merged.autoCoded = Array.from(new Set(merged.autoCoded.map(c => JSON.stringify(c)))).map(s => JSON.parse(s));
    merged.autoExcluded = Array.from(new Set(merged.autoExcluded.map(e => JSON.stringify(e)))).map(s => JSON.parse(s));
    merged.queriesRequired = Array.from(new Set(merged.queriesRequired.map(q => JSON.stringify(q)))).map(s => JSON.parse(s));
    merged.rulesTriggered = Array.from(new Set(merged.rulesTriggered));

    return merged;
}

export class AuditEngine {
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
            // Rule Group 1.3: AKI conflict check (BLOCK_AND_QUERY - highest priority)
            () => evaluateAKIConflict({
                akiDocumented: renalContext.akiDocumented || false,
                creatinineBaseline: renalContext.creatinineBaseline,
                creatinineCurrent: renalContext.creatinineCurrent,
            }),
            () => evaluateLabsWithoutDiagnosis(renalContext), // AUTO_EXCLUDE (high priority)
            () => evaluateNonSpecificRenalTerms(renalContext), // AUTO_QUERY
            () => evaluateCKDStaging(renalContext), // AUTO_QUERY or AUTO_CODE
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
     * Evaluate diabetes linking case
     */
    evaluateDiabetesCase(diabetesContext: DiabetesLinkingContext): AuditResult {
        const result = evaluateDiabetesLinking(diabetesContext);

        if (result !== null) {
            return result;
        }

        return createAuditResult(
            DecisionState.AUTO_CODE,
            AuditRiskLevel.LOW,
            'Diabetes complication linkage documented appropriately',
            ['Rule Group 4.1: Diabetes Linking']
        );
    }

    /**
     * Evaluate heart failure case
     */
    evaluateHeartFailureCase(hfContext: HeartFailureContext): AuditResult {
        const result = evaluateHeartFailureStatus(hfContext);

        if (result !== null) {
            return result;
        }

        return createAuditResult(
            DecisionState.AUTO_CODE,
            AuditRiskLevel.LOW,
            'Heart failure status documented appropriately',
            ['Rule Group 4.2: Heart Failure Status']
        );
    }

    /**
     * Evaluate COPD exacerbation case
     */
    evaluateCOPDCase(copdContext: COPDContext): AuditResult {
        const result = evaluateCOPDExacerbation(copdContext);

        if (result !== null) {
            return result;
        }

        return createAuditResult(
            DecisionState.AUTO_CODE,
            AuditRiskLevel.LOW,
            'COPD exacerbation documented appropriately',
            ['Rule Group 4.3: COPD Exacerbation']
        );
    }

    /**
     * Evaluate stroke history vs sequela case
     */
    evaluateStrokeCase(strokeContext: StrokeHistoryContext): AuditResult {
        const rules = [
            () => evaluateStrokeSequela(strokeContext), // Has deficits = sequela
            () => evaluateStrokeHistory(strokeContext), // No deficits = history
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
            'No stroke history or sequela to code',
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

        return createAuditResult(
            DecisionState.AUTO_CODE,
            AuditRiskLevel.LOW,
            'Condition evaluated/treated/monitored - appropriate to code',
            ['Rule Group 6: Condition Addressed']
        );
    }

    /**
     * Full evaluation with all rule groups
     * Priority order enforced: BLOCK_AND_QUERY > AUTO_EXCLUDE > AUTO_QUERY > AUTO_CODE
     */
    evaluateComprehensive(contexts: {
        sepsis?: SepsisContext;
        renal?: RenalContext;
        diabetes?: DiabetesLinkingContext;
        heartFailure?: HeartFailureContext;
        copd?: COPDContext;
        stroke?: StrokeHistoryContext;
        hcc?: ConditionAddressedContext[];
    }): AuditResult {
        const results: AuditResult[] = [];

        if (contexts.sepsis) {
            results.push(this.evaluateSepsisCase(contexts.sepsis));
        }

        if (contexts.renal) {
            results.push(this.evaluateRenalCase(contexts.renal));
        }

        if (contexts.diabetes) {
            results.push(this.evaluateDiabetesCase(contexts.diabetes));
        }

        if (contexts.heartFailure) {
            results.push(this.evaluateHeartFailureCase(contexts.heartFailure));
        }

        if (contexts.copd) {
            results.push(this.evaluateCOPDCase(contexts.copd));
        }

        if (contexts.stroke) {
            results.push(this.evaluateStrokeCase(contexts.stroke));
        }

        if (contexts.hcc) {
            contexts.hcc.forEach(hccCtx => {
                results.push(this.evaluateHCCCase(hccCtx));
            });
        }

        return mergeResults(results);
    }
}

// Export singleton instance
export const auditEngine = new AuditEngine();
