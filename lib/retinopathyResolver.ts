import { DiabetesType, DiabetesAttributes } from './diabetesResolver.js';

export interface RetinopathyResolution {
  code?: string;
  label?: string;
  attributes: DiabetesAttributes;
  warnings: string[];
}

function codeForSeverity(prefix: DiabetesType, stage?: DiabetesAttributes['stage'], macular?: boolean): string | undefined {
  if (!stage || stage === 'unspecified') {
    return macular ? `${prefix}.311` : `${prefix}.319`;
  }

  const mac = macular ? '1' : '9';
  switch (stage) {
    case 'mild-npdr':
      return macular ? `${prefix}.311` : `${prefix}.319`;
    case 'moderate-npdr':
      return macular ? `${prefix}.321` : `${prefix}.329`;
    case 'severe-npdr':
      return macular ? `${prefix}.331` : `${prefix}.339`;
    case 'pdr':
      return macular ? `${prefix}.351` : `${prefix}.359`;
    case 'traction-detachment':
      return `${prefix}.352`;
    case 'combined-detachment':
      return `${prefix}.353`;
    default:
      return `${prefix}.3${mac}`;
  }
}

export function resolveRetinopathy(attributes: DiabetesAttributes): RetinopathyResolution | undefined {
  if (attributes.complication !== 'retinopathy') return undefined;
  const warnings: string[] = [];
  const code = codeForSeverity(attributes.diabetes_type, attributes.stage, attributes.macular_edema);
  if (!code) {
    warnings.push('Retinopathy mentioned but stage could not be mapped');
  }
  return {
    code,
    label: 'Diabetic retinopathy',
    attributes,
    warnings,
  };
}
