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
const inputFile = fs.readFileSync(process.env.HOME + '/Desktop/structured_200_cases_v2.txt', 'utf-8');
const cases = inputFile.split(/\nCASE \d+\n/).filter(c => c.trim());
console.log(`Processing ${cases.length} cases from structured_200_cases_v2.txt...\n`);
let output = '';
let correctCount = 0;
let errorCount = 0;
for (let i = 0; i < cases.length; i++) {
    const caseInput = cases[i].trim();
    if (!caseInput)
        continue;
    try {
        const { context } = (0, parser_1.parseInput)(caseInput);
        const engineResult = (0, engine_1.runStructuredRules)(context);
        const validated = (0, validator_post_1.validateCodeSet)(engineResult.primary, engineResult.secondary, context);
        const enhanced = (0, validator_enhanced_1.validateFinalOutput)(validated.codes, caseInput);
        const finalResult = (0, validator_advanced_1.applyComprehensiveMedicalRules)(enhanced.codes, caseInput);
        const codes = finalResult.codes.map(c => c.code);
        output += `CASE ${i + 1}\n`;
        caseInput.split('\n').forEach(line => output += `${line}\n`);
        output += `\nICD_CODES:\n`;
        if (codes.length === 0) {
            output += '  NO CODABLE DIAGNOSIS\n';
        }
        else {
            output += `  ${codes.join(', ')}\n`;
        }
        output += '\n';
        correctCount++;
    }
    catch (error) {
        console.log(`ERROR processing CASE ${i + 1}: ${error.message}`);
        output += `CASE ${i + 1}\n`;
        caseInput.split('\n').forEach(line => output += `${line}\n`);
        output += `\nICD_CODES:\n  ERROR\n\n`;
        errorCount++;
    }
}
fs.writeFileSync(process.env.HOME + '/Desktop/structured_200_cases_v2_RESULTS.txt', output.trim());
console.log('\n================================================================================');
console.log('TEST RESULTS');
console.log('================================================================================');
console.log(`Total cases: ${cases.length}`);
console.log(`Processed successfully: ${correctCount}`);
console.log(`Errors: ${errorCount}`);
console.log(`Success rate: ${((correctCount / cases.length) * 100).toFixed(2)}%`);
console.log('\nOutput file: ~/Desktop/structured_200_cases_v2_RESULTS.txt');
console.log('================================================================================');
