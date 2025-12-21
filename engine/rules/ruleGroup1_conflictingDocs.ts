/**
 * RULE GROUP 1: Conflicting Documentation Gate
 * 
 * Validates that provider-documented diagnoses are supported by clinical evidence.
 * Triggers BLOCK_AND_QUERY when conflicts exist.
 */

import { DecisionState, AuditRiskLevel } from '../decision';
import { AuditResult, createAuditResult } from '../auditResult';

export interface ConflictCheck {
    diagnosisDocumented: string;
    clinicalEvidence: string;
    meetsKnownCriteria: boolean;
    criteriaDescription?: string;
}

export interface AKIConflictCheck {
    akiDocumented: boolean;
    creatinineBaseline?: number;
    creatinineCurrent?: number;
}

/**
 * Rule 1.1: Conflicting Documentation Gate
 * 
 * Examples validated:
 * - Case 24: AKI documented with Cr 1.0→1.1 (<0.3 KDIGO threshold)
 * - Case 26: Acute respiratory failure with O2 sat >94% on room air
 * - Case 38: Encephalopathy documented but later "mental status at baseline"
 */
export function evaluateConflictingDocumentation(
    providerDiagnosis: string,
    conflictCheck: ConflictCheck
): AuditResult | null {
    if (!conflictCheck.diagnosisDocumented) {
        return null; // No diagnosis documented, rule doesn't apply
    }

    if (conflictCheck.meetsKnownCriteria) {
        return null; // No conflict, allow other rules to proceed
    }

    // CONFLICT DETECTED
    const result = createAuditResult(
        DecisionState.BLOCK_AND_QUERY,
        AuditRiskLevel.HIGH,
        'Provider documentation conflicts with objective clinical criteria - mandatory query required to resolve',
        ['Rule Group 1: Conflicting Documentation Gate']
    );

    result.queriesRequired.push({
        concept: providerDiagnosis,
        query: `You documented "${providerDiagnosis}." However, clinical data shows ${conflictCheck.clinicalEvidence}. Can you confirm if ${providerDiagnosis} is present? If not, please amend documentation.`,
        ruleGroup: 'Rule Group 1',
    });

    return result;
}

/**
 * Rule 1.3: AKI Conflicting Documentation
 * 
 * Validates AKI diagnosis against KDIGO criteria:
 * - Creatinine rise ≥0.3 mg/dL OR
 * - Creatinine rise ≥1.5x baseline
 * 
 * If AKI documented but criteria NOT met → BLOCK_AND_QUERY
 * 
 * REGRESSION GUARD: This rule is FROZEN to prevent inappropriate AKI coding.
 * Any future changes must:
 * 1. Trigger BLOCK_AND_QUERY when AKI documented with insufficient criteria
 * 2. Never AUTO_CODE N17.x without meeting KDIGO thresholds
 * 3. Pass regression test R6 before deployment
 */
export function evaluateAKIConflict(ctx: AKIConflictCheck): AuditResult | null {
    if (!ctx.akiDocumented) {
        return null; // No AKI documented
    }

    if (!ctx.creatinineBaseline || !ctx.creatinineCurrent) {
        return null; // Cannot validate without baseline and current values
    }

    const creatinineRise = ctx.creatinineCurrent - ctx.creatinineBaseline;
    const creatinineRatio = ctx.creatinineCurrent / ctx.creatinineBaseline;

    // Check KDIGO criteria
    const meetsAbsoluteRise = creatinineRise >= 0.3;
    const meetsRelativeRise = creatinineRatio >= 1.5;

    if (meetsAbsoluteRise || meetsRelativeRise) {
        return null; // Criteria met, allow other rules
    }

    // CONFLICT: AKI documented but criteria NOT met
    const result = createAuditResult(
        DecisionState.BLOCK_AND_QUERY,
        AuditRiskLevel.HIGH,
        'AKI documented but KDIGO criteria not met - mandatory query required',
        ['Rule Group 1.3: AKI Conflicting Documentation']
    );

    result.queriesRequired.push({
        concept: 'Acute Kidney Injury',
        query: `You documented "acute kidney injury," but creatinine increased from ${ctx.creatinineBaseline} to ${ctx.creatinineCurrent} (+${creatinineRise.toFixed(2)} mg/dL, ${creatinineRatio.toFixed(2)}x baseline). This does not meet KDIGO criteria (≥0.3 mg/dL rise OR ≥1.5x baseline). Can you confirm AKI is present, or should documentation be amended?`,
        ruleGroup: 'Rule Group 1.3',
    });

    return result;
}

/**
 * Rule 1.2: Non-Definitive Language
 * 
 * "Possible", "probable", "suspected", "likely" = NOT codeable
 * Must query attending for final diagnosis
 */
export function evaluateNonDefinitiveLanguage(
    diagnosis: string,
    source: 'attending' | 'consultant'
): AuditResult | null {
    const nonDefinitiveTerms = ['possible', 'probable', 'suspected', 'likely', 'rule out', 'r/o'];

    const hasNonDefinitive = nonDefinitiveTerms.some(term =>
        diagnosis.toLowerCase().includes(term)
    );

    if (!hasNonDefinitive) {
        return null; // Definitive language, allow other rules
    }

    const result = createAuditResult(
        DecisionState.AUTO_EXCLUDE,
        AuditRiskLevel.MEDIUM,
        'Non-definitive language used - cannot code until attending confirms diagnosis',
        ['Rule Group 1: Non-Definitive Language']
    );

    result.autoExcluded.push({
        concept: diagnosis,
        reason: 'not supported',
    });

    if (source === 'consultant') {
        result.queriesRequired.push({
            concept: diagnosis,
            query: `Consultant noted "${diagnosis}." Can you confirm this diagnosis as the attending physician?`,
            ruleGroup: 'Rule Group 1',
        });
    }

    return result;
}
