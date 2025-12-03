"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const rulesEngine_1 = require("./lib/rulesEngine");
const text = 'Patient diagnosed with acute pyelonephritis (kidney infection) due to Escherichia coli (E. coli)';
const result = (0, rulesEngine_1.runRulesEngine)(text);
console.log('Input:', text);
console.log('\nSequence:');
result.sequence.forEach((code, idx) => {
    console.log(`${idx + 1}. ${code.code} - ${code.label}`);
});
console.log('\nWarnings:', result.warnings);
console.log('\n✅ Expected:');
console.log('1. N10 - Acute pyelonephritis');
console.log('2. B96.20 - Unspecified Escherichia coli [E. coli] as the cause of diseases classified elsewhere');
