import { ValidationRuleResult } from './highRiskRules';

export function formatValidationError(result: ValidationRuleResult): string {
    const actionList = result.action.map(step => `• ${step}`).join('\n');

    return `❌ VALIDATION FAILED

RULE: ${result.ruleId} — ${result.ruleName}

ISSUE:
${result.issue}

WHY THIS MATTERS:
${result.why}

ACTION REQUIRED:
${actionList}

RESTRICTION:
CODES WILL BE GENERATED ONLY AFTER FIXING THIS ISSUE.`;
}
