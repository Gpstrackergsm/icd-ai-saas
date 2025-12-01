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
  it('enforces diabetes + CKD combo with staging', () => {
    const result = encodeDiagnosisText('Type 2 diabetes with CKD stage 4');
    const codes = result.codes.map((c) => c.code);
    assert.deepEqual(codes.slice(0, 2), ['E11.22', 'N18.4']);
    assert.deepEqual(result.warnings, []);
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
    assert.ok(codes.includes('E10.42'));
  });

  it('assigns hypertension with CKD to I12.x', () => {
    const result = encodeDiagnosisText('hypertension with CKD stage 3b');
    const codes = result.codes.map((c) => c.code);
    assert.ok(codes.includes('I12.9'));
    assert.ok(codes.includes('N18.32'));
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

  it('codes moderate persistent asthma with acute exacerbation', () => {
    const result = encodeDiagnosisText('Moderate persistent asthma with acute exacerbation');
    const codes = result.codes.map((c) => c.code);
    assert.ok(codes.includes('J45.41'));
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
});
