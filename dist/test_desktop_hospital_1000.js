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
const fs = __importStar(require("fs"));
const parser_1 = require("./lib/structured/parser");
const engine_1 = require("./lib/structured/engine");
function parseCasesFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf-8');
    const cases = [];
    const caseBlocks = content.split(/^CASE \d+$/m).filter(block => block.trim());
    caseBlocks.forEach((block, index) => {
        const trimmed = block.trim();
        if (trimmed) {
            cases.push({
                id: index + 1,
                input: trimmed
            });
        }
    });
    return cases;
}
function processTestCase(testCase) {
    try {
        const { context } = (0, parser_1.parseInput)(testCase.input);
        const result = (0, engine_1.runStructuredRules)(context);
        const allCodes = [];
        if (result.primary) {
            allCodes.push(result.primary.code);
        }
        allCodes.push(...result.secondary.map(c => c.code));
        return {
            success: allCodes.length > 0,
            codes: allCodes
        };
    }
    catch (error) {
        return {
            success: false,
            codes: [],
            error: error instanceof Error ? error.message : String(error)
        };
    }
}
async function main() {
    console.log('='.repeat(80));
    console.log('DESKTOP HOSPITAL 1000-CASE VALIDATION TEST');
    console.log('='.repeat(80));
    console.log();
    const filePath = '/Users/khalidaitelmaati/Desktop/hospital_1000_test_cases.txt';
    console.log(`Loading test cases from: ${filePath}`);
    const cases = parseCasesFile(filePath);
    console.log(`Loaded ${cases.length} test cases\n`);
    let successCount = 0;
    let failureCount = 0;
    let emptyCount = 0;
    const failures = [];
    console.log('Processing cases...\n');
    for (const testCase of cases) {
        const result = processTestCase(testCase);
        if (result.error) {
            failureCount++;
            failures.push({ id: testCase.id, error: result.error, codes: [] });
            process.stdout.write('E');
        }
        else if (result.codes.length === 0) {
            emptyCount++;
            failures.push({ id: testCase.id, codes: [] });
            process.stdout.write('0');
        }
        else {
            successCount++;
            process.stdout.write('✓');
        }
        if (testCase.id % 50 === 0) {
            process.stdout.write(`  [${testCase.id}/${cases.length}]\n`);
        }
    }
    console.log('\n');
    console.log('='.repeat(80));
    console.log('RESULTS');
    console.log('='.repeat(80));
    console.log(`Total Cases:             ${cases.length}`);
    console.log(`Successful (with codes): ${successCount} (${(successCount / cases.length * 100).toFixed(1)}%)`);
    console.log(`Empty (no codes):        ${emptyCount} (${(emptyCount / cases.length * 100).toFixed(1)}%)`);
    console.log(`Errors:                  ${failureCount} (${(failureCount / cases.length * 100).toFixed(1)}%)`);
    console.log('='.repeat(80));
    console.log();
    if (failures.length > 0 && failures.length <= 50) {
        console.log('Failed Cases:');
        failures.forEach(f => {
            console.log(`  CASE ${f.id}: ${f.error || 'No codes generated'}`);
        });
        console.log('');
    }
    else if (failures.length > 50) {
        console.log(`${failures.length} cases failed. Showing first 30:`);
        failures.slice(0, 30).forEach(f => {
            console.log(`  CASE ${f.id}: ${f.error || 'No codes generated'}`);
        });
        console.log('');
    }
    // Sample successful cases
    console.log('Sample Results (first 10 successful cases):');
    let sampleCount = 0;
    for (let i = 0; i < cases.length && sampleCount < 10; i++) {
        const result = processTestCase(cases[i]);
        if (result.success && result.codes.length > 0) {
            console.log(`\nCASE ${cases[i].id}:`);
            console.log(`  Codes: ${result.codes.join(', ')}`);
            sampleCount++;
        }
    }
    // Save summary
    const summary = `DESKTOP HOSPITAL 1000-CASE VALIDATION SUMMARY
Generated: ${new Date().toISOString()}

Total Cases: ${cases.length}
Successful: ${successCount} (${(successCount / cases.length * 100).toFixed(1)}%)
Empty: ${emptyCount} (${(emptyCount / cases.length * 100).toFixed(1)}%)
Errors: ${failureCount} (${(failureCount / cases.length * 100).toFixed(1)}%)

Failed Cases: ${failures.length}
${failures.length > 0 ? '\nFirst 30 failures:\n' + failures.slice(0, 30).map(f => `CASE ${f.id}: ${f.error || 'No codes'}`).join('\n') : ''}
`;
    fs.writeFileSync('desktop_hospital_1000_validation_summary.txt', summary);
    console.log('\n\nSummary saved to: desktop_hospital_1000_validation_summary.txt');
}
main().catch(console.error);
