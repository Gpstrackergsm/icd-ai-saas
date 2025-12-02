import assert from 'assert';
import { runRulesEngine } from '../rulesEngine.js';
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
