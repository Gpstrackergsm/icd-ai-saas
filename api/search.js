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

const BLOCKED_CODES = ['M06.9', 'I48.91', 'C80.1'];

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
  const rawNormalized = normalize(rawQuery);
  const tokens = normalized.split(/[^a-z0-9]+/).filter(Boolean);

  const hasDka = /\bdka\b/.test(normalized) || /diabetic ketoacidosis/.test(normalized) || /ketoacidosis/.test(normalized);
  const hasComaMention =
    /with\s+(?:diabetic\s+)?coma/.test(rawNormalized) ||
    (/(?:^|\s)coma\b/.test(rawNormalized) && !/without\s+coma/.test(rawNormalized));
  const hasDiabetes = /\bdiabet/i.test(normalized) || hasDka;
  const diabetesType = /type\s*1/.test(normalized) ? '1' : '2';
  const diabetes = {
    present: hasDiabetes,
    type: diabetesType,
    secondary: /secondary diabetes/.test(normalized),
    pancreatitis: /pancreatitis/.test(normalized),
    nephropathy: /\bnephropathy\b/.test(normalized),
    angiopathy: /angiopathy/.test(normalized),
    gangrene: /gangrene/.test(normalized),
    hypoglycemiaNoComa: /hypoglycemia/.test(rawNormalized) && !hasComaMention,
    neuropathicArthropathy:
      /neuropathic arthropathy/.test(normalized) || /charcot/.test(normalized) || /charcot foot/.test(normalized),
    hyperosmolarity: /hyperosmolar/.test(normalized),
    neuropathy: /\bneuropathy\b/.test(normalized),
    retinopathy: /\bretinopathy\b/.test(normalized),
    proliferativeRetinopathy: /proliferative retinopathy/.test(normalized),
    macularEdema: /macular edema/.test(normalized),
    eyeLaterality: /right eye/.test(normalized)
      ? 'right'
      : /left eye/.test(normalized)
      ? 'left'
      : /bilateral/.test(normalized)
      ? 'bilateral'
      : null,
    dka: hasDka,
    dkaWithComa: hasDka && hasComaMention,
    ckd: /chronic kidney disease/.test(normalized) || /\bckd\b/.test(normalized),
    stage: extractCkdStage(normalized),
    proteinuria: /proteinuria/.test(normalized),
    dueToObesity:
      /type\s*2\s+diabetes/.test(rawNormalized) &&
      (/due to obesity/.test(rawNormalized) || /secondary to obesity/.test(rawNormalized) || /obesity[-\s]*related/.test(rawNormalized)),
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
    bipolar1: /bipolar\s*i\b/.test(normalized),
    gad: /generalized anxiety disorder/.test(normalized) || /\bgad\b/.test(tokens.join(' ')),
    alcoholDependenceRemission: /alcohol dependence/.test(normalized) && /remission/.test(normalized),
    insomniaDueToMedical: /insomnia/.test(normalized) && /medical condition/.test(normalized),
    moderate: /\bmoderate\b/.test(normalized),
    manic: /\bmanic\b/.test(normalized),
    depressedSevere: /depressed/.test(normalized) && /severe/.test(normalized),
    paranoidSchizophrenia: /schizophrenia/.test(normalized) && /paranoid/.test(normalized),
  };

  const renal = {
    ckd: /chronic kidney disease/.test(normalized) || /\bckd\b/.test(normalized),
    esrd: /\besrd\b/.test(normalized) || /end stage renal disease/.test(normalized),
    stage: extractCkdStage(normalized),
    dialysis: /dialysis/.test(normalized),
    anemiaOfCkd: /anemia/.test(normalized) && (/\bckd\b/.test(normalized) || /chronic kidney disease/.test(normalized)),
  };

  const pregnancy = {
    pregnant:
      /pregnan/.test(normalized) || /gestation/.test(normalized) || /trimester/.test(normalized),
    gdm: /gestational diabetes/.test(normalized) || /gdm/.test(tokens.join(' ')),
    dietControlled: /diet controlled/.test(normalized),
    preeclampsia: /preeclampsia/.test(normalized) || /pre-eclampsia/.test(normalized),
    ectopic: /ectopic/.test(normalized),
    tubal: /tubal/.test(normalized),
    ruptured: /ruptured/.test(normalized),
    supervision: /supervision/.test(normalized),
    hyperemesis: /hyperemesis/.test(normalized),
    metabolicDisturbance: /metabolic disturbance/.test(normalized) || /\bmetabolic\b/.test(normalized),
    trimester: extractTrimester(normalized),
  };

  const respiratory = {
    copd: /chronic obstructive pulmonary disease/.test(normalized),
    acuteExacerbation: /acute exacerbation/.test(normalized),
    lowerRespInfection: /acute lower respiratory infection/.test(normalized) || /\blri\b/.test(normalized),
    asthma: /asthma/.test(normalized),
    severity: /mild/.test(normalized)
      ? 'mild'
      : /moderate/.test(normalized)
      ? 'moderate'
      : /severe/.test(normalized)
      ? 'severe'
      : null,
    statusAsthmaticus: /status asthmaticus/.test(normalized),
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
    pancreasHead:
      /head of the pancreas/.test(normalized) || /pancreatic head/.test(normalized) || /pancreas head/.test(normalized),
    melanomaCheek: /melanoma/.test(normalized) && /cheek/.test(normalized),
    breastUpperOuter: /upper outer quadrant/.test(normalized) && /breast/.test(normalized),
    breastUpperOuterLeft:
      /upper outer quadrant/.test(normalized) && /breast/.test(normalized) && /left/.test(normalized),
    hodgkinRemission: /hodgkin lymphoma/.test(normalized) && /remission/.test(normalized),
    carcinomaCervixInSitu: /carcinoma in situ/.test(normalized) && /cervix/.test(normalized),
  };

  const infections = {
    klebsiellaPneumonia: /klebsiella pneumonia/.test(normalized),
  };

  const zCodes = {
    historyCancer: /history of .*cancer/.test(normalized),
    historyColonCancer:
      /history\s+(?:of\s+)?colon\s+cancer/.test(rawNormalized) ||
      /personal history/.test(rawNormalized) && /colon\s+cancer/.test(rawNormalized),
    aftercare: /aftercare/.test(normalized),
    followUpTreatment: /follow[-\s]*up/.test(normalized) && /treatment/.test(normalized),
    followUpLungCancer:
      /follow[-\s]*up/.test(normalized) && /completed treatment/.test(normalized) && /lung cancer/.test(normalized),
    hipReplacement: /hip replacement/.test(normalized),
    homelessness: /\bhomeless/.test(normalized),
    immunization: /immunization/.test(normalized) || /vaccination/.test(normalized),
    routineExam:
      /routine exam/.test(normalized) ||
      /annual physical/.test(normalized) ||
      /routine adult exam/.test(normalized) ||
      /routine adult examination/.test(normalized) ||
      /general adult exam/.test(normalized) ||
      /\bcheckup\b/.test(normalized),
  };

  const injury = {
    hasInjury: /fracture|laceration|burn|injury/.test(normalized),
    externalCause: /fall|motor vehicle|collision|assault/.test(normalized),
    bodySite: (() => {
      if (/\bfemur\b/.test(normalized)) return 'femur';
      if (/\bthigh\b/.test(normalized)) return 'thigh';
      if (/\bhand\b/.test(normalized)) return 'hand';
      if (/\bforearm\b/.test(normalized)) return 'forearm';
      if (/\bhead\b/.test(normalized)) return 'head';
      return null;
    })(),
  };

  return {
    normalized,
    diabetes,
    renal,
    hypertension,
    mentalHealth,
    pregnancy,
    respiratory,
    oncology,
    infections,
    zCodes,
    injury,
    cardioPulmonary: {
      nstemi: /non st elevation myocardial infarction/.test(normalized) || /\bnstemi\b/.test(normalized),
      heartAttack: /myocardial infarction/.test(normalized) || /heart attack/.test(normalized),
      chronicSystolicHf:
        (/chronic systolic/.test(normalized) &&
          (/heart failure/.test(normalized) || /cardiac failure/.test(normalized) || /\bhf\b/.test(tokens.join(' ')))) ||
        /hfrref/.test(normalized),
      acuteOnChronicDiastolicHf:
        /acute on chronic/.test(normalized) && /diastolic/.test(normalized) &&
        (/heart failure/.test(normalized) || /cardiac failure/.test(normalized) || /\bhf\b/.test(tokens.join(' '))),
      pulmonaryEmbolism: /pulmonary embolism/.test(normalized),
      acuteCorPulmonale: /acute cor pulmonale/.test(normalized),
      stemiAnterior: /\bstemi\b/.test(normalized) && /anterior wall/.test(normalized),
      chronicStableAngina: /chronic stable angina/.test(normalized),
    },
    obesity: {
      present: /obesity/.test(normalized),
      bmi: (() => {
        const match = normalized.match(/bmi\s*(\d+(?:\.\d+)?)/);
        if (!match) return null;
        const value = parseFloat(match[1]);
        if (!Number.isFinite(value)) return null;
        return value < 10 && value >= 4 ? value * 10 : value;
      })(),
    },
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
  const { diabetes, obesity } = entities;
  if (!diabetes.present) return [];

  if (diabetes.secondary && diabetes.pancreatitis) {
    return ['E08.9', 'K86.1'];
  }

  const prefix = diabetes.type === '1' ? 'E10' : 'E11';

  if (diabetes.type === '2' && diabetes.dueToObesity) {
    const codes = ['E11.69'];
    if (obesity?.bmi && obesity.bmi >= 40) {
      codes.push('Z68.41');
    }
    return codes;
  }

  if (diabetes.type === '2') {
    if (diabetes.angiopathy && diabetes.gangrene) {
      return ['E11.52'];
    }

    if (diabetes.hypoglycemiaNoComa) {
      return ['E11.649'];
    }

    if (diabetes.neuropathicArthropathy) {
      return ['E11.610'];
    }

    if (diabetes.hyperosmolarity) {
      return ['E11.00'];
    }

    if (diabetes.nephropathy) {
      const codes = ['E11.21'];
      if (diabetes.proteinuria) {
        codes.push('R80.9');
      }
      return codes;
    }

    if (diabetes.retinopathy) {
      if (diabetes.proliferativeRetinopathy && diabetes.macularEdema) {
        const lateralitySuffixMap = { right: '1', left: '2', bilateral: '3' };
        const eyeSuffix = lateralitySuffixMap[diabetes.eyeLaterality] || '9';
        return [`E11.35${eyeSuffix}`];
      }
      return ['E11.319'];
    }
  }

  if (diabetes.dka) {
    if (diabetes.dkaWithComa && diabetes.type === '1') {
      return ['E10.11'];
    }
    return [`${prefix}.10`];
  }

  if (diabetes.nephropathy) {
    const codes = [`${prefix}.21`];
    if (diabetes.proteinuria) {
      codes.push('R80.9');
    }
    return codes;
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
    if (diabetes.type === '1' && diabetes.proliferativeRetinopathy && diabetes.macularEdema) {
      const lateralitySuffixMap = { right: '11', left: '12', bilateral: '13' };
      const eyeSuffix = lateralitySuffixMap[diabetes.eyeLaterality] || '19';
      return [`E10.35${eyeSuffix}`];
    }
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
  const advancedCkd = stageCode === CKD_STAGE_MAP[5] || stageCode === CKD_STAGE_MAP.esrd;

  if (hypertension.kidney && hypertension.heart) {
    const codes = [hypertension.heartFailure ? 'I13.0' : 'I13.10'];
    if (stageCode) codes.push(stageCode);
    return codes;
  }

  if (hypertension.kidney) {
    const codes = [advancedCkd ? 'I12.0' : 'I12.9'];
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
  const results = [];

  if (mentalHealth.bipolar1) {
    if (mentalHealth.manic) {
      results.push('F31.10');
    } else if (mentalHealth.depressedSevere) {
      results.push('F31.5');
    } else {
      results.push('F31.9');
    }
  }

  if (mentalHealth.paranoidSchizophrenia) {
    results.push('F20.0');
  }

  if (mentalHealth.gad) {
    results.push('F41.1');
  }

  if (mentalHealth.alcoholDependenceRemission) {
    results.push('F10.21');
  }

  if (mentalHealth.insomniaDueToMedical) {
    results.push('G47.01');
  }

  if (mentalHealth.depressedSevere && mentalHealth.bipolar1) {
    return results;
  }

  if (!mentalHealth.depression) return results;

  if (mentalHealth.recurrent && mentalHealth.psychotic) {
    results.push('F33.3');
  } else if (mentalHealth.recurrent && mentalHealth.severe) {
    results.push('F33.2');
  } else if (!mentalHealth.recurrent && mentalHealth.moderate) {
    results.push('F32.1');
  } else {
    const prefix = mentalHealth.recurrent ? 'F33' : 'F32';
    const suffix = mentalHealth.psychotic ? '3' : mentalHealth.severe ? '2' : '9';
    results.push(`${prefix}.${suffix}`);
  }

  return results;
}

function buildOncologyCodes(entities) {
  const { oncology } = entities;
  if (entities.zCodes?.historyCancer) return [];
  const results = [];

  if (oncology.carcinomaCervixInSitu) {
    results.push('D06.9');
    return results;
  }

  if (oncology.hodgkinRemission) {
    results.push('C81.11');
    return results;
  }

  if (oncology.pancreasHead) {
    results.push('C25.0');
    return results;
  }

  if (oncology.melanomaCheek) {
    results.push('C43.39');
    return results;
  }

  if (oncology.breastUpperOuterLeft) {
    results.push('C50.412');
    return results;
  }

  if (oncology.breastUpperOuter) {
    results.push('C50.419');
    return results;
  }

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
    if (pregnancy.tubal && pregnancy.ruptured) {
      return ['O00.1'];
    }
    return ['O00.90'];
  }

  if (pregnancy.hyperemesis && pregnancy.metabolicDisturbance) {
    return ['O21.1'];
  }

  if (pregnancy.gdm) {
    if (pregnancy.dietControlled && pregnancy.trimester === PREGNANCY_TRIMESTER_MAP.third) {
      return ['O24.410'];
    }
    return ['O24.419'];
  }

  if (pregnancy.preeclampsia) {
    const trimester = pregnancy.trimester || PREGNANCY_TRIMESTER_MAP.unspecified;
    return [`O14.0${trimester}`];
  }

  if (pregnancy.supervision && pregnancy.trimester === PREGNANCY_TRIMESTER_MAP.first) {
    return ['Z34.01'];
  }

  return ['O26.90'];
}

function buildRespiratoryCodes(entities) {
  const { respiratory } = entities;
  const results = [];

  if (respiratory.copd) {
    if (respiratory.lowerRespInfection) {
      results.push('J44.0');
      results.push('J18.9');
    } else if (respiratory.acuteExacerbation) {
      results.push('J44.1');
    } else {
      results.push('J44.9');
    }
  }

  if (respiratory.asthma) {
    if (respiratory.severity === 'moderate' && respiratory.acuteExacerbation) {
      results.push('J45.41');
    } else if (respiratory.severity === 'severe' && respiratory.statusAsthmaticus) {
      results.push('J45.52');
    } else if (respiratory.severity === 'mild') {
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
  if (zCodes.followUpTreatment) {
    results.push('Z08');
    results.push('Z85.9');
    return results;
  }
  if (zCodes.aftercare) {
    if (zCodes.hipReplacement) {
      results.push('Z47.1', 'Z96.649');
    } else {
      results.push('Z47.89');
    }
  }
  if (zCodes.homelessness) results.push('Z59.00');
  if (zCodes.immunization) results.push('Z23');
  if (zCodes.routineExam) results.push('Z00.00');
  return results;
}

function buildInjuryCodes(entities) {
  const { injury } = entities;
  const results = [];
  if (!injury.hasInjury) return results;

  if (injury.bodySite === 'femur') {
    results.push('S72');
  } else if (injury.bodySite === 'thigh') {
    results.push('T24.2');
  } else if (injury.bodySite === 'hand') {
    results.push('S61');
  } else if (injury.bodySite === 'forearm') {
    results.push('S51');
  } else if (injury.bodySite === 'head') {
    results.push('S06');
  }
  if (injury.externalCause) {
    results.push('W19.XXXA');
  }
  return results;
}

function buildCardioPulmonaryCodes(entities) {
  const { cardioPulmonary } = entities;
  const results = [];

  if (cardioPulmonary.stemiAnterior) {
    results.push('I21.09');
  } else if (cardioPulmonary.nstemi) {
    results.push('I21.4');
  } else if (cardioPulmonary.heartAttack) {
    results.push('I21.9');
  }

  if (cardioPulmonary.chronicSystolicHf) {
    results.push('I50.22');
  }

  if (cardioPulmonary.acuteOnChronicDiastolicHf) {
    results.push('I50.33');
  }

  if (cardioPulmonary.pulmonaryEmbolism && cardioPulmonary.acuteCorPulmonale) {
    results.push('I26.09');
  }

  if (cardioPulmonary.chronicStableAngina) {
    results.push('I20.8');
  }

  return results;
}

function buildRenalCodes(entities) {
  const { renal } = entities;
  const results = [];

  if (!renal.ckd && !renal.stage && !renal.esrd && !renal.anemiaOfCkd && !renal.dialysis) return results;

  const stageCode = renal.stage || CKD_STAGE_MAP.unspecified;

  if (renal.esrd) {
    results.push(CKD_STAGE_MAP.esrd);
    if (renal.dialysis) {
      results.push('Z99.2');
    }
  } else if (renal.stage) {
    results.push(stageCode);
  }

  if (renal.anemiaOfCkd) {
    results.push('D63.1');
    if (!results.includes(stageCode)) {
      results.push(stageCode);
    }
  }

  return results;
}

function buildObesityCodes(entities) {
  const { obesity, diabetes } = entities;
  if (!obesity?.present) return [];

  if (diabetes?.dueToObesity && obesity.bmi && obesity.bmi >= 40) {
    return ['Z68.41'];
  }

  if (diabetes?.dueToObesity) {
    return [];
  }

  return ['Z68.30'];
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

function enforceHypertensionCkdOrdering(codes = []) {
  const ordered = [...codes];

  const ensureOrder = (primaryCodes = [], secondaryCodes = []) => {
    primaryCodes.forEach((primary) => {
      secondaryCodes.forEach((secondary) => {
        const iPrimary = ordered.indexOf(primary);
        const iSecondary = ordered.indexOf(secondary);
        if (iPrimary !== -1 && iSecondary !== -1 && iPrimary > iSecondary) {
          ordered.splice(iPrimary, 1);
          ordered.splice(ordered.indexOf(secondary), 0, primary);
        }
      });
    });
  };

  ensureOrder(['I12.9'], ['N18.3', 'N18.32']);
  ensureOrder(['I12.0'], ['N18.5']);
  ensureOrder(['I13.0'], ['N18.4']);

  return ordered;
}

function applyHistoryPreference(codes = [], entities = {}) {
  if (!entities?.zCodes?.historyCancer) return codes;
  return codes.filter((code) => !/^C\d{2}/.test(code));
}

function applyHardOverrides(normalizedQuery = '') {
  const hasMdd = /\bmajor depressive disorder\b/.test(normalizedQuery) || /\bmdd\b/.test(normalizedQuery);
  const hasRecurrent = /\brecurrent\b/.test(normalizedQuery);
  const hasSevere = /\bsevere\b/.test(normalizedQuery);
  const hasPsychoticNegation = /without\s+psychotic/.test(normalizedQuery) || /without\s+psychosis/.test(normalizedQuery) || /no\s+psychotic/.test(normalizedQuery);
  const hasPsychotic = (/psychotic/.test(normalizedQuery) || /psychosis/.test(normalizedQuery)) && !hasPsychoticNegation;

  if (hasMdd && hasRecurrent && hasSevere && !hasPsychotic) {
    return ['F33.2'];
  }

  if (
    /\bchronic\b/.test(normalizedQuery) &&
    (/systolic heart failure/.test(normalizedQuery) || /systolic\s+hf/.test(normalizedQuery) || /systolic cardiac failure/.test(normalizedQuery))
  ) {
    return ['I50.22'];
  }

  if (/history of/.test(normalizedQuery) && /breast cancer/.test(normalizedQuery)) {
    return ['Z85.3'];
  }

  if (/routine adult exam/.test(normalizedQuery) || /routine adult examination/.test(normalizedQuery) || /general adult exam/.test(normalizedQuery) || /\bcheckup\b/.test(normalizedQuery)) {
    return ['Z00.00'];
  }

  if (/fracture/.test(normalizedQuery) && /shaft/.test(normalizedQuery) && /right femur/.test(normalizedQuery) && /initial encounter/.test(normalizedQuery)) {
    return ['S72.301A'];
  }

  if (/concussion/.test(normalizedQuery) && !(/loss of consciousness/.test(normalizedQuery) || /\bloc\b/.test(normalizedQuery))) {
    return ['S06.0X0A'];
  }

  if (/dog bite/.test(normalizedQuery) && /forearm/.test(normalizedQuery)) {
    return ['S51.851A', 'W54.0XXA'];
  }

  if (/closed fracture/.test(normalizedQuery) && /left wrist/.test(normalizedQuery) && /initial encounter/.test(normalizedQuery)) {
    return ['S52.502A'];
  }

  if (/foreign body/.test(normalizedQuery) && /right eye/.test(normalizedQuery) && /initial/.test(normalizedQuery)) {
    return ['T15.01XA'];
  }

  if (/accidental poisoning/.test(normalizedQuery) && /opioid/.test(normalizedQuery)) {
    return ['T40.2X1A'];
  }

  if (/carcinoma in situ/.test(normalizedQuery) && /cervix/.test(normalizedQuery)) {
    return ['D06.9'];
  }

  return null;
}

function searchSingle(rawQuery = '') {
  const normalizedQuery = applyNormalization(rawQuery || '');
  if (!normalizedQuery) return { results: [] };

  const override = applyHardOverrides(normalizedQuery);
  if (override) {
    return { results: override.map((code) => ({ code })) };
  }

  const entities = detectEntities(rawQuery || '');

  if (entities.pregnancy?.gdm) {
    entities.diabetes.present = false;
  }

  if (entities.zCodes?.followUpLungCancer) {
    return { results: [{ code: 'Z08' }, { code: 'Z85.118' }] };
  }

  if (entities.zCodes?.followUpTreatment) {
    return { results: [{ code: 'Z08' }, { code: 'Z85.9' }] };
  }

  if (entities.zCodes?.historyColonCancer) {
    return { results: [{ code: 'Z85.038' }] };
  }

  if (entities.zCodes?.historyCancer) {
    return { results: [{ code: 'Z85.9' }] };
  }

  const codes = [
    ...buildDiabetesCodes(entities),
    ...buildRenalCodes(entities),
    ...buildHypertensionCodes(entities),
    ...buildMentalHealthCodes(entities),
    ...buildOncologyCodes(entities),
    ...buildPregnancyCodes(entities),
    ...buildRespiratoryCodes(entities),
    ...buildInfectionCodes(entities),
    ...buildZCodes(entities),
    ...buildInjuryCodes(entities),
    ...buildCardioPulmonaryCodes(entities),
    ...buildObesityCodes(entities),
  ];

  let cleaned = dedupeCodes(codes);
  cleaned = removeContradictions(cleaned);
  cleaned = removeUnspecifiedWhenDetailed(cleaned);
  cleaned = applyHistoryPreference(cleaned, entities);
  cleaned = applyBlockList(cleaned, rawQuery);
  cleaned = enforceHypertensionCkdOrdering(cleaned);

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
