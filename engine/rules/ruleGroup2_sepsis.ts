/**
 * RULE GROUP 2: Sepsis Severity Logic
 * 
 * Enforces strict sepsis coding rules per ICD-10-CM guidelines.
 * Prevents inappropriate coding of severe sepsis/septic shock.
 */

import { DecisionState, AuditRiskLevel } from '../decision';
import { AuditResult, createAuditResult } from '../auditResult';

export interface SepsisContext {
    providerTerm: string; // "sepsis", "severe sepsis", "septic shock", "infection with SIRS"
    organDysfunctionDocumented: boolean;
    hypotensionRequiresVasopressors: boolean;
    lactate?: number; // mmol/L
    organism?: string;
}

/**
 * Rule 2.1: Sepsis Without Organ Dysfunction
 * Validated: Case 21
 */
export function evaluateSepsisWithoutOrganDysfunction(ctx: SepsisContext): AuditResult | null {
    if (ctx.providerTerm.toLowerCase() !== 'sepsis') {
        return null;
    }

    if (ctx.organDysfunctionDocumented) {
        return null; // Has organ dysfunction, different rule applies
    }

    const result = createAuditResult(
        DecisionState.AUTO_CODE,
        AuditRiskLevel.MEDIUM,
        'Sepsis documented without organ dysfunction - coded sepsis only (no severe sepsis)',
        ['Rule Group 2.1: Sepsis Without Organ Dysfunction']
    );

    const organismCode = ctx.organism ? getOrganismCode(ctx.organism) : 'A41.9';

    result.autoCoded.push({
        code: organismCode,
        description: ctx.organism ? `Sepsis due to ${ctx.organism}` : 'Sepsis, unspecified organism',
        position: 'Primary',
    });

    result.autoCoded.push({
        code: 'R65.10',
        description: 'SIRS of infectious origin without acute organ dysfunction',
        position: 'Secondary',
    });

    return result;
}

/**
 * Rule 2.2: "Severe Sepsis" Language Gate
 * Validated: Case 22
 */
export function evaluateSevereSepsisLanguage(ctx: SepsisContext): AuditResult | null {
    if (!ctx.providerTerm.toLowerCase().includes('severe sepsis')) {
        return null;
    }

    if (ctx.organDysfunctionDocumented) {
        return null; // Organ dysfunction present, can code severe sepsis
    }

    // HARD STOP - severe sepsis without organ dysfunction
    const result = createAuditResult(
        DecisionState.BLOCK_AND_QUERY,
        AuditRiskLevel.HIGH,
        'Provider documented "severe sepsis" but no organ dysfunction documented - mandatory query required',
        ['Rule Group 2.2: Severe Sepsis Language Gate']
    );

    result.queriesRequired.push({
        concept: 'Severe Sepsis',
        query: 'You documented "severe sepsis." Per ICD-10-CM guidelines, severe sepsis requires documented acute organ dysfunction. Can you please document the specific acute organ dysfunction present? If no organ dysfunction, please clarify if this is sepsis without organ dysfunction.',
        ruleGroup: 'Rule Group 2.2',
    });

    return result;
}

/**
 * Rule 2.3: Septic Shock Clinical Criteria
 * Validated: Case 35
 */
export function evaluateSepticShockCriteria(ctx: SepsisContext): AuditResult | null {
    const meetsShockCriteria =
        ctx.hypotensionRequiresVasopressors &&
        ctx.lactate !== undefined &&
        ctx.lactate >= 2.0;

    if (!meetsShockCriteria) {
        return null;
    }

    if (ctx.providerTerm.toLowerCase().includes('septic shock')) {
        return null; // Provider already documented shock
    }

    // Clinical criteria met but provider did not document shock
    const result = createAuditResult(
        DecisionState.AUTO_QUERY,
        AuditRiskLevel.HIGH,
        'Clinical criteria suggest septic shock but not explicitly documented - query required',
        ['Rule Group 2.3: Septic Shock Clinical Criteria']
    );

    result.queriesRequired.push({
        concept: 'Septic Shock',
        query: `Patient had hypotension requiring vasopressors and elevated lactate (${ctx.lactate} mmol/L). This meets clinical criteria for septic shock. Can you confirm if this is septic shock?`,
        ruleGroup: 'Rule Group 2.3',
    });

    return result;
}

/**
 * Rule 2.4: Infection + SIRS ≠ Sepsis
 * Validated: Case 28
 */
export function evaluateInfectionWithSIRS(ctx: SepsisContext, infectionCode: string): AuditResult | null {
    const isSIRSLanguage = ctx.providerTerm.toLowerCase().includes('sirs') &&
        !ctx.providerTerm.toLowerCase().includes('sepsis');

    if (!isSIRSLanguage) {
        return null;
    }

    // Provider intentionally used "SIRS" not "sepsis"
    const result = createAuditResult(
        DecisionState.AUTO_CODE,
        AuditRiskLevel.LOW,
        'Provider used "infection with SIRS" terminology - respecting clinical judgment to not diagnose sepsis',
        ['Rule Group 2.4: Infection + SIRS ≠ Sepsis']
    );

    result.autoCoded.push({
        code: infectionCode,
        description: 'Primary infection',
        position: 'Primary',
    });

    result.autoCoded.push({
        code: 'R65.10',
        description: 'SIRS of infectious origin without acute organ dysfunction',
        position: 'Secondary',
    });

    return result;
}

function getOrganismCode(organism: string): string {
    const org = organism.toLowerCase();
    if (org.includes('e. coli') || org.includes('escherichia')) return 'A41.51';
    if (org.includes('staph') && org.includes('aureus')) return 'A41.01';
    if (org.includes('strep')) return 'A41.9'; // Would need more specificity
    return 'A41.9'; // Unspecified
}
