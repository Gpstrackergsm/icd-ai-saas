"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const dataSource_1 = require("./lib/icd-core/dataSource");
const encoder_1 = require("./lib/icd-core/encoder");
async function run() {
    console.log('Initializing ICD Data Source...');
    await (0, dataSource_1.initIcdData)();
    const scenarios = [
        // Cardiology tests
        "Hypertension with chronic systolic heart failure and CKD stage 3",
        "Acute anterior wall STEMI",
        "Chronic diastolic heart failure",
        // Respiratory tests
        "COPD with acute exacerbation and klebsiella pneumonia",
        "Severe persistent asthma with status asthmaticus",
        // Neoplasm tests
        "Liver metastasis from colon cancer",
        "Left breast cancer",
        // Diabetes (already working)
        "Type 1 DM with severe hypoglycemia, in coma",
        "Type 2 DM with chronic non-healing ulcer on the left ankle"
    ];
    for (const text of scenarios) {
        console.log(`\n${'='.repeat(80)}`);
        console.log(`Testing: "${text}"`);
        console.log('='.repeat(80));
        const result = (0, encoder_1.encodeDiagnosisText)(text);
        if (result.codes && result.codes.length > 0) {
            console.log('\nCodes:');
            result.codes.forEach((c, idx) => {
                const marker = c.isPrimary ? '[PRIMARY]' : '[SECONDARY]';
                console.log(`  ${idx + 1}. ${marker} ${c.code} - ${c.title}`);
                if (c.rationale)
                    console.log(`     Rationale: ${c.rationale}`);
            });
        }
        else {
            console.log('No codes found.');
        }
        if (result.warnings && result.warnings.length > 0) {
            console.log('\nWarnings:');
            result.warnings.forEach((w) => console.log(`  ⚠️  ${w}`));
        }
        if (result.errors && result.errors.length > 0) {
            console.log('\nErrors:');
            result.errors.forEach((e) => console.log(`  ❌ ${e}`));
        }
    }
}
run().catch(console.error);
