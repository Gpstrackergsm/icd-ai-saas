// ICD-10-CM Encoder core – generated with Codex helper
// Responsibility: Regression tests for the encoder pipeline

import assert from 'node:assert/strict';
import { before, describe, it } from 'node:test';

import { encodeDiagnosisText } from '../encoder.ts';
import { initIcdData } from '../dataSource.ts';

before(async () => {
  await initIcdData();
});

describe('ICD-10-CM encoder scenarios', () => {
  it('encodes diabetes with CKD stage 4', () => {
    const result = encodeDiagnosisText('Type 2 diabetes with CKD stage 4');
    const codes = result.codes.map((c) => c.code);
    assert.deepEqual(codes.slice(0, 2), ['E11.22', 'N18.4']);
    assert.deepEqual(result.warnings, []);
  });

  it('encodes diabetes with CKD stage 3b and hypertension', () => {
    const result = encodeDiagnosisText('Type 2 diabetes with CKD stage 3b and hypertension');
    const codes = result.codes.map((c) => c.code);
    assert.ok(codes.includes('E11.22'));
    assert.ok(codes.includes('N18.32'));
    assert.ok(codes.includes('I12.9'));
  });

  it('encodes hypertensive heart and CKD with heart failure stage 4', () => {
    const result = encodeDiagnosisText('Hypertensive heart and chronic kidney disease with heart failure stage 4');
    const codes = result.codes.map((c) => c.code);
    assert.ok(codes.includes('I13.0'));
    assert.ok(codes.includes('N18.4'));
    assert.ok(codes.includes('I50.9'));
  });

  it('encodes COPD with acute exacerbation', () => {
    const result = encodeDiagnosisText('COPD with acute exacerbation');
    assert.equal(result.codes[0].code, 'J44.1');
  });

  it('encodes COPD with acute lower respiratory infection and pneumonia', () => {
    const result = encodeDiagnosisText('COPD with acute lower respiratory infection and pneumonia');
    const codes = result.codes.map((c) => c.code);
    assert.ok(codes.includes('J44.0'));
    assert.ok(codes.includes('J18.9'));
  });

  it('encodes secondary liver cancer from colon', () => {
    const result = encodeDiagnosisText('Secondary liver cancer from colon');
    const codes = result.codes.map((c) => c.code);
    assert.equal(codes[0], 'C78.7');
    assert.ok(codes.includes('C18.9'));
  });

  it('encodes MDD severe without psychotic features', () => {
    const result = encodeDiagnosisText('Major depressive disorder recurrent severe without psychotic features');
    assert.equal(result.codes[0].code, 'F33.2');
  });

  it('encodes MDD severe with psychotic features', () => {
    const result = encodeDiagnosisText('Major depressive disorder recurrent severe with psychotic features');
    assert.equal(result.codes[0].code, 'F33.3');
  });

  it('encodes diabetes with neuropathy and CKD stage 4', () => {
    const result = encodeDiagnosisText('Type 2 diabetes with diabetic neuropathy and CKD stage 4');
    const codes = result.codes.map((c) => c.code);
    assert.ok(codes.includes('E11.22'));
    assert.ok(codes.includes('N18.4'));
    assert.ok(codes.includes('E11.42'));
  });
});
