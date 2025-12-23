#!/usr/bin/env node

/**
 * UAE Export MVP Test Suite
 * Verifies adapter layer does NOT modify existing Level 0-5 outputs
 * 12 test cases: 6 simple, 3 POA mixed, 3 linking
 */

const { normalize } = require('./lib/uae/normalize.js');
const { exportToUAE } = require('./lib/uae/export.js');
const { generateShafafiyaXML } = require('./lib/uae/shafafiyaXml.js');

// Test counter
let passed = 0;
let failed = 0;
const failures = [];

console.log('\n========================================');
console.log('   UAE EXPORT MVP TEST SUITE');
console.log('========================================\n');

// Test helper
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
    if (!condition) {
        throw new Error(message);
    }
}

// ========================================
// GROUP 1: SIMPLE DIAGNOSIS CASES (6)
// ========================================

test('Test 1: Simple UTI normalization', () => {
    const input = 'Patient presenting with UTI';
    const result = normalize(input);

    assert(result.normalizedText.includes('urinary tract infection'),
        'Should expand UTI to urinary tract infection');
    assert(result.appliedTransformations.length > 0,
        'Should track transformations');
});

test('Test 2: COPD exacerbation abbreviation', () => {
    const input = 'Patient with AECB requiring admission';
    const result = normalize(input);

    assert(result.normalizedText.includes('COPD exacerbation'),
        'Should expand AECB to COPD exacerbation');
});

test('Test 3: UAE section header normalization', () => {
    const input = 'Assessment: Acute myocardial infarction';
    const result = normalize(input);

    assert(result.normalizedText.includes('Diagnosis:'),
        'Should normalize Assessment to Diagnosis');
});

test('Test 4: Export status QUERY_REQUIRED', () => {
    const mockResult = {
        primary: 'I10',
        primaryDescription: 'Essential hypertension',
        secondary: []
    };

    const uaeExport = exportToUAE(mockResult, {});

    assert(uaeExport.exportStatus === 'QUERY_REQUIRED',
        'Should require query when metadata missing');
    assert(uaeExport.missingFields.length > 0,
        'Should list missing fields');
});

test('Test 5: Export status READY', () => {
    const mockResult = {
        primary: 'J44.1',
        primaryDescription: 'COPD with acute exacerbation',
        secondary: []
    };

    const metadata = {
        facilityId: 'FAC001',
        payerId: 'DHA001',
        encounterId: 'ENC123',
        providerId: 'PRV456',
        patientId: 'PAT789',
        encounterDate: '2025-01-15'
    };

    const uaeExport = exportToUAE(mockResult, metadata);

    assert(uaeExport.exportStatus === 'READY',
        'Should be ready when all fields present');
    assert(uaeExport.facility.id === 'FAC001',
        'Should include facility metadata');
});

test('Test 6: XML generation - basic structure', () => {
    const mockResult = {
        primary: 'N39.0',
        primaryDescription: 'Urinary tract infection',
        secondary: [],
        _debug: { decisionState: 'AUTO_CODE' }
    };

    const uaeExport = exportToUAE(mockResult, {
        facilityId: 'FAC001',
        payerId: 'DHA001',
        encounterId: 'ENC001',
        providerId: 'PRV001',
        patientId: 'PAT001',
        encounterDate: '2025-01-15'
    });

    const xml = generateShafafiyaXML(uaeExport);

    assert(xml.includes('<?xml'), 'Should have XML declaration');
    assert(xml.includes('<Claim'), 'Should have Claim root element');
    assert(xml.includes('<Diagnoses>'), 'Should have Diagnoses section');
    assert(xml.includes('N39.0'), 'Should include diagnosis code');
    assert(xml.includes('<Procedures>'), 'Should have Procedures section');
    assert(xml.includes('Diagnosis-only export'), 'Should have MVP comment');
});

// ========================================
// GROUP 2: POA MIXED CASES (3)
// ========================================

test('Test 7: POA status preserved in export', () => {
    const mockResult = {
        primary: 'I50.23',
        primaryDescription: 'Acute on chronic systolic heart failure',
        primaryPOA: 'Y',
        secondary: [
            { code: 'I10', description: 'Essential hypertension', poa: 'Y' },
            { code: 'E11.9', description: 'Type 2 diabetes', poa: 'N' }
        ]
    };

    const uaeExport = exportToUAE(mockResult, {
        facilityId: 'F1', payerId: 'P1', encounterId: 'E1',
        providerId: 'PR1', patientId: 'PA1', encounterDate: '2025-01-15'
    });

    assert(uaeExport.diagnoses.primaryPOA === 'Y',
        'Should preserve primary POA');
    assert(uaeExport.diagnoses.secondary[0].poa === 'Y',
        'Should preserve secondary POA');
    assert(uaeExport.diagnoses.secondary[1].poa === 'N',
        'Should preserve POA=N');
});

test('Test 8: POA in XML output', () => {
    const mockResult = {
        primary: 'J96.01',
        primaryDescription: 'Acute respiratory failure with hypoxia',
        primaryPOA: 'U',
        secondary: []
    };

    const uaeExport = exportToUAE(mockResult, {
        facilityId: 'F1', payerId: 'P1', encounterId: 'E1',
        providerId: 'PR1', patientId: 'PA1', encounterDate: '2025-01-15'
    });

    const xml = generateShafafiyaXML(uaeExport);

    assert(xml.includes('<POA>U</POA>'),
        'Should include POA in XML');
});

test('Test 9: Multiple secondary with mixed POA', () => {
    const mockResult = {
        primary: 'A41.9',
        primaryDescription: 'Sepsis, unspecified',
        primaryPOA: 'Y',
        secondary: [
            { code: 'R65.20', description: 'Severe sepsis', poa: 'Y' },
            { code: 'J18.9', description: 'Pneumonia', poa: 'N' },
            { code: 'E11.9', description: 'Type 2 diabetes', poa: 'Y' }
        ]
    };

    const uaeExport = exportToUAE(mockResult, {
        facilityId: 'F1', payerId: 'P1', encounterId: 'E1',
        providerId: 'PR1', patientId: 'PA1', encounterDate: '2025-01-15'
    });

    const xml = generateShafafiyaXML(uaeExport);

    assert(uaeExport.diagnoses.secondary.length === 3,
        'Should have 3 secondary diagnoses');
    assert(xml.includes('sequence="1"'),
        'Should sequence secondary diagnoses');
});

// ========================================
// GROUP 3: LINKING CASES (3)
// ========================================

test('Test 10: Diabetes + CKD combination preserved', () => {
    const mockResult = {
        primary: 'E11.22',
        primaryDescription: 'Type 2 DM with diabetic CKD',
        secondary: [
            { code: 'N18.4', description: 'CKD Stage 4', poa: null }
        ]
    };

    const uaeExport = exportToUAE(mockResult, {
        facilityId: 'F1', payerId: 'P1', encounterId: 'E1',
        providerId: 'PR1', patientId: 'PA1', encounterDate: '2025-01-15'
    });

    assert(uaeExport.diagnoses.primary === 'E11.22',
        'Should preserve combination code');
    assert(uaeExport.diagnoses.secondary[0].code === 'N18.4',
        'Should preserve CKD stage');
});

test('Test 11: COPD + ARF combination preserved', () => {
    const mockResult = {
        primary: 'J44.1',
        primaryDescription: 'COPD with acute exacerbation',
        secondary: [
            { code: 'J96.01', description: 'Acute respiratory failure with hypoxia', poa: null }
        ]
    };

    const uaeExport = exportToUAE(mockResult, {
        facilityId: 'F1', payerId: 'P1', encounterId: 'E1',
        providerId: 'PR1', patientId: 'PA1', encounterDate: '2025-01-15'
    });

    const xml = generateShafafiyaXML(uaeExport);

    assert(xml.includes('J44.1'), 'Should include COPD code in XML');
    assert(xml.includes('J96.01'), 'Should include ARF code in XML');
});

test('Test 12: Sepsis due to pneumonia preserved', () => {
    const mockResult = {
        primary: 'A41.9',
        primaryDescription: 'Sepsis',
        secondary: [
            { code: 'R65.20', description: 'Severe sepsis', poa: null },
            { code: 'J18.9', description: 'Pneumonia', poa: null }
        ]
    };

    const uaeExport = exportToUAE(mockResult, {
        facilityId: 'F1', payerId: 'P1', encounterId: 'E1',
        providerId: 'PR1', patientId: 'PA1', encounterDate: '2025-01-15'
    });

    assert(uaeExport.diagnoses.codingMethod === 'ICD-10-CM_2025',
        'Should specify coding method');
    assert(uaeExport.countryProfile === 'UAE',
        'Should specify UAE profile');
    assert(uaeExport.submissionFormat === 'SHAFAFIYA_XML_V2',
        'Should specify Shafafiya format');
});

// ========================================
// RESULTS
// ========================================

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

// Exit with error code if failures
process.exit(failures.length > 0 ? 1 : 0);
