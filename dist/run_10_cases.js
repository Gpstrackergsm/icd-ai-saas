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
const fileContent = fs.readFileSync('./test_10_cases.txt', 'utf-8');
const cases = parseCases(fileContent);
console.log('ICD-10-CM ENGINE OUTPUT');
console.log('='.repeat(80));
console.log('');
cases.forEach(testCase => {
    console.log(`CASE ${testCase.id.toString().padStart(2, '0')}`);
    console.log('-'.repeat(80));
    const inputLines = testCase.input.split('\n');
    inputLines.forEach(line => console.log(line));
    console.log('');
    try {
        const { context } = (0, parser_1.parseInput)(testCase.input);
        const engineResult = (0, engine_1.runStructuredRules)(context);
        const validated = (0, validator_post_1.validateCodeSet)(engineResult.primary, engineResult.secondary, context);
        const codes = validated.codes;
        if (codes.length === 0) {
            console.log('OUTPUT: No codes generated');
        }
        else {
            console.log('OUTPUT:');
            codes.forEach((code, idx) => {
                const status = idx === 0 ? 'PRIMARY  ' : 'SECONDARY';
                console.log(`  ${status}: ${code.code} - ${code.label}`);
            });
        }
    }
    catch (error) {
        console.log('OUTPUT: Error processing case');
        console.log(`  ${error.message}`);
    }
    console.log('');
});
console.log('='.repeat(80));
console.log('All cases processed');
