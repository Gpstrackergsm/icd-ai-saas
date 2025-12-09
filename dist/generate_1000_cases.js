"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const fs = __importStar(require("fs"));
/**
 * HOSPITAL-GRADE 1000-CASE DATASET GENERATOR
 *
 * Generates comprehensive clinical test cases in structured format
 * focused on IMPLEMENTED domains in the ICD-10-CM encoder.
 *
 * IMPLEMENTED DOMAINS:
 * - Sepsis & Infections
 * - Diabetes (all complications)
 * - HTN/HF/CKD combinations
 * - COPD & Pneumonia
 * - Respiratory Failure
 * - Pressure Ulcers
 * - Diabetic Ulcers
 * - Traumatic Wounds
 * - CKD/Renal
 * - Cancer (basic)
 */
let caseId = 1;
function generateSepsisInfectionCases() {
    const cases = [];
    const organisms = ['MRSA', 'E. coli', 'Pseudomonas', 'Staphylococcus aureus', 'Streptococcus', 'Klebsiella', 'Proteus', 'Candida', 'Unspecified', 'Viral'];
    const sites = ['Lung', 'Urinary tract', 'Skin', 'Blood', 'Abdominal', 'Wound'];
    const ages = [45, 52, 58, 63, 68, 72, 75, 80, 85];
    const genders = ['Male', 'Female'];
    // Generate 120 sepsis cases
    for (let i = 0; i < 120; i++) {
        const age = ages[i % ages.length];
        const gender = genders[i % 2];
        const organism = organisms[i % organisms.length];
        const site = sites[i % sites.length];
        const hasSepticShock = i % 5 === 0;
        cases.push(`CASE ${caseId++}
Age: ${age}
Gender: ${gender}
Encounter Type: Inpatient
Infection Present: Yes
Infection Site: ${site}
Organism: ${organism}
Sepsis: Yes${hasSepticShock ? '\nSeptic Shock: Yes' : ''}
`);
    }
    return cases;
}
function generateDiabetesCases() {
    const cases = [];
    const types = ['Type 1', 'Type 2'];
    const complications = ['Retinopathy', 'Nephropathy/CKD', 'Neuropathy', 'Foot Ulcer', 'Hypoglycemia', 'Hyperglycemia'];
    const ckdStages = ['1', '2', '3', '4', '5'];
    const ulcerSites = ['Right Ankle', 'Left Ankle', 'Right Foot', 'Left Foot', 'Right Heel', 'Left Heel'];
    const ulcerSeverities = ['Skin breakdown', 'Fat exposed', 'Muscle exposed', 'Bone exposed'];
    // Generate 140 diabetes cases
    for (let i = 0; i < 140; i++) {
        const age = 35 + (i % 50);
        const gender = i % 2 === 0 ? 'Male' : 'Female';
        const diabetesType = types[i % 2];
        const complication = complications[i % complications.length];
        const encounterType = i % 3 === 0 ? 'Inpatient' : (i % 3 === 1 ? 'ED' : 'Outpatient');
        let caseText = `CASE ${caseId++}
Age: ${age}
Gender: ${gender}
Encounter Type: ${encounterType}
Diabetes Type: ${diabetesType}
Complications: ${complication}`;
        if (complication === 'Nephropathy/CKD') {
            caseText += `\nCKD Stage: ${ckdStages[i % ckdStages.length]}`;
        }
        else if (complication === 'Foot Ulcer') {
            caseText += `\nUlcer Site: ${ulcerSites[i % ulcerSites.length]}`;
            caseText += `\nUlcer Severity: ${ulcerSeverities[i % ulcerSeverities.length]}`;
        }
        if (diabetesType === 'Type 2' && i % 3 === 0) {
            caseText += '\nInsulin Use: Yes';
        }
        cases.push(caseText + '\n');
    }
    return cases;
}
function generateHTNHFCKDCases() {
    const cases = [];
    const hfTypes = ['Systolic', 'Diastolic', 'Combined'];
    const hfAcuities = ['Acute', 'Chronic', 'Acute on chronic'];
    const ckdStages = ['1', '2', '3', '4', '5', 'ESRD'];
    // Generate 140 HTN/HF/CKD cases
    for (let i = 0; i < 140; i++) {
        const age = 45 + (i % 40);
        const gender = i % 2 === 0 ? 'Male' : 'Female';
        const encounterType = i % 3 === 0 ? 'Inpatient' : (i % 3 === 1 ? 'ED' : 'Outpatient');
        let caseText = `CASE ${caseId++}
Age: ${age}
Gender: ${gender}
Encounter Type: ${encounterType}
Hypertension: Yes`;
        // 50% have HF
        if (i % 2 === 0) {
            caseText += `\nHeart Failure: ${hfTypes[i % hfTypes.length]}`;
            caseText += `\nHeart Failure Acuity: ${hfAcuities[i % hfAcuities.length]}`;
        }
        // 60% have CKD
        if (i % 5 !== 0) {
            caseText += '\nCKD Present: Yes';
            caseText += `\nCKD Stage: ${ckdStages[i % ckdStages.length]}`;
        }
        cases.push(caseText + '\n');
    }
    return cases;
}
function generateCOPDPneumoniaCases() {
    const cases = [];
    const copdTypes = ['With infection', 'With exacerbation', 'With both', 'Uncomplicated'];
    const organisms = ['MRSA', 'Pseudomonas', 'E. coli', 'Viral', 'Streptococcus', 'Unspecified'];
    const rfTypes = ['Acute', 'Chronic', 'Acute on chronic'];
    // Generate 120 COPD/Pneumonia cases
    for (let i = 0; i < 120; i++) {
        const age = 55 + (i % 30);
        const gender = i % 2 === 0 ? 'Male' : 'Female';
        const encounterType = i % 2 === 0 ? 'Inpatient' : 'ED';
        let caseText = `CASE ${caseId++}
Age: ${age}
Gender: ${gender}
Encounter Type: ${encounterType}`;
        // 70% have COPD
        if (i % 10 !== 0) {
            caseText += `\nCOPD: ${copdTypes[i % copdTypes.length]}`;
        }
        // 60% have pneumonia
        if (i % 5 !== 1) {
            caseText += '\nPneumonia: Yes';
            caseText += `\nPneumonia Organism: ${organisms[i % organisms.length]}`;
        }
        // 40% have respiratory failure
        if (i % 5 < 2) {
            caseText += `\nRespiratory Failure: ${rfTypes[i % rfTypes.length]}`;
        }
        cases.push(caseText + '\n');
    }
    return cases;
}
function generateWoundsUlcersCases() {
    const cases = [];
    const ulcerTypes = ['Pressure', 'Traumatic'];
    const locations = ['Sacral', 'Right heel', 'Left heel', 'Right foot', 'Left foot', 'Right ankle', 'Left ankle', 'Heel', 'Foot', 'Ankle'];
    const stages = ['Stage 1', 'Stage 2', 'Stage 3', 'Stage 4', 'Unstageable', 'Skin breakdown', 'Fat exposed', 'Muscle necrosis', 'Bone necrosis'];
    // Generate 100 wounds/ulcers cases
    for (let i = 0; i < 100; i++) {
        const age = 60 + (i % 35);
        const gender = i % 2 === 0 ? 'Male' : 'Female';
        const encounterType = i % 3 === 0 ? 'Inpatient' : (i % 3 === 1 ? 'ED' : 'Outpatient');
        const ulcerType = ulcerTypes[i % ulcerTypes.length];
        const location = locations[i % locations.length];
        const stage = stages[i % stages.length];
        const caseText = `CASE ${caseId++}
Age: ${age}
Gender: ${gender}
Encounter Type: ${encounterType}
Ulcer/Wound: Yes
Type: ${ulcerType}
Location: ${location}
Stage/Depth: ${stage}
`;
        cases.push(caseText);
    }
    return cases;
}
function generateTraumaCases() {
    const cases = [];
    const injuryTypes = ['Open wound', 'Fracture', 'Burn', 'Laceration'];
    const bodyRegions = ['Chest', 'Abdomen', 'Leg', 'Arm', 'Head', 'Foot', 'Hand'];
    const lateralities = ['Right', 'Left', 'Bilateral'];
    const encounters = ['Initial', 'Subsequent', 'Sequela'];
    const extCauses = ['MVC', 'Fall', 'Sports', 'Assault', 'Accident'];
    // Generate 140 trauma cases
    for (let i = 0; i < 140; i++) {
        const age = 25 + (i % 60);
        const gender = i % 2 === 0 ? 'Male' : 'Female';
        const encounterType = i % 2 === 0 ? 'ED' : 'Inpatient';
        const injuryType = injuryTypes[i % injuryTypes.length];
        const bodyRegion = bodyRegions[i % bodyRegions.length];
        const laterality = lateralities[i % lateralities.length];
        const encounter = encounters[i % encounters.length];
        const extCause = extCauses[i % extCauses.length];
        const caseText = `CASE ${caseId++}
Age: ${age}
Gender: ${gender}
Encounter Type: ${encounterType}
Injury Present: Yes
Type: ${injuryType}
Body Region: ${bodyRegion}
Laterality: ${laterality}
Encounter: ${encounter}
Ext Cause: ${extCause}
`;
        cases.push(caseText);
    }
    return cases;
}
function generateRenalCases() {
    const cases = [];
    const ckdStages = ['1', '2', '3', '4', '5', 'ESRD'];
    // Generate 60 renal cases
    for (let i = 0; i < 60; i++) {
        const age = 50 + (i % 40);
        const gender = i % 2 === 0 ? 'Male' : 'Female';
        const encounterType = i % 3 === 0 ? 'Inpatient' : 'Outpatient';
        const ckdStage = ckdStages[i % ckdStages.length];
        const caseText = `CASE ${caseId++}
Age: ${age}
Gender: ${gender}
Encounter Type: ${encounterType}
CKD Present: Yes
CKD Stage: ${ckdStage}
`;
        cases.push(caseText);
    }
    return cases;
}
function generateCancerCases() {
    const cases = [];
    const sites = ['Lung', 'Breast', 'Prostate', 'Colon', 'Liver', 'Pancreas'];
    const types = ['Primary', 'Secondary'];
    // Generate 80 cancer cases
    for (let i = 0; i < 80; i++) {
        const age = 50 + (i % 40);
        const gender = i % 2 === 0 ? 'Male' : 'Female';
        const encounterType = i % 3 === 0 ? 'Inpatient' : 'Outpatient';
        const site = sites[i % sites.length];
        const type = types[i % types.length];
        const hasMetastasis = i % 3 === 0;
        const activeTx = i % 2 === 0;
        const caseText = `CASE ${caseId++}
Age: ${age}
Gender: ${gender}
Encounter Type: ${encounterType}
Cancer Present: Yes
Site: ${site}
Type: ${type}
Metastasis: ${hasMetastasis ? 'Yes' : 'No'}
Active Tx: ${activeTx ? 'Yes' : 'No'}
`;
        cases.push(caseText);
    }
    return cases;
}
function generateRespiratoryFailureCases() {
    const cases = [];
    const rfTypes = ['Acute', 'Chronic', 'Acute on chronic'];
    // Generate 40 respiratory failure cases
    for (let i = 0; i < 40; i++) {
        const age = 60 + (i % 30);
        const gender = i % 2 === 0 ? 'Male' : 'Female';
        const encounterType = i % 2 === 0 ? 'Inpatient' : 'ED';
        const rfType = rfTypes[i % rfTypes.length];
        const caseText = `CASE ${caseId++}
Age: ${age}
Gender: ${gender}
Encounter Type: ${encounterType}
Respiratory Failure: ${rfType}
`;
        cases.push(caseText);
    }
    return cases;
}
async function main() {
    console.log('Generating 1000-case hospital dataset...\n');
    const allCases = [];
    console.log('Generating Sepsis/Infection cases (120)...');
    allCases.push(...generateSepsisInfectionCases());
    console.log('Generating Diabetes cases (140)...');
    allCases.push(...generateDiabetesCases());
    console.log('Generating HTN/HF/CKD cases (140)...');
    allCases.push(...generateHTNHFCKDCases());
    console.log('Generating COPD/Pneumonia cases (120)...');
    allCases.push(...generateCOPDPneumoniaCases());
    console.log('Generating Wounds/Ulcers cases (100)...');
    allCases.push(...generateWoundsUlcersCases());
    console.log('Generating Trauma cases (140)...');
    allCases.push(...generateTraumaCases());
    console.log('Generating Renal cases (60)...');
    allCases.push(...generateRenalCases());
    console.log('Generating Cancer cases (80)...');
    allCases.push(...generateCancerCases());
    console.log('Generating Respiratory Failure cases (40)...');
    allCases.push(...generateRespiratoryFailureCases());
    console.log(`\nTotal cases generated: ${allCases.length}`);
    // Save to file
    const output = allCases.join('\n');
    fs.writeFileSync('hospital_1000_cases.txt', output);
    console.log('Dataset saved to: hospital_1000_cases.txt');
    console.log('\nDistribution:');
    console.log('  Sepsis/Infection: 120');
    console.log('  Diabetes: 140');
    console.log('  HTN/HF/CKD: 140');
    console.log('  COPD/Pneumonia: 120');
    console.log('  Wounds/Ulcers: 100');
    console.log('  Trauma: 140');
    console.log('  Renal: 60');
    console.log('  Cancer: 80');
    console.log('  Respiratory Failure: 40');
    console.log('  TOTAL: 940 cases');
}
main().catch(console.error);
