
import { parseInput } from './lib/structured/parser';
import { runStructuredRules } from './lib/structured/engine';
import { sepsisCases } from './test_sepsis_40_cases';

async function showCase1() {
    const case1 = sepsisCases.find(c => c.num === 1);
    if (!case1) {
        console.log('Case 1 not found');
        return;
    }

    console.log('\n============== CASE 1 ==============');
    console.log('NARRATIVE INPUT:');
    console.log(`"${case1.text}"`);
    console.log('\n------------------------------------');

    // Run the system
    const parseResult = parseInput(case1.text);
    const output = runStructuredRules(parseResult.context);

    console.log('\nSYSTEM OUTPUT:');
    console.log(`Primary Diagnosis:   ${output.primary?.code} (${output.primary?.label})`);
    console.log(`Secondary Diagnoses: ${output.secondary.map(c => c.code).join(', ')}`);

    console.log('\n------------------------------------');
    console.log('EXPECTED (GROUND TRUTH):');
    console.log(`Primary:   ${case1.expectedPrimary}`);
    console.log(`Secondary: ${case1.expectedSecondary.join(', ')}`);
    console.log('====================================\n');
}

showCase1();
