import { parseInput } from './lib/structured/parser';
import { runStructuredRules } from './lib/structured/engine';
import { validateCodeSet } from './lib/structured/validator-post';
import { validateFinalOutput } from './lib/structured/validator-enhanced';

/**
 * COMPREHENSIVE ICD-10-CM AUDIT TEST SUITE
 * 
 * This suite generates realistic clinical test cases across ALL medical categories
 * and audits the system output against ICD-10-CM Official Guidelines.
 */

interface TestCase {
    id: number;
    category: string;
    clinicalData: string;
    expectedCodes: string[];
    rationale: string;
}

const testCases: TestCase[] = [
    // ===== SEPSIS CATEGORY =====
    {
        id: 1,
        category: "SEPSIS",
        clinicalData: `Age: 65
Gender: Male
Encounter Type: Inpatient
Infection Present: Yes
Infection Site: Lung
Organism: MRSA
Sepsis: Yes`,
        expectedCodes: ["A41.02", "J15.212"],
        rationale: "MRSA sepsis with pneumonia source. A41.02 (Sepsis due to MRSA) is primary, J15.212 (Pneumonia due to MRSA) as source."
    },
    {
        id: 2,
        category: "SEPSIS",
        clinicalData: `Age: 72
Gender: Female
Encounter Type: Inpatient
Infection Present: Yes
Infection Site: Urinary tract
Organism: E. coli
Sepsis: Yes
Septic Shock: Yes`,
        expectedCodes: ["A41.51", "N39.0", "R65.21"],
        rationale: "E. coli sepsis with UTI source and septic shock. Sequence: A41.51 → N39.0 → R65.21"
    },
    {
        id: 3,
        category: "SEPSIS",
        clinicalData: `Age: 58
Gender: Male
Encounter Type: Inpatient
Infection Present: Yes
Infection Site: Skin
Organism: Staphylococcus aureus
Sepsis: Yes`,
        expectedCodes: ["A41.01", "L03.90"],
        rationale: "Staph aureus sepsis with skin infection. A41.01 (Sepsis due to Staph aureus, not MRSA) + L03.90 (Cellulitis, unspecified)"
    },
    {
        id: 4,
        category: "SEPSIS",
        clinicalData: `Age: 45
Gender: Female
Encounter Type: Inpatient
Infection Present: Yes
Infection Site: Blood
Organism: Unspecified
Sepsis: Yes`,
        expectedCodes: ["A41.9"],
        rationale: "Blood infection with unspecified organism = A41.9 alone. No separate source code needed."
    },
    {
        id: 5,
        category: "SEPSIS",
        clinicalData: `Age: 80
Gender: Male
Encounter Type: Inpatient
Infection Present: Yes
Infection Site: Abdominal
Organism: Pseudomonas
Sepsis: Yes`,
        expectedCodes: ["A41.52", "K65.9"],
        rationale: "Pseudomonas sepsis with abdominal source. A41.52 (Sepsis due to Pseudomonas) + K65.9 (Peritonitis)"
    },

    // ===== DIABETES CATEGORY =====
    {
        id: 6,
        category: "DIABETES",
        clinicalData: `Age: 62
Gender: Male
Encounter Type: Outpatient
Diabetes Type: Type 2
Complications: Retinopathy`,
        expectedCodes: ["E11.319"],
        rationale: "Type 2 diabetes with unspecified diabetic retinopathy without macular edema = E11.319"
    },
    {
        id: 7,
        category: "DIABETES",
        clinicalData: `Age: 55
Gender: Female
Encounter Type: Outpatient
Diabetes Type: Type 1
Complications: Nephropathy/CKD
CKD Stage: 3`,
        expectedCodes: ["E10.22", "N18.3"],
        rationale: "Type 1 diabetes with CKD. E10.22 (T1DM with diabetic CKD) + N18.3 (CKD stage 3)"
    },
    {
        id: 8,
        category: "DIABETES",
        clinicalData: `Age: 48
Gender: Male
Encounter Type: ED
Diabetes Type: Type 2
Complications: Foot Ulcer
Ulcer Site: Right Ankle
Ulcer Severity: Muscle exposed`,
        expectedCodes: ["E11.621", "L97.315"],
        rationale: "Type 2 DM with foot ulcer. E11.621 (T2DM with foot ulcer) + L97.315 (Right ankle diabetic ulcer with muscle involvement)"
    },
    {
        id: 9,
        category: "DIABETES",
        clinicalData: `Age: 70
Gender: Female
Encounter Type: Inpatient
Diabetes Type: Type 2
Complications: Hypoglycemia
Insulin Use: Yes`,
        expectedCodes: ["E11.641"],
        rationale: "Type 2 diabetes with hypoglycemia. E11.641 captures both T2DM and hypoglycemia."
    },
    {
        id: 10,
        category: "DIABETES",
        clinicalData: `Age: 38
Gender: Male
Encounter Type: Outpatient
Diabetes Type: Type 1
Complications: Neuropathy`,
        expectedCodes: ["E10.40"],
        rationale: "Type 1 diabetes with diabetic neuropathy, unspecified = E10.40"
    },

    // ===== HTN/HF/CKD CATEGORY =====
    {
        id: 11,
        category: "HTN_HF_CKD",
        clinicalData: `Age: 68
Gender: Male
Encounter Type: Inpatient
Hypertension: Yes
Heart Failure: Systolic
Heart Failure Acuity: Acute
CKD Present: Yes
CKD Stage: 4`,
        expectedCodes: ["I13.0", "I50.21", "N18.4"],
        rationale: "HTN + HF + CKD requires I13.0 (HTN heart and CKD disease with HF and CKD stage 1-4) + I50.21 (Acute systolic HF) + N18.4 (CKD stage 4)"
    },
    {
        id: 12,
        category: "HTN_HF_CKD",
        clinicalData: `Age: 75
Gender: Female
Encounter Type: ED
Hypertension: Yes
Heart Failure: Diastolic
Heart Failure Acuity: Acute on chronic
CKD Present: Yes
CKD Stage: ESRD`,
        expectedCodes: ["I13.2", "I50.33", "N18.6"],
        rationale: "HTN + HF + ESRD requires I13.2 (HTN heart and CKD with HF and stage 5/ESRD) + I50.33 + N18.6"
    },
    {
        id: 13,
        category: "HTN_HF_CKD",
        clinicalData: `Age: 60
Gender: Male
Encounter Type: Outpatient
Hypertension: Yes
CKD Present: Yes
CKD Stage: 2`,
        expectedCodes: ["I12.9", "N18.2"],
        rationale: "HTN + CKD (no HF) requires I12.9 (Hypertensive CKD without HF) + N18.2"
    },
    {
        id: 14,
        category: "HTN_HF_CKD",
        clinicalData: `Age: 52
Gender: Female
Encounter Type: Outpatient
Hypertension: Yes
Heart Failure: Combined
Heart Failure Acuity: Chronic`,
        expectedCodes: ["I11.0", "I50.42"],
        rationale: "HTN + HF (no CKD) requires I11.0 (Hypertensive heart disease with HF) + I50.42 (Chronic combined systolic and diastolic HF)"
    },
    {
        id: 15,
        category: "HTN_HF_CKD",
        clinicalData: `Age: 45
Gender: Male
Encounter Type: Outpatient
Hypertension: Yes`,
        expectedCodes: ["I10"],
        rationale: "Simple hypertension without complications = I10"
    },

    // ===== COPD & PNEUMONIA CATEGORY =====
    {
        id: 16,
        category: "COPD_PNEUMONIA",
        clinicalData: `Age: 70
Gender: Male
Encounter Type: Inpatient
COPD: With infection
Respiratory Failure: Acute
Pneumonia: Yes
Pneumonia Organism: MRSA`,
        expectedCodes: ["J44.0", "J96.00", "J15.212"],
        rationale: "COPD with acute lower respiratory infection + acute respiratory failure + MRSA pneumonia"
    },
    {
        id: 17,
        category: "COPD_PNEUMONIA",
        clinicalData: `Age: 65
Gender: Female
Encounter Type: ED
COPD: With exacerbation
Respiratory Failure: Acute
Pneumonia: Yes
Pneumonia Organism: Viral`,
        expectedCodes: ["J44.1", "J96.00", "J12.9"],
        rationale: "COPD with acute exacerbation + acute respiratory failure + viral pneumonia"
    },
    {
        id: 18,
        category: "COPD_PNEUMONIA",
        clinicalData: `Age: 58
Gender: Male
Encounter Type: Inpatient
COPD: With both
Respiratory Failure: Acute
Pneumonia: Yes
Pneumonia Organism: Pseudomonas`,
        expectedCodes: ["J44.0", "J44.1", "J96.00", "J15.1"],
        rationale: "COPD with both infection and exacerbation requires J44.0 + J44.1 + J96.00 + J15.1"
    },
    {
        id: 19,
        category: "COPD_PNEUMONIA",
        clinicalData: `Age: 72
Gender: Female
Encounter Type: Outpatient
Pneumonia: Yes
Pneumonia Organism: Unspecified`,
        expectedCodes: ["J18.9"],
        rationale: "Pneumonia, unspecified organism = J18.9"
    },
    {
        id: 20,
        category: "COPD_PNEUMONIA",
        clinicalData: `Age: 55
Gender: Male
Encounter Type: Inpatient
COPD: With infection
Pneumonia: Yes
Pneumonia Organism: E. coli`,
        expectedCodes: ["J44.0", "J15.5"],
        rationale: "COPD with infection + E. coli pneumonia = J44.0 + J15.5"
    },

    // ===== ULCERS & WOUNDS CATEGORY =====
    {
        id: 21,
        category: "ULCERS_WOUNDS",
        clinicalData: `Age: 82
Gender: Female
Encounter Type: Inpatient
Ulcer/Wound: Yes
Type: Pressure
Location: Sacral
Stage/Depth: Stage 4`,
        expectedCodes: ["L89.154"],
        rationale: "Pressure ulcer of sacrum, stage 4 = L89.154"
    },
    {
        id: 22,
        category: "ULCERS_WOUNDS",
        clinicalData: `Age: 75
Gender: Male
Encounter Type: Outpatient
Ulcer/Wound: Yes
Type: Pressure
Location: Right heel
Stage/Depth: Stage 2`,
        expectedCodes: ["L89.612"],
        rationale: "Pressure ulcer of right heel, stage 2 = L89.612"
    },
    {
        id: 23,
        category: "ULCERS_WOUNDS",
        clinicalData: `Age: 68
Gender: Female
Encounter Type: ED
Ulcer/Wound: Yes
Type: Pressure
Location: Left foot
Stage/Depth: Muscle necrosis`,
        expectedCodes: ["L89.625"],
        rationale: "Pressure ulcer of left heel with muscle necrosis = L89.625"
    },
    {
        id: 24,
        category: "ULCERS_WOUNDS",
        clinicalData: `Age: 60
Gender: Male
Encounter Type: Outpatient
Ulcer/Wound: Yes
Type: Traumatic
Location: Right foot
Stage/Depth: Stage 4`,
        expectedCodes: ["S91.301A"],
        rationale: "Traumatic wound of right foot should use S91 codes, not L89. Initial encounter = S91.301A (unspecified open wound right foot)"
    },
    {
        id: 25,
        category: "ULCERS_WOUNDS",
        clinicalData: `Age: 55
Gender: Female
Encounter Type: Inpatient
Diabetes Type: Type 2
Complications: Foot Ulcer
Ulcer Site: Left Heel
Ulcer Severity: Bone exposed`,
        expectedCodes: ["E11.621", "L97.426"],
        rationale: "Type 2 DM with foot ulcer + Left heel diabetic ulcer with bone exposure = E11.621 + L97.426"
    },

    // ===== TRAUMA CATEGORY =====
    {
        id: 26,
        category: "TRAUMA",
        clinicalData: `Age: 35
Gender: Male
Encounter Type: ED
Injury Present: Yes
Type: Open wound
Body Region: Chest
Laterality: Right
Encounter: Initial
Ext Cause: MVC`,
        expectedCodes: ["S21.101A", "V49.9XXA"],
        rationale: "Open wound of right chest wall, initial encounter + MVC external cause"
    },
    {
        id: 27,
        category: "TRAUMA",
        clinicalData: `Age: 42
Gender: Female
Encounter Type: ED
Injury Present: Yes
Type: Open wound
Body Region: Abdomen
Laterality: Left
Encounter: Subsequent
Ext Cause: Fall`,
        expectedCodes: ["S31.102D", "W19.XXXD"],
        rationale: "Open wound of left upper quadrant without penetration, subsequent encounter + fall external cause"
    },
    {
        id: 28,
        category: "TRAUMA",
        clinicalData: `Age: 28
Gender: Male
Encounter Type: Inpatient
Injury Present: Yes
Type: Burn
Body Region: Leg
Laterality: Right
Encounter: Initial
Ext Cause: Sports`,
        expectedCodes: ["T24.001A", "Y93.9"],
        rationale: "Burn of unspecified degree of right lower limb, initial encounter + sports activity"
    },

    // ===== RESPIRATORY FAILURE CATEGORY =====
    {
        id: 29,
        category: "RESPIRATORY",
        clinicalData: `Age: 68
Gender: Male
Encounter Type: Inpatient
Respiratory Failure: Acute`,
        expectedCodes: ["J96.00"],
        rationale: "Acute respiratory failure, unspecified = J96.00"
    },
    {
        id: 30,
        category: "RESPIRATORY",
        clinicalData: `Age: 72
Gender: Female
Encounter Type: ED
Respiratory Failure: Chronic`,
        expectedCodes: ["J96.10"],
        rationale: "Chronic respiratory failure, unspecified = J96.10"
    },

    // ===== RENAL CATEGORY =====
    {
        id: 31,
        category: "RENAL",
        clinicalData: `Age: 58
Gender: Male
Encounter Type: Outpatient
CKD Present: Yes
CKD Stage: ESRD`,
        expectedCodes: ["N18.6"],
        rationale: "End stage renal disease = N18.6"
    },
    {
        id: 32,
        category: "RENAL",
        clinicalData: `Age: 65
Gender: Female
Encounter Type: Outpatient
CKD Present: Yes
CKD Stage: 3`,
        expectedCodes: ["N18.3"],
        rationale: "Chronic kidney disease, stage 3 = N18.3"
    },

    // ===== CANCER CATEGORY =====
    {
        id: 33,
        category: "CANCER",
        clinicalData: `Age: 62
Gender: Male
Encounter Type: Outpatient
Cancer Present: Yes
Site: Lung
Type: Primary
Metastasis: No
Active Tx: Yes`,
        expectedCodes: ["C34.90", "Z51.11"],
        rationale: "Primary lung cancer + encounter for chemotherapy = C34.90 + Z51.11"
    },
    {
        id: 34,
        category: "CANCER",
        clinicalData: `Age: 55
Gender: Female
Encounter Type: Inpatient
Cancer Present: Yes
Site: Breast
Type: Secondary
Metastasis: Yes
Active Tx: Yes`,
        expectedCodes: ["C79.81", "Z51.11"],
        rationale: "Secondary malignant neoplasm of breast + chemotherapy encounter"
    },

];

function runAudit() {
    console.log("=".repeat(80));
    console.log("ICD-10-CM COMPREHENSIVE AUDIT TEST SUITE");
    console.log("=".repeat(80));
    console.log();

    let totalTests = 0;
    let passCount = 0;
    let failCount = 0;
    const failures: any[] = [];

    for (const testCase of testCases) {
        totalTests++;

        try {
            const { context } = parseInput(testCase.clinicalData);
            const engineResult = runStructuredRules(context);
            const validated = validateCodeSet(engineResult.primary, engineResult.secondary, context);
            const finalResult = validateFinalOutput(validated.codes, testCase.clinicalData);

            const systemCodes = finalResult.codes.map(c => c.code);
            const expectedCodes = testCase.expectedCodes;

            // Check if codes match
            const codesMatch =
                systemCodes.length === expectedCodes.length &&
                systemCodes.every((code, index) => code === expectedCodes[index]);

            if (codesMatch) {
                passCount++;
                console.log(`CASE ${testCase.id} (${testCase.category}): ✓ PASS`);
            } else {
                failCount++;
                console.log(`CASE ${testCase.id} (${testCase.category}): ✗ FAIL`);
                console.log(`  EXPECTED: ${expectedCodes.join(', ')}`);
                console.log(`  SYSTEM:   ${systemCodes.join(', ')}`);
                console.log(`  REASON:   ${testCase.rationale}`);
                console.log();

                failures.push({
                    case: testCase.id,
                    category: testCase.category,
                    expected: expectedCodes,
                    system: systemCodes,
                    rationale: testCase.rationale
                });
            }

        } catch (error) {
            failCount++;
            console.log(`CASE ${testCase.id} (${testCase.category}): ✗ FAIL (ERROR)`);
            console.log(`  ERROR: ${error}`);
            console.log();

            failures.push({
                case: testCase.id,
                category: testCase.category,
                expected: testCase.expectedCodes,
                system: 'ERROR',
                error: String(error)
            });
        }
    }

    console.log();
    console.log("=".repeat(80));
    console.log("AUDIT SUMMARY");
    console.log("=".repeat(80));
    console.log(`Total Tests: ${totalTests}`);
    console.log(`PASS: ${passCount} (${(passCount / totalTests * 100).toFixed(1)}%)`);
    console.log(`FAIL: ${failCount} (${(failCount / totalTests * 100).toFixed(1)}%)`);
    console.log();

    if (failures.length > 0) {
        console.log("=".repeat(80));
        console.log("FAILURES DETAILED REPORT");
        console.log("=".repeat(80));
        console.log();

        for (const failure of failures) {
            console.log(`CASE ${failure.case} - ${failure.category}`);
            console.log(`  EXPECTED: ${failure.expected.join(', ')}`);
            console.log(`  SYSTEM:   ${Array.isArray(failure.system) ? failure.system.join(', ') : failure.system}`);
            if (failure.rationale) {
                console.log(`  WHY:      ${failure.rationale}`);
            }
            if (failure.error) {
                console.log(`  ERROR:    ${failure.error}`);
            }
            console.log();
        }
    }

    // Category-wise breakdown
    console.log("=".repeat(80));
    console.log("CATEGORY-WISE ACCURACY");
    console.log("=".repeat(80));

    const categories = Array.from(new Set(testCases.map(tc => tc.category)));
    for (const category of categories) {
        const categoryTests = testCases.filter(tc => tc.category === category);
        const categoryFailures = failures.filter(f => f.category === category);
        const categoryPass = categoryTests.length - categoryFailures.length;
        const accuracy = (categoryPass / categoryTests.length * 100).toFixed(1);

        console.log(`${category.padEnd(20)} ${categoryPass}/${categoryTests.length} (${accuracy}%)`);
    }
}

runAudit();
