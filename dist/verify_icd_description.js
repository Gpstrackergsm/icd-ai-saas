"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const dataSource_1 = require("./lib/icd-core/dataSource");
async function verify() {
    await (0, dataSource_1.initIcdData)();
    const code = (0, dataSource_1.getCode)('E11.42');
    if (!code) {
        console.error('FAIL: E11.42 not found');
        process.exit(1);
    }
    console.log('Code:', code.code);
    console.log('Description:', code.longDescription);
    console.log('Synonyms:', code.synonyms);
    if (code.longDescription === "Type 2 diabetes mellitus with diabetic polyneuropathy") {
        console.log('PASS: Description matches expected.');
    }
    else {
        console.error('FAIL: Description incorrect. Got:', code.longDescription);
    }
    if (code.synonyms && code.synonyms.includes("Type 2 diabetes mellitus with diabetic neuralgia")) {
        console.log('PASS: Synonym found.');
    }
    else {
        console.error('FAIL: Synonym missing or incorrect. Got:', code.synonyms);
    }
    // Check E11.40 for regression (should not have duplication split or AHA ref issues)
    const code40 = (0, dataSource_1.getCode)('E11.40');
    console.log('Code 40:', code40 === null || code40 === void 0 ? void 0 : code40.longDescription);
    if (code40 === null || code40 === void 0 ? void 0 : code40.longDescription.includes('AHA:')) {
        console.error('FAIL: E11.40 still has AHA ref');
    }
    else {
        console.log('PASS: E11.40 clean.');
    }
}
verify().catch(e => console.error(e));
