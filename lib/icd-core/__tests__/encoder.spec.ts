/// <reference lib="es2021" />
// @ts-nocheck

// ICD-10-CM Encoder core – generated with Codex helper
// Responsibility: Regression tests for the encoder pipeline

import * as assert from 'node:assert/strict';
import { before, describe, it } from 'node:test';

import { encodeDiagnosisText } from '../encoder';
import { applyGuidelineRules } from '../rulesEngine';
import { getICDEntry, initIcdData } from '../dataSource';

before(async () => {
  await initIcdData();
});

describe('ICD-10-CM encoder scenarios', () => {
  it('enforces diabetes + CKD combo with staging', () => {
    const result = encodeDiagnosisText('Type 2 diabetes with CKD stage 4');
    const codes = result.codes.map((c) => c.code);
    assert.deepEqual(codes.slice(0, 2), ['E11.22', 'N18.4']);
    assert.deepEqual(result.warnings, []);
  });

  it('codes diabetes with CKD stage 3b and stages CKD secondary', () => {
    const result = encodeDiagnosisText('Type 2 diabetes with CKD stage 3b');
    const codes = result.codes.map((c) => c.code);
    assert.equal(codes[0], 'E11.22');
    assert.ok(codes.includes('N18.32'));
  });

  it('codes hypertension with CKD stage 3 per guidelines', () => {
    const result = encodeDiagnosisText('Hypertension with chronic kidney disease stage 3');
    const codes = result.codes.map((c) => c.code);
    assert.ok(codes.some((c) => c.startsWith('I12.')));
    assert.ok(codes.some((c) => c.startsWith('N18.3')));
    assert.ok(!codes.includes('I10'));
  });

  it('codes hypertensive heart disease with heart failure', () => {
    const result = encodeDiagnosisText('Hypertensive heart disease with heart failure');
    const codes = result.codes.map((c) => c.code);
    assert.ok(codes.includes('I11.0'));
    assert.ok(codes.some((c) => c.startsWith('I50.')));
    assert.ok(!codes.includes('I10'));
  });

  it('sequences hypertensive heart disease with HF correctly', () => {
    const result = encodeDiagnosisText('Hypertensive heart disease with heart failure');
    const codes = result.codes.map((c) => c.code);
    assert.equal(codes[0], 'I11.0');
    assert.ok(codes.some((c) => c.startsWith('I50.')));
  });

  it('codes hypertension with heart failure and CKD to combination rules', () => {
    const result = encodeDiagnosisText('Hypertensive heart and chronic kidney disease with heart failure and CKD stage 4');
    const codes = result.codes.map((c) => c.code);
    assert.ok(codes.includes('I13.0'));
    assert.ok(codes.some((c) => c.startsWith('I50.')));
    assert.ok(codes.includes('N18.4'));
  });

  it('removes uncomplicated diabetes when CKD is present', () => {
    const result = encodeDiagnosisText('type 1 diabetes with CKD stage 3 and neuropathy');
    const codes = result.codes.map((c) => c.code);
    assert.ok(codes.includes('E10.22'));
    assert.ok(!codes.includes('E10.9'));
    assert.ok(codes.includes('N18.3'));
    assert.ok(codes.some((c) => c.startsWith('E10.4')));
  });

  it('assigns hypertension with CKD to I12.x', () => {
    const result = encodeDiagnosisText('hypertension with CKD stage 3b');
    const codes = result.codes.map((c) => c.code);
    assert.ok(codes.includes('I12.9'));
    assert.ok(codes.includes('N18.32'));
  });

  it('ranks composite diabetes, hypertension, and CKD with combination codes first', () => {
    const result = encodeDiagnosisText('type 2 diabetes with CKD stage 4 and hypertension');
    const codes = result.codes.map((c) => c.code);
    const topThree = codes.slice(0, 3);
    assert.ok(topThree.includes('E11.22'));
    assert.ok(topThree.includes('I12.9'));
    assert.ok(codes.includes('N18.4'));
  });

  it('assigns hypertension with heart failure to I11.0', () => {
    const result = encodeDiagnosisText('hypertension with heart failure');
    const codes = result.codes.map((c) => c.code);
    assert.ok(codes.includes('I11.0'));
    assert.ok(codes.includes('I50.9'));
  });

  it('assigns hypertension with HF and CKD to I13.x and adds CKD stage', () => {
    const result = encodeDiagnosisText('hypertension with heart failure and CKD stage 5');
    const codes = result.codes.map((c) => c.code);
    assert.ok(codes.includes('I13.0'));
    assert.ok(codes.includes('I50.9'));
    assert.ok(codes.includes('N18.5'));
  });

  it('sequences hypertensive heart + CKD + HF with correct staging', () => {
    const result = encodeDiagnosisText('hypertensive heart and chronic kidney disease with heart failure stage 4 CKD');
    const codes = result.codes.map((c) => c.code);
    assert.equal(codes[0], 'I13.0');
    assert.ok(codes.some((c) => c.startsWith('I50.')));
    assert.ok(codes.includes('N18.4'));
  });

  it('prioritizes hypertensive heart and CKD combinations and removes conflicting hypertension codes', () => {
    const result = encodeDiagnosisText('hypertension with heart failure and chronic kidney disease stage 3');
    const codes = result.codes.map((c) => c.code);
    assert.equal(codes[0], 'I13.0');
    assert.ok(!codes.includes('I10'));
    assert.ok(!codes.some((c) => c.startsWith('I12')));
    assert.ok(codes.some((c) => c.startsWith('N18.3')));
  });

  it('adds N18.x whenever CKD stage is documented', () => {
    const result = encodeDiagnosisText('chronic kidney disease stage 3 with diabetes');
    const codes = result.codes.map((c) => c.code);
    assert.ok(codes.includes('N18.3'));
  });

  it('uses retinopathy laterality codes', () => {
    const result = encodeDiagnosisText('type 2 diabetes with diabetic retinopathy left eye');
    const codes = result.codes.map((c) => c.code);
    assert.ok(codes.includes('E11.3322') || codes.some((c) => c.startsWith('E11.3')));
  });

  it('uses neuropathy combination codes', () => {
    const result = encodeDiagnosisText('type 2 diabetes with peripheral neuropathy');
    const codes = result.codes.map((c) => c.code);
    assert.ok(codes.includes('E11.42'));
    assert.ok(!codes.includes('E11.9'));
    assert.ok(result.codes[0].code.startsWith('E11.4'));
    assert.ok(!result.codes[0].code.startsWith('G'));
  });

  it('prioritizes diabetic neuropathy and suppresses unrelated complications', () => {
    const result = encodeDiagnosisText('Type 2 diabetes with neuropathy');
    const codes = result.codes.map((c) => c.code);
    assert.ok(result.codes[0].code.startsWith('E11.4'));
    assert.ok(codes.includes('E11.40') || codes.includes('E11.42'));
    assert.ok(!codes.some((c) => c.startsWith('E11.3')));
    assert.ok(!codes.some((c) => c.startsWith('E11.2')));
    assert.ok(!codes.some((c) => c.startsWith('E11.0') || c.startsWith('E11.1')));
    assert.ok(!codes.some((c) => /^H47\.|G58\.|G60\.|G62\.|M14\.6/.test(c)));
  });

  it('hard-codes diabetic neuropathy as the primary diabetes manifestation', () => {
    const result = encodeDiagnosisText('Type 2 diabetes with neuropathy');
    const codes = result.codes.map((c) => c.code);
    assert.ok(result.codes[0].code === 'E11.40' || result.codes[0].code === 'E11.42');
    assert.ok(!codes.some((c) => c.startsWith('E11.3')));
    assert.ok(!codes.some((c) => c.startsWith('E11.2')));
    assert.ok(!codes.some((c) => c.startsWith('E11.0') || c.startsWith('E11.1')));
    assert.ok(!codes.some((c) => c.startsWith('H47.')));
    assert.ok(!codes.some((c) => c.startsWith('N18.')));
    assert.ok(!codes.includes('M14.6'));
  });

  it('uses nephropathy combination codes', () => {
    const result = encodeDiagnosisText('type 2 diabetes with nephropathy');
    const codes = result.codes.map((c) => c.code);
    assert.ok(codes.includes('E11.21'));
  });

  it('captures hypoglycemia without coma', () => {
    const result = encodeDiagnosisText('type 2 diabetes with hypoglycemia episodes');
    assert.ok(result.codes.map((c) => c.code).includes('E11.649'));
  });

  it('captures hyperosmolar crisis', () => {
    const result = encodeDiagnosisText('type 2 diabetes with hyperosmolar state');
    assert.ok(result.codes.map((c) => c.code).includes('E11.00'));
  });

  it('codes diabetic ketoacidosis with coma for type 1 diabetes', () => {
    const result = encodeDiagnosisText('Type 1 diabetes with ketoacidosis with coma');
    assert.equal(result.codes[0].code, 'E10.11');
  });

  it('maps diabetic hypoglycemia without coma', () => {
    const result = encodeDiagnosisText('Type 2 diabetes with hypoglycemia without coma');
    assert.ok(result.codes.some((c) => c.code === 'E11.649'));
  });

  it('maps diabetic hyperosmolar state without coma', () => {
    const result = encodeDiagnosisText('Type 2 diabetes with hyperosmolarity without coma');
    assert.equal(result.codes[0].code, 'E11.00');
  });

  it('codes diabetic nephropathy with proteinuria', () => {
    const result = encodeDiagnosisText('Type 2 diabetes with diabetic nephropathy and proteinuria');
    assert.ok(result.codes.some((c) => c.code === 'E11.21'));
  });

  it('codes diabetic CKD with staging and sequencing', () => {
    const result = encodeDiagnosisText('Type 2 diabetes mellitus with chronic kidney disease stage 4');
    assert.equal(result.codes[0].code, 'E11.22');
    assert.ok(result.codes.some((c) => c.code === 'N18.4'));
  });

  it('codes diabetic peripheral angiopathy with gangrene', () => {
    const result = encodeDiagnosisText('Type 2 diabetes with peripheral angiopathy with gangrene of left foot');
    assert.equal(result.codes[0].code, 'E11.52');
    assert.ok(!result.codes.some((c) => c.code.startsWith('I70')));
  });

  it('prioritizes diabetic gangrene code when documented', () => {
    const result = encodeDiagnosisText('Type 2 diabetes with peripheral angiopathy and gangrene');
    const codes = result.codes.map((c) => c.code);
    assert.equal(codes[0], 'E11.52');
  });

  it('codes diabetic retinopathy without macular edema', () => {
    const result = encodeDiagnosisText('Type 2 diabetes with diabetic retinopathy without macular edema');
    assert.ok(result.codes.some((c) => c.code === 'E11.319'));
    assert.ok(!result.codes.some((c) => c.code.startsWith('H36')));
  });

  it('drops generic H36 retinopathy codes when diabetic retinopathy applies', () => {
    const diabetesConcept = {
      raw: 'diabetes with retinopathy',
      type: 'diabetes',
      attributes: {
        diabetesType: 'type2',
        diabetes: {
          subtype: 'E11',
          retinopathy: { present: true, severity: 'unspecified' },
          hyperosmolarity: { present: false },
          ketoacidosis: { present: false },
          hypoglycemia: { present: false },
        },
      },
    } as const;

    const result = applyGuidelineRules({
      concepts: [diabetesConcept],
      initialCandidates: [
        { code: 'E11.9', reason: 'diabetes unspecified', baseScore: 5, conceptRefs: [diabetesConcept.raw] },
        { code: 'H36.0', reason: 'generic retinopathy', baseScore: 5, conceptRefs: [diabetesConcept.raw] },
      ],
    });

    const codes = result.finalCandidates.map((c) => c.code);
    assert.ok(codes.some((code) => code.startsWith('E11.3')));
    assert.ok(!codes.some((code) => code.startsWith('H36')));
    assert.deepEqual(result.removedCodes, ['E11.9', 'H36.0']);
  });

  it('codes diabetic neuropathic arthropathy', () => {
    const result = encodeDiagnosisText('Type 2 diabetes with diabetic neuropathic arthropathy (Charcot joint)');
    assert.ok(result.codes.some((c) => c.code === 'E11.610'));
    assert.ok(!result.codes.some((c) => c.code === 'M14.6'));
  });

  it('codes diabetic Charcot foot with the diabetic manifestation first', () => {
    const result = encodeDiagnosisText('Type 2 diabetes with Charcot foot');
    const codes = result.codes.map((c) => c.code);
    assert.equal(codes[0], 'E11.610');
    assert.ok(!codes.includes('M14.6'));
  });

  it('excludes generic Charcot joint codes in favor of diabetic Charcot manifestations', () => {
    const diabetesConcept = {
      raw: 'type 2 diabetes with Charcot joint',
      type: 'diabetes',
      attributes: {
        diabetesType: 'type2',
        diabetes: {
          subtype: 'E11',
          charcotJoint: true,
          hyperosmolarity: { present: false },
          ketoacidosis: { present: false },
          hypoglycemia: { present: false },
        },
      },
    } as const;

    const result = applyGuidelineRules({
      concepts: [diabetesConcept],
      initialCandidates: [
        { code: 'E11.9', reason: 'diabetes without specified manifestation', baseScore: 5, conceptRefs: [diabetesConcept.raw] },
        { code: 'M14.6', reason: 'generic neuropathic arthropathy', baseScore: 5, conceptRefs: [diabetesConcept.raw] },
      ],
    });

    const codes = result.finalCandidates.map((c) => c.code);
    assert.ok(codes.includes('E11.610'));
    assert.ok(!codes.includes('M14.6'));
    assert.deepEqual(result.removedCodes, ['E11.9', 'M14.6']);
  });

  it('prefers diabetic neuropathy codes over generic neuropathy codes when diabetes present', () => {
    const result = encodeDiagnosisText('Type 2 diabetes with peripheral neuropathy');
    assert.ok(result.codes[0].code.startsWith('E11.4'));
    assert.ok(!result.codes.some((c) => c.code.startsWith('G58') || c.code.startsWith('G62') || c.code.startsWith('H47') || c.code.startsWith('M14.6')));
  });

  it('codes intercostal neuropathy without diabetes context', () => {
    const result = encodeDiagnosisText('Intercostal neuropathy');
    assert.ok(result.codes.some((c) => c.code.startsWith('G58')));
  });

  it('codes Charcot joint due to diabetes with diabetic code', () => {
    const result = encodeDiagnosisText('Charcot joint due to diabetes');
    assert.ok(result.codes.some((c) => c.code.endsWith('610')));
    assert.ok(!result.codes.some((c) => c.code === 'M14.6'));
  });

  it('codes toxic optic neuropathy without diabetes using ophthalmic codes', () => {
    const result = encodeDiagnosisText('Toxic optic neuropathy');
    assert.ok(result.codes.some((c) => c.code.startsWith('H46')) || result.codes.some((c) => c.code.startsWith('H47')));
  });

  it('codes diabetic foot ulcer with additional ulcer code', () => {
    const result = encodeDiagnosisText('Type 2 diabetes with diabetic foot ulcer, left heel');
    assert.ok(result.codes.some((c) => c.code === 'E11.621'));
    assert.ok(result.codes.some((c) => c.code.startsWith('L97.4')));
  });

  it('codes secondary diabetes due to pancreatitis with underlying condition code', () => {
    const result = encodeDiagnosisText('Secondary diabetes due to chronic pancreatitis');
    const codes = result.codes.map((c) => c.code);
    assert.ok(codes[0].startsWith('E08'));
    assert.ok(codes.some((c) => c.startsWith('K86.1')));
  });

  it('prefers pregnancy O codes over endocrine/hypertensive codes', () => {
    const result = encodeDiagnosisText('pregnancy with preexisting type 2 diabetes and hypertension');
    const codes = result.codes.map((c) => c.code);
    assert.ok(codes.some((c) => c.startsWith('O24')) || codes.includes('O26.90'));
    assert.ok(!codes.some((c) => c.startsWith('E1')));
    assert.ok(!codes.some((c) => c.startsWith('I1')));
  });

  it('codes gestational diabetes by trimester', () => {
    const result = encodeDiagnosisText('Gestational diabetes third trimester diet controlled');
    const codes = result.codes.map((c) => c.code);
    assert.ok(codes.some((c) => c.startsWith('O24.41')));
    assert.ok(!codes.some((c) => c.startsWith('E1')));
  });

  it('codes mild preeclampsia in second trimester', () => {
    const result = encodeDiagnosisText('Mild preeclampsia second trimester');
    const codes = result.codes.map((c) => c.code);
    assert.ok(codes.includes('O14.02'));
  });

  it('codes hyperemesis gravidarum with metabolic disturbance', () => {
    const result = encodeDiagnosisText('Hyperemesis gravidarum with metabolic disturbance');
    const codes = result.codes.map((c) => c.code);
    assert.ok(codes.includes('O21.1'));
  });

  it('orders metastatic before primary neoplasm', () => {
    const result = encodeDiagnosisText('Metastatic cancer to liver from colon primary');
    const codes = result.codes.map((c) => c.code);
    assert.equal(codes[0], 'C78.7');
    assert.ok(codes.includes('C18.9'));
  });

  it('codes secondary liver cancer with colon primary', () => {
    const result = encodeDiagnosisText('Secondary liver cancer from colon');
    const codes = result.codes.map((c) => c.code);
    assert.ok(codes.includes('C78.7'));
    assert.ok(codes.includes('C18.9'));
  });

  it('prioritizes metastatic liver cancer over colon primary', () => {
    const result = encodeDiagnosisText('Secondary liver cancer from colon');
    const codes = result.codes.map((c) => c.code);
    assert.equal(codes[0], 'C78.7');
    assert.ok(codes.includes('C18.9'));
  });

  it('codes bone metastasis with prostate primary', () => {
    const result = encodeDiagnosisText('Bone metastasis from prostate cancer');
    const codes = result.codes.map((c) => c.code);
    assert.ok(codes.includes('C79.51'));
    assert.ok(codes.includes('C61'));
  });

  it('codes follow-up after completed treatment for lung cancer', () => {
    const result = encodeDiagnosisText('Follow-up exam after completed treatment for lung cancer');
    const codes = result.codes.map((c) => c.code);
    assert.ok(codes.includes('Z08'));
    assert.ok(codes.includes('Z85.118'));
  });

  it('codes history of colon cancer', () => {
    const result = encodeDiagnosisText('History of colon cancer');
    const codes = result.codes.map((c) => c.code);
    assert.ok(codes.includes('Z85.038'));
  });

  it('flags conflicting neoplasm sites', () => {
    const result = encodeDiagnosisText('metastatic colon cancer with primary colon cancer');
    assert.ok(result.errors.length >= 1);
  });

  it('requires external cause for injury', () => {
    const result = encodeDiagnosisText('wrist injury after fall');
    const codes = result.codes.map((c) => c.code);
    assert.ok(codes.some((c) => c.startsWith('T14.90')));
    assert.ok(codes.some((c) => c.startsWith('W19')));
  });

  it('enforces 7th character for injury episodes', () => {
    const result = encodeDiagnosisText('ankle fracture subsequent encounter');
    assert.ok(result.codes.some((c) => c.code.endsWith('D')));
  });

  it('codes right femur shaft fracture with initial encounter extension', () => {
    const result = applyGuidelineRules({
      concepts: [],
      initialCandidates: [
        { code: 'S72.301A', reason: 'right femur shaft fracture initial encounter', baseScore: 8, conceptRefs: [] },
        { code: 'W19.XXXA', reason: 'fall from unspecified height', baseScore: 3, conceptRefs: [] },
      ],
    });
    const codes = result.finalCandidates.map((c) => c.code);
    assert.equal(codes[0], 'S72.301A');
    assert.ok(codes.includes('W19.XXXA'));
  });

  it('codes dog bite of left forearm with external cause', () => {
    const result = applyGuidelineRules({
      concepts: [],
      initialCandidates: [
        { code: 'S51.851A', reason: 'dog bite of left forearm initial encounter', baseScore: 8, conceptRefs: [] },
        { code: 'W54.0XXA', reason: 'external cause dog bite initial encounter', baseScore: 6, conceptRefs: [] },
      ],
    });
    const codes = result.finalCandidates.map((c) => c.code);
    assert.equal(codes[0], 'S51.851A');
    assert.ok(codes.includes('W54.0XXA'));
  });

  it('keeps COPD separated from asthma', () => {
    const result = encodeDiagnosisText('COPD with acute exacerbation and asthma history');
    const codes = result.codes.map((c) => c.code);
    assert.ok(codes.includes('J44.1'));
  });

  it('codes COPD with acute lower respiratory infection', () => {
    const result = encodeDiagnosisText('COPD with acute lower respiratory infection');
    const codes = result.codes.map((c) => c.code);
    assert.ok(codes.includes('J44.0'));
    assert.ok(codes.some((c) => c.startsWith('J1')));
  });

  it('codes COPD with acute exacerbation', () => {
    const result = encodeDiagnosisText('Chronic obstructive pulmonary disease with acute exacerbation');
    const codes = result.codes.map((c) => c.code);
    assert.ok(codes.includes('J44.1'));
  });

  it('codes COPD with acute exacerbation with COPD code first', () => {
    const result = encodeDiagnosisText('COPD with acute exacerbation');
    const codes = result.codes.map((c) => c.code);
    assert.equal(codes[0], 'J44.1');
  });

  it('codes moderate persistent asthma with acute exacerbation', () => {
    const result = encodeDiagnosisText('Moderate persistent asthma with acute exacerbation');
    const codes = result.codes.map((c) => c.code);
    assert.ok(codes.includes('J45.41'));
  });

  it('sequences moderate persistent asthma with exacerbation first', () => {
    const result = encodeDiagnosisText('Asthma, moderate persistent, with acute exacerbation');
    const codes = result.codes.map((c) => c.code);
    assert.equal(codes[0], 'J45.41');
  });

  it('codes severe persistent asthma with status asthmaticus', () => {
    const result = encodeDiagnosisText('Severe persistent asthma with status asthmaticus');
    const codes = result.codes.map((c) => c.code);
    assert.ok(codes.includes('J45.52'));
  });

  it('distinguishes MI from heart failure', () => {
    const result = encodeDiagnosisText('acute myocardial infarction with chronic heart failure');
    const codes = result.codes.map((c) => c.code);
    assert.ok(codes.includes('I21.9'));
    assert.ok(codes.includes('I50.9'));
  });

  it('codes NSTEMI to I21.4', () => {
    const result = applyGuidelineRules({
      concepts: [],
      initialCandidates: [
        { code: 'I21.4', reason: 'NSTEMI documented', baseScore: 9, conceptRefs: [] },
      ],
    });
    const codes = result.finalCandidates.map((c) => c.code);
    assert.equal(codes[0], 'I21.4');
  });

  it('handles COPD with pneumonia', () => {
    const result = encodeDiagnosisText('COPD with lower respiratory infection and pneumonia');
    const codes = result.codes.map((c) => c.code);
    assert.ok(codes.includes('J44.0'));
    assert.ok(codes.includes('J18.9'));
  });

  it('encodes MDD variants', () => {
    const severe = encodeDiagnosisText('Major depressive disorder recurrent severe without psychotic features');
    assert.equal(severe.codes[0].code, 'F33.2');
    const psychotic = encodeDiagnosisText('Major depressive disorder recurrent severe with psychotic features');
    assert.equal(psychotic.codes[0].code, 'F33.3');
  });

  it('keeps confidence scores between 0 and 1', () => {
    const result = encodeDiagnosisText('type 2 diabetes with CKD stage 4');
    result.codes.forEach((c) => {
      assert.ok(c.confidence > 0 && c.confidence <= 0.99);
    });
  });

  it('returns guideline rule metadata when applied', () => {
    const result = encodeDiagnosisText('hypertension with heart failure and CKD stage 4');
    assert.ok(result.codes.some((c) => c.guidelineRule));
  });

  it('adds heart failure code when hypertension with HF is present', () => {
    const result = encodeDiagnosisText('hypertension with heart failure');
    assert.ok(result.codes.includes(result.codes.find((c) => c.code === 'I50.9')!));
  });

  it('ensures hyperosmolar events rank highly', () => {
    const result = encodeDiagnosisText('type 2 diabetes with hyperosmolar state and CKD stage 3');
    assert.ok(result.codes[0].code.startsWith('E11.00'));
  });

  it('boosts ICD codes when Includes text matches the documentation', () => {
    const entry = getICDEntry('A00');
    const originalIncludes = entry?.includes;
    if (entry) entry.includes = ['cholera infection'];

    const ctx = {
      concepts: [],
      initialCandidates: [
        { code: 'A00', reason: 'cholera infection noted', baseScore: 5, conceptRefs: ['cholera infection'] },
        { code: 'A00.9', reason: 'cholera infection noted', baseScore: 5, conceptRefs: ['cholera infection'] },
      ],
    } as const;

    const result = applyGuidelineRules(ctx);
    const boosted = result.finalCandidates.find((candidate) => candidate.code === 'A00');
    const similar = result.finalCandidates.find((candidate) => candidate.code === 'A00.9');

    assert.ok(boosted && similar && boosted.baseScore > similar.baseScore);

    if (entry) entry.includes = originalIncludes;
  });

  it('keeps COPD and MI separate to avoid crash', () => {
    const result = encodeDiagnosisText('COPD with acute exacerbation and myocardial infarction');
    const codes = result.codes.map((c) => c.code);
    assert.ok(codes.includes('J44.1'));
    assert.ok(codes.includes('I21.9'));
  });

  it('tracks sequencing of metastatic lung vs breast primary', () => {
    const result = encodeDiagnosisText('metastatic lung cancer from breast primary');
    const codes = result.codes.map((c) => c.code);
    assert.equal(codes[0], 'C78.0');
    assert.ok(codes.includes('C50.919'));
  });

  it('retains CKD stage when diabetes present', () => {
    const result = encodeDiagnosisText('type 2 diabetes with CKD stage 5');
    const codes = result.codes.map((c) => c.code);
    assert.ok(codes.includes('N18.5'));
  });

  it('leverages ICD guidance metadata to add supporting codes', () => {
    const ctx = {
      concepts: [],
      initialCandidates: [
        { code: 'Z79', reason: 'Long term drug therapy', baseScore: 6, conceptRefs: ['test'] },
      ],
    };
    const result = applyGuidelineRules(ctx);
    assert.ok(result.addedCodes.some((c) => c.code === 'Z51.81'));
    assert.ok(result.warnings.some((warning) => warning.includes('Z51.81')));
  });
});
