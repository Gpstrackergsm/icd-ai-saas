// ICD-10-CM Encoder core – generated with Codex helper
// Responsibility: Regression tests for the encoder pipeline

import { describe, it, expect, beforeAll } from 'vitest';
import { encodeDiagnosisText } from '../encoder';
import { initIcdData } from '../dataSource';

beforeAll(async () => {
  await initIcdData();
});

describe('ICD-10-CM encoder scenarios', () => {
  it('encodes diabetes with CKD stage 4', () => {
    const result = encodeDiagnosisText('Type 2 diabetes with CKD stage 4');
    const codes = result.codes.map((c) => c.code);
    expect(codes.slice(0, 2)).toEqual(['E11.22', 'N18.4']);
    expect(result.warnings).toEqual([]);
  });

  it('encodes diabetes with CKD stage 3b and hypertension', () => {
    const result = encodeDiagnosisText('Type 2 diabetes with CKD stage 3b and hypertension');
    const codes = result.codes.map((c) => c.code);
    expect(codes).toContain('E11.22');
    expect(codes).toContain('N18.32');
    expect(codes).toContain('I12.9');
  });

  it('encodes hypertensive heart and CKD with heart failure stage 4', () => {
    const result = encodeDiagnosisText('Hypertensive heart and chronic kidney disease with heart failure stage 4');
    const codes = result.codes.map((c) => c.code);
    expect(codes).toContain('I13.0');
    expect(codes).toContain('N18.4');
    expect(codes).toContain('I50.9');
  });

  it('encodes COPD with acute exacerbation', () => {
    const result = encodeDiagnosisText('COPD with acute exacerbation');
    expect(result.codes[0].code).toBe('J44.1');
  });

  it('encodes COPD with acute lower respiratory infection and pneumonia', () => {
    const result = encodeDiagnosisText('COPD with acute lower respiratory infection and pneumonia');
    const codes = result.codes.map((c) => c.code);
    expect(codes).toContain('J44.0');
    expect(codes).toContain('J18.9');
  });

  it('encodes secondary liver cancer from colon', () => {
    const result = encodeDiagnosisText('Secondary liver cancer from colon');
    const codes = result.codes.map((c) => c.code);
    expect(codes[0]).toBe('C78.7');
    expect(codes).toContain('C18.9');
  });

  it('encodes MDD severe without psychotic features', () => {
    const result = encodeDiagnosisText('Major depressive disorder recurrent severe without psychotic features');
    expect(result.codes[0].code).toBe('F33.2');
  });

  it('encodes MDD severe with psychotic features', () => {
    const result = encodeDiagnosisText('Major depressive disorder recurrent severe with psychotic features');
    expect(result.codes[0].code).toBe('F33.3');
  });

  it('encodes diabetes with neuropathy and CKD stage 4', () => {
    const result = encodeDiagnosisText('Type 2 diabetes with diabetic neuropathy and CKD stage 4');
    const codes = result.codes.map((c) => c.code);
    expect(codes).toContain('E11.22');
    expect(codes).toContain('N18.4');
    expect(codes).toContain('E11.42');
  });
});
