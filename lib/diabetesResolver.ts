export type DiabetesType = 'E08' | 'E09' | 'E10' | 'E11' | 'E13';

export interface DiabetesAttributes {
  diabetes_type: DiabetesType;
  complication?: 'hyperglycemia' | 'hypoglycemia' | 'retinopathy' | 'none';
  cause?: 'underlying_condition' | 'drug' | 'other' | undefined;
  pump_failure?: boolean;
  overdose_or_underdose?: 'overdose' | 'underdose' | 'none';
  laterality?: 'right' | 'left' | 'bilateral' | 'unspecified';
  stage?:
    | 'mild-npdr'
    | 'moderate-npdr'
    | 'severe-npdr'
    | 'pdr'
    | 'traction-detachment'
    | 'combined-detachment'
    | 'unspecified';
  macular_edema?: boolean;
}

export interface DiabetesResolution {
  code: string;
  label: string;
  attributes: DiabetesAttributes;
  warning?: string;
}

function detectDiabetesFamily(text: string): DiabetesType {
  const lower = text.toLowerCase();
  if (/type\s*1/.test(lower)) return 'E10';
  if (/type\s*2/.test(lower)) return 'E11';
  if (/(due to|secondary to|result of)\s+(pancreatitis|cystic fibrosis|malignancy|underlying|condition)/.test(lower)) {
    return 'E08';
  }
  if (/(drug[- ]induced|steroid|medication|chemotherapy)/.test(lower)) return 'E09';
  if (/other specified/.test(lower)) return 'E13';
  return 'E11';
}

function detectLaterality(text: string): DiabetesAttributes['laterality'] {
  if (/bilateral/.test(text)) return 'bilateral';
  if (/left/.test(text)) return 'left';
  if (/right/.test(text)) return 'right';
  return 'unspecified';
}

function detectRetinopathyStage(text: string): DiabetesAttributes['stage'] {
  if (/mild/.test(text) && /npdr/.test(text)) return 'mild-npdr';
  if (/moderate/.test(text) && /npdr/.test(text)) return 'moderate-npdr';
  if (/severe/.test(text) && /npdr/.test(text)) return 'severe-npdr';
  if (/proliferative/.test(text)) return 'pdr';
  if (/traction/.test(text) && /detachment/.test(text)) return 'traction-detachment';
  if (/combined/.test(text) && /detachment/.test(text)) return 'combined-detachment';
  if (/retinopathy/.test(text)) return 'unspecified';
  return undefined;
}

function buildBaseCode(prefix: DiabetesType): string {
  return `${prefix}.9`;
}

function mapHypoglycemiaCode(prefix: DiabetesType, coma: boolean): string {
  return coma ? `${prefix}.641` : `${prefix}.649`;
}

function mapHyperglycemiaCode(prefix: DiabetesType): string {
  return `${prefix}.65`;
}

export function resolveDiabetes(text: string): DiabetesResolution | undefined {
  const lower = text.toLowerCase();
  const prefix = detectDiabetesFamily(lower);
  const attributes: DiabetesAttributes = {
    diabetes_type: prefix,
    complication: 'none',
    cause: undefined,
    pump_failure: /insulin pump/.test(lower),
    overdose_or_underdose: 'none',
    laterality: detectLaterality(lower),
    stage: detectRetinopathyStage(lower),
    macular_edema: /macular edema/.test(lower),
  };

  if (prefix === 'E08') attributes.cause = 'underlying_condition';
  if (prefix === 'E09') attributes.cause = 'drug';

  if (/hypoglyc/.test(lower)) {
    attributes.complication = 'hypoglycemia';
    const coma = /coma/.test(lower);
    return { code: mapHypoglycemiaCode(prefix, coma), label: 'Diabetes with hypoglycemia', attributes };
  }

  if (/hyperglyc/.test(lower)) {
    attributes.complication = 'hyperglycemia';
    return { code: mapHyperglycemiaCode(prefix), label: 'Diabetes with hyperglycemia', attributes };
  }

  if (/retinopathy/.test(lower) || /npdr/.test(lower) || /pdr/.test(lower)) {
    attributes.complication = 'retinopathy';
  }

  return { code: buildBaseCode(prefix), label: 'Diabetes mellitus', attributes };
}
