"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateCodeSet = validateCodeSet;
exports.splitValidatedCodes = splitValidatedCodes;
function validateCodeSet(primary, secondary, context) {
    var _a, _b, _c;
    const allCodes = primary ? [primary, ...secondary] : [...secondary];
    const removed = [];
    const added = [];
    let validatedCodes = [...allCodes];
    // Rule 1: Diabetes kidney disease conflict (E11.21 vs E11.22)
    const hasE1122 = validatedCodes.some(c => c.code === 'E11.22');
    const hasE1121 = validatedCodes.some(c => c.code === 'E11.21');
    if (hasE1122 && hasE1121) {
        validatedCodes = validatedCodes.filter(c => {
            if (c.code === 'E11.21') {
                removed.push({
                    code: 'E11.21',
                    reason: 'Excludes1: Cannot report E11.21 with E11.22 (E11.22 is more specific)'
                });
                return false;
            }
            return true;
        });
    }
    // Rule 2: REMOVED - I13.x REQUIRES I50.x codes per ICD-10-CM guidelines
    // Per I13 code notes: "Use additional code to identify the type of heart failure (I50.-)"
    // DO NOT filter out I50 codes when I13 is present
    const hasI13 = validatedCodes.some(c => c.code.startsWith('I13.'));
    // Rule 3: Z-code normalization (Z72.89 → Z72.1 for alcohol use)
    validatedCodes = validatedCodes.map(c => {
        var _a;
        if (c.code === 'Z72.89' && ((_a = c.label) === null || _a === void 0 ? void 0 : _a.toLowerCase().includes('alcohol'))) {
            removed.push({
                code: 'Z72.89',
                reason: 'Replaced with more specific code Z72.1'
            });
            added.push({
                code: 'Z72.1',
                reason: 'Specific code for alcohol use'
            });
            return {
                ...c,
                code: 'Z72.1',
                label: 'Alcohol use',
                rationale: 'Alcohol use documented'
            };
        }
        return c;
    });
    // Rule 4: Required secondary codes (I13.x requires N18.x)
    if (hasI13) {
        const hasN18 = validatedCodes.some(c => c.code.startsWith('N18.'));
        if (!hasN18) {
            // Get CKD stage from context
            const ckdStage = ((_b = (_a = context.conditions.renal) === null || _a === void 0 ? void 0 : _a.ckd) === null || _b === void 0 ? void 0 : _b.stage) || ((_c = context.conditions.ckd) === null || _c === void 0 ? void 0 : _c.stage);
            if (ckdStage && ckdStage !== 'unspecified') {
                const ckdCode = ckdStage === '1' ? 'N18.1' :
                    ckdStage === '2' ? 'N18.2' :
                        ckdStage === '3' ? 'N18.3' :
                            ckdStage === '4' ? 'N18.4' :
                                ckdStage === '5' ? 'N18.5' :
                                    ckdStage === 'esrd' ? 'N18.6' : 'N18.9';
                const ckdLabel = ckdStage === 'esrd'
                    ? 'End stage renal disease'
                    : `Chronic kidney disease, stage ${ckdStage}`;
                validatedCodes.push({
                    code: ckdCode,
                    label: ckdLabel,
                    rationale: 'Required secondary code with I13.x',
                    guideline: 'ICD-10-CM I.C.9.a.2',
                    trigger: `CKD Stage ${ckdStage}`,
                    rule: 'Required secondary code'
                });
                added.push({
                    code: ckdCode,
                    reason: 'Required: I13.x must be accompanied by CKD stage code'
                });
            }
        }
    }
    return {
        codes: validatedCodes,
        removed,
        added
    };
}
/**
 * Helper to separate primary and secondary from validated codes
 */
function splitValidatedCodes(validatedCodes) {
    if (validatedCodes.length === 0) {
        return { primary: null, secondary: [] };
    }
    return {
        primary: validatedCodes[0],
        secondary: validatedCodes.slice(1)
    };
}
