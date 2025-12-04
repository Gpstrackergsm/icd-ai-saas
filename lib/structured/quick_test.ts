import { parseInput } from './parser';
import { runStructuredRules } from './engine';

const testCases = [
    "Type 2 diabetes with diabetic nephropathy",
    "Type 2 diabetes with diabetic foot ulcer, right foot, skin breakdown only, and diabetic neuropathy",
    "Type 1 diabetes with diabetic retinopathy",
    "Type 1 diabetes with ketoacidosis",
    "Sepsis due to E. coli with acute kidney injury",
    "Sepsis, unspecified organism, with severe sepsis, acute respiratory failure, and pneumonia due to Klebsiella",
    "Alcoholic cirrhosis with ascites",
    "Preeclampsia, severe, 34 weeks gestation",
    "Type 2 diabetes with diabetic foot ulcer, left foot, exposed muscle, and diabetic nephropathy, CKD stage 4",
    "Sepsis with septic shock, acute kidney injury, and acute respiratory failure",
    "HIV with active tuberculosis",
    "Breast cancer, right breast, on chemotherapy",
    "Ischemic stroke with right-sided hemiplegia",
    "COPD exacerbation",
    "Alzheimer's dementia",
    "Hypertensive heart disease with heart failure",
    "Iron deficiency anemia",
    "CKD stage 5, on chronic dialysis",
    "Osteoporosis with pathological fracture of right femur",
    "Major depressive disorder, moderate severity"
];

console.log('Quick Test Results:\n');

testCases.forEach((input, index) => {
    const parseResult = parseInput(input);
    const result = runStructuredRules(parseResult.context);
    const codes = result.primary ? [result.primary, ...result.secondary].map(c => c.code).join(', ') : 'No codes';
    console.log(`${index + 1}. ${input}`);
    console.log(`   → ${codes}\n`);
});
