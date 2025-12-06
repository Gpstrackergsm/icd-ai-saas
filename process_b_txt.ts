import * as fs from 'fs';
import { parseInput } from './lib/structured/parser';
import { runStructuredRules } from './lib/structured/engine';

interface ProcessedCase {
    caseNumber: number;
    category: string;
    age: number;
    gender: string;
    encounterType: string;
    clinicalStory: string;
    codes: string[];
}

// -----------------------------------------------------------------------------
// CATEGORY HANDLERS
// -----------------------------------------------------------------------------

function parseHTN_HF_CKD(story: string, lines: string[]) {
    const lower = story.toLowerCase();

    // Hypertension
    if (lower.includes('hypertension') || lower.includes('htn')) {
        lines.push('Hypertension: Yes');
    }

    // Heart Failure
    if (lower.includes('heart failure') || lower.includes('chf')) {
        lines.push('Heart Failure: Yes');
        if (lower.includes('systolic')) lines.push('HF Type: Systolic');
        else if (lower.includes('diastolic')) lines.push('HF Type: Diastolic');
        else if (lower.includes('combined')) lines.push('HF Type: Combined');
    }

    // CKD
    if (lower.includes('ckd') || lower.includes('kidney disease')) {
        lines.push('CKD: Yes');
        if (lower.includes('stage 3')) lines.push('CKD Stage: 3');
        else if (lower.includes('stage 4')) lines.push('CKD Stage: 4');
        else if (lower.includes('stage 5')) lines.push('CKD Stage: 5');
        else if (lower.includes('esrd')) lines.push('CKD Stage: ESRD');
    }
}

function parseInternalDM(story: string, lines: string[]) {
    const lower = story.toLowerCase();

    // Diabetes Type
    if (lower.includes('type 1')) lines.push('Diabetes: Type 1');
    else lines.push('Diabetes: Type 2'); // Default to Type 2 if not specified, or if Type 2 explicitly stated

    // Complications
    if (lower.includes('kidney disease') || lower.includes('nephropathy') || lower.includes('ckd')) {
        lines.push('Diabetic CKD: Yes');
        if (lower.includes('stage 3')) lines.push('CKD Stage: 3');
        else if (lower.includes('stage 4')) lines.push('CKD Stage: 4');
        else if (lower.includes('stage 5')) lines.push('CKD Stage: 5');
        else if (lower.includes('esrd')) lines.push('CKD Stage: ESRD');
    }

    if (lower.includes('foot ulcer') || lower.includes('ulcer')) {
        lines.push('Diabetic Ulcer: Yes');
        if (lower.includes('muscle')) lines.push('Ulcer Depth: Muscle');
        else if (lower.includes('bone')) lines.push('Ulcer Depth: Bone');
        else if (lower.includes('fat')) lines.push('Ulcer Depth: Fat');
    }

    if (lower.includes('neuropathy')) {
        lines.push('Diabetic Neuropathy: Yes');
    }

    if (lower.includes('retinopathy')) {
        lines.push('Diabetic Retinopathy: Yes');
    }
}

function parseTrauma(story: string, lines: string[]) {
    const lower = story.toLowerCase();

    // Injury Type
    if (lower.includes('fracture')) lines.push('Injury: Fracture');
    else if (lower.includes('laceration') || lower.includes('open wound')) lines.push('Injury: Laceration');
    else if (lower.includes('burn')) lines.push('Injury: Burn');

    // Body Part
    if (lower.includes('femur')) lines.push('Site: Femur');
    else if (lower.includes('ankle')) lines.push('Site: Ankle');
    else if (lower.includes('foot') || lower.includes('feet')) lines.push('Site: Foot');
    else if (lower.includes('finger')) lines.push('Site: Finger');
    else if (lower.includes('chest')) lines.push('Site: Chest');
    else if (lower.includes('abdomen') || lower.includes('abdominal')) lines.push('Site: Abdomen');

    // Laterality
    if (lower.includes('left')) lines.push('Laterality: Left');
    else if (lower.includes('right')) lines.push('Laterality: Right');

    // Encounter
    lines.push('Encounter: Initial'); // Default for trauma in this dataset context usually
}

function parseUlcers(story: string, lines: string[]) {
    const lower = story.toLowerCase();

    // Pressure Ulcer
    if (lower.includes('pressure ulcer') || lower.includes('bedsore')) {
        lines.push('Ulcer Type: Pressure');
        if (lower.includes('stage 1')) lines.push('Stage: 1');
        else if (lower.includes('stage 2')) lines.push('Stage: 2');
        else if (lower.includes('stage 3')) lines.push('Stage: 3');
        else if (lower.includes('stage 4')) lines.push('Stage: 4');
        else if (lower.includes('unstageable')) lines.push('Stage: Unstageable');

        if (lower.includes('sacral') || lower.includes('sacrum')) lines.push('Site: Sacral');
        else if (lower.includes('heel')) lines.push('Site: Heel');
        else if (lower.includes('buttock')) lines.push('Site: Buttock');
    }
}

function parseOncology(story: string, lines: string[]) {
    const lower = story.toLowerCase();

    if (lower.includes('metastatic') || lower.includes('secondary')) {
        lines.push('Metastasis: Yes');
    }

    if (lower.includes('breast cancer') || lower.includes('malignant neoplasm of breast')) {
        lines.push('Cancer: Breast');
    } else if (lower.includes('lung cancer')) {
        lines.push('Cancer: Lung');
    } else if (lower.includes('colon cancer')) {
        lines.push('Cancer: Colon');
    } else if (lower.includes('prostate cancer')) {
        lines.push('Cancer: Prostate');
    }

    if (lower.includes('chemotherapy')) {
        lines.push('Chemotherapy: Yes');
    }

    if (lower.includes('history of')) {
        lines.push('History of Cancer: Yes');
    }
}

function parseOBGYN(story: string, lines: string[]) {
    const lower = story.toLowerCase();

    if (lower.includes('preeclampsia')) {
        lines.push('Condition: Preeclampsia');
        if (lower.includes('severe')) lines.push('Severity: Severe');
    }

    if (lower.includes('abortion')) {
        lines.push('Condition: Abortion');
    }

    if (lower.includes('postpartum')) {
        lines.push('Condition: Postpartum');
    }
}

function parseNeuro(story: string, lines: string[]) {
    const lower = story.toLowerCase();

    if (lower.includes('stroke') || lower.includes('cva') || lower.includes('cerebrovascular accident')) {
        lines.push('Condition: Stroke');
        if (lower.includes('hemiplegia')) lines.push('Deficit: Hemiplegia');
        else if (lower.includes('aphasia')) lines.push('Deficit: Aphasia');
    }

    if (lower.includes('epilepsy') || lower.includes('seizure')) {
        lines.push('Condition: Epilepsy');
        if (lower.includes('intractable')) lines.push('Status: Intractable');
    }
}

function parsePsych(story: string, lines: string[]) {
    const lower = story.toLowerCase();

    if (lower.includes('depression') || lower.includes('depressive')) {
        lines.push('Condition: Depression');
        if (lower.includes('major')) lines.push('Type: Major');
        if (lower.includes('recurrent')) lines.push('Pattern: Recurrent');
    }

    if (lower.includes('anxiety')) {
        lines.push('Condition: Anxiety');
    }

    if (lower.includes('alcohol')) {
        lines.push('Condition: Alcohol Use');
        if (lower.includes('dependence')) lines.push('Status: Dependence');
        else if (has(lower, 'abuse')) lines.push('Status: Abuse');
    }
}

function has(text: string, term: string) { return text.includes(term); }

function parseZCodes(story: string, lines: string[]) {
    const lower = story.toLowerCase();

    if (lower.includes('screening')) {
        lines.push('Type: Screening');
        if (lower.includes('colonoscopy')) lines.push('Screening For: Colon Cancer');
        else if (lower.includes('mammogram')) lines.push('Screening For: Breast Cancer');
    }

    if (lower.includes('aftercare')) {
        lines.push('Type: Aftercare');
        if (lower.includes('surgery')) lines.push('After: Surgery');
    }
}

function parsePeds(story: string, lines: string[]) {
    const lower = story.toLowerCase();

    if (lower.includes('otitis media')) {
        lines.push('Condition: Otitis Media');
        if (lower.includes('left')) lines.push('Laterality: Left');
        else if (lower.includes('right')) lines.push('Laterality: Right');
        else if (lower.includes('bilateral')) lines.push('Laterality: Bilateral');
    }

    if (lower.includes('croup')) {
        lines.push('Condition: Croup');
    }
}

function parseSepsisAndPulmonary(story: string, lines: string[]) {
    const lowerStory = story.toLowerCase();
    // Sepsis detection
    if (lowerStory.includes('septic shock')) {
        lines.push('Sepsis: Yes');
        lines.push('Septic Shock: Yes');
    } else if (lowerStory.includes('sepsis') || lowerStory.includes('urosepsis')) {
        lines.push('Sepsis: Yes');
    }

    // Infection source
    if (lowerStory.includes('uti') || lowerStory.includes('urinalysis positive') || lowerStory.includes('urinary')) {
        lines.push('Infection Present: Yes');
        lines.push('Infection Site: Urinary tract');
    } else if (lowerStory.includes('pneumonia') || lowerStory.includes('lung')) {
        lines.push('Infection Present: Yes');
        lines.push('Infection Site: Lung');
        lines.push('Pneumonia: Yes');
    } else if (lowerStory.includes('skin') || lowerStory.includes('cellulitis')) {
        lines.push('Infection Present: Yes');
        lines.push('Infection Site: Skin');
    } else if (lowerStory.includes('abdominal') || lowerStory.includes('peritonitis')) {
        lines.push('Infection Present: Yes');
        lines.push('Infection Site: Abdominal');
    } else if (lowerStory.includes('blood cultures positive')) {
        lines.push('Infection Present: Yes');
        lines.push('Infection Site: Blood');
    }

    // Organism
    if (lowerStory.includes('e. coli') || lowerStory.includes('e.coli')) {
        lines.push('Organism: E. coli');
    } else if (lowerStory.includes('mrsa')) {
        lines.push('Organism: MRSA');
    } else if (lowerStory.includes('pseudomonas')) {
        lines.push('Organism: Pseudomonas');
    } else if (lowerStory.includes('staph')) {
        lines.push('Organism: Staphylococcus aureus');
    } else if (lowerStory.includes('strep')) {
        lines.push('Organism: Streptococcus');
    }

    // Acute kidney injury
    if (lowerStory.includes('acute kidney injury') || lowerStory.includes('aki')) {
        lines.push('AKI: Yes');
    }
}


// -----------------------------------------------------------------------------
// MAIN PARSER DISPATCHER
// -----------------------------------------------------------------------------

function parseClinicalStory(story: string, age: number, gender: string, encounterType: string, category: string): string {
    const lines: string[] = [];

    lines.push(`Age: ${age}`);
    lines.push(`Gender: ${gender}`);
    lines.push(`Encounter Type: ${encounterType}`);

    // Dispatch based on Category
    switch (category) {
        case 'ICU_SEPSIS':
        case 'PULMONARY':
            parseSepsisAndPulmonary(story, lines);
            break;
        case 'HTN_HF_CKD':
            parseHTN_HF_CKD(story, lines);
            break;
        case 'INTERNAL_DM':
            parseInternalDM(story, lines);
            break;
        case 'TRAUMA':
            parseTrauma(story, lines);
            break;
        case 'ULCERS':
            parseUlcers(story, lines);
            break;
        case 'ONCOLOGY':
            parseOncology(story, lines);
            break;
        case 'OBGYN':
            parseOBGYN(story, lines);
            break;
        case 'NEURO':
            parseNeuro(story, lines);
            break;
        case 'PSYCH':
            parsePsych(story, lines);
            break;
        case 'ZCODES':
            parseZCodes(story, lines);
            break;
        case 'PEDS':
            parsePeds(story, lines);
            break;
        default:
            // Fallback for any unknown category or if dataset has mixed labels
            parseSepsisAndPulmonary(story, lines);
            break;
    }

    return lines.join('\n');
}

// -----------------------------------------------------------------------------
// LOCAL CODE GENERATION FOR MISSING CATEGORIES
// -----------------------------------------------------------------------------
// Since the core engine (runStructuredRules) does not yet support these new domains,
// we must generate the codes locally within this script to meet the project requirements.

function generateCategorySpecificCodes(structuredInput: string, category: string): string[] {
    const codes: string[] = [];
    const lines = structuredInput.split('\n').map(l => l.toLowerCase());

    // Helper to check content
    const has = (text: string) => lines.some(l => l.includes(text.toLowerCase()));

    if (category === 'TRAUMA') {
        // --- TRAUMA LOGIC ---
        // S72.301A - Fracture of shaft of right femur, initial
        if (has('Injury: Fracture') && has('Site: Femur') && has('Laterality: Right')) codes.push('S72.301A');
        else if (has('Injury: Fracture') && has('Site: Femur') && has('Laterality: Left')) codes.push('S72.302A');

        // S91.001A - Open wound of right ankle
        else if (has('Injury: Laceration') && has('Site: Ankle') && has('Laterality: Right')) codes.push('S91.001A');
        else if (has('Injury: Laceration') && has('Site: Ankle') && has('Laterality: Left')) codes.push('S91.002A');

        // S91.301A - Open wound of right foot
        else if (has('Injury: Laceration') && has('Site: Foot') && has('Laterality: Right')) codes.push('S91.301A');
        else if (has('Injury: Laceration') && has('Site: Foot') && has('Laterality: Left')) codes.push('S91.302A');

        // S61.210A - Laceration of finger
        else if (has('Injury: Laceration') && has('Site: Finger') && has('Laterality: Right')) codes.push('S61.210A');
        else if (has('Injury: Laceration') && has('Site: Finger') && has('Laterality: Left')) codes.push('S61.211A');

        // S21.90XA - Open wound of chest
        else if (has('Injury: Laceration') && has('Site: Chest')) codes.push('S21.90XA');

        // T21.21XA - Burn of chest (second degree)
        else if (has('Injury: Burn') && has('Site: Chest')) codes.push('T21.21XA');

        // S31.109A - Open wound of abdomen
        else if (has('Injury: Laceration') && has('Site: Abdomen')) codes.push('S31.109A');

        // Fallback if generic fracture
        if (has('Injury: Fracture') && codes.length === 0) codes.push('S72.90XA'); // Unspecified fracture code as fallback
    }

    else if (category === 'ONCOLOGY') {
        // --- ONCOLOGY LOGIC ---
        // Primary Cancers
        if (has('Cancer: Breast')) {
            codes.push('C50.919'); // Malignant neoplasm of breast of unspecified site, unspecified female breast
        }
        if (has('Cancer: Lung')) {
            codes.push('C34.90'); // Malignant neoplasm of unspecified part of unspecified bronchus or lung
        }
        if (has('Cancer: Colon')) {
            codes.push('C18.9'); // Malignant neoplasm of colon, unspecified
        }
        if (has('Cancer: Prostate')) {
            codes.push('C61'); // Malignant neoplasm of prostate
        }

        // Secondary / Metastatic
        if (has('Metastasis: Yes')) {
            codes.push('C79.9'); // Secondary malignant neoplasm of unspecified site
        }

        // History
        if (has('History of Cancer: Yes')) {
            if (has('Cancer: Breast')) codes.push('Z85.3');
            else if (has('Cancer: Lung')) codes.push('Z85.118');
            else if (has('Cancer: Colon')) codes.push('Z85.038');
            else codes.push('Z85.9');
        }

        // Chemo
        if (has('Chemotherapy: Yes')) {
            codes.push('Z51.11'); // Encounter for antineoplastic chemotherapy
        }
    }

    else if (category === 'OBGYN') {
        // --- OBGYN LOGIC ---
        if (has('Condition: Preeclampsia')) {
            if (has('Severity: Severe')) codes.push('O14.10'); // Severe pre-eclampsia, unspecified trimester
            else codes.push('O14.90'); // Unspecified pre-eclampsia
        }

        if (has('Condition: Abortion')) {
            codes.push('O03.9'); // Spontaneous abortion, complete or unspecified, without complication
        }

        if (has('Condition: Postpartum')) {
            codes.push('Z39.2'); // Encounter for routine postpartum follow-up
        }
    }

    else if (category === 'NEURO') {
        // --- NEURO LOGIC ---
        if (has('Condition: Stroke')) {
            if (has('Deficit: Hemiplegia')) codes.push('I69.359'); // Hemiplegia and hemiparesis following cerebral infarction
            else if (has('Deficit: Aphasia')) codes.push('I69.320'); // Aphasia following cerebral infarction
            else codes.push('I63.9'); // Cerebral infarction, unspecified (Acute stroke)
            // Note: If history/sequelae implied by context of "Stroke with deficit", use I69. If acute, I63.
            // For this dataset, usually "Stroke with deficit" implies sequelae (I69) or acute with manifestation.
        }

        if (has('Condition: Epilepsy')) {
            if (has('Status: Intractable')) codes.push('G40.919'); // Epilepsy, unspecified, intractable, without status epilepticus
            else codes.push('G40.909'); // Epilepsy, unspecified, not intractable, without status epilepticus
        }
    }

    else if (category === 'PSYCH') {
        // --- PSYCH LOGIC ---
        if (has('Condition: Depression')) {
            if (has('Type: Major') && has('Pattern: Recurrent')) codes.push('F33.9'); // Major depressive disorder, recurrent, unspecified
            else codes.push('F32.9'); // Major depressive disorder, single episode, unspecified
        }

        if (has('Condition: Anxiety')) {
            codes.push('F41.9'); // Anxiety disorder, unspecified
        }

        if (has('Condition: Alcohol Use')) {
            if (has('Status: Dependence')) codes.push('F10.20'); // Alcohol dependence, uncomplicated
            else if (has('Status: Abuse')) codes.push('F10.10'); // Alcohol abuse, uncomplicated
        }
    }

    else if (category === 'ZCODES') {
        // --- ZCODES LOGIC ---
        if (has('Type: Screening')) {
            if (has('Screening For: Colon Cancer')) codes.push('Z12.11'); // Encounter for screening for malignant neoplasm of colon
            else if (has('Screening For: Breast Cancer')) codes.push('Z12.31'); // Encounter for screening mammogram
        }

        if (has('Type: Aftercare')) {
            if (has('After: Surgery')) codes.push('Z48.815'); // Encounter for surgical aftercare following surgery on the digestive system (common default) or Z48.0
            // defaulting to general surgical aftercare
            codes.push('Z48.00'); // Encounter for change or removal of nonsurgical wound dressing
        }
    }

    else if (category === 'PEDS') {
        // --- PEDS LOGIC ---
        if (has('Condition: Otitis Media')) {
            if (has('Laterality: Right')) codes.push('H66.91');
            else if (has('Laterality: Left')) codes.push('H66.92');
            else if (has('Laterality: Bilateral')) codes.push('H66.93');
            else codes.push('H66.90'); // Otitis media, unspecified, unspecified ear
        }

        if (has('Condition: Croup')) {
            codes.push('J05.0'); // Acute obstructive laryngitis [croup]
        }
    }

    return codes;
}

function processCases() {
    console.log('================================================================================');
    console.log('PROCESSING B.TXT - GENERATING ICD-10-CM CODES (ALL CATEGORIES)');
    console.log('================================================================================\n');

    const filePath = '/Users/khalidaitelmaati/Desktop/icd-ai-saas/icd-ai-saas/b_original.txt';
    const content = fs.readFileSync(filePath, 'utf-8');

    // Parse cases
    const lines = content.split('\n');
    const processedCases: ProcessedCase[] = [];

    let currentCase: any = {};
    let caseNumber = 0;
    let readingClinicalStory = false;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();

        if (line.startsWith('CASE ')) {
            if (caseNumber > 0 && currentCase.clinicalStory) {
                // Process previous case
                const structuredInput = parseClinicalStory(
                    currentCase.clinicalStory,
                    currentCase.age,
                    currentCase.gender,
                    currentCase.encounterType,
                    currentCase.category
                );

                try {
                    const { context } = parseInput(structuredInput);
                    const result = runStructuredRules(context);

                    const codes: string[] = [];
                    if (result.primary) codes.push(result.primary.code);
                    codes.push(...result.secondary.map(c => c.code));

                    // MERGE: Add locally generated codes for missing categories
                    const localCodes = generateCategorySpecificCodes(structuredInput, currentCase.category);
                    localCodes.forEach(c => {
                        if (!codes.includes(c)) codes.push(c);
                    });

                    processedCases.push({
                        caseNumber,
                        category: currentCase.category,
                        age: currentCase.age,
                        gender: currentCase.gender,
                        encounterType: currentCase.encounterType,
                        clinicalStory: currentCase.clinicalStory,
                        codes
                    });

                    process.stdout.write(codes.length > 0 ? '✓' : 'X');
                } catch (error) {
                    processedCases.push({
                        caseNumber,
                        category: currentCase.category,
                        age: currentCase.age,
                        gender: currentCase.gender,
                        encounterType: currentCase.encounterType,
                        clinicalStory: currentCase.clinicalStory,
                        codes: []
                    });
                    process.stdout.write('E');
                }

                if (caseNumber % 50 === 0) {
                    process.stdout.write(` [${caseNumber}]\n`);
                }
            }

            caseNumber = parseInt(line.replace('CASE ', ''));
            currentCase = { caseNumber };
            readingClinicalStory = false;
        } else if (line.startsWith('CATEGORY:')) {
            currentCase.category = line.replace('CATEGORY:', '').trim();
        } else if (line.startsWith('AGE:')) {
            currentCase.age = parseInt(line.replace('AGE:', '').trim());
        } else if (line.startsWith('GENDER:')) {
            currentCase.gender = line.replace('GENDER:', '').trim();
        } else if (line.startsWith('ENCOUNTER TYPE:')) {
            currentCase.encounterType = line.replace('ENCOUNTER TYPE:', '').trim();
        } else if (line.startsWith('CLINICAL STORY:')) {
            readingClinicalStory = true;
            const storyOnSameLine = line.replace('CLINICAL STORY:', '').trim();
            if (storyOnSameLine) {
                currentCase.clinicalStory = storyOnSameLine;
                readingClinicalStory = false;
            }
        } else if (readingClinicalStory && line && !line.startsWith('---')) {
            currentCase.clinicalStory = line;
            readingClinicalStory = false;
        }
    }

    // Process last case
    if (currentCase.clinicalStory) {
        const structuredInput = parseClinicalStory(
            currentCase.clinicalStory,
            currentCase.age,
            currentCase.gender,
            currentCase.encounterType,
            currentCase.category
        );

        try {
            const { context } = parseInput(structuredInput);
            const result = runStructuredRules(context);

            const codes: string[] = [];
            if (result.primary) codes.push(result.primary.code);
            codes.push(...result.secondary.map(c => c.code));

            // MERGE: Add locally generated codes for missing categories
            const localCodes = generateCategorySpecificCodes(structuredInput, currentCase.category);
            localCodes.forEach(c => {
                if (!codes.includes(c)) codes.push(c);
            });

            processedCases.push({
                caseNumber,
                category: currentCase.category,
                age: currentCase.age,
                gender: currentCase.gender,
                encounterType: currentCase.encounterType,
                clinicalStory: currentCase.clinicalStory,
                codes
            });
            process.stdout.write(codes.length > 0 ? '✓' : 'X');

        } catch (error) {
            processedCases.push({
                caseNumber,
                category: currentCase.category,
                age: currentCase.age,
                gender: currentCase.gender,
                encounterType: currentCase.encounterType,
                clinicalStory: currentCase.clinicalStory,
                codes: []
            });
            process.stdout.write('E');
        }
    }

    console.log('\n\n================================================================================');
    console.log('RESULTS');
    console.log('================================================================================');

    const withCodes = processedCases.filter(c => c.codes.length > 0);
    const noCodes = processedCases.filter(c => c.codes.length === 0);

    console.log(`Total Cases: ${processedCases.length}`);
    console.log(`With Codes: ${withCodes.length} (${(withCodes.length / processedCases.length * 100).toFixed(1)}%)`);
    console.log(`No Codes: ${noCodes.length} (${(noCodes.length / processedCases.length * 100).toFixed(1)}%)`);

    // Group analysis
    const categoryStats: Record<string, { total: number, withCodes: number }> = {};
    processedCases.forEach(c => {
        if (!categoryStats[c.category]) categoryStats[c.category] = { total: 0, withCodes: 0 };
        categoryStats[c.category].total++;
        if (c.codes.length > 0) categoryStats[c.category].withCodes++;
    });

    console.log('\nCategory Breakdown:');
    Object.keys(categoryStats).forEach(cat => {
        const stats = categoryStats[cat];
        console.log(`${cat}: ${stats.withCodes}/${stats.total} (${(stats.withCodes / stats.total * 100).toFixed(1)}%)`);
    });

    console.log('');

    // Generate output file with only cases that have answers
    let output = 'HOSPITAL TEST CASES WITH ICD-10-CM ANSWERS\n';
    output += '================================================================================\n\n';

    withCodes.forEach(c => {
        output += `CASE ${c.caseNumber}\n`;
        output += `Clinical Story: ${c.clinicalStory}\n`;
        output += `ICD-10-CM Codes: ${c.codes.join(', ')}\n\n`;
    });

    output += '================================================================================\n';
    output += `Total Cases with Answers: ${withCodes.length}\n`;
    output += `Generated: ${new Date().toISOString().split('T')[0]}\n`;
    output += '================================================================================\n';

    // Save to workspace
    fs.writeFileSync('/Users/khalidaitelmaati/Desktop/icd-ai-saas/icd-ai-saas/b_with_answers.txt', output);

    console.log(`\n✅ Output saved to: b_with_answers.txt`);
    console.log(`   Cases with answers: ${withCodes.length}`);
}

processCases();
