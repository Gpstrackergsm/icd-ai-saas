"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const dataSource_1 = require("./lib/icd-core/dataSource");
const encoder_1 = require("./lib/icd-core/encoder");
async function run() {
    console.log('Initializing ICD Data Source...');
    await (0, dataSource_1.initIcdData)();
    const scenarios = [
        "Type 1 DM with severe hypoglycemia, in coma",
        "Type 2 DM with chronic non-healing ulcer on the left ankle"
    ];
    for (const text of scenarios) {
        console.log(`\n--- Testing: "${text}" ---`);
        const result = (0, encoder_1.encodeDiagnosisText)(text);
        if (result.codes && result.codes.length > 0) {
            console.log('Primary Code:', result.codes[0].code, '-', result.codes[0].title);
            if (result.codes.length > 1) {
                console.log('Secondary Codes:');
                result.codes.slice(1).forEach((c) => console.log(`  ${c.code} - ${c.title}`));
            }
        }
        else {
            console.log('No codes found.');
        }
    }
}
run().catch(console.error);
