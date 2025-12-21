/**
 * RULE GROUP 4: Linking & Specificity
 * 
 * Enforces explicit provider linkage for related conditions.
 * Prevents assumption-based coding from treatment patterns.
 */

import { DecisionState, AuditRiskLevel } from '../decision';
import { AuditResult, createAuditResult } from '../auditResult';

export interface DiabetesLinkingContext {
    diabetesDocumented: boolean;
    complication: 'ulcer' | 'neuropathy' | 'infection' | 'retinopathy' | 'nephropathy' | null;
    explicitLinkDocumented: boolean;
    complicationLocation?: string;
}

export interface COPDContext {
    copdDocumented: boolean;
    shortnessOfBreath: boolean;
    exacerbationExplicitlyDocumented: boolean;
    treatedWithBronchodilators: boolean;
    treatedWithSteroids: boolean;
}

export interface HeartFailureContext {
    heartFailureDocumented: boolean;
    acuteChronicStatus?: 'acute' | 'chronic' | 'acute on chronic';
    exacerbationLanguageUsed: boolean;
    knownChronicHF: boolean;
    systolicDiastolic?: 'systolic' | 'diastolic' | 'combined';
    ejectionFraction?: number;
}

/**
 * Rule 4.1: Diabetes Complication Linking
 * Validated: Case 31
 */
export function evaluateDiabetesLinking(ctx: DiabetesLinkingContext): AuditResult | null {
    if (!ctx.diabetesDocumented || !ctx.complication) {
        return null; // No diabetes or no complication present
    }

    if (ctx.explicitLinkDocumented) {
        return null; // Link documented, allow other rules to proceed
    }

    // Diabetes + complication but NO explicit link
    const result = createAuditResult(
        DecisionState.AUTO_QUERY,
        AuditRiskLevel.HIGH,
        'Diabetes and potential complication present but no explicit linkage documented - query required',
        ['Rule Group 4.1: Diabetes Complication Linking']
    );

    result.queriesRequired.push({
        concept: `Diabetic ${ctx.complication}`,
        query: `Patient has type 2 diabetes and ${ctx.complication}${ctx.complicationLocation ? ` (${ctx.complicationLocation})` : ''}. Is the ${ctx.complication} diabetic in origin?`,
        ruleGroup: 'Rule Group 4.1',
    });

    // Fallback: code separately if query unanswered
    result.autoCoded.push({
        code: 'E11.9',
        description: 'Type 2 diabetes mellitus without complications (fallback if query unanswered)',
        position: 'Secondary',
    });

    return result;
}

/**
 * Rule 4.2: CHF Acute vs Chronic Status
 * Validated: Cases 25 (exception), 36 (query)
 */
export function evaluateHeartFailureStatus(ctx: HeartFailureContext): AuditResult | null {
    if (!ctx.heartFailureDocumented) {
        return null;
    }

    // EXCEPTION: "Exacerbation" of known chronic HF = acute on chronic
    if (ctx.exacerbationLanguageUsed && ctx.knownChronicHF) {
        const result = createAuditResult(
            DecisionState.AUTO_CODE,
            AuditRiskLevel.LOW,
            '"Exacerbation" of known chronic heart failure = acute on chronic per ICD-10-CM guidelines',
            ['Rule Group 4.2: CHF Exacerbation Exception']
        );

        const systolicCode = ctx.systolicDiastolic === 'systolic' ? 'I50.23' :
            ctx.systolicDiastolic === 'diastolic' ? 'I50.33' :
                ctx.systolicDiastolic === 'combined' ? 'I50.43' : 'I50.9';

        result.autoCoded.push({
            code: systolicCode,
            description: 'Acute on chronic heart failure',
            position: 'Primary',
        });

        return result;
    }

    if (ctx.acuteChronicStatus !== undefined) {
        return null; // Status specified, allow other rules
    }

    // Heart failure without acute/chronic status
    const result = createAuditResult(
        DecisionState.AUTO_QUERY,
        AuditRiskLevel.MEDIUM,
        'Heart failure documented without acute/chronic status - query recommended for specificity',
        ['Rule Group 4.2: CHF Acute vs Chronic Status']
    );

    let ejInfo = '';
    if (ctx.ejectionFraction !== undefined) {
        ejInfo = ` [EF ${ctx.ejectionFraction}%]`;
    }

    result.queriesRequired.push({
        concept: 'Heart Failure',
        query: `You documented "heart failure"${ejInfo}. Can you specify:\n- Acute heart failure\n- Chronic heart failure\n- Acute on chronic heart failure\nAlso: systolic, diastolic, or combined?`,
        ruleGroup: 'Rule Group 4.2',
    });

    // Fallback: unspecified code if query unanswered
    result.autoCoded.push({
        code: 'I50.9',
        description: 'Heart failure, unspecified (fallback if query unanswered)',
        position: 'Primary',
    });

    return result;
}

/**
 * Rule 4.3: COPD Exacerbation Inference Prohibition
 * Validated: Case 39
 */
export function evaluateCOPDExacerbation(ctx: COPDContext): AuditResult | null {
    if (!ctx.copdDocumented || !ctx.shortnessOfBreath) {
        return null;
    }

    if (ctx.exacerbationExplicitlyDocumented) {
        return null; // Exacerbation documented, allow other rules
    }

    // COPD + SOB + treatment pattern but NO explicit exacerbation diagnosis
    const treatmentPattern = ctx.treatedWithBronchodilators || ctx.treatedWithSteroids;

    if (!treatmentPattern) {
        return null; // No suggestive treatment
    }

    const result = createAuditResult(
        DecisionState.AUTO_QUERY,
        AuditRiskLevel.MEDIUM,
        'COPD patient with SOB and exacerbation treatment pattern but no explicit exacerbation diagnosis - query required',
        ['Rule Group 4.3: COPD Exacerbation Inference Prohibition']
    );

    const treatmentInfo: string[] = [];
    if (ctx.treatedWithBronchodilators) treatmentInfo.push('bronchodilators');
    if (ctx.treatedWithSteroids) treatmentInfo.push('steroids');

    result.queriesRequired.push({
        concept: 'COPD Exacerbation',
        query: `Patient with known COPD admitted with shortness of breath and treated with ${treatmentInfo.join(' and ')}. Is this a COPD exacerbation?\nIf yes, this allows coding J44.1 (COPD with acute exacerbation).`,
        ruleGroup: 'Rule Group 4.3',
    });

    // Fallback: code COPD + SOB separately if query unanswered
    result.autoCoded.push({
        code: 'R06.02',
        description: 'Shortness of breath (fallback if query unanswered)',
        position: 'Primary',
    });

    result.autoCoded.push({
        code: 'J44.9',
        description: 'Chronic obstructive pulmonary disease, unspecified (fallback if query unanswered)',
        position: 'Secondary',
    });

    return result;
}
