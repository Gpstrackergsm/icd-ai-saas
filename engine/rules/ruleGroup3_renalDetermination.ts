/**
 * RULE GROUP 3: AKI / CKD Determination
 * 
 * Enforces strict renal diagnosis validation.
 * Laboratory values alone NEVER create diagnoses.
 */

import { DecisionState, AuditRiskLevel } from '../decision';
import { AuditResult, createAuditResult } from '../auditResult';

export interface RenalContext {
    providerTerm?: string; // "AKI", "CKD", "renal insufficiency", "azotemia", etc.
    creatinineBaseline?: number;
    creatinineCurrent?: number;
    ckdStage?: number; // 1-5
    akiDocumented?: boolean;
    providerDocumentedDiagnosis: boolean;
}

/**
 * Rule 3.1: Non-Specific Renal Terminology
 * Validated: Case 23
 */
export function evaluateNonSpecificRenalTerms(ctx: RenalContext): AuditResult | null {
    if (!ctx.providerTerm) {
        return null;
    }

    const nonSpecificTerms = ['renal insufficiency', 'azotemia', 'elevated creatinine', 'impaired renal function'];
    const isNonSpecific = nonSpecificTerms.some(term =>
        ctx.providerTerm!.toLowerCase().includes(term)
    );

    if (!isNonSpecific) {
        return null; // Specific terminology used
    }

    const result = createAuditResult(
        DecisionState.AUTO_QUERY,
        AuditRiskLevel.HIGH,
        'Non-specific renal terminology used - query required to clarify AKI vs CKD',
        ['Rule Group 3.1: Non-Specific Renal Terminology']
    );

    result.queriesRequired.push({
        concept: ctx.providerTerm,
        query: `You documented "${ctx.providerTerm}." Can you clarify if this is:\n- Acute kidney injury (AKI)\n- Chronic kidney disease (CKD)\n- Acute kidney injury on chronic kidney disease`,
        ruleGroup: 'Rule Group 3.1',
    });

    // Fallback if query unanswered
    result.autoCoded.push({
        code: 'N28.9',
        description: 'Disorder of kidney and ureter, unspecified (fallback if query unanswered)',
        position: 'Secondary',
    });

    return result;
}

/**
 * Rule 3.2: CKD Staging Missing
 * Validated: Case 34, R8
 */
export function evaluateCKDStaging(ctx: RenalContext): AuditResult | null {
    if (!ctx.providerTerm?.toLowerCase().includes('ckd') &&
        !ctx.providerTerm?.toLowerCase().includes('chronic kidney')) {
        return null;
    }

    // Check if stage was extracted
    if (ctx.ckdStage !== undefined && ctx.ckdStage >= 1 && ctx.ckdStage <= 5) {
        // Stage documented - AUTO_CODE with specific stage code
        const result = createAuditResult(
            DecisionState.AUTO_CODE,
            AuditRiskLevel.LOW,
            `CKD stage ${ctx.ckdStage} documented - coding N18.${ctx.ckdStage}`,
            ['Rule Group 3.2: CKD Staging Documented']
        );

        result.autoCoded.push({
            code: `N18.${ctx.ckdStage}`,
            description: `Chronic kidney disease, stage ${ctx.ckdStage}`,
            position: 'Secondary',
        });

        return result;
    }

    // No stage extracted - query for staging
    const result = createAuditResult(
        DecisionState.AUTO_QUERY,
        AuditRiskLevel.MEDIUM,
        'CKD documented without staging - query recommended for specificity',
        ['Rule Group 3.2: CKD Staging Missing']
    );

    result.queriesRequired.push({
        concept: 'Chronic Kidney Disease',
        query: `You documented "chronic kidney disease." Can you specify the CKD stage (1-5) based on GFR or clinical assessment?\n\nReference:\n- Stage 1: GFR ≥90\n- Stage 2: GFR 60-89\n- Stage 3: GFR 30-59\n- Stage 4: GFR 15-29\n- Stage 5: GFR <15`,
        ruleGroup: 'Rule Group 3.2',
    });

    // Fallback if query unanswered
    result.autoCoded.push({
        code: 'N18.9',
        description: 'Chronic kidney disease, unspecified (fallback if query unanswered)',
        position: 'Secondary',
    });

    return result;
}

/**
 * Rule 3.3: Laboratory Values Alone
 * Validated: Cases 1, 4, 16
 */
export function evaluateLabsWithoutDiagnosis(ctx: RenalContext): AuditResult | null {
    // If provider documented a diagnosis, this rule doesn't apply
    if (ctx.providerDocumentedDiagnosis) {
        return null;
    }

    // Check if we have lab values but no diagnosis
    const hasLabValues = ctx.creatinineBaseline !== undefined || ctx.creatinineCurrent !== undefined;

    if (!hasLabValues) {
        return null;
    }

    const result = createAuditResult(
        DecisionState.AUTO_EXCLUDE,
        AuditRiskLevel.LOW,
        'Laboratory values present without provider diagnosis - excluded per audit rules',
        ['Rule Group 3.3: Laboratory Values Alone']
    );

    result.autoExcluded.push({
        concept: 'Renal Impairment',
        reason: 'not documented',
    });

    return result;
}
