import { parseInput } from './lib/structured/parser';
import { validateContext } from './lib/structured/validator';
import { runStructuredRules } from './lib/structured/engine';
import { validateCodeSet } from './lib/structured/validator-post';

const testCases = [
    {
        name: "CASE 01",
        input: `Age: 47
Gender: Female
Encounter Type: Outpatient
Diabetes Type: Type 2
Complications: None
Insulin Use: No`
    },
    {
        name: "CASE 02",
        input: `Age: 69
Gender: Male
Encounter Type: Inpatient
Diabetes Type: Type 1
Complications: Retinopathy
Insulin Use: Yes`
    },
    {
        name: "CASE 03",
        input: `Age: 58
Gender: Female
Encounter Type: Inpatient
Diabetes Type: Type 2
Complications: Neuropathy
Insulin Use: No`
    },
    {
        name: "CASE 04",
        input: `Age: 73
Gender: Male
Encounter Type: Inpatient
Diabetes Type: Type 2
Complications: Nephropathy/CKD
CKD Stage: 2
Insulin Use: No`
    },
    {
        name: "CASE 05",
        input: `Age: 66
Gender: Female
Encounter Type: Inpatient
Diabetes Type: Type 2
Complications: Foot Ulcer
Ulcer Site: Right Ankle
Ulcer Severity: Muscle exposed
Insulin Use: No`
    },
    {
        name: "CASE 06",
        input: `Age: 52
Gender: Male
Encounter Type: Outpatient
Hypertension: Yes
Heart Failure: None`
    },
    {
        name: "CASE 07",
        input: `Age: 75
Gender: Female
Encounter Type: Inpatient
Hypertension: Yes
Heart Failure: Systolic
Heart Failure Acuity: Acute`
    },
    {
        name: "CASE 08",
        input: `Age: 60
Gender: Male
Encounter Type: Inpatient
Hypertension: Yes
CKD Present: Yes
CKD Stage: 3`
    },
    {
        name: "CASE 09",
        input: `Age: 71
Gender: Female
Encounter Type: Inpatient
Hypertension: Yes
Heart Failure: Diastolic
Heart Failure Acuity: Chronic
CKD Present: Yes
CKD Stage: 4`
    },
    {
        name: "CASE 10",
        input: `Age: 49
Gender: Male
Encounter Type: Outpatient
Hypertension: Yes
Secondary Hypertension: Yes`
    },
    {
        name: "CASE 11",
        input: `Age: 64
Gender: Female
Encounter Type: Outpatient
COPD: None
Asthma: Yes`
    },
    {
        name: "CASE 12",
        input: `Age: 79
Gender: Male
Encounter Type: Inpatient
COPD: With exacerbation
Respiratory Failure: None`
    },
    {
        name: "CASE 13",
        input: `Age: 56
Gender: Female
Encounter Type: Inpatient
COPD: With infection
Respiratory Failure: Acute
Mech Vent: Yes
Vent Hours: 6`
    },
    {
        name: "CASE 14",
        input: `Age: 42
Gender: Male
Encounter Type: ED
Asthma: Yes
Respiratory Failure: Acute`
    },
    {
        name: "CASE 15",
        input: `Age: 68
Gender: Female
Encounter Type: Inpatient
Resp Failure: Acute on chronic
COPD: With both
Mech Vent: Yes
Vent Hours: 14`
    },
    {
        name: "CASE 16",
        input: `Age: 83
Gender: Male
Encounter Type: Inpatient
Pneumonia: Yes
Organism: Unspecified`
    },
    {
        name: "CASE 17",
        input: `Age: 54
Gender: Female
Encounter Type: Outpatient
Pneumonia: Yes
Organism: Viral`
    },
    {
        name: "CASE 18",
        input: `Age: 77
Gender: Male
Encounter Type: Inpatient
Pneumonia: Yes
Organism: MRSA
Sepsis: Yes`
    },
    {
        name: "CASE 19",
        input: `Age: 62
Gender: Female
Encounter Type: Inpatient
Infection Present: Yes
Site: Urinary tract
Organism: E. coli
Sepsis: Yes`
    },
    {
        name: "CASE 20",
        input: `Age: 70
Gender: Male
Encounter Type: Inpatient
Ulcer/Wound: Yes
Type: Pressure
Location: Sacral
Stage/Depth: Bone necrosis
Infection Present: Yes
Site: Skin
Organism: Not specified
Sepsis: Yes`
    }
];

console.log("🏥 AUDITOR-VALIDATED ICD-10-CM ENCODER TEST");
console.log("=".repeat(80));

testCases.forEach((testCase, index) => {
    const { context } = parseInput(testCase.input);
    const results = runStructuredRules(context);
    const validated = validateCodeSet(results.primary, results.secondary, context);

    const primary = validated.codes[0];
    const secondary = validated.codes.slice(1);

    console.log(`\n${testCase.name}`);
    console.log(`Primary: ${primary?.code || 'None'}`);
    if (secondary.length > 0) {
        console.log(`Secondary:`);
        secondary.forEach(c => console.log(`  ${c.code}`));
    }
});

console.log("\n" + "=".repeat(80));
console.log("✅ All 20 cases processed");
