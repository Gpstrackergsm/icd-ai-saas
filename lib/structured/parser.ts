
import { PatientContext } from './context';

export interface ParseResult {
    context: PatientContext;
    errors: string[];
}

export function parseInput(text: string): ParseResult {
    const lines = text.split('\n').map(l => l.trim()).filter(l => l);
    const context: PatientContext = {
        demographics: {},
        encounter: { type: 'initial' },
        conditions: {}
    };
    const errors: string[] = [];

    const parseBoolean = (val: string) => ['yes', 'true', 'present'].includes(val.toLowerCase());

    lines.forEach(line => {
        const parts = line.split(':');
        if (parts.length < 2) {
            errors.push(`Invalid format (missing colon): "${line}"`);
            return;
        }

        const key = parts[0].trim().toLowerCase();
        const value = parts.slice(1).join(':').trim();
        const lowerValue = value.toLowerCase();

        switch (key) {
            // Demographics
            case 'age':
                const age = parseInt(value, 10);
                if (isNaN(age)) errors.push(`Invalid age: ${value}`);
                else context.demographics.age = age;
                break;
            case 'gender':
                if (['male', 'female'].includes(lowerValue)) context.demographics.gender = lowerValue as 'male' | 'female';
                else errors.push(`Invalid gender: ${value}`);
                break;
            case 'encounter type':
                if (['initial', 'subsequent', 'sequela'].includes(lowerValue)) context.encounter.type = lowerValue as any;
                else errors.push(`Invalid encounter type: ${value}`);
                break;

            // Diabetes
            case 'diabetes type':
                if (!context.conditions.diabetes) context.conditions.diabetes = { type: 'type2', complications: [] };
                if (lowerValue === 'type 1') context.conditions.diabetes.type = 'type1';
                else if (lowerValue === 'type 2') context.conditions.diabetes.type = 'type2';
                else if (lowerValue.includes('drug')) context.conditions.diabetes.type = 'drug_induced';
                else if (lowerValue.includes('secondary')) context.conditions.diabetes.type = 'secondary';
                else errors.push(`Invalid diabetes type: ${value}`);
                break;
            case 'diabetes complication':
                if (!context.conditions.diabetes) context.conditions.diabetes = { type: 'type2', complications: [] };
                const comps = lowerValue.split(',').map(c => c.trim());
                comps.forEach(c => {
                    if (c === 'ckd') context.conditions.diabetes!.complications.push('ckd');
                    else if (c.includes('ulcer')) context.conditions.diabetes!.complications.push('foot_ulcer');
                    else if (c.includes('retinopathy')) context.conditions.diabetes!.complications.push('retinopathy');
                    else if (c.includes('neuropathy')) context.conditions.diabetes!.complications.push('neuropathy');
                    else if (c.includes('hypoglycemia')) context.conditions.diabetes!.complications.push('hypoglycemia');
                    else errors.push(`Unknown diabetes complication: ${c}`);
                });
                break;
            case 'insulin use':
                if (!context.conditions.diabetes) context.conditions.diabetes = { type: 'type2', complications: [] };
                context.conditions.diabetes.insulinUse = parseBoolean(value);
                break;
            case 'ulcer site':
                if (!context.conditions.diabetes) context.conditions.diabetes = { type: 'type2', complications: [] };
                if (lowerValue.includes('left') && lowerValue.includes('foot')) context.conditions.diabetes.ulcerSite = 'foot_left';
                else if (lowerValue.includes('right') && lowerValue.includes('foot')) context.conditions.diabetes.ulcerSite = 'foot_right';
                else context.conditions.diabetes.ulcerSite = 'other';
                break;
            case 'ulcer severity':
                if (!context.conditions.diabetes) context.conditions.diabetes = { type: 'type2', complications: [] };
                if (lowerValue.includes('muscle')) context.conditions.diabetes.ulcerSeverity = 'muscle';
                else if (lowerValue.includes('bone')) context.conditions.diabetes.ulcerSeverity = 'bone';
                else if (lowerValue.includes('fat')) context.conditions.diabetes.ulcerSeverity = 'fat';
                else if (lowerValue.includes('skin')) context.conditions.diabetes.ulcerSeverity = 'skin';
                else context.conditions.diabetes.ulcerSeverity = 'unspecified';
                break;

            // Renal
            case 'ckd stage':
                if (!context.conditions.ckd) context.conditions.ckd = { stage: 3, onDialysis: false, aki: false, transplantStatus: false };
                if (value === '1') context.conditions.ckd.stage = 1;
                else if (value === '2') context.conditions.ckd.stage = 2;
                else if (value === '3') context.conditions.ckd.stage = 3;
                else if (value === '4') context.conditions.ckd.stage = 4;
                else if (value === '5') context.conditions.ckd.stage = 5;
                else if (lowerValue === 'esrd') context.conditions.ckd.stage = 'esrd';
                else errors.push(`Invalid CKD stage: ${value}`);
                break;
            case 'dialysis':
                if (!context.conditions.ckd) context.conditions.ckd = { stage: 3, onDialysis: false, aki: false, transplantStatus: false };
                context.conditions.ckd.onDialysis = parseBoolean(value);
                break;
            case 'acute kidney injury':
            case 'aki':
                if (!context.conditions.ckd) context.conditions.ckd = { stage: 3, onDialysis: false, aki: false, transplantStatus: false };
                context.conditions.ckd.aki = parseBoolean(value);
                break;

            // Cardiovascular
            case 'hypertension':
                if (!context.conditions.cardiovascular) context.conditions.cardiovascular = { hypertension: false };
                context.conditions.cardiovascular.hypertension = parseBoolean(value);
                break;
            case 'heart failure':
                if (!context.conditions.cardiovascular) context.conditions.cardiovascular = { hypertension: false };
                if (parseBoolean(value)) {
                    context.conditions.cardiovascular.heartFailure = { type: 'unspecified', acuity: 'unspecified' };
                }
                break;
            case 'heart failure type':
                if (!context.conditions.cardiovascular?.heartFailure) {
                    if (!context.conditions.cardiovascular) context.conditions.cardiovascular = { hypertension: false };
                    context.conditions.cardiovascular.heartFailure = { type: 'unspecified', acuity: 'unspecified' };
                }
                if (['systolic', 'diastolic', 'combined'].includes(lowerValue)) context.conditions.cardiovascular!.heartFailure!.type = lowerValue as any;
                break;
            case 'heart failure acuity':
                if (!context.conditions.cardiovascular?.heartFailure) {
                    if (!context.conditions.cardiovascular) context.conditions.cardiovascular = { hypertension: false };
                    context.conditions.cardiovascular.heartFailure = { type: 'unspecified', acuity: 'unspecified' };
                }
                if (lowerValue.includes('acute on chronic')) context.conditions.cardiovascular!.heartFailure!.acuity = 'acute_on_chronic';
                else if (lowerValue === 'acute') context.conditions.cardiovascular!.heartFailure!.acuity = 'acute';
                else if (lowerValue === 'chronic') context.conditions.cardiovascular!.heartFailure!.acuity = 'chronic';
                break;

            // Respiratory
            case 'pneumonia':
                if (!context.conditions.respiratory) context.conditions.respiratory = {};
                if (parseBoolean(value)) context.conditions.respiratory.pneumonia = { type: 'unspecified' };
                break;
            case 'pneumonia organism':
                if (!context.conditions.respiratory?.pneumonia) {
                    if (!context.conditions.respiratory) context.conditions.respiratory = {};
                    context.conditions.respiratory.pneumonia = { type: 'unspecified' };
                }
                if (lowerValue.includes('pseudomonas')) context.conditions.respiratory!.pneumonia!.organism = 'pseudomonas';
                else if (lowerValue.includes('mrsa')) context.conditions.respiratory!.pneumonia!.organism = 'mrsa';
                else if (lowerValue.includes('e. coli')) context.conditions.respiratory!.pneumonia!.organism = 'e_coli';
                else errors.push(`Unknown organism: ${value}`);
                break;

            default:
                // Ignore unknown fields or log warning
                break;
        }
    });

    return { context, errors };
}
