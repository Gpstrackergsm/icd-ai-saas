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
            // Save previous case
            if (currentCase) {
                cases.push({
                    id: currentCase.id,
                    input: currentCase.lines.join('\n')
                });
            }
            // Start new case
            const caseNum = parseInt(line.replace('CASE ', '').trim());
            currentCase = { id: caseNum, lines: [] };
        }
        else if (currentCase && line.trim()) {
            currentCase.lines.push(line.trim());
        }
    }
    // Add last case
    if (currentCase) {
        cases.push({
            id: currentCase.id,
            input: currentCase.lines.join('\n')
        });
    }
    return cases;
}
function loadExpectedCodes() {
    // Load from original JSON if available
    try {
        const jsonData = JSON.parse(fs.readFileSync('./data/icd10_test_cases_1000.json', 'utf-8'));
        const expectedMap = new Map();
        jsonData.forEach((item) => {
            expectedMap.set(item.id, item.expected_codes || []);
        });
        return expectedMap;
    }
    catch (error) {
        console.log('Note: No expected codes file found. Running without comparison.');
        return new Map();
    }
}
function inferDomain(input) {
    const lower = input.toLowerCase();
    if (lower.includes('diabetes') || lower.includes('insulin'))
        return 'Diabetes';
    if (lower.includes('sepsis') || lower.includes('septic shock'))
        return 'Sepsis';
    if (lower.includes('copd') || lower.includes('asthma') || lower.includes('pneumonia') || lower.includes('respiratory'))
        return 'Respiratory';
    if (lower.includes('hypertension') || lower.includes('heart failure') || lower.includes('atrial'))
        return 'Cardiology';
    if (lower.includes('ckd') || lower.includes('kidney') || lower.includes('renal'))
        return 'Renal';
    if (lower.includes('cancer') || lower.includes('neoplasm') || lower.includes('chemotherapy'))
        return 'Oncology';
    if (lower.includes('labor') || lower.includes('gestation') || lower.includes('pregnancy'))
        return 'OB/GYN';
    if (lower.includes('cirrhosis') || lower.includes('ascites') || lower.includes('liver'))
        return 'Liver/GI';
    if (lower.includes('infection') && lower.includes('urinary'))
        return 'Infectious';
    if (lower.includes('depression') || lower.includes('anxiety'))
        return 'Psychiatry';
    if (lower.includes('burn') || lower.includes('ulcer') && !lower.includes('diabetes'))
        return 'Dermatology';
    if (lower.includes('alzheimer') || lower.includes('dementia') || lower.includes('stroke'))
        return 'Neurology';
    return 'Unknown';
}
async function runTests() {
    console.log('='.repeat(80));
    console.log('ICD-10-CM STRUCTURED ENGINE TEST - 1000 CASES');
    console.log('='.repeat(80));
    console.log('');
    // Load cases
    const fileContent = fs.readFileSync('./data/structured_cases.txt', 'utf-8');
    const cases = parseCases(fileContent);
    const expectedCodes = loadExpectedCodes();
    console.log(`✓ Loaded ${cases.length} structured test cases`);
    console.log(`✓ Loaded expected codes for ${expectedCodes.size} cases`);
    console.log('');
    console.log('Processing cases...');
    console.log('');
    const results = [];
    const domainStats = new Map();
    const errorPatterns = new Map();
    let processed = 0;
    for (const testCase of cases) {
        processed++;
        if (processed % 100 === 0) {
            console.log(`  Processed ${processed}/${cases.length} cases...`);
        }
        try {
            // Parse and run through engine
            const { context } = (0, parser_1.parseInput)(testCase.input);
            const engineResult = (0, engine_1.runStructuredRules)(context);
            const validated = (0, validator_post_1.validateCodeSet)(engineResult.primary, engineResult.secondary, context);
            const generatedCodes = validated.codes.map(c => c.code);
            // Get expected codes
            const expected = expectedCodes.get(testCase.id) || [];
            // Compare
            const status = JSON.stringify(generatedCodes.sort()) === JSON.stringify(expected.sort()) ? 'PASS' : 'FAIL';
            results.push({
                caseId: testCase.id,
                input: testCase.input,
                generated_codes: generatedCodes,
                expected_codes: expected,
                status
            });
            // Track domain stats
            const domain = inferDomain(testCase.input);
            if (!domainStats.has(domain)) {
                domainStats.set(domain, { passed: 0, failed: 0, total: 0, accuracy: 0 });
            }
            const stats = domainStats.get(domain);
            stats.total++;
            if (status === 'PASS')
                stats.passed++;
            else
                stats.failed++;
            // Track error patterns
            if (status === 'FAIL') {
                let errorType = 'Unknown';
                if (generatedCodes.length === 0)
                    errorType = 'No codes generated';
                else if (expected.length === 0)
                    errorType = 'No expected codes';
                else if (generatedCodes.length < expected.length)
                    errorType = 'Missing codes';
                else if (generatedCodes.length > expected.length)
                    errorType = 'Extra codes';
                else
                    errorType = 'Wrong codes';
                if (!errorPatterns.has(errorType)) {
                    errorPatterns.set(errorType, { pattern: errorType, count: 0, examples: [] });
                }
                const pattern = errorPatterns.get(errorType);
                pattern.count++;
                if (pattern.examples.length < 5) {
                    pattern.examples.push(testCase.id);
                }
            }
        }
        catch (error) {
            results.push({
                caseId: testCase.id,
                input: testCase.input,
                generated_codes: [],
                expected_codes: expectedCodes.get(testCase.id) || [],
                status: 'FAIL',
                error: error.message
            });
            const domain = inferDomain(testCase.input);
            if (!domainStats.has(domain)) {
                domainStats.set(domain, { passed: 0, failed: 0, total: 0, accuracy: 0 });
            }
            domainStats.get(domain).total++;
            domainStats.get(domain).failed++;
        }
    }
    // Calculate accuracies
    domainStats.forEach(stats => {
        stats.accuracy = stats.total > 0 ? (stats.passed / stats.total) * 100 : 0;
    });
    const totalPassed = results.filter(r => r.status === 'PASS').length;
    const totalFailed = results.length - totalPassed;
    const overallAccuracy = (totalPassed / results.length) * 100;
    // Generate console report
    console.log('');
    console.log('='.repeat(80));
    console.log('ICD-10-CM ENGINE — AUTOMATED TEST REPORT');
    console.log('='.repeat(80));
    console.log('');
    console.log(`Total Cases: ${results.length}`);
    console.log(`Passed: ${totalPassed}`);
    console.log(`Failed: ${totalFailed}`);
    console.log(`Accuracy: ${overallAccuracy.toFixed(2)}%`);
    console.log('');
    console.log('Batch Summary (by domain):');
    const sortedDomains = Array.from(domainStats.entries()).sort((a, b) => a[0].localeCompare(b[0]));
    for (const [domain, stats] of sortedDomains) {
        console.log(`${domain}: ${stats.passed}/${stats.total} (${stats.accuracy.toFixed(1)}%)`);
    }
    console.log('');
    console.log('Error Patterns:');
    const sortedErrors = Array.from(errorPatterns.values()).sort((a, b) => b.count - a.count);
    for (const pattern of sortedErrors) {
        console.log(`  ${pattern.pattern}: ${pattern.count} cases (e.g., CASE ${pattern.examples.join(', ')})`);
    }
    console.log('');
    console.log('FINAL STATUS:');
    if (overallAccuracy === 100) {
        console.log('✅ SYSTEM VALIDATED — 100% PASS');
    }
    else {
        console.log(`❌ SYSTEM FAILED — Accuracy ${overallAccuracy.toFixed(2)}%`);
    }
    console.log('');
    // Save results.json
    fs.writeFileSync('./results.json', JSON.stringify({
        summary: {
            total: results.length,
            passed: totalPassed,
            failed: totalFailed,
            accuracy: overallAccuracy
        },
        domainStats: Object.fromEntries(domainStats),
        errorPatterns: Array.from(errorPatterns.values()),
        results: results
    }, null, 2));
    console.log('✓ Detailed results saved to: results.json');
    // Save accuracy_report.txt
    let reportText = '';
    reportText += '='.repeat(80) + '\n';
    reportText += 'ICD-10-CM ENGINE — AUTOMATED TEST REPORT\n';
    reportText += '='.repeat(80) + '\n\n';
    reportText += `Total Cases: ${results.length}\n`;
    reportText += `Passed: ${totalPassed}\n`;
    reportText += `Failed: ${totalFailed}\n`;
    reportText += `Accuracy: ${overallAccuracy.toFixed(2)}%\n\n`;
    reportText += 'Batch Summary (by domain):\n';
    for (const [domain, stats] of sortedDomains) {
        reportText += `${domain}: ${stats.passed}/${stats.total} (${stats.accuracy.toFixed(1)}%)\n`;
    }
    reportText += '\nError Patterns:\n';
    for (const pattern of sortedErrors) {
        reportText += `  ${pattern.pattern}: ${pattern.count} cases\n`;
        reportText += `    Examples: CASE ${pattern.examples.join(', ')}\n`;
    }
    reportText += '\nFINAL STATUS:\n';
    if (overallAccuracy === 100) {
        reportText += '✅ SYSTEM VALIDATED — 100% PASS\n';
    }
    else {
        reportText += `❌ SYSTEM FAILED — Accuracy ${overallAccuracy.toFixed(2)}%\n`;
    }
    fs.writeFileSync('./accuracy_report.txt', reportText);
    console.log('✓ Summary report saved to: accuracy_report.txt');
    console.log('');
    console.log('='.repeat(80));
}
runTests().catch(console.error);
