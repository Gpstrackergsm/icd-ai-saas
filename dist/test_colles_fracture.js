"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const rulesEngine_1 = require("./lib/rulesEngine");
const text = 'acute fracture of the left wrist (distal radius) with documented severe, acute post-traumatic pain from a fall';
const result = (0, rulesEngine_1.runRulesEngine)(text);
console.log('Input:', text);
console.log('\nSequence:');
result.sequence.forEach((code, idx) => {
    console.log(`${idx + 1}. ${code.code} - ${code.label}`);
});
console.log('\nWarnings:', result.warnings);
console.log('\n✅ Expected:');
console.log('1. S52.532A - Colles\' fracture of left radius');
console.log('2. G89.11 - Acute post-traumatic pain');
console.log('3. W19.XXXA - Unspecified fall (external cause)');
