"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const parser_1 = require("./parser");
const engine_1 = require("./engine");
const cases = [
    `Age: 68
Gender: Male
Encounter Type: Inpatient

Diabetes Type: Type 2
Complications: Foot Ulcer, Neuropathy
Insulin Use: Yes

Infection Present: Yes
Infection Site: Skin
Organism: MRSA

Sepsis: Yes
Severe Sepsis: No
Septic Shock: No

Ulcer Present / Wound Present: Yes
Ulcer Type: Diabetic
Ulcer Location: Right Foot
Ulcer Severity / Ulcer Depth: Muscle`,
    `Age: 73
Gender: Female
Encounter Type: Inpatient

Diabetes Type: Type 2
Complications: Nephropathy (CKD)
Insulin Use: No

CKD Present: Yes
CKD Stage: 4

Infection Present: Yes
Infection Site: Urinary (UTI)
Organism: E. Coli

Sepsis: Yes
Severe Sepsis: Yes
Septic Shock: No

Acute Kidney Injury / AKI: Yes`,
    `Age: 59
Gender: Male
Encounter Type: ED

Diabetes Type: Type 1
Complications: None
Insulin Use: Yes

Infection Present: Yes
Infection Site: Lung (Pneumonia)
Organism: Pseudomonas

Sepsis: Yes
Severe Sepsis: Yes
Septic Shock: Yes

Encephalopathy: Yes
Encephalopathy Type: Hypoxic`,
    `Age: 81
Gender: Female
Encounter Type: Inpatient

Diabetes Type: Type 2
Complications: Nephropathy (CKD), Retinopathy
Insulin Use: Yes

CKD Present: Yes
CKD Stage: 5
Dialysis / Dialysis Status: Chronic

Infection Present: Yes
Infection Site: Blood
Organism: Enterococcus

Sepsis: Yes
Severe Sepsis: Yes
Septic Shock: No`,
    `Age: 64
Gender: Male
Encounter Type: Inpatient

Diabetes Type: Type 2
Complications: Foot Ulcer
Insulin Use: No

Infection Present: Yes
Infection Site: Skin
Organism: Streptococcus

Sepsis: Yes
Severe Sepsis: No
Septic Shock: No

Ulcer Present / Wound Present: Yes
Ulcer Type: Diabetic
Ulcer Location: Left Foot
Ulcer Severity / Ulcer Depth: Fat`,
    `Age: 71
Gender: Female
Encounter Type: Inpatient

Diabetes Type: Type 1
Complications: Nephropathy (CKD)
Insulin Use: Yes

CKD Present: Yes
CKD Stage: 3

Infection Present: Yes
Infection Site: Urinary (UTI)
Organism: Candida

Sepsis: Yes
Severe Sepsis: Yes
Septic Shock: No

Acute Kidney Injury / AKI: Yes`,
    `Age: 55
Gender: Male
Encounter Type: Inpatient

Diabetes Type: Type 2
Complications: Foot Ulcer
Insulin Use: Yes

Infection Present: Yes
Infection Site: Skin
Organism: Pseudomonas

Sepsis: Yes
Severe Sepsis: Yes
Septic Shock: No

Ulcer Present / Wound Present: Yes
Ulcer Type: Diabetic
Ulcer Location: Right Foot
Ulcer Severity / Ulcer Depth: Bone`,
    `Age: 62
Gender: Female
Encounter Type: Inpatient

Diabetes Type: Type 2
Complications: Neuropathy
Insulin Use: No

Infection Present: Yes
Infection Site: Lung (Pneumonia)
Organism: MRSA

Sepsis: Yes
Severe Sepsis: No
Septic Shock: No`,
    `Age: 74
Gender: Male
Encounter Type: Inpatient

Diabetes Type: Type 2
Complications: Nephropathy (CKD), Neuropathy
Insulin Use: Yes

CKD Present: Yes
CKD Stage: 2

Infection Present: Yes
Infection Site: Urinary (UTI)
Organism: Proteus

Sepsis: Yes
Severe Sepsis: No
Septic Shock: No`,
    `Age: 69
Gender: Female
Encounter Type: Inpatient

Diabetes Type: Type 1
Complications: Retinopathy
Insulin Use: Yes

Infection Present: Yes
Infection Site: Lung (Pneumonia)
Organism: Legionella

Sepsis: Yes
Severe Sepsis: Yes
Septic Shock: Yes`,
    `Age: 60
Gender: Male
Encounter Type: Inpatient

Diabetes Type: Type 2
Complications: Nephropathy (CKD)
Insulin Use: No

CKD Present: Yes
CKD Stage: 3

Infection Present: Yes
Infection Site: Abdominal
Organism: Bacteroides

Sepsis: Yes
Severe Sepsis: Yes
Septic Shock: No

Acute Kidney Injury / AKI: Yes`,
    `Age: 58
Gender: Female
Encounter Type: Inpatient

Diabetes Type: Type 1
Complications: None
Insulin Use: Yes

Infection Present: Yes
Infection Site: Blood
Organism: E. Coli

Sepsis: Yes
Severe Sepsis: No
Septic Shock: No`,
    `Age: 76
Gender: Male
Encounter Type: Inpatient

Diabetes Type: Type 2
Complications: Foot Ulcer, Nephropathy (CKD)
Insulin Use: Yes

CKD Present: Yes
CKD Stage: 4

Infection Present: Yes
Infection Site: Lung (Pneumonia)
Organism: Influenza

Sepsis: Yes
Severe Sepsis: Yes
Septic Shock: No

Ulcer Present / Wound Present: Yes
Ulcer Type: Diabetic
Ulcer Location: Left Foot
Ulcer Severity / Ulcer Depth: Skin`,
    `Age: 66
Gender: Female
Encounter Type: Inpatient

Diabetes Type: Type 2
Complications: Neuropathy
Insulin Use: No

Infection Present: Yes
Infection Site: Skin
Organism: Enterobacter

Sepsis: Yes
Severe Sepsis: No
Septic Shock: No`,
    `Age: 72
Gender: Male
Encounter Type: Inpatient

Diabetes Type: Type 1
Complications: Nephropathy (CKD), Retinopathy
Insulin Use: Yes

CKD Present: Yes
CKD Stage: 5
Dialysis / Dialysis Status: Chronic

Infection Present: Yes
Infection Site: Blood
Organism: Staphylococcus aureus

Sepsis: Yes
Severe Sepsis: Yes
Septic Shock: No`,
    `Age: 63
Gender: Female
Encounter Type: ED

Diabetes Type: Type 2
Complications: None
Insulin Use: No

Infection Present: Yes
Infection Site: Urinary (UTI)
Organism: Candida

Sepsis: Yes
Severe Sepsis: No
Septic Shock: No`,
    `Age: 70
Gender: Male
Encounter Type: Inpatient

Diabetes Type: Type 2
Complications: Nephropathy (CKD)
Insulin Use: Yes

CKD Present: Yes
CKD Stage: 2

Infection Present: Yes
Infection Site: Lung (Pneumonia)
Organism: MRSA

Sepsis: Yes
Severe Sepsis: Yes
Septic Shock: No`,
    `Age: 57
Gender: Female
Encounter Type: Inpatient

Diabetes Type: Type 1
Complications: Neuropathy
Insulin Use: Yes

Infection Present: Yes
Infection Site: Skin
Organism: Pseudomonas

Sepsis: Yes
Severe Sepsis: Yes
Septic Shock: Yes`,
    `Age: 78
Gender: Male
Encounter Type: Inpatient

Diabetes Type: Type 2
Complications: Foot Ulcer
Insulin Use: Yes

Infection Present: Yes
Infection Site: Skin
Organism: Proteus

Sepsis: Yes
Severe Sepsis: No
Septic Shock: No

Ulcer Present / Wound Present: Yes
Ulcer Type: Diabetic
Ulcer Location: Right Foot
Ulcer Severity / Ulcer Depth: Bone`,
    `Age: 65
Gender: Female
Encounter Type: Inpatient

Diabetes Type: Type 2
Complications: Nephropathy (CKD)
Insulin Use: No

CKD Present: Yes
CKD Stage: 3

Infection Present: Yes
Infection Site: Lung (Pneumonia)
Organism: MRSA

Sepsis: Yes
Severe Sepsis: Yes
Septic Shock: No`
];
console.log('Running User Batch Tests Set 2...\n');
cases.forEach((caseText, index) => {
    console.log(`TEST ${index + 1}`);
    const { context, errors } = (0, parser_1.parseInput)(caseText);
    if (errors.length > 0) {
        console.log('❌ Parse Errors:', errors);
        return;
    }
    const result = (0, engine_1.runStructuredRules)(context);
    const codes = [result.primary, ...result.secondary].filter(c => c);
    if (codes.length === 0) {
        console.log('❌ No codes generated');
    }
    else {
        console.log('Output: ' + codes.map(c => c === null || c === void 0 ? void 0 : c.code).join(', '));
    }
    console.log('');
});
