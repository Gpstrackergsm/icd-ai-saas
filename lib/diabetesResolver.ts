export type DiabetesType = 'E08' | 'E09' | 'E10' | 'E11' | 'E13';

export interface DiabetesAttributes {
  diabetes_type: DiabetesType;
  complication?: string;
  cause?: string;
  pump_failure?: boolean;
  overdose_or_underdose?: 'overdose' | 'underdose' | 'none';
  laterality?: string;
  stage?: string;
  macular_edema?: boolean;
}

const retinopathyMap: Record<string, { base: string; withMacular: string }> = {
  'mild-npdr': { base: '1', withMacular: '1' },
  'moderate-npdr': { base: '3', withMacular: '3' },
  'severe-npdr': { base: '4', withMacular: '4' },
  pdr: { base: '5', withMacular: '5' },
  unspecified: { base: '1', withMacular: '1' },
};

function detectDiabetesType(text: string): DiabetesType {
  const lower = text.toLowerCase();
  if (/type\s*1/.test(lower)) return 'E10';
  if (/type\s*2/.test(lower)) return 'E11';
  if (/due to\s+(cancer|pancreatitis|chromosome|esrd|renal)/.test(lower)) return 'E08';
  if (/drug[- ]induced|steroid|medication/.test(lower)) return 'E09';
  return 'E11';
}

function resolveRetinopathyCode(prefix: string, description: string): string | undefined {
  const lower = description.toLowerCase();
  if (!/retinopathy/.test(lower)) return undefined;
  const macular = /macular edema/.test(lower);
  const traction = /traction.*detachment/.test(lower);
  let severity: keyof typeof retinopathyMap = 'unspecified';
  if (/mild/.test(lower) && /npdr/.test(lower)) severity = 'mild-npdr';
  else if (/moderate/.test(lower) && /npdr/.test(lower)) severity = 'moderate-npdr';
  else if (/severe/.test(lower) && /npdr/.test(lower)) severity = 'severe-npdr';
  else if (/proliferative/.test(lower)) severity = 'pdr';

  if (severity === 'pdr' && traction) return `${prefix}.352`;
  if (macular) return `${prefix}.3${retinopathyMap[severity].withMacular}1`;
  if (severity === 'mild-npdr') return `${prefix}.329`;
  if (severity === 'moderate-npdr') return `${prefix}.339`;
  if (severity === 'severe-npdr') return `${prefix}.349`;
  if (severity === 'pdr') return `${prefix}.359`;
  return `${prefix}.319`;
}

function mapHyperglycemiaCode(prefix: string): string {
  return `${prefix}.65`;
}

function mapHypoglycemiaCode(prefix: string, withComa: boolean): string {
  return withComa ? `${prefix}.641` : `${prefix}.649`;
}

export interface DiabetesResolution {
  code: string;
  attributes: DiabetesAttributes;
  warning?: string;
}

export function resolveDiabetes(text: string): DiabetesResolution | undefined {
  const lower = text.toLowerCase();
  const diabetesType = detectDiabetesType(lower);
  const attributes: DiabetesAttributes = {
    diabetes_type: diabetesType,
    complication: 'none',
    cause: undefined,
    pump_failure: /insulin pump/.test(lower),
    overdose_or_underdose: 'none',
    macular_edema: /macular edema/.test(lower),
  };

  if (/underlying/.test(lower)) {
    attributes.cause = 'underlying_condition';
  } else if (/adverse effect/.test(lower) || /medication/.test(lower)) {
    attributes.cause = 'drug_adverse_effect';
  }

  const hypoglycemia = /hypoglyc/.test(lower);
  const hyperglycemia = /hyperglyc/.test(lower);
  const coma = /coma/.test(lower);

  const retinoCode = resolveRetinopathyCode(diabetesType, lower);
  if (retinoCode) {
    attributes.complication = 'retinopathy';
    return { code: retinoCode, attributes };
  }

  if (hypoglycemia) {
    attributes.complication = 'hypoglycemia';
    return { code: mapHypoglycemiaCode(diabetesType, coma), attributes };
  }

  if (hyperglycemia) {
    attributes.complication = 'hyperglycemia';
    return { code: mapHyperglycemiaCode(diabetesType), attributes };
  }

  return { code: `${diabetesType}.9`, attributes };
}
