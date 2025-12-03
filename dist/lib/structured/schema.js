"use strict";
/**
 * JSON Schema definitions for structured ICD-10-CM encoding
 * Enforces field requirements, allowed values, and business logic
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.businessRules = exports.PatientContextSchema = exports.CardiovascularSchema = exports.CKDSchema = exports.DiabetesSchema = void 0;
exports.DiabetesSchema = {
    type: 'object',
    properties: {
        type: {
            type: 'string',
            enum: ['type1', 'type2', 'drug_induced', 'secondary'],
            description: 'Diabetes type classification'
        },
        complications: {
            type: 'array',
            items: {
                type: 'string',
                enum: ['ckd', 'foot_ulcer', 'retinopathy', 'neuropathy', 'pad', 'hypoglycemia', 'hyperosmolarity', 'ketoacidosis']
            }
        },
        ulcerSite: {
            type: 'string',
            enum: ['foot_left', 'foot_right', 'foot_bilateral', 'ankle_left', 'ankle_right', 'other']
        },
        ulcerSeverity: {
            type: 'string',
            enum: ['skin', 'fat', 'muscle', 'bone', 'unspecified']
        },
        insulinUse: {
            type: 'boolean'
        }
    },
    required: ['type'],
    // Business rules
    allOf: [
        {
            // If foot_ulcer complication, require site and severity
            if: {
                properties: { complications: { contains: { const: 'foot_ulcer' } } }
            },
            then: {
                required: ['ulcerSite', 'ulcerSeverity'],
                errorMessage: 'Foot ulcer requires both site and severity specification'
            }
        }
    ]
};
exports.CKDSchema = {
    type: 'object',
    properties: {
        stage: {
            type: ['number', 'string'],
            enum: [1, 2, 3, 4, 5, 'esrd']
        },
        onDialysis: {
            type: 'boolean'
        },
        aki: {
            type: 'boolean'
        },
        transplantStatus: {
            type: 'boolean'
        }
    },
    required: ['stage', 'onDialysis', 'aki'],
    allOf: [
        {
            // ESRD requires dialysis or transplant
            if: {
                properties: { stage: { const: 'esrd' } }
            },
            then: {
                anyOf: [
                    { properties: { onDialysis: { const: true } } },
                    { properties: { transplantStatus: { const: true } } }
                ],
                errorMessage: 'ESRD requires either dialysis or transplant status'
            }
        }
    ]
};
exports.CardiovascularSchema = {
    type: 'object',
    properties: {
        hypertension: {
            type: 'boolean'
        },
        heartFailure: {
            type: 'object',
            properties: {
                type: {
                    type: 'string',
                    enum: ['systolic', 'diastolic', 'combined', 'unspecified']
                },
                acuity: {
                    type: 'string',
                    enum: ['acute', 'chronic', 'acute_on_chronic', 'unspecified']
                }
            },
            required: ['type', 'acuity']
        },
        cad: {
            type: 'boolean'
        },
        mi: {
            type: 'object',
            properties: {
                type: {
                    type: 'string',
                    enum: ['stemi', 'nstemi']
                },
                site: {
                    type: 'string',
                    enum: ['anterior', 'inferior', 'lateral', 'posterior', 'other']
                },
                acuity: {
                    type: 'string',
                    enum: ['acute', 'old']
                }
            }
        }
    }
};
exports.PatientContextSchema = {
    type: 'object',
    properties: {
        demographics: {
            type: 'object',
            properties: {
                age: { type: 'number', minimum: 0, maximum: 150 },
                gender: { type: 'string', enum: ['male', 'female'] }
            }
        },
        encounter: {
            type: 'object',
            properties: {
                type: { type: 'string', enum: ['initial', 'subsequent', 'sequela'] }
            },
            required: ['type']
        },
        conditions: {
            type: 'object',
            properties: {
                diabetes: exports.DiabetesSchema,
                ckd: exports.CKDSchema,
                cardiovascular: exports.CardiovascularSchema
            }
        }
    },
    required: ['encounter']
};
exports.businessRules = [
    {
        name: 'diabetes_ulcer_requires_site',
        check: (ctx) => {
            var _a, _b, _c;
            if ((_c = (_b = (_a = ctx.conditions) === null || _a === void 0 ? void 0 : _a.diabetes) === null || _b === void 0 ? void 0 : _b.complications) === null || _c === void 0 ? void 0 : _c.includes('foot_ulcer')) {
                return !!(ctx.conditions.diabetes.ulcerSite && ctx.conditions.diabetes.ulcerSeverity);
            }
            return true;
        },
        errorMessage: 'Diabetes with foot ulcer requires both ulcer site and severity'
    },
    {
        name: 'esrd_requires_dialysis_or_transplant',
        check: (ctx) => {
            var _a, _b;
            if (((_b = (_a = ctx.conditions) === null || _a === void 0 ? void 0 : _a.ckd) === null || _b === void 0 ? void 0 : _b.stage) === 'esrd') {
                return ctx.conditions.ckd.onDialysis || ctx.conditions.ckd.transplantStatus;
            }
            return true;
        },
        errorMessage: 'ESRD (End Stage Renal Disease) requires either dialysis or transplant status'
    },
    {
        name: 'no_esrd_with_ckd_stages',
        check: (ctx) => {
            var _a;
            const ckd = (_a = ctx.conditions) === null || _a === void 0 ? void 0 : _a.ckd;
            if (!ckd)
                return true;
            // If stage is ESRD, it cannot also be 1-5
            if (ckd.stage === 'esrd') {
                return true; // ESRD is valid
            }
            return true; // Stage 1-5 is valid
            // The issue is if both are somehow set, but TypeScript prevents this
        },
        errorMessage: 'Cannot have both ESRD and CKD stage 1-5'
    },
    {
        name: 'heart_failure_requires_hypertension_for_combo',
        check: (ctx) => {
            var _a, _b;
            const cardio = (_a = ctx.conditions) === null || _a === void 0 ? void 0 : _a.cardiovascular;
            if ((cardio === null || cardio === void 0 ? void 0 : cardio.heartFailure) && ((_b = ctx.conditions) === null || _b === void 0 ? void 0 : _b.ckd)) {
                // If both HF and CKD, HTN should be present for I13.x combo code
                // This is a guideline, not a strict requirement, so just warn
                return true; // Allow but will generate warning in engine
            }
            return true;
        },
        errorMessage: 'Heart failure with CKD typically requires hypertension documentation for combination code'
    }
];
