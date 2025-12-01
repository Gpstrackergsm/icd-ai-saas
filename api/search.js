const PREGNANCY_TRIMESTER_MAP = {
  first: '1',
  second: '2',
  third: '3',
  unspecified: '0',
};

const CKD_STAGE_MAP = {
  1: 'N18.1',
  2: 'N18.2',
  3: 'N18.3',
  '3b': 'N18.32',
  4: 'N18.4',
  5: 'N18.5',
  esrd: 'N18.6',
  unspecified: 'N18.9',
};

const ONCOLOGY_PRIMARY_MAP = {
  colon: 'C18.9',
  breast: 'C50.919',
  lung: 'C34.90',
  pancreas: 'C25.9',
  prostate: 'C61',
  stomach: 'C16.9',
  liver: 'C22.9',
};

const ONCOLOGY_SECONDARY_MAP = {
  liver: 'C78.7',
  brain: 'C79.31',
  bone: 'C79.51',
  lung: 'C78.00',
  'lymph node': 'C77.9',
};

const synonymDictionary = {
  copd: 'chronic obstructive pulmonary disease',
  exacerbation: 'acute exacerbation',
  'heart attack': 'myocardial infarction',
  'high blood pressure': 'hypertension',
  'diabetes type 2': 'type 2 diabetes mellitus',
  ckd: 'chronic kidney disease',
  'recurrent depression': 'major depressive disorder recurrent',
  nstemi: 'non st elevation myocardial infarction',
  'secondary cancer': 'metastasis',
  metastatic: 'metastasis',
  mets: 'metastasis',
  from: 'primary',
  'due to': 'primary',
  of: 'primary',
  'heart failure': 'cardiac failure',
};

const BLOCKED_CODES = ['M06.9', 'I48.91', 'C80.1', 'Z00.00'];

function normalize(text = '') {
  return text.toString().toLowerCase().trim();
}

function escapeRegExp(str = '') {
  return str.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&');
}

function applyNormalization(text = '') {
  let normalized = normalize(text);
  Object.entries(synonymDictionary).forEach(([term, canonical]) => {
    const pattern = new RegExp(`\\b${escapeRegExp(term)}\\b`, 'g');
    normalized = normalized.replace(pattern, canonical);
  });
  return normalized;
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

function extractCkdStage(normalizedQuery = '') {
  if (/\besrd\b/.test(normalizedQuery) || normalizedQuery.includes('end stage renal disease')) {
    return CKD_STAGE_MAP.esrd;
  }

  const stageMatch = normalizedQuery.match(/(?:ckd\s*)?stage\s*(\d(?:b)?)/);
  const stageKey = stageMatch?.[1]?.toLowerCase();
  if (!stageKey) return null;
  return CKD_STAGE_MAP[stageKey] || null;
}

function extractTrimester(normalizedQuery = '') {
  if (/\bfirst trimester\b/.test(normalizedQuery)) return PREGNANCY_TRIMESTER_MAP.first;
  if (/\bsecond trimester\b/.test(normalizedQuery)) return PREGNANCY_TRIMESTER_MAP.second;
  if (/\bthird trimester\b/.test(normalizedQuery)) return PREGNANCY_TRIMESTER_MAP.third;
  return PREGNANCY_TRIMESTER_MAP.unspecified;
}

function detectEntities(rawQuery = '') {
  const normalized = applyNormalization(rawQuery);
  const tokens = normalized.split(/[^a-z0-9]+/).filter(Boolean);

  const hasDiabetes = /\bdiabet/i.test(normalized);
  const diabetesType = /type\s*1/.test(normalized) ? '1' : '2';
  const diabetes = {
    present: hasDiabetes,
    type: diabetesType,
    nephropathy: /\bnephropathy\b/.test(normalized),
    neuropathy: /\bneuropathy\b/.test(normalized),
    retinopathy: /\bretinopathy\b/.test(normalized),
    dka: /\bdka\b/.test(normalized) || /diabetic ketoacidosis/.test(normalized),
    ckd: /chronic kidney disease/.test(normalized) || /\bckd\b/.test(normalized),
    stage: extractCkdStage(normalized),
  };

  const hypertension = {
    present: /\bhypertension\b/.test(normalized) || /\bhypertensive\b/.test(normalized),
    heart: /heart/.test(normalized) || /cardiac/.test(normalized),
    heartFailure: /cardiac failure/.test(normalized) || /\bhf\b/.test(tokens.join(' ')),
    kidney: /kidney/.test(normalized) || /\bckd\b/.test(normalized) || /chronic kidney disease/.test(normalized),
    stage: extractCkdStage(normalized),
  };

  const mentalHealth = {
    depression: /depress/.test(normalized),
    recurrent: /\brecurrent\b/.test(normalized),
    severe: /\bsevere\b/.test(normalized),
    psychotic: /\bpsychotic\b/.test(normalized),
  };

  const pregnancy = {
    pregnant:
      /pregnan/.test(normalized) || /gestation/.test(normalized) || /trimester/.test(normalized),
    gdm: /gestational diabetes/.test(normalized) || /gdm/.test(tokens.join(' ')),
    preeclampsia: /preeclampsia/.test(normalized) || /pre-eclampsia/.test(normalized),
    ectopic: /ectopic/.test(normalized),
    trimester: extractTrimester(normalized),
  };

  const respiratory = {
    copd: /chronic obstructive pulmonary disease/.test(normalized),
    acuteExacerbation: /acute exacerbation/.test(normalized),
    asthma: /asthma/.test(normalized),
    severity: /mild/.test(normalized)
      ? 'mild'
      : /moderate/.test(normalized)
      ? 'moderate'
      : /severe/.test(normalized)
      ? 'severe'
      : null,
  };

  const oncology = {
    metastasis: /metastasis/.test(normalized) || /secondary/.test(normalized),
    primaryClues: Object.keys(ONCOLOGY_PRIMARY_MAP).filter((organ) =>
      new RegExp(`\\b${escapeRegExp(organ)}\\b`).test(normalized)
    ),
    secondaryClues: Object.keys(ONCOLOGY_SECONDARY_MAP).filter((organ) =>
      new RegExp(`\\b${escapeRegExp(organ)}\\b`).test(normalized)
    ),
    mentionsPrimary: /\bprimary\b/.test(normalized),
  };

  const infections = {
    klebsiellaPneumonia: /klebsiella pneumonia/.test(normalized),
  };

  const zCodes = {
    historyCancer: /history of .*cancer/.test(normalized),
    aftercare: /aftercare/.test(normalized),
    homelessness: /\bhomeless/.test(normalized),
    immunization: /immunization/.test(normalized) || /vaccination/.test(normalized),
  };

  const injury = {
    hasInjury: /fracture|laceration|burn|injury/.test(normalized),
    externalCause: /fall|motor vehicle|collision|assault/.test(normalized),
  };

  return {
    normalized,
    diabetes,
    hypertension,
    mentalHealth,
    pregnancy,
    respiratory,
    oncology,
    infections,
    zCodes,
    injury,
  };
}

function dedupeCodes(codes = []) {
  const seen = new Set();
  return codes.filter((code) => {
    const upper = (code || '').toUpperCase();
    if (!upper || seen.has(upper)) return false;
    seen.add(upper);
    return true;
  });
}

function buildDiabetesCodes(entities) {
  const { diabetes } = entities;
  if (!diabetes.present) return [];

  const prefix = diabetes.type === '1' ? 'E10' : 'E11';

  if (diabetes.dka) {
    return [`${prefix}.10`];
  }

  if (diabetes.nephropathy) {
    return [`${prefix}.21`];
  }

  if (diabetes.ckd) {
    const codes = [`${prefix}.22`];
    if (diabetes.stage) {
      codes.push(diabetes.stage);
    } else {
      codes.push(CKD_STAGE_MAP.unspecified);
    }
    return codes;
  }

  if (diabetes.retinopathy) {
    return [`${prefix}.319`];
  }

  if (diabetes.neuropathy) {
    return [`${prefix}.40`];
  }

  return [`${prefix}.9`];
}

function buildHypertensionCodes(entities) {
  const { hypertension } = entities;
  if (!hypertension.present) return [];

  const stageCode = hypertension.kidney ? hypertension.stage || CKD_STAGE_MAP.unspecified : null;

  if (hypertension.kidney && hypertension.heart) {
    const codes = [hypertension.heartFailure ? 'I13.0' : 'I13.10'];
    if (stageCode) codes.push(stageCode);
    return codes;
  }

  if (hypertension.kidney) {
    const codes = ['I12.9'];
    if (stageCode) codes.push(stageCode);
    return codes;
  }

  if (hypertension.heart) {
    return [hypertension.heartFailure ? 'I11.0' : 'I11.9'];
  }

  return ['I10'];
}

function buildMentalHealthCodes(entities) {
  const { mentalHealth } = entities;
  if (!mentalHealth.depression) return [];

  const prefix = mentalHealth.recurrent ? 'F33' : 'F32';
  const suffix = mentalHealth.psychotic ? '3' : mentalHealth.severe ? '2' : '9';
  return [`${prefix}.${suffix}`];
}

function buildOncologyCodes(entities) {
  const { oncology } = entities;
  const results = [];

  const secondarySite = oncology.secondaryClues[0];
  const primarySite = oncology.primaryClues.find((organ) => organ !== secondarySite);

  if (oncology.metastasis && secondarySite) {
    const secondaryCode = ONCOLOGY_SECONDARY_MAP[secondarySite];
    if (secondaryCode) results.push(secondaryCode);
    if (primarySite && ONCOLOGY_PRIMARY_MAP[primarySite]) {
      results.push(ONCOLOGY_PRIMARY_MAP[primarySite]);
    }
    return results;
  }

  if (primarySite && ONCOLOGY_PRIMARY_MAP[primarySite]) {
    results.push(ONCOLOGY_PRIMARY_MAP[primarySite]);
    return results;
  }

  return results;
}

function buildPregnancyCodes(entities) {
  const { pregnancy } = entities;
  if (!pregnancy.pregnant) return [];

  if (pregnancy.ectopic) {
    return ['O00.90'];
  }

  if (pregnancy.gdm) {
    return ['O24.419'];
  }

  if (pregnancy.preeclampsia) {
    const trimester = pregnancy.trimester || PREGNANCY_TRIMESTER_MAP.unspecified;
    return [`O14.0${trimester}`];
  }

  return ['O26.90'];
}

function buildRespiratoryCodes(entities) {
  const { respiratory } = entities;
  const results = [];

  if (respiratory.copd) {
    if (respiratory.acuteExacerbation) {
      results.push('J44.1');
    } else {
      results.push('J44.9');
    }
  }

  if (respiratory.asthma) {
    if (respiratory.severity === 'mild') {
      results.push('J45.20');
    } else if (respiratory.severity === 'moderate') {
      results.push('J45.40');
    } else if (respiratory.severity === 'severe') {
      results.push('J45.50');
    } else {
      results.push('J45.909');
    }
  }

  return results;
}

function buildInfectionCodes(entities) {
  return entities.infections.klebsiellaPneumonia ? ['J15.0'] : [];
}

function buildZCodes(entities) {
  const { zCodes } = entities;
  const results = [];
  if (zCodes.historyCancer) results.push('Z85.9');
  if (zCodes.aftercare) results.push('Z47.89', 'Z48.89');
  if (zCodes.homelessness) results.push('Z59.00');
  if (zCodes.immunization) results.push('Z23');
  return results;
}

function buildInjuryCodes(entities) {
  const { injury } = entities;
  const results = [];
  if (!injury.hasInjury) return results;

  results.push('S09.90XA');
  if (injury.externalCause) {
    results.push('W19.XXXA');
  }
  return results;
}

function removeContradictions(codes = []) {
  const filtered = [...codes];

  const hasF32 = filtered.some((code) => /^F32\./.test(code));
  const hasF33 = filtered.some((code) => /^F33\./.test(code));
  if (hasF32 && hasF33) {
    return filtered.filter((code) => !/^F32\./.test(code));
  }

  return filtered;
}

function removeUnspecifiedWhenDetailed(codes = []) {
  const filtered = [...codes];

  const hasDiabetesComplication = filtered.some((code) => /^E1[01]\.(1|2|3|4)/.test(code));
  if (hasDiabetesComplication) {
    return filtered.filter((code) => !/^E1[01]\.9$/.test(code));
  }

  const hasCkdStage = filtered.some((code) => /^N18\.[1-6]/.test(code));
  if (hasCkdStage) {
    return filtered.filter((code) => code !== CKD_STAGE_MAP.unspecified);
  }

  return filtered;
}

function applyBlockList(codes = [], rawQuery = '') {
  return codes.filter((code) => {
    const upper = (code || '').toUpperCase();
    const isBlocked = BLOCKED_CODES.some((blocked) => upper === blocked.toUpperCase());
    if (!isBlocked) return true;
    const pattern = new RegExp(`\\b${escapeRegExp(upper)}\\b`, 'i');
    return pattern.test(rawQuery || '');
  });
}

function searchSingle(rawQuery = '') {
  const normalizedQuery = applyNormalization(rawQuery || '');
  if (!normalizedQuery) return { results: [] };

  const entities = detectEntities(rawQuery || '');

  const codes = [
    ...buildDiabetesCodes(entities),
    ...buildHypertensionCodes(entities),
    ...buildMentalHealthCodes(entities),
    ...buildOncologyCodes(entities),
    ...buildPregnancyCodes(entities),
    ...buildRespiratoryCodes(entities),
    ...buildInfectionCodes(entities),
    ...buildZCodes(entities),
    ...buildInjuryCodes(entities),
  ];

  let cleaned = dedupeCodes(codes);
  cleaned = removeContradictions(cleaned);
  cleaned = removeUnspecifiedWhenDetailed(cleaned);
  cleaned = applyBlockList(cleaned, rawQuery);

  return { results: cleaned.map((code) => ({ code })) };
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  let body;
  try {
    body = req.body ?? (await parseBody(req));
  } catch (err) {
    res.status(400).json({ error: 'Invalid JSON body' });
    return;
  }

  const rawQuery = (body.query || '').toString();
  if (!rawQuery.trim()) {
    res.status(400).json({ error: 'Query is required' });
    return;
  }

  const lines = rawQuery
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const numberedPattern = /^([0-9]+)\s*[)\.\-]\s*(.+)$/;
  const numberedItems = lines
    .map((line) => {
      const match = line.match(numberedPattern);
      if (!match) return null;
      return { id: match[1], query: match[2] };
    })
    .filter(Boolean);

  if (numberedItems.length > 1) {
    const batchResults = numberedItems.map((item) => {
      const { results } = searchSingle(item.query);
      return { id: item.id, query: item.query, codes: results };
    });

    res.setHeader('Content-Type', 'application/json');
    res.status(200).json({ batch: batchResults });
    return;
  }

  const { results } = searchSingle(rawQuery);
  res.setHeader('Content-Type', 'application/json');
  res.status(200).json({ results });
};
