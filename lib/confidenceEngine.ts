import { SequencedCode } from './rulesEngine.js';

export interface ConfidenceAssessment {
    overallConfidence: number; // 0-100
    factors: ConfidenceFactor[];
    explanation: string;
}

export interface ConfidenceFactor {
    factor: string;
    impact: 'positive' | 'negative' | 'neutral';
    weight: number; // contribution to overall score
    description: string;
}

/**
 * Calculate intelligent confidence score based on multiple factors
 */
export function calculateConfidence(
    codes: SequencedCode[],
    warnings: string[]
): ConfidenceAssessment {
    const factors: ConfidenceFactor[] = [];
    let baseScore = 70; // Start at 70%

    // Factor 1: Code Specificity
    const avgLength = codes.reduce((sum, c) => sum + c.code.replace('.', '').length, 0) / codes.length;
    if (avgLength >= 7) {
        factors.push({
            factor: 'High Specificity',
            impact: 'positive',
            weight: 15,
            description: 'Codes use full 7-character detail with laterality and encounter type'
        });
        baseScore += 15;
    } else if (avgLength >= 5) {
        factors.push({
            factor: 'Moderate Specificity',
            impact: 'neutral',
            weight: 5,
            description: 'Codes include complication/manifestation detail'
        });
        baseScore += 5;
    } else {
        factors.push({
            factor: 'Low Specificity',
            impact: 'negative',
            weight: -10,
            description: 'Category-level codes used; more specific codes may be available'
        });
        baseScore -= 10;
    }

    // Factor 2: Laterality Compliance
    const lateralityWarnings = warnings.filter(w => /laterality/i.test(w)).length;
    if (lateralityWarnings > 0) {
        factors.push({
            factor: 'Missing Laterality',
            impact: 'negative',
            weight: -lateralityWarnings * 5,
            description: `${lateralityWarnings} code(s) missing required laterality (left/right)`
        });
        baseScore -= lateralityWarnings * 5;
    } else if (codes.some(c => /left|right|bilateral/i.test(c.label))) {
        factors.push({
            factor: 'Laterality Documented',
            impact: 'positive',
            weight: 5,
            description: 'Laterality specified for paired organs'
        });
        baseScore += 5;
    }

    // Factor 3: 7th Character Compliance
    const char7Warnings = warnings.filter(w => /7th character/i.test(w)).length;
    if (char7Warnings > 0) {
        factors.push({
            factor: 'Missing 7th Character',
            impact: 'negative',
            weight: -char7Warnings * 5,
            description: `${char7Warnings} injury/trauma code(s) missing required 7th character`
        });
        baseScore -= char7Warnings * 5;
    }

    // Factor 4: HCC Capture
    const hccCount = codes.filter(c => c.hcc).length;
    if (hccCount > 0) {
        factors.push({
            factor: 'HCC Codes Identified',
            impact: 'positive',
            weight: 5,
            description: `${hccCount} HCC code(s) captured for risk adjustment`
        });
        baseScore += 5;
    }

    // Factor 5: General Warnings
    const otherWarnings = warnings.filter(w =>
        !/laterality|7th character/i.test(w)
    ).length;
    if (otherWarnings > 0) {
        const penalty = Math.min(otherWarnings * 3, 15); // Cap at -15
        factors.push({
            factor: 'Documentation Gaps',
            impact: 'negative',
            weight: -penalty,
            description: `${otherWarnings} warning(s) indicate potential documentation improvement opportunities`
        });
        baseScore -= penalty;
    }

    // Factor 6: Code Count (Completeness)
    if (codes.length === 0) {
        factors.push({
            factor: 'No Codes Assigned',
            impact: 'negative',
            weight: -70,
            description: 'Unable to assign any codes from provided documentation'
        });
        baseScore = 0;
    } else if (codes.length >= 3) {
        factors.push({
            factor: 'Comprehensive Coding',
            impact: 'positive',
            weight: 5,
            description: 'Multiple codes assigned capturing clinical complexity'
        });
        baseScore += 5;
    }

    // Ensure score is within 0-100 range
    const overallConfidence = Math.max(0, Math.min(100, baseScore));

    // Generate explanation
    const explanation = generateExplanation(overallConfidence, factors);

    return {
        overallConfidence,
        factors,
        explanation
    };
}

function generateExplanation(confidence: number, factors: ConfidenceFactor[]): string {
    if (confidence >= 90) {
        return 'Excellent confidence. Codes are highly specific with complete documentation and no compliance issues.';
    } else if (confidence >= 75) {
        return 'Good confidence. Codes are appropriate with minor documentation gaps that could be addressed.';
    } else if (confidence >= 60) {
        return 'Moderate confidence. Some specificity or compliance issues present. Review warnings for improvement opportunities.';
    } else if (confidence >= 40) {
        return 'Low confidence. Significant documentation gaps or compliance issues. Clinical review recommended.';
    } else {
        return 'Very low confidence. Major issues with code assignment or documentation. Expert review required.';
    }
}
