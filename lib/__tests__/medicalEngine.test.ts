import assert from 'assert';
import { runRulesEngine } from '../rulesEngineCore.js';
import { applyExclusions } from '../exclusionEngine.js';
import { validateHierarchy } from '../hierarchyValidator.js';

function describe(name: string, fn: () => void) {
  console.log(`\n${name}`);
  fn();
}

function test(name: string, fn: () => void) {
  try {
    fn();
    console.log(`✔️  ${name}`);
  } catch (err) {
    console.error(`❌ ${name}`);
    throw err;
  }
}

describe('Insulin pump failure logic', () => {
  test('underdosing adds mechanical, exposure, and hyperglycemia diabetes code', () => {
    const result = runRulesEngine('Patient with insulin pump breakdown causing insufficient insulin and hyperglycemia');
    const codes = result.sequence.map((c) => c.code);
    assert.ok(codes.includes('T85.6X9A'));
    assert.ok(codes.includes('T38.3X6A'));
    assert.ok(codes.includes('E11.65'));
  });
});

describe('Overdose vs adverse vs underdose', () => {
  test('accidental insulin overdose sequences poisoning first', () => {
    const result = runRulesEngine('Accidental insulin overdose with hypoglycemia');
    assert.equal(result.sequence[0].code, 'T38.3X1A');
  });

  test('drug-induced diabetes adverse effect keeps diabetes first', () => {
    const result = runRulesEngine('Drug-induced diabetes with hyperglycemia from adverse effect of medication');
    const codes = result.sequence.map((c) => c.code);
    assert.ok(codes[0].startsWith('E09.65'));
    assert.ok(codes.includes('T50.905A'));
  });
});

describe('Retinopathy accuracy', () => {
  test('maps moderate NPDR with macular edema', () => {
    const result = runRulesEngine('Type 2 diabetes with moderate NPDR with macular edema');
    const codes = result.sequence.map((c) => c.code);
    assert.ok(codes.includes('E11.321'));
  });
});

describe('Excludes handling', () => {
  test('Excludes1 keeps diabetes-specific variant', () => {
    const filtered = applyExclusions([
      { code: 'E11.65', label: '', triggeredBy: 'test', hcc: false },
      { code: 'E11.64', label: '', triggeredBy: 'test', hcc: false },
    ]);
    assert.equal(filtered.filtered.length, 1);
    assert.equal(filtered.filtered[0].code, 'E11.65');
  });

  test('hierarchy removes non-billable parents', () => {
    const hierarchy = validateHierarchy([
      { code: 'E11', label: '', triggeredBy: 'test', hcc: false },
      { code: 'E11.65', label: '', triggeredBy: 'test', hcc: false },
    ]);
    assert.ok(hierarchy.filtered.length === 1 && hierarchy.filtered[0].code === 'E11.65');
  });
});

describe('Drug-induced diabetes rules', () => {
  test('poisoning intent sequences T code first', () => {
    const result = runRulesEngine('Drug-induced diabetes due to insulin overdose with hyperglycemia');
    assert.ok(result.sequence[0].code.startsWith('T38.3'));
  });
});

describe('HCC validation', () => {
  test('complicated diabetes flagged as HCC', () => {
    const result = runRulesEngine('Type 2 diabetes with hyperglycemia');
    const hyper = result.sequence.find((c) => c.code === 'E11.65');
    assert.ok(hyper && hyper.hcc === true);
  });
});

describe('Enhanced Diabetes Intelligence', () => {
  test('Type 2 diabetes with CKD stage 4 uses combination code', () => {
    const result = runRulesEngine('Type 2 diabetes with CKD stage 4');
    const codes = result.sequence.map((c) => c.code);
    assert.ok(codes.includes('E11.22'), 'Should include E11.22 (diabetes with CKD)');
    assert.ok(codes.includes('N18.4'), 'Should include N18.4 (CKD stage 4)');
  });

  test('Diabetes with Charcot joint excludes M14.6', () => {
    const result = runRulesEngine('Type 2 diabetes with Charcot joint');
    const codes = result.sequence.map((c) => c.code);
    assert.ok(codes.includes('E11.610'), 'Should include E11.610');
    assert.ok(!codes.some(code => code.startsWith('M14.6')), 'Should NOT include M14.6*');
    assert.ok(result.warnings.some(w => w.includes('Charcot')), 'Should have Charcot warning');
  });

  test('Diabetes with peripheral neuropathy uses specific code', () => {
    const result = runRulesEngine('Type 2 diabetes with peripheral neuropathy');
    const codes = result.sequence.map((c) => c.code);
    assert.ok(codes.includes('E11.42'), 'Should include E11.42 (peripheral neuropathy)');
  });

  test('Diabetes with autonomic neuropathy', () => {
    const result = runRulesEngine('Type 1 diabetes with autonomic neuropathy');
    const codes = result.sequence.map((c) => c.code);
    assert.ok(codes.includes('E10.43'), 'Should include E10.43 (autonomic neuropathy)');
  });
});

describe('Enhanced Exclusion Rules', () => {
  test('Diabetic neuropathy excludes generic neuropathy codes', () => {
    const filtered = applyExclusions([
      { code: 'E11.42', label: 'Diabetic peripheral neuropathy', triggeredBy: 'test', hcc: false },
      { code: 'G56.0', label: 'Carpal tunnel syndrome', triggeredBy: 'test', hcc: false },
    ]);
    assert.equal(filtered.filtered.length, 1);
    assert.equal(filtered.filtered[0].code, 'E11.42');
  });
});

describe('Enhanced Hierarchy Validation', () => {
  test('Parent-child: E11 removed when E11.22 exists', () => {
    const result = validateHierarchy([
      { code: 'E11', label: 'Diabetes', triggeredBy: 'test', hcc: false },
      { code: 'E11.22', label: 'Diabetes with CKD', triggeredBy: 'test', hcc: false },
    ]);
    assert.ok(result.filtered.some(c => c.code === 'E11.22'), 'Should keep E11.22');
    assert.ok(!result.filtered.some(c => c.code === 'E11'), 'Should remove E11');
  });
});
