
import { parseInput } from './parser';
import { runStructuredRules } from './engine';

const cases = [
    `Case 1:
Age: 67
Gender: Male
Diabetes Type: Type 2
Complications: Diabetic nephropathy
Insulin Use: Not mentioned`,

    `Case 2:
Age: 59
Gender: Female
Diabetes Type: Type 2
Complications: Diabetic polyneuropathy, Foot ulcer
Ulcer Site: Right foot
Ulcer Depth: Fat layer exposed
Insulin Use: Not mentioned`,

    `Case 3:
Age: 73
Gender: Male
Diabetes Type: Type 2
Complications: Diabetic retinopathy with macular edema`,

    `Case 4:
Age: 45
Gender: Female
Diabetes Type: Type 1
Complications: Ketoacidosis without coma`,

    `Case 5:
Age: 62
Gender: Male
Diagnosis: Sepsis due to E. coli
Complications: Acute kidney failure`,

    `Case 6:
Age: 70
Gender: Female
Diagnosis: Pneumonia due to MRSA
Complications: Severe sepsis, Acute respiratory failure`,

    `Case 7:
Age: 58
Gender: Male
Diagnosis: Alcoholic cirrhosis
Complications: Ascites`,

    `Case 8:
Age: 32
Gender: Female
Pregnant: Yes
Gestational Age: 34 weeks
Diagnosis: Preeclampsia with severe features`,

    `Case 9:
Age: 75
Gender: Male
Diabetes Type: Type 2
Complications: CKD Stage 4, Diabetic foot ulcer
Ulcer Site: Left heel
Ulcer Severity: Necrosis of muscle`,

    `Case 10:
Age: 61
Gender: Female
Diagnosis: Septic shock
Source: Urinary tract infection
Complications: Acute respiratory failure, Acute kidney failure`,

    `Case 11:
Age: 29
Gender: Male
Diagnosis: HIV positive, Active tuberculosis`,

    `Case 12:
Age: 44
Gender: Female
History: Breast cancer
Current Admission: Chemotherapy
Active disease: No`,

    `Case 13:
Age: 68
Gender: Male
Diagnosis: Ischemic stroke
Complications: Right side hemiplegia`,

    `Case 14:
Age: 55
Gender: Female
Diagnosis: COPD
Complication: Acute exacerbation`,

    `Case 15:
Age: 80
Gender: Female
Diagnosis: Alzheimer’s disease
Status: Severe`,

    `Case 16:
Age: 47
Gender: Male
Diagnosis: Hypertensive heart disease
Complication: Heart failure`,

    `Case 17:
Age: 36
Gender: Female
Diagnosis: Iron deficiency anemia
Cause: Chronic blood loss`,

    `Case 18:
Age: 64
Gender: Male
Diagnosis: Chronic kidney disease Stage 5
On dialysis: Yes`,

    `Case 19:
Age: 71
Gender: Female
Diagnosis: Osteoporosis
Event: Pathological fracture of femur`,

    `Case 20:
Age: 50
Gender: Male
Diagnosis: Major depressive disorder
Status: Severe without psychotic features`
];

console.log('Running User Batch Tests Set 4...\n');

cases.forEach((caseText, index) => {
    console.log(`TEST ${index + 1}`);
    // Strip "Case X:" line if present for cleaner parsing, though parser splits by newline
    const cleanText = caseText.replace(/^Case \d+:\n/, '');

    const { context, errors } = parseInput(cleanText);

    if (errors.length > 0) {
        console.log('❌ Parse Errors:', errors);
    }

    const result = runStructuredRules(context);
    const codes = [result.primary, ...result.secondary].filter(c => c);

    if (codes.length === 0) {
        console.log('❌ No codes generated');
    } else {
        console.log('Output: ' + codes.map(c => c?.code).join(', '));
    }
    console.log('');
});
