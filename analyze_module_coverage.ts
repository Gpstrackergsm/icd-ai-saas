import * as fs from 'fs';

const csvPath = '/Users/khalidaitelmaati/Desktop/b.csv';
const content = fs.readFileSync(csvPath, 'utf-8');
const lines = content.trim().split('\n').slice(1); // Skip header

interface ModuleStats {
    name: string;
    total: number;
    pass: number;
    warning: number;
    hardStop: number;
    examples: string[];
}

const modules: Record<string, ModuleStats> = {
    Sepsis: { name: 'Sepsis', total: 0, pass: 0, warning: 0, hardStop: 0, examples: [] },
    Respiratory: { name: 'Respiratory', total: 0, pass: 0, warning: 0, hardStop: 0, examples: [] },
    Renal: { name: 'Renal (CKD/AKI)', total: 0, pass: 0, warning: 0, hardStop: 0, examples: [] },
    Cardiac: { name: 'Cardiac', total: 0, pass: 0, warning: 0, hardStop: 0, examples: [] },
    Diabetes: { name: 'Diabetes', total: 0, pass: 0, warning: 0, hardStop: 0, examples: [] },
    Neuro: { name: 'Neurological', total: 0, pass: 0, warning: 0, hardStop: 0, examples: [] },
    Injury: { name: 'Injury/Trauma', total: 0, pass: 0, warning: 0, hardStop: 0, examples: [] },
    Infection: { name: 'Infection (non-sepsis)', total: 0, pass: 0, warning: 0, hardStop: 0, examples: [] },
    OB: { name: 'Obstetric', total: 0, pass: 0, warning: 0, hardStop: 0, examples: [] },
    Other: { name: 'Other Conditions', total: 0, pass: 0, warning: 0, hardStop: 0, examples: [] }
};

const categorizeCase = (input: string): string[] => {
    const lower = input.toLowerCase();
    const categories: string[] = [];

    // Sepsis
    if (lower.includes('sepsis') || lower.includes('septic shock')) {
        categories.push('Sepsis');
    }

    // Respiratory
    if (lower.match(/respiratory|pneumonia|ards|copd|asthma|emphysema|pleural|hypoxia|hypoxic/)) {
        categories.push('Respiratory');
    }

    // Renal
    if (lower.match(/kidney|renal|aki|ckd|esrd|dialysis/)) {
        categories.push('Renal');
    }

    // Cardiac
    if (lower.match(/heart|cardiac|chf|myocardial|arrhythmia|atrial|ventricular|hypertension/)) {
        categories.push('Cardiac');
    }

    // Diabetes
    if (lower.match(/diabetes|diabetic|ketoacidosis|hyperglycemia|hypoglycemia/)) {
        categories.push('Diabetes');
    }

    // Neuro
    if (lower.match(/stroke|seizure|epilepsy|dementia|encephalopathy|parkinsons|alzheimer|tia|cerebral|subdural|concussion/)) {
        categories.push('Neuro');
    }

    // Injury
    if (lower.match(/fracture|fall|trauma|injury|laceration|burn|wound|contusion|crush/)) {
        categories.push('Injury');
    }

    // Infection (non-sepsis)
    if ((lower.match(/infection|pneumonia|uti|cellulitis|abscess|mrsa|e\. coli/) && !categories.includes('Sepsis'))) {
        categories.push('Infection');
    }

    // OB
    if (lower.match(/pregnancy|preeclampsia|eclampsia|gestational|delivery|postpartum|maternal/)) {
        categories.push('OB');
    }

    if (categories.length === 0) {
        categories.push('Other');
    }

    return categories;
};

for (const line of lines) {
    const parts = line.split(',');
    if (parts.length < 3) continue;

    const caseId = parts[0];
    const input = parts[1].replace(/^"|"$/g, ''); // Remove quotes
    const status = parts[2];

    const categories = categorizeCase(input);

    for (const category of categories) {
        const mod = modules[category];
        mod.total++;

        if (status === 'PASS') mod.pass++;
        else if (status === 'WARNING') mod.warning++;
        else if (status === 'HARD_STOP') mod.hardStop++;

        if (mod.examples.length < 3) {
            mod.examples.push(input.substring(0, 80));
        }
    }
}

// Sort by total
const sorted = Object.values(modules).sort((a, b) => b.total - a.total);

console.log('='.repeat(80));
console.log('MODULE COVERAGE ANALYSIS - 1000 CASES');
console.log('='.repeat(80));
console.log();

for (const mod of sorted) {
    if (mod.total === 0) continue;

    console.log(`📊 ${mod.name}`);
    console.log(`   Total Cases: ${mod.total}`);
    console.log(`   ✅ PASS: ${mod.pass} (${((mod.pass / mod.total) * 100).toFixed(1)}%)`);
    console.log(`   ⚠️  WARNING: ${mod.warning} (${((mod.warning / mod.total) * 100).toFixed(1)}%)`);
    console.log(`   🛑 HARD STOP: ${mod.hardStop} (${((mod.hardStop / mod.total) * 100).toFixed(1)}%)`);
    console.log(`   Examples:`);
    mod.examples.forEach(ex => console.log(`     - ${ex}${ex.length >= 80 ? '...' : ''}`));
    console.log();
}

console.log('='.repeat(80));
console.log('NOTE: Some cases may be counted in multiple modules (e.g., "Sepsis with pneumonia")');
console.log('='.repeat(80));
