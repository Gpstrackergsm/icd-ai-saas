/**
 * RULE GROUP 5: Stroke History vs Sequela
 * 
 * Determines whether to code stroke history or sequela based on residual deficits.
 * Never allows both in same encounter.
 */

import { DecisionState, AuditRiskLevel } from '../decision';
import { AuditResult, createAuditResult } from '../auditResult';

export interface StrokeHistoryContext {
    priorStrokeDocumented: boolean;
    strokeType?: 'ischemic' | 'hemorrhagic' | 'unspecified';
    residualDeficitsDocumented: boolean;
    deficitType?: 'hemiplegia' | 'hemiparesis' | 'aphasia' | 'dysphagia' | 'ataxia' | 'cognitive';
    affectedSide?: 'left dominant' | 'left non-dominant' | 'right dominant' | 'right non-dominant' | 'unspecified';
    acuteStrokeThisEncounter: boolean;
}

/**
 * Rule 5.1: Current Residual Deficits Present
 * Validated: Case 33
 */
export function evaluateStrokeSequela(ctx: StrokeHistoryContext): AuditResult | null {
    if (!ctx.priorStrokeDocumented) {
        return null;
    }

    if (ctx.acuteStrokeThisEncounter) {
        return null; // Acute stroke takes precedence, different coding
    }

    if (!ctx.residualDeficitsDocumented) {
        return null; // No deficits, use history-only code (Rule 5.2)
    }

    // Prior stroke WITH current residual deficits = sequela
    const result = createAuditResult(
        DecisionState.AUTO_CODE,
        AuditRiskLevel.LOW,
        'Prior stroke with documented current residual deficits - code sequela appropriately',
        ['Rule Group 5.1: Stroke Sequela with Residual Deficits']
    );

    const sequelaCode = getSequelaCode(ctx.deficitType, ctx.affectedSide);

    result.autoCoded.push({
        code: sequelaCode,
        description: `Sequela of ${ctx.strokeType || 'cerebral'} infarction - ${ctx.deficitType || 'deficit'}`,
        position: 'Secondary',
    });

    return result;
}

/**
 * Rule 5.2: No Residual Deficits
 * Validated: Case 2
 */
export function evaluateStrokeHistory(ctx: StrokeHistoryContext): AuditResult | null {
    if (!ctx.priorStrokeDocumented) {
        return null;
    }

    if (ctx.acuteStrokeThisEncounter) {
        return null; // Acute stroke, different coding
    }

    if (ctx.residualDeficitsDocumented) {
        return null; // Has deficits, use sequela code (Rule 5.1)
    }

    // Prior stroke with NO residual deficits = history only
    const result = createAuditResult(
        DecisionState.AUTO_CODE,
        AuditRiskLevel.LOW,
        'Prior stroke with no residual deficits documented - code history only',
        ['Rule Group 5.2: Stroke History without Deficits']
    );

    result.autoCoded.push({
        code: 'Z86.73',
        description: 'Personal history of transient ischemic attack (TIA), and cerebral infarction without residual deficits',
        position: 'Secondary',
    });

    return result;
}

/**
 * Map deficit type to ICD-10-CM sequela code
 */
function getSequelaCode(deficitType?: string, side?: string): string {
    if (!deficitType) {
        return 'I69.398'; // Other sequelae of cerebral infarction
    }

    // Hemiplegia/hemiparesis codes
    if (deficitType === 'hemiplegia' || deficitType === 'hemiparesis') {
        if (side === 'left dominant') return 'I69.351';
        if (side === 'left non-dominant') return 'I69.352';
        if (side === 'right dominant') return 'I69.353';
        if (side === 'right non-dominant') return 'I69.354';
        return 'I69.359'; // Unspecified side
    }

    // Aphasia
    if (deficitType === 'aphasia') {
        return 'I69.320';
    }

    // Dysphagia
    if (deficitType === 'dysphagia') {
        return 'I69.391';
    }

    // Ataxia
    if (deficitType === 'ataxia') {
        return 'I69.393';
    }

    // Cognitive deficits
    if (deficitType === 'cognitive') {
        return 'I69.31'; // Cognitive deficits following cerebral infarction
    }

    return 'I69.398'; // Other sequelae
}
