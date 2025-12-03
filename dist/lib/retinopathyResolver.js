"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveRetinopathy = resolveRetinopathy;
function codeForSeverity(prefix, stage, macular) {
    if (!stage || stage === 'unspecified') {
        return macular ? `${prefix}.311` : `${prefix}.319`;
    }
    switch (stage) {
        case 'mild-npdr':
            return macular ? `${prefix}.311` : `${prefix}.319`;
        case 'moderate-npdr':
            return macular ? `${prefix}.321` : `${prefix}.329`;
        case 'severe-npdr':
            return macular ? `${prefix}.341` : `${prefix}.349`;
        case 'pdr':
            return macular ? `${prefix}.351` : `${prefix}.359`;
        case 'traction-detachment':
            return `${prefix}.352`;
        case 'combined-detachment':
            return `${prefix}.353`;
        default:
            return macular ? `${prefix}.311` : `${prefix}.319`;
    }
}
function resolveRetinopathy(attributes) {
    if (attributes.complication !== 'retinopathy')
        return undefined;
    const warnings = [];
    const code = codeForSeverity(attributes.diabetes_type, attributes.stage, attributes.macular_edema);
    if (!code) {
        warnings.push('Retinopathy mentioned but stage could not be mapped');
    }
    return {
        code,
        label: 'Diabetic retinopathy',
        attributes,
        warnings,
    };
}
