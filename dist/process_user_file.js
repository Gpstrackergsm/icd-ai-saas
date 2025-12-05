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
// Parse the user's actual results file
function parseUserFile(content) {
    const cases = [];
    const lines = content.split('\n');
    let currentCase = null;
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.startsWith('CASE ')) {
            if (currentCase && currentCase.inputLines) {
                currentCase.input = currentCase.inputLines.join('\n');
                delete currentCase.inputLines;
                cases.push(currentCase);
            }
            currentCase = {
                caseId: parseInt(line.replace('CASE ', '').replace(':', '').trim()),
                inputLines: []
            };
        }
        else if (currentCase && line.trim() && !line.startsWith('ICD_CODES:')) {
            currentCase.inputLines.push(line.trim());
        }
    }
    if (currentCase && currentCase.inputLines) {
        currentCase.input = currentCase.inputLines.join('\n');
        delete currentCase.inputLines;
        cases.push(currentCase);
    }
    return cases.filter(c => c.input);
}
const userFile = fs.readFileSync(process.env.HOME + '/Desktop/icd_results_2025-12-05.txt', 'utf-8');
const cases = parseUserFile(userFile);
console.log('Processing user file with medical coding fixes...');
console.log(`Total cases: ${cases.length}\n`);
let output = '';
for (const testCase of cases) {
    try {
        const { context } = (0, parser_1.parseInput)(testCase.input);
        const engineResult = (0, engine_1.runStructuredRules)(context);
        const validated = (0, validator_post_1.validateCodeSet)(engineResult.primary, engineResult.secondary, context);
        const enhanced = (0, validator_enhanced_1.validateFinalOutput)(validated.codes, testCase.input);
        const finalResult = (0, validator_advanced_1.applyComprehensiveMedicalRules)(enhanced.codes, testCase.input);
        const codes = finalResult.codes.map(c => c.code);
        output += `CASE ${testCase.caseId}:\n`;
        testCase.input.split('\n').forEach(line => output += `  ${line}\n`);
        output += '\nICD_CODES:\n';
        if (codes.length === 0) {
            output += '  NO CODABLE DIAGNOSIS\n';
        }
        else {
            output += `  ${codes.join(', ')}\n`;
        }
        output += '\n';
    }
    catch (error) {
        console.log(`ERROR processing CASE ${testCase.caseId}: ${error.message}`);
        output += `CASE ${testCase.caseId}:\n`;
        testCase.input.split('\n').forEach(line => output += `  ${line}\n`);
        output += '\nICD_CODES:\n  ERROR\n\n';
    }
}
fs.writeFileSync(process.env.HOME + '/Desktop/icd_results_FIXED.txt', output.trim());
console.log('\nFixed results written to: ~/Desktop/icd_results_FIXED.txt');
