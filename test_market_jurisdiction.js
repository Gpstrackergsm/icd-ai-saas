#!/usr/bin/env node

/**
 * Market Jurisdiction Switch Test Suite
 * Tests USA (strict CMS) vs UAE (procedure-derived) modes
 */

const { applyMarketAdapter } = require('./lib/market/adapter.js');

let passed = 0;
let failed = 0;
const failures = [];

console.log('\n========================================');
console.log('  MARKET JURISDICTION SWITCH TEST SUITE');
console.log('========================================\n');

function test(name, fn) {
    try {
        fn();
        passed++;
        console.log(`✅ ${name}`);
    } catch (error) {
        failed++;
        failures.push({ name, error: error.message });
        console.log(`❌ ${name}`);
        console.log(`   ${error.message}\n`);
    }
}

function assert(condition, message) {
    if (!condition) throw new Error(message);
}

// Test 1: USA Mode - Abscess + I&D → AUTO_EXCLUDE
test('Test 1: USA Mode - Abscess + I&D → AUTO_EXCLUDE (Strict CMS)', () => {
    const text = 'Patient with infected abscess. Performed incision and drainage. Successful.';

    const result = applyMarketAdapter({
        marketProfile: 'USA',
        coreDecision: { primary: null, decisionState: 'AUTO_EXCLUDE' },
        text
    });

    assert(result.decisionState === 'AUTO_EXCLUDE', 'Should remain AUTO_EXCLUDE');
    assert(result.primary === null, 'Should not derive diagnosis');
    assert(result.marketProfile === 'USA', 'Should be USA market');
    assert(result.marketRuleApplied === false, 'Should not apply UAE rules');
});

// Test 2: UAE Mode - Abscess + I&D → AUTO_CODE
test('Test 2: UAE Mode - Abscess + I&D → AUTO_CODE (Derived)', () => {
    const text = 'Patient with infected abscess. Performed incision and drainage. Successful.';

    const result = applyMarketAdapter({
        marketProfile: 'UAE',
        coreDecision: { primary: null, decisionState: 'AUTO_EXCLUDE' },
        text
    });

    assert(result.decisionState === 'AUTO_CODE', 'Should override to AUTO_CODE');
    assert(result.primary === 'L02.91', 'Should derive abscess code');
    assert(result.derivedByMarketRule === true, 'Should be UAE-derived');
    assert(result.marketProfile === 'UAE', 'Should be UAE market');
    assert(result.ruleReference.includes('UAE-PROC-001'), 'Should have rule reference');
});

// Test 3: UAE Mode - I&D without clinical term → AUTO_EXCLUDE
test('Test 3: UAE Mode - I&D without clinical term → No derivation', () => {
    const text = 'Patient evaluated. Performed I&D procedure. No complications.';

    const result = applyMarketAdapter({
        marketProfile: 'UAE',
        coreDecision: { primary: null, decisionState: 'AUTO_EXCLUDE' },
        text
    });

    assert(result.decisionState === 'AUTO_EXCLUDE', 'Should remain AUTO_EXCLUDE without clinical term');
    assert(result.primary === null, 'Should not derive without supporting term');
});

// Test 4: UAE Mode - Abscess without procedure → AUTO_EXCLUDE
test('Test 4: UAE Mode - Abscess without procedure → No derivation', () => {
    const text = 'Patient with abscess on finger. Observation only.';

    const result = applyMarketAdapter({
        marketProfile: 'UAE',
        coreDecision: { primary: null, decisionState: 'AUTO_EXCLUDE' },
        text
    });

    assert(result.decisionState === 'AUTO_EXCLUDE', 'Should remain AUTO_EXCLUDE without procedure');
});

// Test 5: UAE Mode - Negated abscess → No derivation
test('Test 5: UAE Mode - Negated abscess → No derivation', () => {
    const text = 'Patient evaluated. No abscess found. Performed I&D for drainage.';

    const result = applyMarketAdapter({
        marketProfile: 'UAE',
        coreDecision: { primary: null, decisionState: 'AUTO_EXCLUDE' },
        text
    });

    assert(result.decisionState === 'AUTO_EXCLUDE', 'Should not derive negated diagnosis');
    assert(result.primary === null, 'Should respect negation');
});

// Test 6: UAE Mode - Explicit diagnosis present → No override needed
test('Test 6: UAE Mode - Explicit diagnosis present → No override', () => {
    const text = 'Diagnosis: Abscess. Performed I&D.';

    const result = applyMarketAdapter({
        marketProfile: 'UAE',
        coreDecision: { primary: 'L02.91', decisionState: 'AUTO_CODE' },
        text
    });

    assert(result.decisionState === 'AUTO_CODE', 'Should keep AUTO_CODE');
    assert(result.marketRuleApplied === false, 'Should not need override');
    assert(result.marketNote.includes('no market override needed'), 'Should note override not needed');
});

// Test 7: USA Mode - Appendectomy + Appendicitis → AUTO_EXCLUDE
test('Test 7: USA Mode - Appendectomy + Appendicitis → AUTO_EXCLUDE', () => {
    const text = 'Acute abdomen, likely appendicitis. Performed laparoscopic appendectomy.';

    const result = applyMarketAdapter({
        marketProfile: 'USA',
        coreDecision: { primary: null, decisionState: 'AUTO_EXCLUDE' },
        text
    });

    assert(result.decisionState === 'AUTO_EXCLUDE', 'USA mode should not derive');
});

// Test 8: UAE Mode - Appendectomy + Appendicitis → AUTO_CODE
test('Test 8: UAE Mode - Appendectomy + Appendicitis → AUTO_CODE', () => {
    const text = 'Acute abdomen, likely appendicitis. Performed laparoscopic appendectomy.';

    const result = applyMarketAdapter({
        marketProfile: 'UAE',
        coreDecision: { primary: null, decisionState: 'AUTO_EXCLUDE' },
        text
    });

    assert(result.decisionState === 'AUTO_CODE', 'Should derive appendicitis');
    assert(result.primary === 'K35.80', 'Should use appendicitis code');
    assert(result.derivedByMarketRule === true, 'Should be UAE-derived');
});

// Test 9: Default market (no profile) → USA behavior
test('Test 9: Default market profile → USA behavior', () => {
    const text = 'Patient with abscess. Performed I&D.';

    const result = applyMarketAdapter({
        coreDecision: { primary: null, decisionState: 'AUTO_EXCLUDE' },
        text
    });

    assert(result.marketProfile === 'USA', 'Should default to USA');
    assert(result.decisionState === 'AUTO_EXCLUDE', 'Should use strict rules');
});

// Test 10: UAE Mode - purulent drainage term → Derivation
test('Test 10: UAE Mode - Alternative clinical term (purulent)', () => {
    const text = 'Purulent drainage from wound. Performed I&D.';

    const result = applyMarketAdapter({
        marketProfile: 'UAE',
        coreDecision: { primary: null, decisionState: 'AUTO_EXCLUDE' },
        text
    });

    assert(result.decisionState === 'AUTO_CODE', 'Should derive from purulent');
    assert(result.derivedByMarketRule === true, 'Should be UAE-derived');
});

console.log('\n========================================');
console.log('   TEST RESULTS');
console.log('========================================\n');

const total = passed + failed;
const passRate = ((passed / total) * 100).toFixed(1);

console.log(`✅ PASSED: ${passed} / ${total} (${passRate}%)`);
console.log(`❌ FAILED: ${failed} / ${total}\n`);

if (failures.length > 0) {
    console.log('FAILURES:');
    failures.forEach(f => {
        console.log(`  - ${f.name}: ${f.error}`);
    });
    console.log();
}

console.log('========================================\n');

process.exit(failures.length > 0 ? 1 : 0);
