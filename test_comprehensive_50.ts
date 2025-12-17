
import { parseInput } from './lib/structured/parser';
import { runStructuredRules } from './lib/structured/engine';

const cases = [
    // --- NEUROLOGY (1-8) ---
    "Patient admitted with acute ischemic stroke of the left MCA with dense right hemiplegia.",
    "History of CVA with residual left sided hemiparesis affecting dominant side.",
    "Transient Ischemic Attack (TIA) lasting 30 minutes, symptoms resolved.",
    "Intractible epilepsy with status epilepticus.",
    "Toxic metabolic encephalopathy secondary to sepsis.",
    "Patient with history of stroke presenting with new onset seizures.",
    "Acute hemorrhagic stroke of the right cerebellum.",
    "Patient with vascular dementia and history of CVA.",

    // --- CARDIOLOGY (9-18) ---
    "Acute ST elevation myocardial infarction of anterior wall.",
    "NSTEMI with acute combined systolic and diastolic heart failure.",
    "Chronic diastolic heart failure with acute exacerbation.",
    "Patient with history of MI and current unstable angina.",
    "Atrial fibrillation with rapid ventricular response (RVR).",
    "Admitted for heart failure reduced ejection fraction (HFrEF).",
    "Hypertensive heart and chronic kidney disease stage 5 on dialysis.",
    "Acute pulmonary edema due to left ventricular failure.",
    "Coronary artery disease (CAD) with ischemic cardiomyopathy.",
    "Patient with palpitations found to have supraventricular tachycardia.",

    // --- RESPIRATORY (19-28) ---
    "Admitted with pneumonia due to MRSA and acute respiratory failure.",
    "COPD exacerbation with acute infectious pneumonia.",
    "Acute asthma exacerbation with status asthmaticus.",
    "COVID-19 pneumonia with acute respiratory distress syndrome (ARDS).",
    "Patient with history of lung cancer presenting with shortness of breath.",
    "Aspiration pneumonia leading to acute hypoxia.",
    "Influenza A pneumonia with severe sepsis.",
    "Chronic obstructive pulmonary disease with acute lower respiratory infection.",
    "Simple pneumonia, likely bacterial.",
    "Patient with pleural effusion requiring thoracentesis.",

    // --- SEPSIS & INFECTION (29-37) ---
    "Severe sepsis due to E. coli UTI with acute organ dysfunction.",
    "Septic shock due to Pseudomonas pneumonia.",
    "Sepsis secondary to cellulitis of the left leg.",
    "Patient with urosepsis and acute kidney injury.",
    "Postoperative sepsis following abdominal surgery.",
    "Viral sepsis with acute renal failure.",
    "Bacteremia due to Staph aureus.",
    "Patient with fever and hypotension, diagnosed with septic shock.",
    "Sepsis 3 criteria met with lactate of 4.0.",

    // --- ENDOCRINOLOGY & RENAL (38-45) ---
    "Type 2 diabetes with diabetic ketoacidosis (DKA).",
    "Type 1 diabetes with foot ulcer and osteomyelitis.",
    "Uncontrolled diabetes type 2 with hyperglycemia.",
    "End stage renal disease (ESRD) on chronic hemodialysis.",
    "Acute kidney injury (AKI) superimposed on CKD stage 3.",
    "Diabetes mellitus type 2 with diabetic nephropathy.",
    "Patient with hyponatremia and dehydration.",
    "Hyperkalemia requiring urgent dialysis.",

    // --- OBSTETRICS (46-50) ---
    "39 weeks gestation admitted for repeat cesarean section.",
    "Pre-eclampsia with severe features at 34 weeks gestation.",
    "Twin gestation, dichorionic diamniotic, delivery via C-section.",
    "Postpartum hemorrhage following vaginal delivery.",
    "Patient admitted for induction of labor at 41 weeks."
];

console.log(`=== COMPREHENSIVE 50-CASE BENCHMARK ===\n`);

async function run() {
    for (let i = 0; i < cases.length; i++) {
        const text = cases[i];
        console.log(`CASE ${i + 1}:`);
        console.log(`Input: "${text}"`);

        try {
            const { context } = parseInput(text);
            const result = runStructuredRules(context);

            const primary = result.primary ? `${result.primary.code} (${result.primary.label})` : 'NONE';
            const secondary = result.secondary.map(c => `${c.code} (${c.label})`).join(', ');

            console.log(`Codes: ${primary}` + (secondary ? `, ${secondary}` : ''));
        } catch (err) {
            console.log(`ERROR: ${err}`);
        }
        console.log('--------------------------------------------------');
    }
}

run();
