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
