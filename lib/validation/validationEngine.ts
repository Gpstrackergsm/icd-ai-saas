import { SequencedCode } from '../rulesEngine';
import { highRiskRules, ValidationRuleResult } from './highRiskRules';

export interface ValidationOutput {
    isValid: boolean;
    errors: string[];
    warnings: string[];
}

export function runValidation(codes: SequencedCode[], context?: any): ValidationOutput {
    const errors: string[] = [];
    const warnings: string[] = [];

    highRiskRules.forEach(rule => {
        const result = rule(codes, context);
        if (result) {
            if (result.level === 'error') {
                errors.push(`[${result.ruleId}] ${result.message}`);
            } else {
                warnings.push(`[${result.ruleId}] ${result.message}`);
            }
        }
    });

    return {
        isValid: errors.length === 0,
        errors,
        warnings
    };
}
