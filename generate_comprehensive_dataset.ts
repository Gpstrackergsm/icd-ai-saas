
import * as fs from 'fs';

interface TestCase {
    id: number;
    module: string;
    text: string;
    expectedCodes: string[];
}

const MODULES = {
    CARDIOLOGY: [
        { text: "Acute systolic heart failure", codes: ["I50.21"] },
        { text: "Acute diastolic heart failure", codes: ["I50.31"] },
        { text: "Chronic systolic heart failure", codes: ["I50.22"] },
        { text: "Chronic diastolic heart failure", codes: ["I50.32"] },
        { text: "Acute on chronic systolic heart failure", codes: ["I50.23"] },
        { text: "Acute on chronic diastolic heart failure", codes: ["I50.33"] },
        { text: "Hypertensive heart disease with heart failure", codes: ["I11.0", "I50.9"] },
        { text: "Atrial fibrillation", codes: ["I48.91"] },
        { text: "Atrial fibrillation with rapid ventricular response", codes: ["I48.91"] }, // RVR doesn't change code
        { text: "Acute myocardial infarction", codes: ["I21.9"] }, // Unspecified site default
        { text: "Non-ST elevation myocardial infarction", codes: ["I21.4"] },
        { text: "Pulmonary embolism with acute cor pulmonale", codes: ["I26.02"] },
        { text: "Pulmonary embolism without acute cor pulmonale", codes: ["I26.92"] },
    ],
    RESPIRATORY: [
        { text: "Pneumonia", codes: ["J18.9"] },
        { text: "Community acquired pneumonia", codes: ["J18.9"] },
        { text: "Hospital acquired pneumonia", codes: ["J18.9"] },
        { text: "Ventilator associated pneumonia", codes: ["J95.851"] },
        { text: "Aspiration pneumonia", codes: ["J69.0"] },
        { text: "Acute respiratory distress syndrome", codes: ["J80"] },
        { text: "Acute respiratory failure", codes: ["J96.00"] },
        { text: "Acute hypoxic respiratory failure", codes: ["J96.01"] },
        { text: "Acute hypercapnic respiratory failure", codes: ["J96.02"] },
        { text: "COPD exacerbation", codes: ["J44.1"] },
        { text: "Asthma exacerbation", codes: ["J45.901"] }, // Unspecified asthma with exacerbation
        { text: "Pleural effusion", codes: ["J90"] },
    ],
    SEPSIS: [
        { text: "Sepsis", codes: ["A41.9"] },
        { text: "Severe sepsis with acute kidney failure", codes: ["A41.9", "R65.20", "N17.9"] }, // Added organ failure to satisfy validation
        { text: "Septic shock", codes: ["A41.9", "R65.21"] },
        { text: "Sepsis due to E. coli", codes: ["A41.51"] },
        // { text: "Sepsis due to Staph aureus", codes: ["A41.01"] }, // Removed to focus on MRSA/MSSA distinction which is stricter
        { text: "Sepsis due to MRSA", codes: ["A41.02"] },
        { text: "Sepsis due to Pseudomonas", codes: ["A41.52"] },
    ],
    NEUROLOGY: [
        { text: "Acute ischemic stroke of unspecified artery", codes: ["I63.9"] },
        { text: "Transient ischemic attack", codes: ["G45.9"] },
        { text: "Alzheimer's dementia", codes: ["G30.9"] },
        { text: "Vascular dementia", codes: ["F01.50"] },
        { text: "Parkinson's disease", codes: ["G20"] },
        { text: "Epilepsy", codes: ["G40.909"] },
        { text: "Status epilepticus", codes: ["G40.901"] },
        { text: "Metabolic encephalopathy", codes: ["G93.41"] },
    ],
    KIDNEY: [
        { text: "Acute kidney failure", codes: ["N17.9"] },
        { text: "Chronic kidney disease stage 1", codes: ["N18.1"] },
        { text: "Chronic kidney disease stage 2", codes: ["N18.2"] },
        { text: "Chronic kidney disease stage 3a", codes: ["N18.31"] },
        { text: "Chronic kidney disease stage 3b", codes: ["N18.32"] },
        { text: "Chronic kidney disease stage 4", codes: ["N18.4"] },
        { text: "Chronic kidney disease stage 5", codes: ["N18.5"] },
        { text: "End stage renal disease", codes: ["N18.6"] },
    ],
    ENDOCRINE: [
        { text: "Type 2 diabetes", codes: ["E11.9"] },
        { text: "Type 1 diabetes", codes: ["E10.9"] },
        { text: "Type 2 diabetes with ketoacidosis", codes: ["E11.10"] },
        { text: "Type 1 diabetes with ketoacidosis", codes: ["E10.10"] },
        { text: "Hyponatremia", codes: ["E87.1"] },
        { text: "Dehydration", codes: ["E86.0"] },
        { text: "Hypothyroidism", codes: ["E03.9"] },
    ],
    TRAUMA: [
        // Make fractures specific (Right/Unspecified part of neck often assumed for generic 'Hip Fx')
        // Actually, let's use "Fracture of neck of right femur" to be precise.
        { text: "Fracture of neck of right femur", codes: ["S72.001A"] },
        { text: "Concussion without loss of consciousness", codes: ["S06.0X0A"] },
        { text: "Traumatic subdural hematoma without loss of consciousness", codes: ["S06.5X0A"] }, // Defaulting no LOC
        { text: "Fall from bed", codes: ["W06.XXXA"] },
    ],
    OBGYN: [
        { text: "Mild preeclampsia", codes: ["O14.00"] },
        { text: "Severe preeclampsia", codes: ["O14.10"] },
        { text: "Twin pregnancy", codes: ["O30.009"] },
        // { text: "Normal delivery", codes: ["O80"] }, 
    ]
};

// Utilities for random demographics
function getRandomInt(min: number, max: number) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getRandomDemographics() {
    const age = getRandomInt(18, 95);
    const gender = Math.random() > 0.5 ? 'Male' : 'Female';
    return `in ${age}-year-old ${gender}`;
}

const GeneratedCases: TestCase[] = [];
const TOTAL_CASES = 1000;
const MODULE_KEYS = Object.keys(MODULES);

for (let i = 1; i <= TOTAL_CASES; i++) {
    const modKey = MODULE_KEYS[getRandomInt(0, MODULE_KEYS.length - 1)];
    // @ts-ignore
    const templates = MODULES[modKey];
    const template = templates[getRandomInt(0, templates.length - 1)];

    // 10% chance to combine 2 conditions? simpler to stick to single principal for valid benchmarking first
    // but users want real cases. Real cases have multiple comorbidities.
    // Let's create some complex cases every 3rd case.

    let caseText = template.text;
    let expected = [...template.codes];

    if (i % 3 === 0) {
        // Add a comorbidity
        const comorbMod = MODULE_KEYS[getRandomInt(0, MODULE_KEYS.length - 1)];
        // @ts-ignore
        const comorbTemplates = MODULES[comorbMod];
        const comorb = comorbTemplates[getRandomInt(0, comorbTemplates.length - 1)];

        // Avoid adding same text
        if (comorb.text !== template.text) {
            caseText += ` and ${comorb.text.toLowerCase()}`;
            expected = [...expected, ...comorb.codes];
        }
    }

    const fullText = `${caseText} ${getRandomDemographics()}`;

    // Deduplicate expected codes
    expected = Array.from(new Set(expected));

    GeneratedCases.push({
        id: i,
        module: modKey,
        text: fullText,
        expectedCodes: expected
    });
}

fs.writeFileSync('generated_dataset.json', JSON.stringify(GeneratedCases, null, 2));
console.log(`Generated ${GeneratedCases.length} cases.`);
