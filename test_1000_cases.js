#!/usr/bin/env node

// Test Runner for a.txt - 1000 ICD-10 Test Cases
const fs = require('fs');
const path = require('path');

// Read the test file
const testFile = fs.readFileSync(path.join(process.env.HOME, 'Desktop', 'a.txt'), 'utf8');
const lines = testFile.split('\n').filter(l => l.trim() && l.includes('Target:'));

console.log(`\n========================================`);
console.log(`   ICD-10 1000-CASE TEST SUITE`);
console.log(`========================================\n`);
console.log(`Total test cases: ${lines.length}\n`);

// Load the encoder
delete require.cache[require.resolve('./api/encode.js')];
const handler = require('./api/encode.js');

let passed = 0;
let failed = 0;
const failures = [];
const passingCases = [];

// Process each test case
lines.forEach((line, index) => {
    // Parse line: "ID0001: 45yo patient presenting with Urinary Tract Infection. Target: N39.0"
    const match = line.match(/^(ID\d+):\s*(\d+)yo patient presenting with (.+?)\.\s*Target:\s*(.+)$/);

    if (!match) {
        console.log(`⚠️  Skipping malformed line ${index + 1}: ${line.substring(0, 50)}...`);
        return;
    }

    const [, id, age, condition, expectedCodes] = match;
    const expectedArray = expectedCodes.split(',').map(c => c.trim()).sort();

    // Create test input text
    const text = `${age}yo patient presenting with ${condition}`;

    // Run through encoder
    const req = { method: 'POST', body: { text } };
    let actualCodes = [];

    const res = {
        status: (code) => ({
            json: (data) => {
                if (data.data.primary) {
                    actualCodes.push(data.data.primary);
                }
                if (data.data.secondary && data.data.secondary.length > 0) {
                    actualCodes.push(...data.data.secondary.map(s => s.code));
                }
            }
        })
    };

    try {
        handler(req, res);
        actualCodes.sort();

        // Compare codes
        const match = JSON.stringify(actualCodes) === JSON.stringify(expectedArray);

        if (match) {
            passed++;
            passingCases.push({ id, condition, codes: actualCodes.join(',  ') });
        } else {
            failed++;
            failures.push({
                id,
                condition,
                expected: expectedArray.join(', '),
                actual: actualCodes.join(', ') || '(none)'
            });
        }
    } catch (error) {
        failed++;
        failures.push({
            id,
            condition,
            expected: expectedArray.join(', '),
            actual: `ERROR: ${error.message}`
        });
    }
});

// Print results
console.log(`\n========================================`);
console.log(`   TEST RESULTS`);
console.log(`========================================\n`);

const passRate = ((passed / (passed + failed)) * 100).toFixed(1);
console.log(`✅ PASSED: ${passed} / ${passed + failed} (${passRate}%)`);
console.log(`❌ FAILED: ${failed} / ${passed + failed}\n`);

if (failures.length > 0) {
    console.log(`\n========================================`);
    console.log(`   FAILURES (First 20)`);
    console.log(`========================================\n`);

    failures.slice(0, 20).forEach(f => {
        console.log(`${f.id}: ${f.condition}`);
        console.log(`  Expected: ${f.expected}`);
        console.log(`  Actual:   ${f.actual}`);
        console.log();
    });

    if (failures.length > 20) {
        console.log(`... and ${failures.length - 20} more failures\n`);
    }

    // Group failures by missing code
    const missingCodes = {};
    failures.forEach(f => {
        const expected = f.expected.split(', ');
        const actual = f.actual === '(none)' ? [] : f.actual.split(', ');
        expected.forEach(code => {
            if (!actual.includes(code)) {
                missingCodes[code] = (missingCodes[code] || 0) + 1;
            }
        });
    });

    console.log(`\n========================================`);
    console.log(`   MOST COMMON MISSING CODES`);
    console.log(`========================================\n`);

    Object.entries(missingCodes)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .forEach(([code, count]) => {
            console.log(`${code}: ${count} failures`);
        });
}

console.log(`\n========================================\n`);

// Exit with error code if failures
process.exit(failures.length > 0 ? 1 : 0);
