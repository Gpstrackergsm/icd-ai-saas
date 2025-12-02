
import { initIcdData } from './lib/icd-core/dataSource';
import { encodeDiagnosisText } from './lib/icd-core/encoder';

async function run() {
    console.log('Initializing ICD Data Source...');
    await initIcdData();

    const scenarios = [
        "Type 1 DM with severe hypoglycemia, in coma",
        "Type 2 DM with chronic non-healing ulcer on the left ankle"
    ];

    for (const text of scenarios) {
        console.log(`\n--- Testing: "${text}" ---`);
        const result = encodeDiagnosisText(text);

        if (result.codes && result.codes.length > 0) {
            console.log('Primary Code:', result.codes[0].code, '-', result.codes[0].title);
            if (result.codes.length > 1) {
                console.log('Secondary Codes:');
                result.codes.slice(1).forEach((c: any) => console.log(`  ${c.code} - ${c.title}`));
            }
        } else {
            console.log('No codes found.');
        }
    }
}

run().catch(console.error);
