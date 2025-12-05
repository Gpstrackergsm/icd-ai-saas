"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const parser_1 = require("./lib/structured/parser");
const engine_1 = require("./lib/structured/engine");
const validator_post_1 = require("./lib/structured/validator-post");
const validator_enhanced_1 = require("./lib/structured/validator-enhanced");
const validator_advanced_1 = require("./lib/structured/validator-advanced");
const fs = __importStar(require("fs"));
function parseCases(fileContent) {
    const cases = [];
    const lines = fileContent.split('\n');
    let currentCase = null;
    for (const line of lines) {
        if (line.trim().startsWith('CASE ')) {
            if (currentCase) {
                cases.push({ id: currentCase.id, input: currentCase.lines.join('\n') });
            }
            const caseNum = parseInt(line.replace('CASE ', '').trim());
            currentCase = { id: caseNum, lines: [] };
        }
        else if (currentCase && line.trim()) {
            currentCase.lines.push(line.trim());
        }
    }
    if (currentCase) {
        cases.push({ id: currentCase.id, input: currentCase.lines.join('\n') });
    }
    return cases;
}
const fileContent = fs.readFileSync('./data/structured_cases_v3.txt', 'utf-8');
const cases = parseCases(fileContent);
let output = '';
let noCasesBefore = 0;
let noCasesAfter = 0;
for (const testCase of cases) {
    output += `CASE ${testCase.id}:\n`;
    output += '─'.repeat(80) + '\n';
    output += 'CASE DATA:\n';
    const inputLines = testCase.input.split('\n');
    inputLines.forEach(line => {
        output += `  ${line}\n`;
    });
    output += '\n';
    try {
        const { context } = (0, parser_1.parseInput)(testCase.input);
        const engineResult = (0, engine_1.runStructuredRules)(context);
        const validated = (0, validator_post_1.validateCodeSet)(engineResult.primary, engineResult.secondary, context);
        const enhanced = (0, validator_enhanced_1.validateFinalOutput)(validated.codes, testCase.input);
        // Count NO CODES before advanced rules
        if (enhanced.codes.length === 0) {
            noCasesBefore++;
        }
        // Apply advanced medical coding rules
        const finalCodes = (0, validator_advanced_1.applyAdvancedCodingRules)(enhanced.codes, testCase.input);
        // Count NO CODES after advanced rules
        if (finalCodes.length === 0) {
            noCasesAfter++;
        }
        output += 'ICD_CODES:\n';
        if (finalCodes.length === 0) {
            output += '  NO CODABLE DIAGNOSIS\n';
        }
        else {
            finalCodes.forEach((code, idx) => {
                const status = idx === 0 ? '[PRIMARY]  ' : '[SECONDARY]';
                output += `  ${status} ${code.code} - ${code.label}\n`;
            });
        }
    }
    catch (error) {
        output += 'ICD_CODES:\n';
        output += '  ERROR PROCESSING CASE\n';
        noCasesAfter++;
    }
    output += '\n';
}
fs.writeFileSync(process.env.HOME + '/Desktop/corrected_results_v3.txt', output.trim());
console.log('════════════════════════════════════════════════════════════════');
console.log('ADVANCED MEDICAL CODING VALIDATOR - EXECUTION COMPLETE');
console.log('════════════════════════════════════════════════════════════════');
console.log('');
console.log(`Total Cases Processed: ${cases.length}`);
console.log(`Cases with NO CODES (Before): ${noCasesBefore}`);
console.log(`Cases with NO CODES (After):  ${noCasesAfter}`);
console.log(`Cases Fixed: ${noCasesBefore - noCasesAfter}`);
console.log(`Coverage Rate: ${((cases.length - noCasesAfter) / cases.length * 100).toFixed(2)}%`);
console.log('');
console.log('Output saved to: ~/Desktop/corrected_results_v3.txt');
console.log('════════════════════════════════════════════════════════════════');
