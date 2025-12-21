/**
 * ICD-10-CM AUDIT ENGINE - Normalized Output Schema
 * Mandatory output format for all audit evaluations
 */

import { DecisionState, AuditRiskLevel, DiagnosisCode, ExcludedConcept, QueryRequirement } from './decision';

export interface AuditResult {
    decisionState: DecisionState;
    autoCoded: DiagnosisCode[];
    autoExcluded: ExcludedConcept[];
    queriesRequired: QueryRequirement[];
    riskLevel: AuditRiskLevel;
    riskRationale: string;
    rulesTriggered: string[];
}

export function createAuditResult(
    decisionState: DecisionState,
    riskLevel: AuditRiskLevel,
    riskRationale: string,
    rulesTriggered: string[] = []
): AuditResult {
    return {
        decisionState,
        autoCoded: [],
        autoExcluded: [],
        queriesRequired: [],
        riskLevel,
        riskRationale,
        rulesTriggered,
    };
}

export function formatAuditResult(result: AuditResult): string {
    let output = `DECISION_STATE: ${result.decisionState}\n\n`;

    output += `AUTO_CODED_DIAGNOSES:\n`;
    if (result.autoCoded.length === 0) {
        output += `- None\n`;
    } else {
        result.autoCoded.forEach(dx => {
            output += `- ${dx.code} — ${dx.description} (${dx.position})\n`;
        });
    }

    output += `\nAUTO_EXCLUDED_DIAGNOSES:\n`;
    if (result.autoExcluded.length === 0) {
        output += `- None\n`;
    } else {
        result.autoExcluded.forEach(ex => {
            output += `- ${ex.concept} — Reason: ${ex.reason}\n`;
        });
    }

    output += `\nQUERY_REQUIRED:\n`;
    if (result.queriesRequired.length === 0) {
        output += `- None\n`;
    } else {
        result.queriesRequired.forEach(q => {
            output += `- ${q.concept}\n`;
            output += `  Query: "${q.query}"\n`;
        });
    }

    output += `\nAUDIT_RISK_LEVEL: ${result.riskLevel}\n\n`;
    output += `RISK_RATIONALE:\n${result.riskRationale}\n`;

    if (result.rulesTriggered.length > 0) {
        output += `\nRULES_TRIGGERED:\n`;
        result.rulesTriggered.forEach(rule => {
            output += `- ${rule}\n`;
        });
    }

    return output;
}
