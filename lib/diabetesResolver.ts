export type DiabetesType = 'E08' | 'E09' | 'E10' | 'E11' | 'E13' | 'none';

export interface DiabetesAttributes {
  diabetes_type: DiabetesType;
  complication?:
    | 'hyperglycemia'
    | 'hypoglycemia'
    | 'retinopathy'
    | 'ketoacidosis'
    | 'neuropathy'
    | 'circulatory'
    | 'oral'
    | 'unspecified'
    | 'none';
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
  presymptomatic_stage?: 'stage1' | 'stage2';
}

export interface DiabetesResolution {
  code: string;
  label: string;
  attributes: DiabetesAttributes;
  warnings?: string[];
}

function detectDiabetesFamily(text: string): DiabetesType | undefined {
  if (/type\s*1/.test(text)) return 'E10';
  if (/type\s*2/.test(text)) return 'E11';
  if (/(due to|secondary to|result of)\s+(pancreatitis|cystic fibrosis|malignancy|underlying|condition)/.test(text)) {
    return 'E08';
  }
  if (/(drug[- ]induced|steroid|medication|chemotherapy)/.test(text)) return 'E09';
  if (/other specified/.test(text)) return 'E13';
  if (/diabet/.test(text) || /\bdm\b/.test(text)) return 'E11';
  return undefined;
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
  if (prefix === 'none') return 'E15';
  return coma ? `${prefix}.641` : `${prefix}.649`;
}

function mapHyperglycemiaCode(prefix: DiabetesType): string {
  return `${prefix}.65`;
}

export function resolveDiabetes(text: string): DiabetesResolution | undefined {
  const lower = text.toLowerCase();
  const warnings: string[] = [];
  const diabetesPresent =
    /diabet/.test(lower) || /\bdm\b/.test(lower) || /type\s*[12]/.test(lower) || /presymptomatic/.test(lower) || /due to underlying condition/.test(lower);
  const prefix = detectDiabetesFamily(lower);
  const diabetes_type: DiabetesType = diabetesPresent ? prefix || 'E11' : 'none';
  const attributes: DiabetesAttributes = {
    diabetes_type,
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

  if (!diabetesPresent) {
    if (/hypoglyc/.test(lower) && /coma/.test(lower)) {
      attributes.complication = 'hypoglycemia';
      return { code: 'E15', label: 'Nondiabetic hypoglycemic coma', attributes, warnings };
    }
    return undefined;
  }

  if (!prefix) {
    warnings.push('Diabetes mentioned without type; unable to assign family');
  }

  const presymptomaticStage1 = /stage\s*1/.test(lower) || (/presymptomatic/.test(lower) && /multiple autoantibodies/.test(lower)) || (/presymptomatic/.test(lower) && /normoglycemia/.test(lower));
  const presymptomaticStage2 = /stage\s*2/.test(lower) || (/presymptomatic/.test(lower) && /islet autoimmunity/.test(lower)) || (/presymptomatic/.test(lower) && /dysglycemia/.test(lower));

  if (presymptomaticStage1 && presymptomaticStage2) {
    warnings.push('Conflicting presymptomatic stages detected');
  }

  if (prefix === 'E10' && (presymptomaticStage1 || presymptomaticStage2)) {
    attributes.presymptomatic_stage = presymptomaticStage1 ? 'stage1' : 'stage2';
    if (/complication|hypoglyc|hyperglyc|retinopathy|ketoacidosis/.test(lower)) {
      warnings.push('Presymptomatic Type 1 diabetes cannot be reported with complications; complications ignored');
    }
    const code = presymptomaticStage1 ? 'E10.A1' : 'E10.A2';
    return { code, label: 'Presymptomatic Type 1 diabetes', attributes, warnings };
  }

  if (/ketoacidosis|\bdka\b/.test(lower)) {
    if (/coma/.test(lower)) {
      warnings.push('DKA with coma detected; coma not supported in current mapping');
    }
    attributes.complication = 'ketoacidosis';
    const code = prefix === 'E10' ? 'E10.10' : prefix === 'E11' ? 'E11.10' : `${diabetes_type}.10`;
    return { code, label: 'Diabetes with ketoacidosis', attributes, warnings };
  }

  if (/hypoglyc/.test(lower)) {
    attributes.complication = 'hypoglycemia';
    const coma = /coma/.test(lower);
    const code = prefix === 'E08' && coma ? 'E08.641' : mapHypoglycemiaCode(diabetes_type, coma);
    return { code, label: coma ? 'Diabetes with hypoglycemic coma' : 'Diabetes with hypoglycemia', attributes, warnings };
  }

  if (/hyperglyc/.test(lower)) {
    attributes.complication = 'hyperglycemia';
    return { code: mapHyperglycemiaCode(diabetes_type), label: 'Diabetes with hyperglycemia', attributes, warnings };
  }

  if (/retinopathy/.test(lower) || /npdr/.test(lower) || /pdr/.test(lower)) {
    attributes.complication = 'retinopathy';
  }

  if (prefix === 'E10') {
    if (/neuropath/.test(lower)) {
      attributes.complication = 'neuropathy';
      return { code: 'E10.40', label: 'Type 1 diabetes with neuropathy', attributes, warnings };
    }
    if (/circulatory|angiopathy|pvd|vascular/.test(lower)) {
      attributes.complication = 'circulatory';
      return { code: 'E10.59', label: 'Type 1 diabetes with circulatory complications', attributes, warnings };
    }
    if (/oral|periodontal|gingivitis|dental/.test(lower)) {
      attributes.complication = 'oral';
      return { code: 'E10.638', label: 'Type 1 diabetes with oral complications', attributes, warnings };
    }
    if (/complication/.test(lower) && attributes.complication === 'none') {
      attributes.complication = 'unspecified';
      return { code: 'E10.8', label: 'Type 1 diabetes with unspecified complication', attributes, warnings };
    }
  }

  return { code: buildBaseCode(diabetes_type), label: 'Diabetes mellitus', attributes, warnings };
}
