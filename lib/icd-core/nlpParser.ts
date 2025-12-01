// ICD-10-CM Encoder core – generated with Codex helper
// Responsibility: Deterministic NLP helpers to normalize text and extract concepts

import type { CandidateCode, ParsedConcept } from './models.ts';
import { searchIndex } from './dataSource.ts';

const abbreviationMap: Record<string, string> = {
  copd: 'chronic obstructive pulmonary disease',
  mi: 'myocardial infarction',
  htn: 'hypertension',
  ckd: 'chronic kidney disease',
  dm: 'diabetes mellitus',
};

const synonymExpansions: Record<string, string> = {
  'heart attack': 'acute myocardial infarction',
  'type 2 diabetes': 'type 2 diabetes mellitus',
  'type ii diabetes': 'type 2 diabetes mellitus',
  'secondary cancer': 'metastatic cancer',
};

export function normalizeText(text: string): string {
  let normalized = text.toLowerCase();
  normalized = normalized.replace(/\s+/g, ' ').trim();
  Object.entries(abbreviationMap).forEach(([abbr, expansion]) => {
    normalized = normalized.replace(new RegExp(`\\b${abbr}\\b`, 'g'), expansion);
  });
  Object.entries(synonymExpansions).forEach(([term, expansion]) => {
    normalized = normalized.replace(new RegExp(`\\b${term}\\b`, 'g'), expansion);
  });
  return normalized;
}

export function extractClinicalConcepts(text: string): ParsedConcept[] {
  const normalized = normalizeText(text);
  const concepts: ParsedConcept[] = [];

  if (/diabetes/.test(normalized)) {
    const stage = normalized.match(/stage\s*(\d(?:b)?)/)?.[1];
    const diabetesType = normalized.includes('type 1') ? 'type1' : normalized.includes('type 2') ? 'type2' : 'type2';
    const lateralityMatch =
      normalized.match(/left eye|os\b|left\s+retina/)?.[0]
        ? 'left'
        : normalized.match(/right eye|od\b|right\s+retina/)?.[0]
          ? 'right'
          : normalized.match(/bilateral|both eyes/)?.[0]
            ? 'bilateral'
            : undefined;
    const hasRetinopathy = /retinopathy/.test(normalized);
    const hasNeuropathy = /neuropathy/.test(normalized);
    const hasNephropathy = /nephropathy/.test(normalized);
    const hasHypoglycemia = /hypoglycemia/.test(normalized);
    const hasHyperosmolar = /hyperosmolar/.test(normalized);
    concepts.push({
      raw: text,
      normalized: normalized.includes('type 1') ? 'type 1 diabetes' : 'type 2 diabetes',
      type: 'diabetes',
      attributes: {
        stage: stage || undefined,
        diabetesType,
        laterality: lateralityMatch,
        complications: {
          retinopathy: hasRetinopathy,
          neuropathy: hasNeuropathy,
          nephropathy: hasNephropathy,
          hypoglycemia: hasHypoglycemia,
          hyperosmolar: hasHyperosmolar,
        },
      },
    });
  }

  const ckdStage = normalized.match(/ckd\s*stage\s*(\d(?:b)?)/)?.[1] ||
    normalized.match(/stage\s*(\d(?:b)?)\s*ckd/)?.[1] ||
    normalized.match(/stage\s*(\d(?:b)?)/)?.[1];
  if (/chronic kidney disease/.test(normalized) || ckdStage) {
    concepts.push({
      raw: text,
      normalized: 'chronic kidney disease',
      type: 'ckd',
      attributes: { stage: ckdStage || undefined },
    });
  }

  if (/hypertension|hypertensive|high blood pressure/.test(normalized)) {
    concepts.push({ raw: text, normalized: 'hypertension', type: 'hypertension', attributes: {} });
  }

  if (/heart failure|cardiac failure/.test(normalized)) {
    concepts.push({ raw: text, normalized: 'heart failure', type: 'heart_failure', attributes: {} });
  }

  if (/myocardial infarction|heart attack/.test(normalized)) {
    concepts.push({ raw: text, normalized: 'acute myocardial infarction', type: 'other', attributes: {} });
  }

  if (/copd|chronic obstructive pulmonary disease/.test(normalized)) {
    const acuteExac = /acute exacerbation/.test(normalized) ? 'acute_on_chronic' : undefined;
    concepts.push({ raw: text, normalized: 'chronic obstructive pulmonary disease', type: 'copd', attributes: { acuity: acuteExac } });
  }

  if (/asthma/.test(normalized)) {
    concepts.push({ raw: text, normalized: 'asthma', type: 'asthma', attributes: {} });
  }

  if (/pregnan/.test(normalized)) {
    const trimester =
      /third trimester/.test(normalized) ? '3rd' :
      /second trimester|\b16\s*weeks?\b/.test(normalized) ? '2nd' :
      /first trimester|\b10\s*weeks?\b/.test(normalized) ? '1st' : undefined;
    concepts.push({ raw: text, normalized: 'pregnancy', type: 'pregnancy', attributes: { trimester } });
  }

  if (/metastasis|metastatic|secondary cancer/.test(normalized)) {
    const siteMatch = normalized.match(/secondary\s+([a-z\s]+?)\s+cancer/);
    const metastaticTo = normalized.match(/metastatic\s+cancer\s+to\s+([a-z]+)/)?.[1];
    const metastaticLeadingSite = normalized.match(/metastatic\s+(lung|liver|brain|bone|colon|breast)/)?.[1];
    const site = (siteMatch?.[1] || metastaticTo || metastaticLeadingSite)?.trim();
    concepts.push({
      raw: text,
      normalized: site ? `secondary ${site} cancer` : 'secondary neoplasm',
      type: 'neoplasm',
      attributes: { site, severity: 'secondary' },
    });
  }

  if (/cancer|neoplasm|carcinoma/.test(normalized)) {
    const originSite = normalized.match(/from\s+(lung|colon|breast|liver|brain|pancreas)\s+primary/)?.[1];
    const siteMatch = originSite ? [originSite] : normalized.match(/(lung|colon|breast|liver|brain|pancreas)/);
    concepts.push({
      raw: text,
      normalized: `${siteMatch?.[1] || originSite || 'primary'} neoplasm`,
      type: 'neoplasm',
      attributes: { site: siteMatch?.[1] || originSite, severity: 'primary' },
    });
  }

  if (/pneumonia/.test(normalized)) {
    concepts.push({ raw: text, normalized: 'pneumonia', type: 'symptom', attributes: {} });
  }

  if (/depress/.test(normalized)) {
    const hasPsychotic = /with psychotic/.test(normalized);
    concepts.push({
      raw: text,
      normalized: hasPsychotic
        ? 'major depressive disorder recurrent severe with psychotic features'
        : 'major depressive disorder recurrent severe without psychotic features',
      type: 'other',
      attributes: { severity: hasPsychotic ? 'severe_psychotic' : 'severe' },
    });
  }

  if (/fracture|laceration|injury|contusion|sprain/.test(normalized)) {
    const episode = /sequela/.test(normalized)
      ? 'sequela'
      : /subsequent/.test(normalized)
        ? 'subsequent'
        : 'initial';
    const siteMatch = normalized.match(/(wrist|ankle|knee|arm|head|femur|hip)/);
    concepts.push({
      raw: text,
      normalized: `${siteMatch?.[1] || 'injury'} injury`,
      type: 'injury',
      attributes: { episode: episode as any, site: siteMatch?.[1] },
    });
  }

  return concepts;
}

function addCandidate(collection: CandidateCode[], candidate: CandidateCode) {
  const existing = collection.find((item) => item.code === candidate.code);
  if (existing) {
    existing.baseScore = Math.max(existing.baseScore, candidate.baseScore);
    existing.conceptRefs = Array.from(new Set([...existing.conceptRefs, ...candidate.conceptRefs]));
    return;
  }
  collection.push(candidate);
}

export function mapConceptsToCandidateCodes(concepts: ParsedConcept[]): CandidateCode[] {
  const candidates: CandidateCode[] = [];
  const conceptText = concepts.map((c) => c.normalized).join(' ');

  const diabetes = concepts.find((c) => c.type === 'diabetes');
  const ckd = concepts.find((c) => c.type === 'ckd');
  const hypertension = concepts.find((c) => c.type === 'hypertension');
  const heartFailure = concepts.find((c) => c.type === 'heart_failure');
  const copd = concepts.find((c) => c.type === 'copd');
  const pneumonia = concepts.find((c) => c.normalized.includes('pneumonia'));
  const depression = concepts.find((c) => c.normalized.startsWith('major depressive disorder'));
  const sourceText = concepts.map((c) => c.raw.toLowerCase()).join(' ');
  const hasNeuropathy = /neuropathy/.test(sourceText);
  const hasRetinopathy = /retinopathy/.test(sourceText);
  const hasNephropathy = /nephropathy/.test(sourceText);
  const hasHypoglycemia = /hypoglycemia/.test(sourceText);
  const hasHyperosmolar = /hyperosmolar/.test(sourceText);

  const diabetesType = (diabetes?.attributes as any)?.diabetesType || 'type2';
  const diabetesPrefix = diabetesType === 'type1' ? 'E10' : diabetesType === 'secondary' ? 'E08' : 'E11';

  const addCkdStage = (stageRaw?: string) => {
    const stage = stageRaw?.toLowerCase();
    if (stage === '4') addCandidate(candidates, { code: 'N18.4', reason: 'CKD stage 4', baseScore: 8, conceptRefs: [ckd!.raw] });
    else if (stage === '3b') addCandidate(candidates, { code: 'N18.32', reason: 'CKD stage 3b', baseScore: 8, conceptRefs: [ckd!.raw] });
    else if (stage === '5') addCandidate(candidates, { code: 'N18.5', reason: 'CKD stage 5', baseScore: 9, conceptRefs: [ckd!.raw] });
    else if (stage) addCandidate(candidates, { code: `N18.${stage}`, reason: `CKD stage ${stage}`, baseScore: 7, conceptRefs: [ckd!.raw] });
    else addCandidate(candidates, { code: 'N18.9', reason: 'CKD unspecified stage', baseScore: 5, conceptRefs: [ckd!.raw] });
  };

  if (diabetes && ckd) {
    addCandidate(candidates, { code: `${diabetesPrefix}.22`, reason: 'Diabetes with CKD combination', baseScore: 10, conceptRefs: [diabetes.raw, ckd.raw] });
    addCkdStage(ckd.attributes.stage);
  } else if (diabetes) {
    addCandidate(candidates, { code: `${diabetesPrefix}.9`, reason: 'Diabetes without clear manifestation', baseScore: 5, conceptRefs: [diabetes.raw] });
  } else if (ckd) {
    addCkdStage(ckd.attributes.stage);
  }

  if (hypertension && ckd && !heartFailure) {
    const stage = ckd?.attributes.stage;
    const code = stage === '5' ? 'I12.0' : 'I12.9';
    addCandidate(candidates, { code, reason: 'Hypertensive CKD combination', baseScore: 9, conceptRefs: [hypertension.raw] });
  }

  if (hypertension && heartFailure && ckd) {
    addCandidate(candidates, { code: 'I13.0', reason: 'Hypertensive heart and CKD with heart failure', baseScore: 10, conceptRefs: [hypertension.raw, ckd?.raw || heartFailure.raw] });
    addCandidate(candidates, { code: 'I50.9', reason: 'Heart failure detail', baseScore: 8, conceptRefs: [heartFailure.raw] });
  }

  if (hypertension && heartFailure && !ckd) {
    addCandidate(candidates, { code: 'I11.0', reason: 'Hypertensive heart disease with heart failure', baseScore: 9, conceptRefs: [hypertension.raw] });
    addCandidate(candidates, { code: 'I50.9', reason: 'Heart failure detail', baseScore: 8, conceptRefs: [heartFailure.raw] });
  }

  if (copd) {
    if (pneumonia) {
      addCandidate(candidates, { code: 'J44.0', reason: 'COPD with acute infection', baseScore: 8, conceptRefs: [copd.raw] });
      addCandidate(candidates, { code: 'J18.9', reason: 'Pneumonia organism unspecified', baseScore: 6, conceptRefs: [pneumonia.raw] });
    } else if (copd.attributes.acuity === 'acute_on_chronic') {
      addCandidate(candidates, { code: 'J44.1', reason: 'COPD with acute exacerbation', baseScore: 8, conceptRefs: [copd.raw] });
    } else {
      addCandidate(candidates, { code: 'J44.0', reason: 'COPD with lower respiratory issues', baseScore: 5, conceptRefs: [copd.raw] });
    }
  }

  if (conceptText.includes('myocardial infarction') || /heart attack/.test(conceptText)) {
    addCandidate(candidates, { code: 'I21.9', reason: 'Acute myocardial infarction', baseScore: 6, conceptRefs: ['mi'] });
  }

  if (heartFailure && !hypertension) {
    addCandidate(candidates, { code: 'I50.9', reason: 'Heart failure detail', baseScore: 6, conceptRefs: [heartFailure.raw] });
  }

  if (depression) {
    const hasPsychotic = depression.attributes.severity === 'severe_psychotic';
    addCandidate(candidates, {
      code: hasPsychotic ? 'F33.3' : 'F33.2',
      reason: 'Major depressive disorder severity mapping',
      baseScore: 6,
      conceptRefs: [depression.raw],
    });
  }

  if (hasNeuropathy && diabetes) {
    addCandidate(candidates, {
      code: `${diabetesPrefix}.42`,
      reason: 'Diabetic neuropathy',
      baseScore: 9,
      conceptRefs: [diabetes.raw],
    });
  }

  if (hasRetinopathy && diabetes) {
    const laterality = (diabetes.attributes as any)?.laterality || 'unspecified';
    const lateralityCode = laterality === 'left' ? '322' : laterality === 'right' ? '321' : laterality === 'bilateral' ? '323' : '319';
    addCandidate(candidates, {
      code: `${diabetesPrefix}.3${lateralityCode}`,
      reason: 'Diabetic retinopathy with laterality',
      baseScore: 9,
      conceptRefs: [diabetes.raw],
    });
  }

  if (hasNephropathy && diabetes) {
    addCandidate(candidates, { code: `${diabetesPrefix}.21`, reason: 'Diabetic nephropathy', baseScore: 9, conceptRefs: [diabetes.raw] });
  }

  if (hasHypoglycemia && diabetes) {
    addCandidate(candidates, { code: `${diabetesPrefix}.649`, reason: 'Diabetic hypoglycemia without coma', baseScore: 8, conceptRefs: [diabetes.raw] });
  }

  if (hasHyperosmolar && diabetes) {
    addCandidate(candidates, { code: `${diabetesPrefix}.00`, reason: 'Diabetes with hyperosmolarity', baseScore: 10, conceptRefs: [diabetes.raw] });
  }

  const neoplasmConcepts = concepts.filter((c) => c.type === 'neoplasm');
  if (neoplasmConcepts.length >= 1) {
    let addedSpecificSecondary = false;
    if (/secondary liver/.test(conceptText) || /metastasis.*liver/.test(conceptText) || /metastatic.*liver/.test(conceptText)) {
      addCandidate(candidates, { code: 'C78.7', reason: 'Secondary liver malignancy', baseScore: 9, conceptRefs: neoplasmConcepts.map((c) => c.raw) });
      addedSpecificSecondary = true;
    }
    if (/metastasis.*lung|secondary lung|metastatic lung/.test(conceptText)) {
      addCandidate(candidates, { code: 'C78.0', reason: 'Secondary lung malignancy', baseScore: 9, conceptRefs: neoplasmConcepts.map((c) => c.raw) });
      addedSpecificSecondary = true;
    }
    if (/colon/.test(conceptText)) {
      addCandidate(candidates, { code: 'C18.9', reason: 'Primary colon malignancy', baseScore: 7, conceptRefs: neoplasmConcepts.map((c) => c.raw) });
    }
    if (/breast/.test(conceptText)) {
      addCandidate(candidates, { code: 'C50.919', reason: 'Primary breast malignancy', baseScore: 7, conceptRefs: neoplasmConcepts.map((c) => c.raw) });
    }
    if (!addedSpecificSecondary && neoplasmConcepts.some((c) => c.attributes.severity === 'secondary')) {
      addCandidate(candidates, { code: 'C79.9', reason: 'Secondary malignant neoplasm, unspecified site', baseScore: 6, conceptRefs: neoplasmConcepts.map((c) => c.raw) });
    }
  }

  const pregnancy = concepts.find((c) => c.type === 'pregnancy');
  if (pregnancy && diabetes) {
    const trimester = pregnancy.attributes.trimester;
    const code = trimester === '2nd' ? 'O24.112' : 'O24.111';
    addCandidate(candidates, { code, reason: 'Pre-existing diabetes in pregnancy', baseScore: 10, conceptRefs: [pregnancy.raw] });
  }

  const injury = concepts.find((c) => c.type === 'injury');
  if (injury) {
    const episode = injury.attributes.episode || 'initial';
    const seventh = episode === 'sequela' ? 'S' : episode === 'subsequent' ? 'D' : 'A';
    const injuryCode = `T14.90X${seventh}`;
    addCandidate(candidates, { code: injuryCode, reason: 'Unspecified injury requires 7th character', baseScore: 8, conceptRefs: [injury.raw] });
    if (/fall/.test(sourceText)) {
      addCandidate(candidates, { code: `W19.XXX${seventh}`, reason: 'External cause for fall', baseScore: 6, conceptRefs: [injury.raw] });
    }
  }

  if (candidates.length === 0) {
    const searchResults = searchIndex(conceptText, 5);
    searchResults.forEach((result) => {
      addCandidate(candidates, { code: result.code.code, reason: `Index match for ${result.matchedTerm}`, baseScore: result.score, conceptRefs: [result.matchedTerm] });
    });
  }

  return candidates;
}
