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

  const parseCkdStage = (input: string): { stage?: string; ckdStage?: 1 | 2 | 3 | 4 | 5 | 'ESRD' } => {
    const esrdDetected = /end[- ]stage renal disease|esrd/.test(input);
    if (esrdDetected) return { stage: 'ESRD', ckdStage: 'ESRD' };
    const stageMatch =
      input.match(/ckd\s*stage\s*(\d(?:[ab])?)/)?.[1] ||
      input.match(/stage\s*(\d(?:[ab]?))\s*ckd/)?.[1] ||
      input.match(/stage\s*(\d(?:[ab]?))/)?.[1];
    if (!stageMatch) return {};
    if (stageMatch.startsWith('1')) return { stage: stageMatch, ckdStage: 1 };
    if (stageMatch.startsWith('2')) return { stage: stageMatch, ckdStage: 2 };
    if (stageMatch.startsWith('3')) return { stage: stageMatch, ckdStage: 3 };
    if (stageMatch.startsWith('4')) return { stage: stageMatch, ckdStage: 4 };
    if (stageMatch.startsWith('5')) return { stage: stageMatch, ckdStage: 5 };
    return { stage: stageMatch };
  };

  if (/diabetes/.test(normalized)) {
    const stage = normalized.match(/stage\s*(\d(?:b)?)/)?.[1];
    const diabetesType: 'type1' | 'type2' | 'secondary' = normalized.includes('type 1')
      ? 'type1'
      : normalized.includes('secondary')
        ? 'secondary'
        : 'type2';
    const lateralityMatch =
      normalized.match(/left eye|\bos\b|left\s+retina/)?.[0]
        ? 'left'
        : normalized.match(/right eye|\bod\b|right\s+retina/)?.[0]
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

  const ckdInfo = parseCkdStage(normalized);
  if (/chronic kidney disease|ckd|end-stage renal disease/.test(normalized) || ckdInfo.stage) {
    concepts.push({
      raw: text,
      normalized: 'chronic kidney disease',
      type: 'ckd',
      attributes: { stage: ckdInfo.stage, ckdStage: ckdInfo.ckdStage, hasCKD: true },
    });
  }

  if (/hypertension|hypertensive|high blood pressure/.test(normalized)) {
    concepts.push({
      raw: text,
      normalized: 'hypertension',
      type: 'hypertension',
      attributes: { hasHypertension: true },
    });
  }

  if (/heart failure|cardiac failure/.test(normalized)) {
    const systolic = /systolic|reduced ejection fraction/.test(normalized);
    const diastolic = /diastolic|preserved ejection fraction/.test(normalized);
    const combined = systolic && diastolic;
    const heartFailureType = combined
      ? 'combined'
      : systolic
        ? 'systolic'
        : diastolic
          ? 'diastolic'
          : 'unspecified';
    const acuity = /acute on chronic/.test(normalized)
      ? 'acute_on_chronic'
      : /acute/.test(normalized)
        ? 'acute'
        : /chronic/.test(normalized)
          ? 'chronic'
          : undefined;
    concepts.push({
      raw: text,
      normalized: 'heart failure',
      type: 'heart_failure',
      attributes: { hasHeartFailure: true, heartFailureType, acuity },
    });
  }

  if (/myocardial infarction|heart attack/.test(normalized)) {
    concepts.push({ raw: text, normalized: 'acute myocardial infarction', type: 'other', attributes: {} });
  }

  const hasAcuteExacerbation = /acute exacerbation|status asthmaticus/.test(normalized);
  const hasLowerRespInfection = /acute lower respiratory infection|lower respiratory infection/.test(normalized);
  const pneumoniaOrganism = /klebsiella/.test(normalized)
    ? 'klebsiella'
    : /staph/.test(normalized)
      ? 'staph'
      : /viral/.test(normalized)
        ? 'viral'
        : /pneumonia/.test(normalized)
          ? 'unspecified'
          : undefined;
  if (/copd|chronic obstructive pulmonary disease/.test(normalized)) {
    concepts.push({
      raw: text,
      normalized: 'chronic obstructive pulmonary disease',
      type: 'copd',
      attributes: {
        acuity: hasAcuteExacerbation ? 'acute_on_chronic' : undefined,
        hasCOPD: true,
        hasAcuteExacerbation: hasAcuteExacerbation,
        hasAcuteLowerRespInfection: hasLowerRespInfection,
        pneumoniaOrganism,
      },
    });
  }

  if (/asthma/.test(normalized)) {
    const severity: ParsedConcept['attributes']['asthmaSeverity'] =
      /moderate persistent/.test(normalized)
        ? 'moderatePersistent'
        : /severe persistent/.test(normalized)
          ? 'severePersistent'
          : /mild persistent/.test(normalized)
            ? 'mildPersistent'
            : /mild intermittent/.test(normalized)
              ? 'mildIntermittent'
              : /persistent asthma/.test(normalized)
                ? 'unspecified'
                : undefined;
    concepts.push({
      raw: text,
      normalized: 'asthma',
      type: 'asthma',
      attributes: {
        hasAsthma: true,
        asthmaSeverity: severity,
        hasAcuteExacerbation: hasAcuteExacerbation,
      },
    });
  }

  const obstetricSignal = /pregnan|obstetric|postpartum|gestational/.test(normalized)
    || /preeclampsia|hyperemesis|placenta previa|threatened abortion|postpartum hemorrhage|ectopic pregnancy/.test(normalized);
  if (obstetricSignal) {
    const trimester: ParsedConcept['attributes']['trimester'] =
      /third trimester|3rd trimester/.test(normalized)
        ? 3
        : /second trimester|2nd trimester/.test(normalized)
          ? 2
          : /first trimester|1st trimester/.test(normalized)
            ? 1
            : undefined;
    const complication: ParsedConcept['attributes']['pregnancyComplicationType'] =
      /preeclampsia/.test(normalized)
        ? 'preeclampsia'
        : /gestational diabetes/.test(normalized)
          ? 'gestationalDiabetes'
          : /hyperemesis/.test(normalized)
            ? 'hyperemesis'
            : /placenta previa/.test(normalized)
              ? 'placentaPrevia'
              : /threatened abortion/.test(normalized)
                ? 'threatenedAbortion'
                : /postpartum hemorrhage/.test(normalized)
                  ? 'postpartumHemorrhage'
                  : undefined;
    concepts.push({
      raw: text,
      normalized: 'pregnancy',
      type: 'pregnancy',
      attributes: { isPregnant: true, trimester, pregnancyComplicationType: complication },
    });
  }

  if (/metastasis|metastatic|secondary cancer|secondary malignancy/.test(normalized)) {
    const metastaticSites: string[] = [];
    if (/liver/.test(normalized)) metastaticSites.push('liver');
    if (/bone/.test(normalized)) metastaticSites.push('bone');
    if (/brain/.test(normalized)) metastaticSites.push('brain');
    if (/lung/.test(normalized)) metastaticSites.push('lung');
    if (/colon/.test(normalized)) metastaticSites.push('colon');
    const originFrom = normalized.match(/from\s+(lung|colon|breast|prostate|pancreas|kidney|stomach|ovary|pancreatic|prostate cancer)/)?.[1];
    concepts.push({
      raw: text,
      normalized: metastaticSites.length ? `secondary ${metastaticSites.join(', ')} malignancy` : 'secondary neoplasm',
      type: 'neoplasm',
      attributes: {
        hasNeoplasm: true,
        metastaticSites: metastaticSites.length ? metastaticSites : undefined,
        primaryNeoplasmSite: originFrom?.replace(/ cancer/, ''),
        hasFollowUpAfterCancer: /follow-up/.test(normalized) || /surveillance/.test(normalized),
        hasHistoryOfCancer: /history/.test(normalized),
        severity: 'secondary',
      },
    });
  }

  if (/cancer|neoplasm|carcinoma|malignant/.test(normalized)) {
    const laterality: ParsedConcept['attributes']['primaryNeoplasmLaterality'] =
      /left/.test(normalized)
        ? 'left'
        : /right/.test(normalized)
          ? 'right'
          : /bilateral/.test(normalized)
            ? 'bilateral'
            : 'unspecified';
    const primarySiteMatch =
      normalized.match(/(colon|lung|breast|liver|brain|pancreas|pancreatic head|prostate|kidney|pancreatic)/)?.[1] ||
      normalized.match(/neoplasm of (\w+)/)?.[1];
    const isHistory = /history of .*cancer/.test(normalized);
    const isFollowUp = /follow-up/.test(normalized);
    concepts.push({
      raw: text,
      normalized: `${primarySiteMatch || 'primary'} neoplasm`,
      type: 'neoplasm',
      attributes: {
        hasNeoplasm: true,
        primaryNeoplasmSite: primarySiteMatch?.replace('pancreatic head', 'pancreas'),
        primaryNeoplasmLaterality: laterality,
        hasHistoryOfCancer: isHistory,
        hasFollowUpAfterCancer: isFollowUp,
        severity: 'primary',
      },
    });
  }

  if (/pneumonia/.test(normalized)) {
    concepts.push({ raw: text, normalized: 'pneumonia', type: 'symptom', attributes: { pneumoniaOrganism } });
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
  const asthma = concepts.find((c) => c.type === 'asthma');
  const pneumonia = concepts.find((c) => c.normalized.includes('pneumonia'));
  const depression = concepts.find((c) => c.normalized.startsWith('major depressive disorder'));
  const pregnancy = concepts.find((c) => c.type === 'pregnancy');
  const injury = concepts.find((c) => c.type === 'injury');
  const sourceText = concepts.map((c) => c.raw.toLowerCase()).join(' ');
  const hasStatusAsthmaticus = sourceText.includes('status asthmaticus');

  const hasNeuropathy = diabetes?.attributes.complications?.neuropathy;
  const hasRetinopathy = diabetes?.attributes.complications?.retinopathy;
  const hasNephropathy = diabetes?.attributes.complications?.nephropathy;
  const hasHypoglycemia = diabetes?.attributes.complications?.hypoglycemia;
  const hasHyperosmolar = diabetes?.attributes.complications?.hyperosmolar;

  const diabetesType = diabetes?.attributes.diabetesType || 'type2';
  const diabetesPrefix = diabetesType === 'type1' ? 'E10' : diabetesType === 'secondary' ? 'E08' : 'E11';

  const getCkdStageCode = (stageRaw?: string, ckdStage?: ParsedConcept['attributes']['ckdStage']) => {
    if (ckdStage === 'ESRD') return 'N18.6';
    if (ckdStage === 5 || stageRaw === '5') return 'N18.5';
    if (ckdStage === 4 || stageRaw === '4') return 'N18.4';
    if (ckdStage === 3 || stageRaw?.startsWith('3')) {
      if (stageRaw?.toLowerCase() === '3a') return 'N18.31';
      if (stageRaw?.toLowerCase() === '3b') return 'N18.32';
      return 'N18.3';
    }
    if (ckdStage === 2 || stageRaw === '2') return 'N18.2';
    if (ckdStage === 1 || stageRaw === '1') return 'N18.1';
    return 'N18.9';
  };

  if (diabetes && ckd) {
    addCandidate(candidates, { code: `${diabetesPrefix}.22`, reason: 'Diabetes with CKD combination', baseScore: 10, conceptRefs: [diabetes.raw, ckd.raw], guidelineRule: 'diabetes_ckd_combo' });
    addCandidate(candidates, {
      code: getCkdStageCode(ckd.attributes.stage, ckd.attributes.ckdStage),
      reason: 'CKD stage documented',
      baseScore: 8,
      conceptRefs: [ckd.raw],
      guidelineRule: 'ckd_stage_required',
    });
  } else if (diabetes) {
    addCandidate(candidates, { code: `${diabetesPrefix}.9`, reason: 'Diabetes without clear manifestation', baseScore: 5, conceptRefs: [diabetes.raw] });
  } else if (ckd) {
    addCandidate(candidates, {
      code: getCkdStageCode(ckd.attributes.stage, ckd.attributes.ckdStage),
      reason: 'CKD staging',
      baseScore: 7,
      conceptRefs: [ckd.raw],
    });
  }

  const hfTypeCode = (hf?: ParsedConcept): string => {
    const type = hf?.attributes.heartFailureType;
    if (type === 'systolic') return 'I50.2';
    if (type === 'diastolic') return 'I50.3';
    if (type === 'combined') return 'I50.4';
    return 'I50.9';
  };

  const hasHypertension = hypertension?.attributes.hasHypertension;
  const hasHF = heartFailure?.attributes.hasHeartFailure;
  const hasCKD = Boolean(ckd?.attributes.hasCKD);

  if (hasHypertension && !hasHF && hasCKD) {
    const code = ckd?.attributes.ckdStage === 5 || ckd?.attributes.stage === '5' || ckd?.attributes.stage === 'ESRD' ? 'I12.0' : 'I12.9';
    addCandidate(candidates, {
      code,
      reason: 'Hypertensive CKD combination',
      baseScore: 9,
      conceptRefs: [hypertension.raw],
      guidelineRule: 'htn_ckd_combo',
    });
  }

  if (hasHypertension && hasHF && hasCKD) {
    addCandidate(candidates, {
      code: 'I13.0',
      reason: 'Hypertension with heart failure and CKD',
      baseScore: 10,
      conceptRefs: [hypertension.raw, ckd?.raw || heartFailure.raw],
      guidelineRule: 'htn_hf_ckd_combo',
    });
    addCandidate(candidates, {
      code: hfTypeCode(heartFailure),
      reason: 'Heart failure type detail',
      baseScore: 8,
      conceptRefs: [heartFailure.raw],
    });
    addCandidate(candidates, {
      code: getCkdStageCode(ckd?.attributes.stage, ckd?.attributes.ckdStage),
      reason: 'CKD stage detail',
      baseScore: 8,
      conceptRefs: [ckd?.raw || heartFailure.raw],
    });
  }

  if (hasHypertension && hasHF && !hasCKD) {
    addCandidate(candidates, {
      code: 'I11.0',
      reason: 'Hypertensive heart disease with heart failure',
      baseScore: 9,
      conceptRefs: [hypertension.raw],
      guidelineRule: 'htn_hf_combo',
    });
    addCandidate(candidates, {
      code: hfTypeCode(heartFailure),
      reason: 'Heart failure detail',
      baseScore: 8,
      conceptRefs: [heartFailure.raw],
    });
  }

  if (heartFailure && !hasHypertension) {
    addCandidate(candidates, { code: hfTypeCode(heartFailure), reason: 'Heart failure detail', baseScore: 6, conceptRefs: [heartFailure.raw] });
  }

  if (copd) {
    if (copd.attributes.hasAcuteLowerRespInfection || pneumonia) {
      addCandidate(candidates, { code: 'J44.0', reason: 'COPD with acute lower respiratory infection', baseScore: 8, conceptRefs: [copd.raw], guidelineRule: 'copd_with_infection' });
      const organism = pneumonia?.attributes.pneumoniaOrganism || copd.attributes.pneumoniaOrganism || 'unspecified';
      const pneumoniaCode = organism === 'klebsiella' ? 'J15.0' : organism === 'staph' ? 'J15.2' : organism === 'viral' ? 'J12.9' : 'J18.9';
      addCandidate(candidates, { code: pneumoniaCode, reason: 'Pneumonia organism mapping', baseScore: 6, conceptRefs: [pneumonia?.raw || copd.raw].filter(Boolean) as string[] });
    } else if (copd.attributes.hasAcuteExacerbation) {
      addCandidate(candidates, { code: 'J44.1', reason: 'COPD with acute exacerbation', baseScore: 8, conceptRefs: [copd.raw], guidelineRule: 'copd_exacerbation' });
    }
  }

  if (asthma?.attributes.hasAsthma && asthma.attributes.asthmaSeverity && asthma.attributes.hasAcuteExacerbation) {
    const severity = asthma.attributes.asthmaSeverity;
    let code = 'J45.909';
    if (severity === 'mildIntermittent') code = 'J45.21';
    if (severity === 'mildPersistent') code = 'J45.31';
    if (severity === 'moderatePersistent') code = 'J45.41';
    if (severity === 'severePersistent') {
      code = hasStatusAsthmaticus ? 'J45.52' : 'J45.51';
    }
    if (severity === 'unspecified') code = 'J45.901';
    addCandidate(candidates, {
      code,
      reason: 'Asthma severity with acute exacerbation',
      baseScore: 8,
      conceptRefs: [asthma.raw],
      guidelineRule: 'asthma_exacerbation',
    });
  }

  if (conceptText.includes('myocardial infarction') || /heart attack/.test(conceptText)) {
    addCandidate(candidates, { code: 'I21.9', reason: 'Acute myocardial infarction', baseScore: 6, conceptRefs: ['mi'] });
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
    const laterality = diabetes.attributes.laterality || 'unspecified';
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
  if (neoplasmConcepts.length) {
    const primarySite = neoplasmConcepts.find((c) => c.attributes.primaryNeoplasmSite)?.attributes.primaryNeoplasmSite;
    const laterality = neoplasmConcepts.find((c) => c.attributes.primaryNeoplasmLaterality)?.attributes.primaryNeoplasmLaterality;
    const metastaticSites = neoplasmConcepts.find((c) => c.attributes.metastaticSites)?.attributes.metastaticSites;
    const hasHistory = neoplasmConcepts.some((c) => c.attributes.hasHistoryOfCancer);
    const hasFollowUp = neoplasmConcepts.some((c) => c.attributes.hasFollowUpAfterCancer);

    const primaryCodeForSite = (site?: string): string | undefined => {
      if (!site) return undefined;
      if (site.includes('colon')) return 'C18.9';
      if (site.includes('lung')) return 'C34.90';
      if (site.includes('breast')) {
        if (laterality === 'left') return 'C50.912';
        if (laterality === 'right') return 'C50.911';
        return 'C50.919';
      }
      if (site.includes('pancreas')) return 'C25.9';
      if (site.includes('prostate')) return 'C61';
      if (site.includes('brain')) return 'C71.9';
      return undefined;
    };

    const metastaticCodes = (sites?: string[]): string[] => {
      if (!sites || !sites.length) return [];
      return sites.map((site) => {
        if (site.includes('liver')) return 'C78.7';
        if (site.includes('lung')) return 'C78.0';
        if (site.includes('bone')) return 'C79.51';
        if (site.includes('brain')) return 'C79.31';
        return 'C79.9';
      });
    };

    if (metastaticSites && metastaticSites.length) {
      metastaticCodes(metastaticSites).forEach((code) =>
        addCandidate(candidates, {
          code,
          reason: 'Secondary malignant neoplasm site',
          baseScore: 9,
          conceptRefs: neoplasmConcepts.map((c) => c.raw),
          guidelineRule: 'neoplasm_secondary',
        }),
      );
    }

    const primaryCode = primaryCodeForSite(primarySite || neoplasmConcepts.find((c) => c.attributes.hasNeoplasm)?.attributes.site);
    if (primaryCode && !hasHistory && !hasFollowUp) {
      addCandidate(candidates, {
        code: primaryCode,
        reason: 'Primary malignancy site',
        baseScore: 8,
        conceptRefs: neoplasmConcepts.map((c) => c.raw),
        guidelineRule: metastaticSites?.length ? 'neoplasm_primary_with_secondary' : undefined,
      });
    }

    if (hasHistory) {
      const historyCode = primarySite?.includes('colon') ? 'Z85.038' : primarySite?.includes('lung') ? 'Z85.118' : primarySite?.includes('prostate') ? 'Z85.46' : 'Z85.9';
      addCandidate(candidates, { code: historyCode, reason: 'History of cancer', baseScore: 7, conceptRefs: neoplasmConcepts.map((c) => c.raw), guidelineRule: 'neoplasm_history' });
    }

    if (hasFollowUp) {
      const historyCode = primarySite?.includes('lung') ? 'Z85.118' : primarySite?.includes('colon') ? 'Z85.038' : 'Z85.9';
      addCandidate(candidates, { code: 'Z08', reason: 'Follow-up after completed treatment', baseScore: 8, conceptRefs: neoplasmConcepts.map((c) => c.raw), guidelineRule: 'neoplasm_followup' });
      addCandidate(candidates, { code: historyCode, reason: 'History code pairs with follow-up', baseScore: 7, conceptRefs: neoplasmConcepts.map((c) => c.raw), guidelineRule: 'neoplasm_followup' });
    }
  }

  if (pregnancy) {
    if (pregnancy.attributes.pregnancyComplicationType === 'gestationalDiabetes') {
      const trimester = pregnancy.attributes.trimester;
      const code = trimester === 1 || trimester === '1st'
        ? 'O24.411'
        : trimester === 2 || trimester === '2nd'
          ? 'O24.413'
          : trimester === 3 || trimester === '3rd'
            ? 'O24.414'
            : 'O24.410';
      addCandidate(candidates, {
        code,
        reason: 'Gestational diabetes per trimester',
        baseScore: 10,
        conceptRefs: [pregnancy.raw],
        guidelineRule: 'gestational_diabetes',
      });
    }

    if (pregnancy.attributes.pregnancyComplicationType === 'preeclampsia') {
      const trimester = pregnancy.attributes.trimester;
      const code = trimester === 2 || trimester === '2nd' ? 'O14.02' : 'O14.01';
      addCandidate(candidates, { code, reason: 'Preeclampsia complicating pregnancy', baseScore: 10, conceptRefs: [pregnancy.raw], guidelineRule: 'preeclampsia' });
    }

    if (pregnancy.attributes.pregnancyComplicationType === 'hyperemesis') {
      addCandidate(candidates, { code: 'O21.1', reason: 'Hyperemesis gravidarum with metabolic disturbance', baseScore: 10, conceptRefs: [pregnancy.raw], guidelineRule: 'hyperemesis' });
    }

    if (pregnancy.attributes.pregnancyComplicationType === 'placentaPrevia') {
      addCandidate(candidates, { code: 'O44.1', reason: 'Placenta previa with hemorrhage', baseScore: 9, conceptRefs: [pregnancy.raw], guidelineRule: 'placenta_previa' });
    }

    if (pregnancy.attributes.pregnancyComplicationType === 'threatenedAbortion') {
      addCandidate(candidates, { code: 'O20.0', reason: 'Threatened abortion', baseScore: 9, conceptRefs: [pregnancy.raw], guidelineRule: 'threatened_abortion' });
    }

    if (pregnancy.attributes.pregnancyComplicationType === 'postpartumHemorrhage') {
      addCandidate(candidates, { code: 'O72.1', reason: 'Postpartum hemorrhage', baseScore: 9, conceptRefs: [pregnancy.raw], guidelineRule: 'postpartum_hemorrhage' });
    }
  }

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
