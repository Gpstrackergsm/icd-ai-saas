import * as fs from 'fs';

const inputFile = fs.readFileSync(process.env.HOME + '/Desktop/icd_results_2025-12-05.txt', 'utf-8');
const lines = inputFile.split('\n');

let output = '';
let currentCase: any = {};
let inCase = false;

for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (line.startsWith('CASE ')) {
        if (inCase && currentCase.id) {
            output += processCase(currentCase);
        }
        currentCase = {
            id: line.replace('CASE ', '').replace(':', '').trim(),
            lines: [],
            codes: []
        };
        inCase = true;
    } else if (line.startsWith('ICD_CODES:')) {
        // Skip original codes
    } else if (inCase && line) {
        currentCase.lines.push(line);
    }
}

if (inCase && currentCase.id) {
    output += processCase(currentCase);
}

function processCase(caseData: any): string {
    const input = caseData.lines.join('\n');
    const lower = input.toLowerCase();
    let codes: string[] = [];

    // Traumatic wounds - FIX ALL S90.9xXA to S91.xxx
    if (lower.includes('type: traumatic')) {
        const location = lower.match(/location:\s*([^\n]+)/)?.[1] || '';
        const depth = lower.match(/stage\/depth:\s*([^\n]+)/)?.[1] || '';

        if (location.includes('heel')) {
            codes.push('S91.359A'); // Open wound of heel
        } else if (location.includes('right foot')) {
            codes.push('S91.301A'); // Open wound of right foot
        } else if (location.includes('left foot')) {
            codes.push('S91.302A'); // Open wound of left foot
        } else if (location.includes('ankle')) {
            codes.push('S91.009A'); // Open wound of ankle
        } else {
            codes.push('S91.309A'); // Open wound of unspecified foot
        }
    }

    // Pressure ulcers
    else if (lower.includes('type: pressure')) {
        const location = lower.match(/location:\s*([^\n]+)/)?.[1] || '';
        const stage = lower.match(/stage\/depth:\s*([^\n]+)/)?.[1] || '';

        if (location.includes('sacral')) {
            if (stage.includes('4')) codes.push('L89.154');
            else if (stage.includes('3')) codes.push('L89.153');
            else if (stage.includes('2')) codes.push('L89.152');
            else if (stage.includes('1')) codes.push('L89.151');
        } else if (location.includes('heel')) {
            if (stage.includes('4')) codes.push('L89.624');
            else if (stage.includes('3')) codes.push('L89.623');
            else if (stage.includes('2')) codes.push('L89.622');
            else if (stage.includes('1')) codes.push('L89.621');
        } else if (location.includes('right foot')) {
            if (stage.includes('4')) codes.push('L89.514');
            else if (stage.includes('3')) codes.push('L89.513');
            else if (stage.includes('2')) codes.push('L89.512');
            else if (stage.includes('1')) codes.push('L89.511');
        } else if (location.includes('left foot')) {
            if (stage.includes('4')) codes.push('L89.524');
            else if (stage.includes('3')) codes.push('L89.523');
            else if (stage.includes('2')) codes.push('L89.522');
            else if (stage.includes('1')) codes.push('L89.521');
        }
    }

    // HTN + HF + CKD
    if (lower.includes('hypertension: yes') && lower.includes('heart failure:') && lower.includes('ckd present: yes')) {
        const ckdStage = lower.match(/ckd stage:\s*([^\n]+)/)?.[1] || '';
        const hfType = lower.match(/heart failure:\s*([^\n]+)/)?.[1] || '';
        const hfAcuity = lower.match(/heart failure acuity:\s*([^\n]+)/)?.[1] || '';

        if (ckdStage.includes('esrd') || ckdStage.includes('5')) {
            codes.push('I13.2');
        } else {
            codes.push('I13.0');
        }

        // Add HF specificity
        if (hfType.includes('systolic')) {
            if (hfAcuity.includes('acute on chronic')) codes.push('I50.23');
            else if (hfAcuity.includes('acute')) codes.push('I50.21');
            else if (hfAcuity.includes('chronic')) codes.push('I50.22');
        } else if (hfType.includes('diastolic')) {
            if (hfAcuity.includes('acute on chronic')) codes.push('I50.33');
            else if (hfAcuity.includes('acute')) codes.push('I50.31');
            else if (hfAcuity.includes('chronic')) codes.push('I50.32');
        } else if (hfType.includes('combined')) {
            if (hfAcuity.includes('acute on chronic')) codes.push('I50.43');
            else if (hfAcuity.includes('acute')) codes.push('I50.41');
            else if (hfAcuity.includes('chronic')) codes.push('I50.42');
        }

        // Add CKD code
        if (ckdStage.includes('esrd')) codes.push('N18.6');
        else if (ckdStage.includes('5')) codes.push('N18.5');
        else if (ckdStage.includes('4')) codes.push('N18.4');
        else if (ckdStage.includes('3')) codes.push('N18.30');
        else if (ckdStage.includes('2')) codes.push('N18.2');
        else if (ckdStage.includes('1')) codes.push('N18.1');
    }

    // Sepsis
    if (lower.includes('sepsis: yes')) {
        const organism = lower.match(/organism:\s*([^\n]+)/)?.[1] || '';
        const site = lower.match(/infection site:\s*([^\n]+)/)?.[1] || '';
        const shock = lower.includes('septic shock: yes');

        if (organism.includes('viral')) codes.push('A41.89');
        else if (organism.includes('mrsa')) codes.push('A41.02');
        else if (organism.includes('e. coli')) codes.push('A41.51');
        else if (organism.includes('pseudomonas')) codes.push('A41.52');
        else codes.push('A41.9');

        if (shock) codes.push('R65.21');

        if (site.includes('lung')) {
            if (organism.includes('viral')) codes.push('J12.9');
            else if (organism.includes('mrsa')) codes.push('J15.212');
            else if (organism.includes('e. coli')) codes.push('J15.5');
            else if (organism.includes('pseudomonas')) codes.push('J15.1');
        } else if (site.includes('urinary')) {
            codes.push('N39.0');
        } else if (site.includes('skin')) {
            codes.push('L03.317');
        }
    }

    // COPD
    if (lower.includes('copd:')) {
        const copdType = lower.match(/copd:\s*([^\n]+)/)?.[1] || '';
        const hasPneumonia = lower.includes('pneumonia: yes');
        const respFailure = lower.match(/respiratory failure:\s*([^\n]+)/)?.[1] || '';

        if (respFailure.includes('acute')) codes.push('J96.00');
        else if (respFailure.includes('chronic')) codes.push('J96.10');

        if (copdType.includes('both') || (copdType.includes('exacerbation') && hasPneumonia)) {
            codes.push('J44.0');
            codes.push('J44.1');
        } else if (copdType.includes('exacerbation')) {
            codes.push('J44.1');
        } else if (copdType.includes('infection')) {
            codes.push('J44.0');
        }

        if (hasPneumonia) {
            const organism = lower.match(/pneumonia organism:\s*([^\n]+)/)?.[1] || '';
            if (organism.includes('mrsa')) codes.push('J15.212');
            else if (organism.includes('pseudomonas')) codes.push('J15.1');
            else if (organism.includes('e. coli')) codes.push('J15.5');
            else if (organism.includes('viral')) codes.push('J12.9');
            else codes.push('J18.9');
        }
    }

    // Diabetes with foot ulcer
    if (lower.includes('diabetes type:') && lower.includes('foot ulcer')) {
        const dmType = lower.includes('type 1') ? 'E10' : 'E11';
        const site = lower.match(/ulcer site:\s*([^\n]+)/)?.[1] || '';
        const severity = lower.match(/ulcer severity:\s*([^\n]+)/)?.[1] || '';

        codes.push(`${dmType}.621`);

        if (site.includes('right foot')) {
            if (severity.includes('bone')) codes.push('L97.514');
            else if (severity.includes('muscle')) codes.push('L97.515');
            else codes.push('L97.511');
        } else if (site.includes('left foot')) {
            if (severity.includes('bone')) codes.push('L97.524');
            else if (severity.includes('muscle')) codes.push('L97.525');
            else codes.push('L97.521');
        } else if (site.includes('right ankle')) {
            if (severity.includes('muscle')) codes.push('L97.515');
            else codes.push('L97.511');
        } else if (site.includes('left ankle')) {
            if (severity.includes('bone')) codes.push('L97.524');
            else if (severity.includes('muscle')) codes.push('L97.525');
            else if (severity.includes('skin')) codes.push('L97.521');
        } else if (site.includes('heel')) {
            codes.push('L97.595');
        }
    }

    let result = `CASE ${caseData.id}\n`;
    caseData.lines.forEach((line: string) => result += `  ${line}\n`);
    result += `\nICD_CODES:\n  ${codes.length > 0 ? codes.join(', ') : 'NO CODABLE DIAGNOSIS'}\n\n`;

    return result;
}

fs.writeFileSync(process.env.HOME + '/Desktop/corrected_structured_200_cases.txt', output.trim());
console.log('Generated: ~/Desktop/corrected_structured_200_cases.txt');
