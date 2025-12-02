// ICD-10-CM Encoder core – generated with Codex helper
// Responsibility: Core type models for ICD-10-CM structured data and rules

export interface IcdCode {
  code: string;
  shortDescription: string;
  longDescription: string;
  chapter: string;
  block?: string;
  section?: string;
  isBillable: boolean;
  isHeader: boolean;
  parentCode?: string;
  category3?: string;
  category4?: string;
  bodySystem?: string;
  bodySite?: string;
  laterality?: "left" | "right" | "bilateral" | "unspecified" | null;
  acuity?: "acute" | "chronic" | "acute_on_chronic" | null;
  severity?: "mild" | "moderate" | "severe" | null;
  stage?: string | null;
  isManifestationOnly?: boolean;
  requiresUnderlyingCode?: boolean;
  codeFirstNote?: string | null;
  useAdditionalCodeNote?: string | null;
  includesNotes?: string[];
  excludes1Notes?: string[];
  excludes2Notes?: string[];
}

export interface IcdIndexTerm {
  id: string;
  term: string;
  originalTerm: string;
  code: string;
  weight: number;
  tags?: string[];
}

export type IcdRelationshipType =
  | "etiology"
  | "manifestation"
  | "code_first"
  | "use_additional"
  | "combination"
  | "excludes1"
  | "excludes2"
  | "includes"
  | "neoplasm_primary"
  | "neoplasm_secondary";

export interface IcdCodeLink {
  sourceCode: string;
  targetCode: string;
  relation: IcdRelationshipType;
  note?: string;
}

export interface IcdGuidelineRule {
  id: string;
  name: string;
  description: string;
  category:
    | "diabetes"
    | "hypertension"
    | "neoplasm"
    | "ob-pregnancy"
    | "injury"
    | "external"
    | "sign-symptom"
    | "general";
  pattern: {
    includesCodes?: string[];
    excludesCodes?: string[];
    requiredConcepts?: string[];
    forbiddenConcepts?: string[];
  };
  action: {
    enforceOrder?: (
      | "etiology_first"
      | "manifestation_second"
      | "hypertension_before_ckd"
      | "diabetes_before_ckd"
    )[];
    addCodes?: string[];
    removeCodes?: string[];
    markErrorIfMissing?: string[];
  };
  severity: "info" | "warning" | "error";
}

export interface ParsedConceptAttributes {
  stage?: string;
  severity?: string;
  laterality?: 'left' | 'right' | 'bilateral' | 'unspecified' | string;
  trimester?: 1 | 2 | 3 | "1st" | "2nd" | "3rd";
  episode?: "initial" | "subsequent" | "sequela";
  acuity?: "acute" | "chronic" | "acute_on_chronic";
  site?: string;
  diabetesType?: 'type1' | 'type2' | 'secondary';
  complications?: {
    retinopathy?: boolean;
    neuropathy?: boolean;
    nephropathy?: boolean;
    hypoglycemia?: boolean;
    hyperosmolar?: boolean;
  };
  hasHypertension?: boolean;
  hasHeartFailure?: boolean;
  heartFailureType?: "systolic" | "diastolic" | "combined" | "unspecified";
  hasCKD?: boolean;
  ckdStage?: 1 | 2 | 3 | 4 | 5 | "ESRD";
  hasNeoplasm?: boolean;
  primaryNeoplasmSite?: string;
  primaryNeoplasmLaterality?: "left" | "right" | "bilateral" | "unspecified";
  metastaticSites?: string[];
  hasHistoryOfCancer?: boolean;
  hasFollowUpAfterCancer?: boolean;
  isPregnant?: boolean;
  pregnancyComplicationType?:
    | "preeclampsia"
    | "gestationalDiabetes"
    | "hyperemesis"
    | "placentaPrevia"
    | "threatenedAbortion"
    | "postpartumHemorrhage";
  hasCOPD?: boolean;
  hasAsthma?: boolean;
  asthmaSeverity?:
    | "mildIntermittent"
    | "mildPersistent"
    | "moderatePersistent"
    | "severePersistent"
    | "unspecified";
  hasAcuteExacerbation?: boolean;
  hasAcuteLowerRespInfection?: boolean;
  pneumoniaOrganism?: "staph" | "klebsiella" | "viral" | "unspecified";
  diabetes?: ParsedDiabetesAttributes;
  neuropathy?: boolean;
  neuropathyEtiology?: string;
}

export type DiabetesSubtype = "E08" | "E09" | "E10" | "E11" | "E13";

export interface ParsedDiabetesAttributes {
  subtype?: DiabetesSubtype;
  uncontrolled?: boolean;
  hypoglycemia?: {
    present: boolean;
    withComa?: boolean;
  };
  ketoacidosis?: {
    present: boolean;
    withComa?: boolean;
    withHyperosmolarity?: boolean;
  };
  hyperosmolarity?: {
    present: boolean;
    withComa?: boolean;
  };
  nephropathy?: boolean;
  ckdStage?: string | undefined;
  neuropathy?: boolean;
  peripheralAngiopathy?: {
    present: boolean;
    withGangrene?: boolean;
  };
  retinopathy?: {
    present: boolean;
    severity?: "unspecified" | "mild-npdr" | "moderate-npdr" | "severe-npdr" | "pdr";
    withMacularEdema?: boolean;
    withTractionDetachmentMacula?: boolean;
  };
  footUlcer?: boolean;
  charcotJoint?: boolean;
  cataract?: boolean;
  dueToUnderlyingCondition?: boolean;
  dueToDrugOrChemical?: boolean;
  gestationalOrPregnancy?: boolean;
  dueToObesity?: boolean;
  longTermInsulinUse?: boolean;
}

export interface ParsedConcept {
  raw: string;
  normalized: string;
  type:
    | "diabetes"
    | "ckd"
    | "hypertension"
    | "heart_failure"
    | "copd"
    | "asthma"
    | "neoplasm"
    | "pregnancy"
    | "injury"
    | "symptom"
    | "other";
  attributes: ParsedConceptAttributes;
}

export interface CandidateCode {
  code: string;
  reason: string;
  baseScore: number;
  conceptRefs: string[];
  guidelineRule?: string;
}

export interface EncodingContext {
  concepts: ParsedConcept[];
  initialCandidates: CandidateCode[];
}

export interface RuleResult {
  addedCodes: CandidateCode[];
  removedCodes: string[];
  reorderedCodes: string[];
  warnings: string[];
  errors: string[];
  finalCandidates?: CandidateCode[];
}

export interface EncoderOutputCode {
  code: string;
  description: string;
  reason: string;
  order: number;
  guidelineRule?: string;
  confidence: number;
}

export interface EncoderOutput {
  codes: EncoderOutputCode[];
  warnings: string[];
  errors: string[];
  debug?: any;
}
