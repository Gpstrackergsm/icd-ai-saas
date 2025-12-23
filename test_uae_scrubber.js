#!/usr/bin/env node

/**
 * UAE Scrubber Test Suite
 * Tests Activity-Diagnosis linkage, modifier injection, medical necessity
 */

const { scrubShafafiyaXML, validateActivityDiagnosisLink, injectModifiers } = require('./lib/uae/scrubber.js');
const { exportToUAE } = require('./lib/uae/export.js');
const { generateShafafiyaXML } = require('./lib/uae/shafafiyaXml.js');

let passed = 0;
let failed = 0;
const failures = [];

console.log('\n========================================');
console.log('   UAE SCRUBBER TEST SUITE');
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

// Test 1: Activity-Diagnosis linkage validation - correct link
test('Test 1: Valid Activity-Diagnosis link (appendectomy + appendicitis)', () => {
    const activity = {
        id: 'ACT1',
        cptCode: '44970',
        diagnosisCodeReference: 'K35.30'
    };

    const diagnoses = [{ code: 'K35.30', description: 'Acute appendicitis' }];

    const result = validateActivityDiagnosisLink(activity, diagnoses);

    assert(result.valid === true, 'Should be valid');
    assert(result.suggestedDiagnosis === 'K35.30', 'Should keep same diagnosis');
});

// Test 2: Activity-Diagnosis linkage validation - incorrect link
test('Test 2: Invalid Activity-Diagnosis link (appendectomy + HTN)', () => {
    const activity = {
        id: 'ACT1',
        cptCode: '44970',
        diagnosisCodeReference: 'I10'
    };

    const diagnoses = [
        { code: 'I10', description: 'Hypertension' },
        { code: 'K35.30', description: 'Acute appendicitis' }
    ];

    const result = validateActivityDiagnosisLink(activity, diagnoses);

    assert(result.valid === false, 'Should be invalid');
    assert(result.suggestedDiagnosis === 'K35.30', 'Should suggest appendicitis');
});

// Test 3: Modifier 25 injection (E&M + surgery same day)
test('Test 3: Modifier 25 injection for E&M + surgery same day', () => {
    const activities = [
        { id: 'ACT1', cptCode: '99213', description: 'Office visit', modifiers: [], serviceDate: '2025-01-15' },
        { id: 'ACT2', cptCode: '10060', description: 'I&D abscess', modifiers: [], serviceDate: '2025-01-15' }
    ];

    const result = injectModifiers(activities, 'Office visit and procedure');

    assert(result.fixes.length === 1, 'Should inject one modifier');
    assert(result.fixes[0].modifier === '25', 'Should inject modifier 25');
    assert(result.fixes[0].activityId === 'ACT1', 'Should inject on E&M code');
    assert(result.activities[0].modifiers.includes('25'), 'E&M should have modifier 25');
});

// Test 4: Modifier 51 injection (multiple procedures)
test('Test 4: Modifier 51 injection for multiple procedures', () => {
    const activities = [
        { id: 'ACT1', cptCode: '10060', description: 'I&D abscess 1', modifiers: [], serviceDate: '2025-01-15' },
        { id: 'ACT2', cptCode: '10061', description: 'I&D abscess 2', modifiers: [], serviceDate: '2025-01-15' }
    ];

    const result = injectModifiers(activities, 'Two procedures');

    assert(result.fixes.some(f => f.modifier === '51'), 'Should inject modifier 51');
    assert(result.activities[1].modifiers.includes('51'), 'Second procedure should have modifier 51');
});

// Test 5: Full scrubber flow - remap diagnosis
test('Test 5: Full scrubber - remap incorrect diagnosis', () => {
    const uaeExport = {
        diagnoses: {
            primary: 'K35.30',
            primaryDescription: 'Acute appendicitis',
            secondary: [{ code: 'I10', description: 'Hypertension' }]
        }
    };

    const activities = [
        { id: 'ACT1', cptCode: '44970', description: 'Appendectomy', diagnosisCodeReference: 'I10', modifiers: [] }
    ];

    const result = scrubShafafiyaXML(uaeExport, activities, 'Appendectomy');

    assert(result.exportStatus === 'READY', 'Should be ready after auto-fix');
    assert(result.fixes.length > 0, 'Should have fixes');
    assert(result.fixes[0].type === 'DIAGNOSIS_REMAPPED', 'Should be diagnosis remap');
    assert(result.scrubbedActivities[0].diagnosisCodeReference === 'K35.30', 'Should remap to appendicitis');
});

// Test 6: Full scrubber flow - QUERY_REQUIRED when no fix available
test('Test 6: Full scrubber - QUERY_REQUIRED when no valid diagnosis', () => {
    const uaeExport = {
        diagnoses: {
            primary: 'I10',
            primaryDescription: 'Hypertension',
            secondary: []
        }
    };

    const activities = [
        { id: 'ACT1', cptCode: '44970', description: 'Appendectomy', diagnosisCodeReference: 'I10', modifiers: [] }
    ];

    const result = scrubShafafiyaXML(uaeExport, activities, 'Appendectomy');

    assert(result.exportStatus === 'QUERY_REQUIRED', 'Should require query');
    assert(result.queries.length > 0, 'Should have queries');
});

// Test 7: XML generation with activities and fixes
test('Test 7: XML generation with activities and scrubber fixes', () => {
    const uaeExport = {
        facility: { id: 'F1' },
        payer: { id: 'P1', scheme: 'DHA' },
        encounter: { id: 'E1', type: 'OUTPATIENT', encounterDate: '2025-01-15' },
        provider: { id: 'PR1' },
        patient: { id: 'PA1' },
        diagnoses: {
            primary: 'I10',
            primaryDescription: 'Hypertension',
            codingMethod: 'ICD-10-CM',
            secondary: [],
            auditDecision: 'AUTO_CODE'
        },
        exportStatus: 'READY',
        exportedAt: new Date().toISOString(),
        exporterVersion: 'v1.0'
    };

    const activities = [
        {
            id: 'ACT1',
            cptCode: '99213',
            description: 'Office visit',
            diagnosisCodeReference: 'I10',
            modifiers: ['25'],
            serviceDate: '2025-01-15'
        }
    ];

    const fixes = [
        {
            type: 'MODIFIER_INJECTED',
            activityId: 'ACT1',
            cptCode: '99213',
            modifier: '25',
            reason: 'E&M same day as procedure'
        }
    ];

    const xml = generateShafafiyaXML(uaeExport, { activities, scrubberFixes: fixes });

    assert(xml.includes('<Activities>'), 'Should have Activities section');
    assert(xml.includes('<CPTCode>99213</CPTCode>'), 'Should include CPT code');
    assert(xml.includes('<Modifier>25</Modifier>'), 'Should include modifier');
    assert(xml.includes('<ScrubberFixes>'), 'Should have scrubber fixes');
    assert(xml.includes('MODIFIER_INJECTED'), 'Should document fix type');
});

// Test 8: E&M code can justify any diagnosis
test('Test 8: E&M code justifies any diagnosis', () => {
    const activity = {
        id: 'ACT1',
        cptCode: '99213',
        diagnosisCodeReference: 'I10'
    };

    const diagnoses = [{ code: 'I10', description: 'Hypertension' }];

    const result = validateActivityDiagnosisLink(activity, diagnoses);

    assert(result.valid === true, 'E&M should justify any diagnosis');
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
