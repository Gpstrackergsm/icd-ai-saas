import * as fs from 'fs';

// Case templates for each module
const templates = {
    sepsis: [
        { base: "Sepsis due to {organism} with {source} as infection site", requiresFullDoc: true },
        { base: "Severe sepsis with {organ} dysfunction due to {organism} with {source} infection", requiresFullDoc: true },
        { base: "Septic shock due to {organism} with {source} infection", requiresFullDoc: true },
        { base: "Sepsis due to {organism}", requiresFullDoc: false }, // Missing source - HARD STOP
        { base: "Urosepsis", requiresFullDoc: false }, // Incomplete - HARD STOP
    ],

    respiratory: [
        "Acute respiratory distress syndrome",
        "Acute hypoxic respiratory failure",
        "{type} pneumonia",
        "Chronic obstructive pulmonary disease with acute exacerbation",
        "Asthma with acute exacerbation",
        "Pleural effusion",
        "Pneumothorax",
        "Acute respiratory failure with hypercapnia",
    ],

    renal: [
        "Chronic kidney disease stage {stage}",
        "Acute kidney injury",
        "End stage renal disease on dialysis",
        "Acute kidney failure",
        "Chronic kidney disease stage {stage} with acute kidney injury",
    ],

    cardiac: [
        "Acute systolic heart failure",
        "Acute diastolic heart failure",
        "Chronic systolic heart failure",
        "Acute on chronic systolic heart failure",
        "Atrial fibrillation",
        "Ventricular tachycardia",
        "Hypertensive emergency",
        "Acute myocardial infarction",
    ],

    diabetes: [
        "Type {type} diabetes",
        "Type {type} diabetes with ketoacidosis",
        "Type {type} diabetes with hyperosmolarity",
        "Type {type} diabetes with diabetic nephropathy",
        "Type {type} diabetes with diabetic retinopathy",
        "Type {type} diabetes with peripheral neuropathy",
    ],

    neuro: [
        "Acute ischemic stroke",
        "Status epilepticus",
        "Epilepsy",
        "Vascular dementia",
        "Alzheimer's disease",
        "Parkinson's disease",
        "Metabolic encephalopathy",
        "Subdural hematoma",
        "Traumatic brain injury",
    ],

    injury: [
        "Fall from bed",
        "Fall from standing height",
        "Motor vehicle accident",
        "Concussion without loss of consciousness",
        "Traumatic subdural hematoma without loss of consciousness",
        "{injury_type} to {body_part}",
    ],

    infection: [
        "{type} pneumonia",
        "Urinary tract infection",
        "Cellulitis",
        "Hospital acquired pneumonia",
        "Ventilator associated pneumonia",
    ],

    ob: [
        "{severity} preeclampsia",
        "Gestational diabetes",
        "Twin pregnancy",
        "Gestational hypertension",
    ],

    other: [
        "Dehydration",
        "Hyponatremia",
        "Hyperkalemia",
        "Hypothyroidism",
        "Hyperthyroidism",
        "Anemia",
    ]
};

const replacements = {
    organism: ['E. coli', 'MRSA', 'Klebsiella', 'Pseudomonas', 'Streptococcus'],
    source: ['urinary tract', 'lung', 'blood', 'skin'],
    organ: ['renal', 'respiratory', 'hepatic'],
    type: ['Type 1', 'Type 2'],
    stage: ['1', '2', '3a', '3b', '4', '5'],
    severity: ['Mild', 'Moderate', 'Severe'],
    injury_type: ['Fracture', 'Laceration', 'Contusion'],
    body_part: ['right wrist', 'left ankle', 'skull', 'femur'],
};

const ages = [21, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90];
const genders = ['Male', 'Female'];

function replaceVariables(template: string): string {
    let result = template;

    for (const [key, values] of Object.entries(replacements)) {
        const pattern = `{${key}}`;
        if (result.includes(pattern)) {
            const randomValue = values[Math.floor(Math.random() * values.length)];
            result = result.replace(pattern, randomValue);
        }
    }

    return result;
}

function generateCase(caseNum: number, moduleDistribution: Record<string, number>): string {
    // Determine module based on distribution
    const modules = Object.keys(moduleDistribution);
    let cumulative = 0;
    let selectedModule = modules[0];

    const rand = Math.random() * 2000;
    for (const mod of modules) {
        cumulative += moduleDistribution[mod];
        if (rand < cumulative) {
            selectedModule = mod;
            break;
        }
    }

    // Get template for selected module
    const moduleTemplates = templates[selectedModule as keyof typeof templates];
    const template = Array.isArray(moduleTemplates)
        ? moduleTemplates[Math.floor(Math.random() * moduleTemplates.length)]
        : moduleTemplates;

    let narrative: string;

    if (typeof template === 'string') {
        narrative = replaceVariables(template);
    } else if (template.requiresFullDoc) {
        narrative = replaceVariables(template.base);
    } else {
        narrative = template.base;
    }

    // Add patient demographics
    const age = ages[Math.floor(Math.random() * ages.length)];
    const gender = genders[Math.floor(Math.random() * genders.length)];

    // 30% chance of adding secondary condition
    if (Math.random() < 0.3) {
        const secondaryModules = modules.filter(m => m !== selectedModule && m !== 'sepsis');
        if (secondaryModules.length > 0) {
            const secondMod = secondaryModules[Math.floor(Math.random() * secondaryModules.length)];
            const secondTemplates = templates[secondMod as keyof typeof templates];
            const secondTemplate = Array.isArray(secondTemplates)
                ? secondTemplates[Math.floor(Math.random() * secondTemplates.length)]
                : secondTemplates;

            const secondNarrative = typeof secondTemplate === 'string'
                ? replaceVariables(secondTemplate)
                : replaceVariables(secondTemplate.base);

            narrative = `${narrative} and ${secondNarrative.toLowerCase()}`;
        }
    }

    return `CASE ${caseNum},${narrative} in ${age}-year-old ${gender}`;
}

// Distribution: 2000 cases across modules
const distribution = {
    sepsis: 300,      // High priority - test strict validation
    respiratory: 250,
    renal: 250,
    cardiac: 200,
    diabetes: 150,
    neuro: 250,
    injury: 200,
    infection: 150,
    ob: 150,
    other: 100
};

console.log('Generating 2000 test cases...\n');

const cases: string[] = ['Case ID,input'];

for (let i = 1; i <= 2000; i++) {
    const caseStr = generateCase(i, distribution);
    cases.push(caseStr);

    if (i % 200 === 0) {
        console.log(`Generated ${i}/2000 cases...`);
    }
}

const outputPath = '/Users/khalidaitelmaati/Desktop/n2000_input.csv';
fs.writeFileSync(outputPath, cases.join('\n'), 'utf-8');

console.log(`\n✅ Generated 2000 cases`);
console.log(`📁 Saved to: ${outputPath}`);
console.log('\nDistribution:');
for (const [module, count] of Object.entries(distribution)) {
    console.log(`  ${module}: ${count} cases`);
}
