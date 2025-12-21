const fs = require('fs');

// Read CORRECT dataset - the one actually used in validation
const cases = JSON.parse(fs.readFileSync('generated_dataset.json', 'utf-8'));
const resultsLines = fs.readFileSync('COMPREHENSIVE_RESULTS.csv', 'utf-8').trim().split('\n');

// Parse results into map
const resultsMap = new Map();
resultsLines.forEach(line => {
    const [caseId, status, codes] = line.split('|');
    resultsMap.set(caseId, { status, codes: codes || '' });
});

// Create CSV lines
const outputLines = [];
outputLines.push('Case ID,Module,Status,Clinical Scenario,Expected Codes,Generated Codes,Missing,Extra');

cases.forEach((testCase) => {
    const caseId = `CASE ${testCase.id}`;
    const result = resultsMap.get(caseId);

    if (!result) {
        console.log(`Warning: No result for ${caseId}`);
        return;
    }

    // Clean text for CSV
    const scenario = testCase.text.replace(/"/g, '""');
    const expected = testCase.expectedCodes.join(', ');
    const generated = result.codes;

    // Calculate missing and extra
    const expectedSet = new Set(testCase.expectedCodes);
    const generatedSet = new Set(generated.split(',').map(c => c.trim()).filter(c => c));

    const missing = [];
    const extra = [];

    expectedSet.forEach(code => {
        if (!generatedSet.has(code)) missing.push(code);
    });

    generatedSet.forEach(code => {
        if (!expectedSet.has(code)) extra.push(code);
    });

    outputLines.push([
        caseId,
        testCase.module,
        result.status,
        `"${scenario}"`,
        `"${expected}"`,
        `"${generated}"`,
        `"${missing.join(', ')}"`,
        `"${extra.join(', ')}"`
    ].join(','));
});

// Write output
const outputPath = '/Users/khalidaitelmaati/Desktop/all_cases_with_scenarios.csv';
fs.writeFileSync(outputPath, outputLines.join('\n'));

const passing = Array.from(resultsMap.values()).filter(r => r.status === 'PASS').length;
const failing = Array.from(resultsMap.values()).filter(r => r.status === 'FAIL').length;

console.log(`✅ FIXED: ${outputPath}`);
console.log(`📊 Total: ${cases.length} cases`);
console.log(`✓ Passing: ${passing} (${(passing / cases.length * 100).toFixed(1)}%)`);
console.log(`✗ Failing: ${failing} (${(failing / cases.length * 100).toFixed(1)}%)`);
console.log(`\nNote: Now using CORRECT dataset (generated_dataset.json)`);
