import { initIcdData } from './lib/icd-core/dataSource';
import { encodeDiagnosisText } from './lib/icd-core/encoder';

async function run() {
    console.log('Initializing ICD Data Source...');
    await initIcdData();

    const text = "Atherosclerosis of native coronary artery with unstable angina pectoris, and a history of smoking (nicotine dependence)";

    console.log(`\nTesting: "${text}"\n`);
    const result = encodeDiagnosisText(text);

    console.log('Result:', JSON.stringify(result, null, 2));

    if (result.codes && result.codes.length > 0) {
        console.log('\nCodes:');
        result.codes.forEach((c: any, idx: number) => {
            const marker = c.isPrimary ? '[PRIMARY]' : '[SECONDARY]';
            console.log(`  ${idx + 1}. ${marker} ${c.code} - ${c.title}`);
            if (c.rationale) console.log(`     Rationale: ${c.rationale}`);
        });
    } else {
        console.log('\n❌ No codes found.');
    }

    if (result.warnings && result.warnings.length > 0) {
        console.log('\nWarnings:');
        result.warnings.forEach((w: string) => console.log(`  ⚠️  ${w}`));
    }
}

run().catch(console.error);
