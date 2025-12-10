import { ValidationRuleResult } from './highRiskRules';

export function formatValidationError(result: ValidationRuleResult, index: number = 1): string {
    const actionList = result.action.map(step => `• ${step}`).join('\n');

    return `${index}) ❌ ${result.ruleId} — ${result.ruleName}
ISSUE:
${result.issue}

WHY THIS MATTERS:
${result.why}

ACTION REQUIRED:
${actionList}`;
}
