"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const child_process_1 = require("child_process");
const tests = [
    'test_sepsis_sequencing.ts',
    'test_domain_sequencing.ts',
    'test_compliance.ts',
    'test_rationale.ts'
];
async function runAllTests() {
    console.log('🚀 Running All Validation Tests...\n');
    let totalPassed = 0;
    let totalFailed = 0;
    for (const testFile of tests) {
        console.log(`\n▶️  Running ${testFile}...`);
        console.log('==================================================');
        await new Promise((resolve) => {
            const child = (0, child_process_1.spawn)('npx', ['tsx', testFile], { stdio: 'inherit', shell: true });
            child.on('close', (code) => {
                if (code === 0) {
                    console.log(`\n✅ ${testFile} PASSED`);
                    totalPassed++;
                }
                else {
                    console.log(`\n❌ ${testFile} FAILED`);
                    totalFailed++;
                }
                resolve();
            });
        });
    }
    console.log('\n==================================================');
    console.log(`SUMMARY: ${totalPassed} Test Suites Passed, ${totalFailed} Failed`);
    if (totalFailed === 0) {
        console.log('🎉 ALL SYSTEMS GO! 100% ACCURACY ACHIEVED.');
    }
    else {
        console.log('⚠️  SOME TESTS FAILED. PLEASE REVIEW.');
    }
}
runAllTests();
