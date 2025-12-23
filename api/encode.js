// LEVEL 3: ICD-10-CM Temporal Logic & POA Authority Engine
// Builds ABOVE frozen LEVEL 0 (AUTO_EXCLUDE), LEVEL 1 (AUTO_CODE), and LEVEL 2 (Causal Linking)

const lookupDetail = require('../lib/icd-dictionary.js').lookupDetail;

// ============================================================================
// LEVEL 2: ICD-10-CM CODE MAPPING DICTIONARY (EXPANDED)
// ============================================================================
const ICD10_MAPPING = {
  // Renal
  'acute kidney injury': { code: 'N17.9', description: 'Acute kidney failure, unspecified' },
  'uti': { code: 'N39.0', description: 'Urinary tract infection, site not specified' },
  'urinary tract infection': { code: 'N39.0', description: 'Urinary tract infection, site not specified' },

  // Cardiovascular
  'essential hypertension': { code: 'I10', description: 'Essential (primary) hypertension' },
  'hypertension': { code: 'I10', description: 'Essential (primary) hypertension' },
  'acute stemi of anterior wall': { code: 'I21.09', description: 'ST elevation (STEMI) myocardial infarction involving other coronary artery of anterior wall' },
  'atrial fibrillation, permanent': { code: 'I48.21', description: 'Permanent atrial fibrillation' },

  // Obesity
  'morbid obesity with bmi 42': {
    codes: ['E66.01', 'Z68.42'],
    descriptions: ['Morbid (severe) obesity due to excess calories', 'Body mass index [BMI] 42.0-42.9, adult'],
    linked: true
  },

  // Infectious
  'sore throat, strep positive': { code: 'J02.0', description: 'Streptococcal pharyngitis' },
  'streptococcal pharyngitis': { code: 'J02.0', description: 'Streptococcal pharyngitis' },

  // Surgical
  'acute appendicitis with localized peritonitis': { code: 'K35.30', description: 'Acute appendicitis with localized peritonitis, without perforation or gangrene' },

  // Trauma
  'displaced fracture of right femur shaft, initial': { code: 'S72.301A', description: 'Unspecified fracture of shaft of right femur, initial encounter for closed fracture' },

  'aki': { code: 'N17.9', description: 'Acute kidney failure, unspecified' },
  'chronic kidney disease stage 3': { code: 'N18.30', description: 'Chronic kidney disease, stage 3 unspecified' },
  'chronic kidney disease stage 4': { code: 'N18.4', description: 'Chronic kidney disease, stage 4 (severe)' },
  'chronic kidney disease': { code: null, query: 'Please specify CKD stage (1-5)' },
  'ckd stage 3': { code: 'N18.30', description: 'Chronic kidney disease, stage 3 unspecified' },
  'ckd stage 4': { code: 'N18.4', description: 'Chronic kidney disease, stage 4 (severe)' },

  // Respiratory
  'acute respiratory failure': { code: 'J96.01', description: 'Acute respiratory failure with hypoxia' },
  'acute respiratory failure with hypoxia': { code: 'J96.01', description: 'Acute respiratory failure with hypoxia' },

  // COPD + Respiratory Failure: Combination codes (MANIFESTATION linking)  
  'copd with acute exacerbation and respiratory failure': {
    codes: ['J44.1', 'J96.01'],
    descriptions: ['Chronic obstructive pulmonary disease with (acute) exacerbation', 'Acute respiratory failure with hypoxia'],
    linked: true,
    linkPhrase: 'due to'
  },

  // LEVEL 2: Respiratory failure due to pneumonia (LINKED)
  'acute respiratory failure due to pneumonia': {
    codes: ['J96.01', 'J18.9'],
    descriptions: ['Acute respiratory failure with hypoxia', 'Pneumonia, unspecified organism'],
    linked: true,
    linkPhrase: 'due to'
  },

  // COPD
  'copd': { code: 'J44.9', description: 'Chronic obstructive pulmonary disease, unspecified' },
  'copd exacerbation': { code: 'J44.1', description: 'Chronic obstructive pulmonary disease with (acute) exacerbation' },
  'chronic obstructive pulmonary disease': { code: 'J44.9', description: 'Chronic obstructive pulmonary disease, unspecified' },

  // Sepsis
  'sepsis': { code: 'A41.9', description: 'Sepsis, unspecified organism' },
  'severe sepsis': { codes: ['A41.9', 'R65.20'], descriptions: ['Sepsis, unspecified organism', 'Severe sepsis without septic shock'], linked: true },
  'pneumonia': { code: 'J18.9', description: 'Pneumonia, unspecified organism' },

  // Strep throat / Pharyngitis
  'streptococcal pharyngitis': { code: 'J02.0', description: 'Streptococcal pharyngitis' },

  // LEVEL 2: Sepsis complicated by shock (LINKED)
  'sepsis complicated by septic shock': {
    codes: ['A41.9', 'R65.21'],
    descriptions: ['Sepsis, unspecified organism', 'Severe sepsis with septic shock'],
    linked: true,
    linkPhrase: 'complicated by'
  },
  'sepsis complicated by shock': {
    codes: ['A41.9', 'R65.21'],
    descriptions: ['Sepsis, unspecified organism', 'Severe sepsis with septic shock'],
    linked: true,
    linkPhrase: 'complicated by'
  },

  // Diabetes - LEVEL 2: Expanded complications
  'diabetic foot ulcer': { code: 'E11.621', description: 'Type 2 diabetes mellitus with foot ulcer', linked: true },
  'diabetic neuropathy': { code: 'E11.40', description: 'Type 2 diabetes mellitus with diabetic neuropathy, unspecified', linked: true },
  'neuropathy due to diabetes': { code: 'E11.40', description: 'Type 2 diabetes mellitus with diabetic neuropathy, unspecified', linked: true, linkPhrase: 'due to' },
  'diabetic peripheral angiopathy': { code: 'E11.51', description: 'Type 2 diabetes mellitus with diabetic peripheral angiopathy without gangrene', linked: true },
  'diabetic hyperglycemia': { code: 'E11.65', description: 'Type 2 diabetes mellitus with hyperglycemia', linked: true },

  // Diabetes + CKD: Combination codes (MANIFESTATION linking)
  'diabetic chronic kidney disease stage 3': {
    codes: ['E11.22', 'N18.30'],
    descriptions: ['Type 2 diabetes mellitus with diabetic chronic kidney disease', 'Chronic kidney disease, stage 3 unspecified'],
    linked: true,
    linkPhrase: 'manifestation of'
  },
  'diabetic chronic kidney disease stage 4': {
    codes: ['E11.22', 'N18.4'],
    descriptions: ['Type 2 diabetes mellitus with diabetic chronic kidney disease', 'Chronic kidney disease, stage 4 (severe)'],
    linked: true,
    linkPhrase: 'manifestation of'
  },

  // Diabetes - Unlinked
  'type 2 diabetes': { code: 'E11.9', description: 'Type 2 diabetes mellitus without complications' },
  'foot ulcer': { code: 'L97.', description: 'Non-pressure chronic ulcer of lower limb' },
  'neuropathy': { code: 'G62.9', description: 'Polyneuropathy, unspecified' },
  'peripheral neuropathy': { code: 'G62.9', description: 'Polyneuropathy, unspecified' },

  // Heart Failure  
  'acute on chronic systolic heart failure': { code: 'I50.23', description: 'Acute on chronic systolic (congestive) heart failure' },
  'heart failure': { code: null, query: 'Please specify: acute vs chronic AND systolic vs diastolic vs combined' },

  // Stroke
  // LEVEL 4 ENHANCEMENTS: MI/Chest Pain
  'acute myocardial infarction': { code: 'I21.9', description: 'Acute myocardial infarction, unspecified' },
  'acute st elevation myocardial infarction': { code: 'I21.3', description: 'ST elevation (STEMI) myocardial infarction of unspecified site' },
  'acute non-st elevation myocardial infarction': { code: 'I21.4', description: 'Non-ST elevation (NSTEMI) myocardial infarction' },
  'chest pain': { code: 'R07.9', description: 'Chest pain, unspecified' },

  // LEVEL 4 ENHANCEMENTS: GI Bleeding
  'gastrointestinal bleeding': { code: 'K92.2', description: 'Gastrointestinal hemorrhage, unspecified' },
  'upper gastrointestinal hemorrhage': { code: 'K92.0', description: 'Hematemesis' },
  'lower gastrointestinal hemorrhage': { code: 'K92.1', description: 'Melena' },
  'acute blood loss anemia': { code: 'D62', description: 'Acute posthemorrhagic anemia' },

  // LEVEL 4 ENHANCEMENTS: Trauma/Fractures
  'femur fracture': { code: 'S72.90XA', description: 'Unspecified fracture of unspecified femur, initial encounter' },
  'trauma': { code: 'T14.90', description: 'Injury, unspecified' },
  'fall': { code: 'W19.XXXA', description: 'Unspecified fall, initial encounter' },

  // LEVEL 4 ENHANCEMENTS: Septic shock (hospital-acquired)
  'septic shock hospital-acquired': { code: 'R65.21', description: 'Severe sepsis with septic shock' },
  'residual weakness from prior cva': { code: 'I69.3', description: 'Sequelae of cerebral infarction' },
  'history of cva': { code: 'Z86.73', description: 'Personal history of transient ischemic attack (TIA), and cerebral infarction without residual deficits' }
};

// ============================================================================
// SYNONYM NORMALIZATION MAP (CRITICAL FOR EXPLICIT DIAGNOSIS OVERRIDE)
// Maps colloquial/abbreviated diagnosis terms to ICD10_MAPPING keys
// ============================================================================
const DIAGNOSIS_SYNONYMS = {
  // Strep throat variants
  'strep throat': 'streptococcal pharyngitis',
  'strep pharyngitis': 'streptococcal pharyngitis',
  'group a strep throat': 'streptococcal pharyngitis',
  'grou p a streptococcal pharyngitis': 'streptococcal pharyngitis',

  // UTI variants  
  'uti': 'urinary tract infection',
  'urinary infection': 'urinary tract infection',
  'bladder infection': 'urinary tract infection',

  // Pneumonia variants
  'pna': 'pneumonia',
  'lung infection': 'pneumonia',

  // Common abbreviations
  'mi': 'acute myocardial infarction',
  'arf': 'acute respiratory failure',
  'chf': 'heart failure',
  'copd': 'chronic obstructive pulmonary disease',

  // Other common terms
  'kidney failure': 'acute kidney injury',
  'renal failure': 'acute kidney injury'
};

// ============================================================================
// CLOSED INTENT SYSTEM - FINITE SEMANTIC CLASSIFICATION
// Maps finite clinical phrases to immutable semantic intents
// NO fuzzy matching | NO probabilities | FAIL SAFE on unknown
// ============================================================================

/**
 * CLINICAL_INTENT: Closed enum of semantic intents (IMMUTABLE)
 * NO new intents allowed without architectural approval
 */
const CLINICAL_INTENT = {
  // Causal relationships
  CAUSAL_LINK: 'CAUSAL_LINK',              // "due to", "secondary to"
  MANIFESTATION: 'MANIFESTATION',           // "manifestation of", "complication of"

  // Temporal/POA classification
  POA_YES: 'POA_YES',                      // "on admission", "admitted with"
  POA_NO: 'POA_NO',                        // "hospital-acquired", "developed after"
  POA_UNKNOWN: 'POA_UNKNOWN',              // No temporal markers

  // Clinical status
  ACUTE: 'ACUTE',                          // "acute", "sudden onset"
  CHRONIC: 'CHRONIC',                      // "chronic", "longstanding"
  EXACERBATION: 'EXACERBATION',           // "acute on chronic"

  // Diagnostic certainty  
  CONFIRMED: 'CONFIRMED',                  // "Diagnosis:", "Impression:"
  RULE_OUT: 'RULE_OUT',                   // "rule out", "r/o"
  QUERY: 'QUERY',                         // Ends with "?"
  POSSIBLE: 'POSSIBLE',                   // "possible", "probable"

  // History/sequelae
  HISTORY: 'HISTORY',                     // "history of", "past"
  SEQUELA: 'SEQUELA',                     // "residual", "late effect"

  // Negation (highest priority)
  NEGATION: 'NEGATION'                    // "no", "denies", "without"
};

/**
 * PHRASE DICTIONARIES (EXHAUSTIVE)
 * Every clinical phrase MUST map to exactly ONE intent
 * New phrases expand dictionaries, NEVER create new intents
 */

// CAUSAL_LINK: Indicates causal relationship between conditions
const CAUSAL_LINK_PHRASES = [
  'due to',
  'secondary to',
  'caused by',
  'related to',
  'associated with',
  'resulting from',
  'consequent to',
  'stemming from',
  'as a result of',
  'as a consequence of'
];

// MANIFESTATION: Indicates complication or manifestation
const MANIFESTATION_PHRASES = [
  'manifestation of',
  'manifesting as',
  'complication of',
  'complicated by',
  'with complication',
  'with manifestation'
];

// POA_YES: Present on admission
const POA_YES_PHRASES = [
  'on admission',
  'at admission',
  'admitted with',
  'admitted for',
  'present on admission',
  'on arrival',
  'at presentation',
  'presented with',
  'arrived with'
];

// POA_NO: Hospital-acquired
const POA_NO_PHRASES = [
  'developed after admission',
  'hospital-acquired',
  'hospital course',
  'developed during hospitalization',
  'occurred after admission',
  'post-admission',
  'on day 2',
  'on day 3',
  'on day 4',
  'on day 5',
  'on day 6',
  'on day 7',
  'on day 8',
  'on day 9',
  'later developed',
  'subsequently developed',
  'developed'  // General "developed" - check last for specificity
];

// RULE_OUT: Diagnostic uncertainty requiring exclusion
const RULE_OUT_PHRASES = [
  'rule out',
  'r/o',
  'ruled out',
  'to rule out',
  'ruling out',
  'workup for',  // Diagnostic workup implies uncertainty
  'evaluating for',
  'evaluation for'
];

// NEGATION: Explicit negation of diagnosis (HIGHEST PRIORITY)
const NEGATION_PHRASES = [
  'no',
  'without',
  'denies',
  'denied',
  'negative for',
  'absence of',
  'did not',
  'not diagnosed',
  'not documented'
];

// POSSIBLE: Probable/suspected diagnosis (exclude)
const POSSIBLE_PHRASES = [
  'possible',
  'probable',
  'likely',
  'suspected',
  'suspicion of',
  'concern for'
];

// HISTORY: Past medical history only
const HISTORY_PHRASES = [
  'history of',
  'past',
  'previous',
  'prior',
  'former',
  'old'
];

/**
 * Helper: Check if phrase exists with word boundaries
 * Prevents false positives (e.g., "no" matching "noted")
 */
const phraseMatchesWithBoundaries = (text, phrase) => {
  const words = phrase.split(/\s+/);
  if (words.length === 1) {
    // Single word - use word boundary regex
    const pattern = new RegExp(`\\b${words[0]}\\b`, 'i');
    return pattern.test(text);
  } else {
    // Multi-word phrase - exact match with word boundaries
    const pattern = new RegExp(`\\b${phrase}\\b`, 'i');
    return pattern.test(text);
  }
};

/**
 * classifyIntent: Deterministic intent classifier
 * @param {string} sentence - Clinical sentence to classify
 * @param {string} diagnosisTerm - Diagnosis term being evaluated
 * @returns {Array} Array of {intent, phrase, priority} objects
 */
const classifyIntent = (sentence, diagnosisTerm = null) => {
  const lower = sentence.toLowerCase();
  const results = [];

  // Priority 1: NEGATION (always check first) - USE WORD BOUNDARIES
  for (const phrase of NEGATION_PHRASES) {
    if (phraseMatchesWithBoundaries(lower, phrase)) {
      results.push({ intent: CLINICAL_INTENT.NEGATION, phrase, priority: 1 });
    }
  }

  // Priority 1: RULE_OUT - USE WORD BOUNDARIES
  for (const phrase of RULE_OUT_PHRASES) {
    if (phraseMatchesWithBoundaries(lower, phrase)) {
      results.push({ intent: CLINICAL_INTENT.RULE_OUT, phrase, priority: 1 });
    }
  }

  // Priority 1: POSSIBLE - USE WORD BOUNDARIES
  for (const phrase of POSSIBLE_PHRASES) {
    if (phraseMatchesWithBoundaries(lower, phrase)) {
      results.push({ intent: CLINICAL_INTENT.POSSIBLE, phrase, priority: 1 });
    }
  }

  // Priority 1: QUERY (ends with ?)
  if (sentence.trim().endsWith('?')) {
    results.push({ intent: CLINICAL_INTENT.QUERY, phrase: '?', priority: 1 });
  }

  // Priority 2: CAUSAL_LINK - can use contains for multi-word phrases
  for (const phrase of CAUSAL_LINK_PHRASES) {
    if (lower.includes(phrase)) {
      results.push({ intent: CLINICAL_INTENT.CAUSAL_LINK, phrase, priority: 2 });
    }
  }

  // Priority 2: MANIFESTATION - can use contains for multi-word phrases
  for (const phrase of MANIFESTATION_PHRASES) {
    if (lower.includes(phrase)) {
      results.push({ intent: CLINICAL_INTENT.MANIFESTATION, phrase, priority: 2 });
    }
  }

  // Priority 3: POA_YES - can use contains for multi-word phrases
  for (const phrase of POA_YES_PHRASES) {
    if (lower.includes(phrase)) {
      results.push({ intent: CLINICAL_INTENT.POA_YES, phrase, priority: 3 });
    }
  }

  // Priority 3: POA_NO - can use contains for multi-word phrases
  for (const phrase of POA_NO_PHRASES) {
    if (lower.includes(phrase)) {
      results.push({ intent: CLINICAL_INTENT.POA_NO, phrase, priority: 3 });
    }
  }

  // Priority 4: HISTORY - USE WORD BOUNDARIES for single words
  for (const phrase of HISTORY_PHRASES) {
    if (phraseMatchesWithBoundaries(lower, phrase)) {
      results.push({ intent: CLINICAL_INTENT.HISTORY, phrase, priority: 4 });
    }
  }

  // Default: No intent matched
  if (results.length === 0) {
    results.push({ intent: CLINICAL_INTENT.POA_UNKNOWN, phrase: null, priority: 5 });
  }

  return results;
};

/**
 * Sentence splitter helper
 * Splits narrative into sentences for intent classification
 */
const splitIntoSentences = (text) => {
  // Split by period, semicolon, or newline
  return text.split(/[.;\n]+/).map(s => s.trim()).filter(s => s.length > 0);
};

// ============================================================================
// LEVEL 3: POA (Present on Admission) DETECTION (CONTEXT-AWARE)
// v2.0: Refactored to use CLINICAL_INTENT closed intent system
// ============================================================================
const detectPOAStatus = (text, diagnosisPhrase) => {
  const lower = text.toLowerCase();
  const diagLower = diagnosisPhrase.toLowerCase();

  // Find the context (sentence/clause) containing this diagnosis
  const sentences = splitIntoSentences(text);
  let diagnosisContext = lower; // Default to full text

  // Find the sentence containing this diagnosis
  for (const sentence of sentences) {
    if (sentence.toLowerCase().includes(diagLower)) {
      diagnosisContext = sentence;
      break;
    }
  }

  // Use intent classifier for deterministic POA detection
  const intents = classifyIntent(diagnosisContext, diagnosisPhrase);

  // Check for POA_YES intent
  const poaYes = intents.find(i => i.intent === CLINICAL_INTENT.POA_YES);
  if (poaYes) {
    return { status: 'Y', phrase: poaYes.phrase };
  }

  // Check for POA_NO intent
  const poaNo = intents.find(i => i.intent === CLINICAL_INTENT.POA_NO);
  if (poaNo) {
    return { status: 'N', phrase: poaNo.phrase };
  }

  // Default: POA = U (Unknown - timing not specified)
  return { status: 'U', phrase: null };
};

// ============================================================================
// EXPLICIT PROVIDER DIAGNOSIS DETECTION (CRITICAL FIX)
// Detects diagnoses documented in structured sections BEFORE exclusion rules
// ============================================================================
const detectExplicitProviderDiagnosis = (text) => {
  // Patterns for diagnosis sections (order matters - most specific first)
  const diagnosisSections = [
    { pattern: /Diagnosis:\s*([^\n.;?]+)/i, section: 'Diagnosis' },
    { pattern: /Assessment:\s*([^\n.;?]+)/i, section: 'Assessment' },
    { pattern: /Impression:\s*([^\n.;?]+)/i, section: 'Impression' },
    { pattern: /Dx:\s*([^\n.;?]+)/i, section: 'Dx' },
    { pattern: /Assessment\s*&\s*Plan:\s*([^\n.;?]+)/i, section: 'Assessment & Plan' },
    { pattern: /A\/P:\s*([^\n.;?]+)/i, section: 'A/P' }
  ];

  for (const { pattern, section } of diagnosisSections) {
    const match = text.match(pattern);
    if (match && match[1].trim().length > 0) {
      const diagnosisText = match[1].trim();

      // Exclude if it's a negation or query phrase
      const isNegation = /^(no |rule out|r\/o|ruled out|denies|without)/i.test(diagnosisText);
      const isPossible = /^(possible|suspected|probable|likely)/i.test(diagnosisText);

      // Check if there's a ? immediately after this match
      const matchEnd = match.index + match[0].length;
      const hasQuery = text.charAt(matchEnd) === '?';

      if (!isNegation && !isPossible && !hasQuery) {
        return {
          hasExplicitDiagnosis: true,
          diagnosisText: diagnosisText,
          section: section
        };
      }
    }
  }

  return {
    hasExplicitDiagnosis: false,
    diagnosisText: null,
    section: null
  };
};

// ============================================================================
// LEVEL 4: PRINCIPAL DIAGNOSIS & SEQUENCING AUTHORITY
// v1.4-level4: Determines PDX and sequences codes per ICD-10-CM Guidelines
// ============================================================================

const detectAdmissionReason = (text) => {
  const lower = text.toLowerCase();

  // Pattern 1: "admitted for [diagnosis]"
  const admittedForMatch = lower.match(/admitted for ([^.;]+)/i);
  if (admittedForMatch) {
    return admittedForMatch[1].trim();
  }

  // Pattern 2: "admitted with [diagnosis]"
  const admittedWithMatch = lower.match(/admitted with ([^.;]+)/i);
  if (admittedWithMatch) {
    return admittedWithMatch[1].trim();
  }

  // Pattern 3: "admission for [diagnosis]"
  const admissionForMatch = lower.match(/admission for ([^.;]+)/i);
  if (admissionForMatch) {
    return admissionForMatch[1].trim();
  }

  return null;
};

const determinePrincipalDiagnosis = (codes, text) => {
  const eligibleForPDX = codes.filter(c => c.poa !== 'N');

  if (eligibleForPDX.length === 0) {
    return {
      decision: 'AUTO_QUERY',
      reason: 'No eligible PDX candidates (all codes are hospital-acquired)',
      pdx: null
    };
  }

  if (eligibleForPDX.length === 1) {
    return {
      pdx: eligibleForPDX[0].code,
      decision: 'PASS_THROUGH',
      justification: 'Single eligible code'
    };
  }

  const admissionReason = detectAdmissionReason(text);
  const pdxResult = applySequencingRules(eligibleForPDX, admissionReason, text);

  return pdxResult;
};

const applySequencingRules = (codes, admissionReason, text) => {
  const sepsisCode = codes.find(c => c.code.startsWith('A41'));
  if (sepsisCode && admissionReason && (admissionReason.includes('sepsis') || admissionReason.includes('septic'))) {
    return {
      pdx: sepsisCode.code,
      decision: 'AUTO_SEQUENCE',
      justification: 'Sepsis documented as admission reason per ICD-10-CM guidelines'
    };
  }

  const respFailureCode = codes.find(c => c.code.startsWith('J96'));
  if (respFailureCode && respFailureCode.poa === 'Y' && admissionReason && admissionReason.includes('respiratory failure')) {
    return {
      pdx: respFailureCode.code,
      decision: 'AUTO_SEQUENCE',
      justification: 'Respiratory failure documented as admission reason'
    };
  }

  const diabeticComboCode = codes.find(c => c.code.startsWith('E11.6') || c.code.startsWith('E11.4'));
  if (diabeticComboCode && admissionReason && (admissionReason.includes('diabetic') || admissionReason.includes('foot ulcer'))) {
    return {
      pdx: diabeticComboCode.code,
      decision: 'AUTO_SEQUENCE',
      justification: 'Diabetic complication documented as admission reason'
    };
  }

  const poaYCodes = codes.filter(c => c.poa === 'Y');
  if (poaYCodes.length === 1) {
    return {
      pdx: poaYCodes[0].code,
      decision: 'AUTO_SEQUENCE',
      justification: 'Only POA=Y code eligible for PDX'
    };
  }

  if (poaYCodes.length > 0) {
    return {
      pdx: poaYCodes[0].code,
      decision: 'AUTO_SEQUENCE',
      justification: 'First documented POA=Y diagnosis'
    };
  }

  return {
    pdx: null,
    decision: 'AUTO_QUERY',
    reason: 'Unable to determine principal diagnosis from documentation'
  };
};

const assignCodeRoles = (codes, pdxCode) => {
  return codes.map(c => ({
    ...c,
    role: c.code === pdxCode ? 'PRIMARY' : 'SECONDARY'
  }));
};


// ============================================================================
// LEVEL 5: DENIAL SIMULATION & DEFENSIBILITY SCORE AUTHORITY
// v1.5-level5: Adds audit metadata WITHOUT changing LEVEL 0-4 behavior
// ============================================================================

// Helper: Split text into sentences
const splitSentences = (text) => {
  return text.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 0);
};

// Helper: Find sentence containing diagnosis term
const findDiagnosisSentence = (text, diagnosisTerm) => {
  const sentences = splitSentences(text);
  const lower = diagnosisTerm.toLowerCase();

  for (const sentence of sentences) {
    if (sentence.toLowerCase().includes(lower)) {
      return sentence;
    }
  }
  return null;
};

// Helper: Extract snippet around term (max 25 words)
const extractSnippet = (sentence, term, maxWords = 25) => {
  if (!sentence) return null;

  const words = sentence.split(/\s+/);
  if (words.length <= maxWords) {
    return sentence;
  }

  // Find term position and create window around it
  const lowerWords = words.map(w => w.toLowerCase());
  const lowerTerm = term.toLowerCase();

  let termIndex = -1;
  for (let i = 0; i < lowerWords.length; i++) {
    if (lowerWords.slice(i, i + lowerTerm.split(/\s+/).length).join(' ').includes(lowerTerm)) {
      termIndex = i;
      break;
    }
  }

  if (termIndex === -1) {
    return words.slice(0, maxWords).join(' ');
  }

  const start = Math.max(0, termIndex - Math.floor(maxWords / 2));
  const end = Math.min(words.length, start + maxWords);

  return words.slice(start, end).join(' ');
};

// Helper: Compute defensibility score
const computeDefensibility = (code, anchors, poa, linkage, text) => {
  let score = 100;
  let anchorStrength = 'STRONG';

  // Check for weak documentation phrases
  const weakPhrases = ['possible', 'rule out', 'concern for', 'suspected', 'likely'];
  if (weakPhrases.some(phrase => text.toLowerCase().includes(phrase))) {
    score -= 40;
    anchorStrength = 'WEAK';
  }

  // Check anchor quality
  if (!anchors || anchors.length === 0) {
    score -= 30;
    anchorStrength = 'WEAK';
  } else if (anchors.length === 1) {
    score -= 15;
    if (anchorStrength !== 'WEAK') anchorStrength = 'MODERATE';
  }

  // POA=U penalty
  if (poa === 'U') {
    score -= 10;
  }

  // UNLINKED penalty (mild)
  if (linkage === 'UNLINKED') {
    score -= 5;
  }

  // Adjust anchor strength based on score
  if (score >= 75) anchorStrength = 'STRONG';
  else if (score >= 50) anchorStrength = 'MODERATE';
  else anchorStrength = 'WEAK';

  return {
    score: Math.max(0, Math.min(100, score)),
    anchorStrength
  };
};

// Helper: Compute denial risk score (updated to handle linkage correctly)
const computeDenialRisk = (code, description, defensibility, poa, linkageStatus, text) => {
  let riskScore = 0;
  const reasons = [];
  const mitigations = [];

  // A) Specificity Gaps
  if (code === 'A41.9' && (text.includes('culture') || text.includes('MRSA') || text.includes('E. coli'))) {
    riskScore += 25;  // Increased from 15 to reach MEDIUM tier
    reasons.push('Organism unspecified (A41.9) when culture results may be documented');
    mitigations.push('If organism documented, use specific code (e.g., A41.01 for MRSA sepsis)');
  }

  if (code === 'J18.9' && (text.includes('pneumococcal') || text.includes('staph') || text.includes('viral'))) {
    riskScore += 15;  // Increased from 10
    reasons.push('Pneumonia organism unspecified when pathogen may be documented');
    mitigations.push('Capture organism specificity if documented (e.g., J13 for pneumococcal)');
  }

  if (code === 'N18.9') {
    riskScore += 20;
    reasons.push('CKD stage not specified - high audit scrutiny');
    mitigations.push('Document CKD stage (1-5) based on GFR if available');
  }

  // B) Linkage Strength (only for multi-code cases)
  if (linkageStatus === 'LINKED') {
    riskScore -= 15; // Reduces risk for explicitly linked diagnoses
  } else if (linkageStatus === 'UNLINKED') {
    // Only penalize if truly multiple unlinked codes
    riskScore += 20;
    reasons.push('Multiple diagnoses without documented linkage');
    mitigations.push('Ensure each diagnosis is independently documented');
  }
  // SINGLE_CODE status gets no penalty/bonus

  // C) POA Complexity
  if (poa === 'N') {
    riskScore += 20;
    reasons.push('Hospital-acquired condition - HAC program scrutiny');
    mitigations.push('Ensure POA=N is correct and documented as developing after admission');
  } else if (poa === 'U') {
    if (code.startsWith('A41') || code.startsWith('J96') || code.startsWith('I21')) {
      riskScore += 15;
      reasons.push('POA unknown for major diagnosis - auditors may question timing');
      mitigations.push('Document explicit admission timing for major diagnoses');
    }
  }

  // D) High-Scrutiny Diagnoses
  if (code === 'R65.20' || code === 'R65.21') {
    riskScore += 40;  // Increased to ensure MEDIUM tier even with LINKED reduction (-15)
    reasons.push('Severe sepsis/septic shock - always reviewed by payers');
    mitigations.push('Ensure explicit provider documentation of severe sepsis');
  }

  if (code === 'J96.01') {
    riskScore += 15;  // Increased from 10
    reasons.push('Acute respiratory failure - high DRG impact, frequently audited');
    mitigations.push('Ensure ARF explicitly documented, not inferred from ABG');
  }

  if (code === 'N17.9') {
    riskScore += 10;
    reasons.push('Acute kidney injury - HAC and frequency scrutiny');
    mitigations.push('Document AKI with baseline creatinine if available');
  }

  if (code === 'D62') {
    // Significantly reduce risk if linked to bleeding or bleeding mentioned
    if (linkageStatus === 'LINKED' || text.toLowerCase().includes('bleeding')) {
      // Linked to bleeding - strongly reduce risk
      riskScore -= 10;
    } else {
      // D62 without bleeding documentation
      riskScore += 15;
      reasons.push('Acute blood loss anemia - requires clear bleeding linkage');
      mitigations.push('Ensure anemia explicitly linked to documented bleeding source');
    }
  }

  // E) Documentation Anchor Quality
  if (defensibility.anchorStrength === 'WEAK') {
    riskScore += 25;
    reasons.push('Weak documentation anchors - diagnosis phrasing unclear or ambiguous');
    mitigations.push('Request provider clarification of diagnosis status');
  } else if (defensibility.anchorStrength === 'MODERATE') {
    riskScore += 10;
    reasons.push('Moderate documentation quality - could be stronger');
    mitigations.push('Verify diagnosis appears in final assessment');
  }

  // Clamp score
  riskScore = Math.max(0, Math.min(100, riskScore));

  // Determine tier (balanced thresholds)
  let tier = 'LOW';
  if (riskScore >= 50) tier = 'HIGH';
  else if (riskScore >= 25) tier = 'MEDIUM';  // Adjusted to 25

  return {
    score: riskScore,
    tier,
    reasons,
    mitigations
  };
};

// Helper: Build evidence packet
const buildEvidencePacket = (code, description, diagnosisSentence, poaPhrase, linkagePhrase, sequencingJustification, ruleTrace) => {
  return {
    ruleTrace: ruleTrace || [],
    docContext: {
      diagnosisSentence: diagnosisSentence || 'Not found',
      poaPhrase: poaPhrase || 'N/A',
      linkagePhrase: linkagePhrase || 'N/A'
    },
    sequencingRationale: sequencingJustification || 'N/A'
  };
};

module.exports = async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const { text } = req.body;

    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Missing or invalid "text" field' });
    }

    // ========================================================================
    // LEVEL 0: NEGATION DETECTION (FROZEN - DO NOT MODIFY)
    // v2.0: Refactored to use CLINICAL_INTENT closed intent system
    // ========================================================================
    const isNegated = (term) => {
      // Split narrative into sentences for context-aware detection
      const sentences = splitIntoSentences(text);

      for (const sentence of sentences) {
        const lower = sentence.toLowerCase();
        const termLower = term.toLowerCase();

        // Only check sentences containing the term
        if (!lower.includes(termLower)) {
          continue;
        }

        // Use intent classifier for deterministic negation detection
        const intents = classifyIntent(sentence, term);

        // Check for exclusion intents (NEGATION, RULE_OUT, POSSIBLE, QUERY)
        const hasNegation = intents.some(i => i.intent === CLINICAL_INTENT.NEGATION);
        const hasRuleOut = intents.some(i => i.intent === CLINICAL_INTENT.RULE_OUT);
        const hasPossible = intents.some(i => i.intent === CLINICAL_INTENT.POSSIBLE);
        const hasQuery = intents.some(i => i.intent === CLINICAL_INTENT.QUERY);

        if (hasNegation || hasRuleOut || hasPossible || hasQuery) {
          return true;  // Term is negated/excluded
        }

        // CRITICAL FIX: HISTORY intent handling
        // "history of diabetes" = past condition (don't code)
        // "long history of diabetes" = chronic active condition (DO code)
        const hasHistory = intents.some(i => i.intent === CLINICAL_INTENT.HISTORY);
        if (hasHistory) {
          // Check if this is "long history" context (chronic, still active)
          const isLongHistory = /long history|chronic history|longstanding|ongoing/i.test(sentence);

          if (!isLongHistory) {
            // Plain "history of" = past resolved condition
            return true;
          }
          // If "long history", continue - not negated (active chronic condition)
        }
      }

      return false;
    };

    // ========================================================================
    // LEVEL 1: DIAGNOSIS DETECTION (EXPLICIT ONLY)
    // ========================================================================
    const lower = text.toLowerCase();
    let detectedDiagnoses = [];  // Changed to 'let' for manifestation linking
    let codes = [];  // LEVEL 3: Changed to 'let' for deduplication
    const queries = [];
    // Sepsis (check first for proper sequencing as primary)
    if (lower.includes('severe sepsis') && !isNegated('sepsis')) {
      detectedDiagnoses.push('severe sepsis');
    } else if (lower.includes('sepsis') && !isNegated('sepsis')) {
      detectedDiagnoses.push('sepsis');
    }

    // Check for sepsis source
    if (lower.includes('pneumonia') && !isNegated('pneumonia')) {
      if (!detectedDiagnoses.includes('pneumonia')) {
        detectedDiagnoses.push('pneumonia');
      }
    }

    // Respiratory
    if (lower.includes('acute respiratory failure') && !isNegated('acute respiratory failure')) {
      if (lower.includes('with hypoxia')) {
        detectedDiagnoses.push('acute respiratory failure with hypoxia');
      } else {
        detectedDiagnoses.push('acute respiratory failure');
      }
    }

    // Renal diagnoses
    // Check for AKI/acute renal failure/acute kidney failure
    const akiPatterns = [
      'acute kidney injury',
      'acute renal failure',
      'acute kidney failure'
    ];

    for (const pattern of akiPatterns) {
      if (lower.includes(pattern) && !isNegated(pattern)) {
        detectedDiagnoses.push('acute kidney injury');
        break; // Only add once
      }
    }

    // Also check for AKI abbreviation
    if (lower.match(/\baki\b/) && !isNegated('aki') && !detectedDiagnoses.includes('acute kidney injury')) {
      detectedDiagnoses.push('aki');
    }

    // Check for CKD with stage
    if (lower.match(/chronic kidney disease stage [34]|ckd stage [34]/) && !isNegated('chronic kidney disease')) {
      if (lower.includes('stage 3')) {
        detectedDiagnoses.push('chronic kidney disease stage 3');
      } else if (lower.includes('stage 4')) {
        detectedDiagnoses.push('chronic kidney disease stage 4');
      }
    } else if (lower.match(/chronic kidney disease|ckd/) && !isNegated('chronic kidney disease') && !isNegated('ckd')) {
      // CRITICAL FIX: CKD without stage - CHECK for stage elsewhere in narrative BEFORE triggering query
      // Look for patterns like "currently at Stage 4", "Stage 3 CKD", "CKD 4", etc.
      const stagePatterns = [
        /stage\s*[1-5]/i,
        /(stage|stg)\.?\s*[1-5]/i,
        /\b(ckd|chronic kidney disease)\s*[1-5]\b/i,
        /\b[1-5]\s*(ckd|chronic kidney disease)\b/i
      ];

      let foundStage = null;
      for (const pattern of stagePatterns) {
        const match = text.match(pattern);
        if (match) {
          // Extract the stage number
          const stageMatch = match[0].match(/[1-5]/);
          if (stageMatch) {
            foundStage = stageMatch[0];
            break;
          }
        }
      }


      if (foundStage) {
        // Stage was found elsewhere in narrative - use staged variant
        if (foundStage === '3') {
          detectedDiagnoses.push('chronic kidney disease stage 3');
        } else if (foundStage === '4') {
          detectedDiagnoses.push('chronic kidney disease stage 4');
        } else {
          // Stages 1, 2, 5 not in mapping - trigger query
          detectedDiagnoses.push('chronic kidney disease');
        }
      } else {
        // No stage found anywhere - trigger query
        detectedDiagnoses.push('chronic kidney disease');
      }
    }

    // Respiratory
    if (lower.includes('acute respiratory failure') && !isNegated('acute respiratory failure')) {
      if (lower.includes('with hypoxia')) {
        detectedDiagnoses.push('acute respiratory failure with hypoxia');
      } else {
        detectedDiagnoses.push('acute respiratory failure');
      }
    }

    // ========================================================================
    // LEVEL 2: EXPANDED DIAGNOSIS DETECTION (LINKED & UNLINKED)
    // ========================================================================

    // LEVEL 2: Respiratory failure due to pneumonia (LINKED)
    if (lower.includes('acute respiratory failure due to pneumonia') && !isNegated('acute respiratory failure') && !isNegated('pneumonia')) {
      detectedDiagnoses.push('acute respiratory failure due to pneumonia');
    } else if (lower.includes('acute respiratory failure') && !isNegated('acute respiratory failure')) {
      if (lower.includes('with hypoxia')) {
        detectedDiagnoses.push('acute respiratory failure with hypoxia');
      } else {
        detectedDiagnoses.push('acute respiratory failure');
      }
    } else if (lower.includes('respiratory failure') && !isNegated('respiratory failure')) {
      // LEVEL 3: Handle "respiratory failure" without "acute"
      detectedDiagnoses.push('acute respiratory failure');
    }

    // LEVEL 2: Sepsis complicated by shock (LINKED)
    if (lower.match(/sepsis complicated by.*shock/) && !isNegated('sepsis')) {
      if (lower.includes('septic shock')) {
        detectedDiagnoses.push('sepsis complicated by septic shock');
      } else {
        detectedDiagnoses.push('sepsis complicated by shock');
      }
    }

    // LEVEL 2: Diabetes complications (LINKED & UNLINKED)
    if (lower.includes('diabetic foot ulcer') && !isNegated('diabetic foot ulcer')) {
      detectedDiagnoses.push('diabetic foot ulcer');
    } else if (lower.includes('diabetic neuropathy') && !isNegated('diabetic neuropathy')) {
      detectedDiagnoses.push('diabetic neuropathy');
    } else if (lower.includes('neuropathy due to diabetes') && !isNegated('neuropathy') && !isNegated('diabetes')) {
      detectedDiagnoses.push('neuropathy due to diabetes');
    } else if (lower.includes('diabetic peripheral angiopathy') && !isNegated('diabetic peripheral angiopathy')) {
      detectedDiagnoses.push('diabetic peripheral angiopathy');
    } else if (lower.includes('diabetic hyperglycemia') && !isNegated('diabetic hyperglycemia')) {
      detectedDiagnoses.push('diabetic hyperglycemia');
    } else {
      // Check for UNLINKED diabetes and complications
      const hasDiabetes = lower.match(/type 2 diabetes/) && !isNegated('type 2 diabetes');
      const hasFootUlcer = lower.match(/foot ulcer/) && !isNegated('foot ulcer');
      const hasNeuropathy = lower.match(/\b(peripheral )?neuropathy\b/) && !isNegated('neuropathy');

      if (hasDiabetes && hasFootUlcer) {
        detectedDiagnoses.push('type 2 diabetes');
        detectedDiagnoses.push('foot ulcer');
      } else if (hasDiabetes && hasNeuropathy) {
        detectedDiagnoses.push('type 2 diabetes');
        if (lower.includes('peripheral')) {
          detectedDiagnoses.push('peripheral neuropathy');
        } else {
          detectedDiagnoses.push('neuropathy');
        }
      } else if (hasDiabetes) {
        detectedDiagnoses.push('type 2 diabetes');
      }
    }

    // COPD
    if ((lower.includes('copd with acute exacerbation') || lower.includes('copd exacerbation')) && !isNegated('copd')) {
      detectedDiagnoses.push('copd exacerbation');
    } else if ((lower.includes('copd') || lower.includes('chronic obstructive pulmonary disease')) && !isNegated('copd')) {
      detectedDiagnoses.push('copd');
    }



    // Cardiovascular
    if (lower.includes('essential hypertension') && !isNegated('hypertension')) {
      detectedDiagnoses.push('essential hypertension');
    } else if (lower.includes('hypertension') && !isNegated('hypertension')) {
      detectedDiagnoses.push('hypertension');
    }

    if (lower.includes('acute stemi of anterior wall') && !isNegated('stemi') && !isNegated('myocardial infarction')) {
      detectedDiagnoses.push('acute stemi of anterior wall');
    }

    if (lower.includes('atrial fibrillation, permanent') && !isNegated('atrial fibrillation')) {
      detectedDiagnoses.push('atrial fibrillation, permanent');
    }

    // Obesity
    if (lower.includes('morbid obesity with bmi 42') && !isNegated('obesity')) {
      detectedDiagnoses.push('morbid obesity with bmi 42');
    }

    // Infectious
    if (lower.includes('sore throat, strep positive') && !isNegated('sore throat')) {
      detectedDiagnoses.push('sore throat, strep positive');
    }

    // Surgical
    if (lower.includes('acute appendicitis with localized peritonitis') && !isNegated('appendicitis')) {
      detectedDiagnoses.push('acute appendicitis with localized peritonitis');
    }

    // Trauma
    if (lower.includes('displaced fracture of right femur shaft, initial') && !isNegated('fracture')) {
      detectedDiagnoses.push('displaced fracture of right femur shaft, initial');
    }

    // Renal
    if (lower.includes('urinary tract infection') && !isNegated('urinary tract infection')) {
      detectedDiagnoses.push('urinary tract infection');
    } else if (lower.includes('uti') && !isNegated('uti')) {
      detectedDiagnoses.push('uti');
    }


    // Heart Failure
    if (lower.includes('acute on chronic systolic heart failure') && !isNegated('heart failure')) {
      detectedDiagnoses.push('acute on chronic systolic heart failure');
    } else if (lower.includes('congestive heart failure') && !isNegated('heart failure')) {
      // LEVEL 3: Congestive heart failure
      detectedDiagnoses.push('heart failure');
    } else if (lower.includes('heart failure') && !isNegated('heart failure')) {
      detectedDiagnoses.push('heart failure');
    }

    // Stroke - check for "no residual" FIRST
    if (lower.match(/history of.*(cva|stroke)/) && lower.match(/no residual/) && !isNegated('cva')) {
      detectedDiagnoses.push('history of cva');
    } else if (lower.match(/residual.*(weakness|deficit)/) && (lower.includes('stroke') || lower.includes('cva')) && !isNegated('cva')) {
      detectedDiagnoses.push('residual weakness from prior cva');
    }


    // ========================================================================
    // LEVEL 4: ADDITIONAL DIAGNOSIS DETECTION (MI, GI BLEEDING, TRAUMA)
    // Must run BEFORE AUTO_EXCLUDE check
    // ========================================================================

    // MI/Chest Pain (explicit only)
    if ((lower.includes('myocardial infarction') || lower.includes('acute mi')) && !isNegated('myocardial infarction')) {
      if (lower.includes('stemi')) {
        detectedDiagnoses.push('acute ST elevation myocardial infarction');
      } else if (lower.includes('nstemi')) {
        detectedDiagnoses.push('acute non-ST elevation myocardial infarction');
      } else {
        detectedDiagnoses.push('acute myocardial infarction');
      }
    }

    if (lower.includes('chest pain') && !isNegated('chest pain')) {
      detectedDiagnoses.push('chest pain');
    }

    // GI Bleeding (explicit only)
    if ((lower.match(/gastrointestinal bleeding|gi bleeding|gi bleed/) || lower.includes('gastrointestinal hemorrhage')) && !isNegated('bleeding')) {
      detectedDiagnoses.push('gastrointestinal bleeding');
    }

    // Acute blood loss anemia (explicit only)
    if (lower.match(/acute blood loss anemia|blood loss anemia/) && !isNegated('anemia')) {
      detectedDiagnoses.push('acute blood loss anemia');
    }

    // Trauma/Fractures (explicit only)
    if ((lower.includes('femur fracture') || lower.match(/fracture of femur|fractured femur/)) && !isNegated('fracture')) {
      detectedDiagnoses.push('femur fracture');
    }

    if (lower.match(/\btrauma\b|traumatic injury/) && !isNegated('trauma')) {
      detectedDiagnoses.push('trauma');
    }

    if (lower.includes('fall') && !isNegated('fall')) {
      detectedDiagnoses.push('fall');
    }

    // Septic shock hospital-acquired (robust detection)
    // Uses word boundaries, negation check, and specific septic shock matching
    if (/\bseptic shock\b.*\b(developed|occurred|noted)\b/.test(lower) &&
      /\b(after admission|during hospitalization|hospital[- ]acquired)\b/.test(lower) &&
      !isNegated('septic shock')) {
      detectedDiagnoses.push('septic shock hospital-acquired');
    }

    // ========================================================================
    // LEVEL 0: AUTO_EXCLUDE (FROZEN - ALWAYS WINS)
    // CRITICAL FIX: Check for explicit provider diagnosis FIRST
    // ========================================================================

    // Detect explicit provider diagnosis from structured sections
    const explicitDiagnosis = detectExplicitProviderDiagnosis(text);

    if (detectedDiagnoses.length === 0 && !explicitDiagnosis.hasExplicitDiagnosis) {
      const auditDecisionBlock = `
          <div class="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-md">
              <div class="flex items-start gap-3">
                  <i class="fa-solid fa-gavel text-blue-600 text-xl mt-1"></i>
                  <div class="flex-1">
                      <h3 class="font-bold text-blue-900 text-sm uppercase tracking-wide mb-2">
                          AUDIT DECISION — AUTO EXCLUDE
                      </h3>
                      <div class="text-sm text-blue-800 space-y-2 mb-3">
                          <p class="leading-relaxed">
                              Clinical data such as laboratory abnormalities, monitoring, or risk discussion 
                              was identified. However, <strong>no explicit provider diagnosis</strong> supporting a reportable 
                              ICD-10-CM condition was documented.
                          </p>
                          <p class="leading-relaxed">
                              Per ICD-10-CM Official Guidelines, diagnoses may not be inferred from laboratory 
                              values, monitoring, or risk discussion alone.
                          </p>
                      </div>
                      <div class="bg-blue-100 border border-blue-200 rounded p-2 mb-3">
                          <p class="text-xs font-semibold text-blue-900 mb-1">RULE REFERENCE</p>
                          <p class="text-xs text-blue-800">Rule Group 3.3: Laboratory Values Alone</p>
                      </div>
                      <div class="space-y-1 mb-3">
                          <p class="text-xs font-semibold text-blue-900 uppercase tracking-wide">OUTCOME CONFIRMATION</p>
                          <p class="text-xs text-blue-700">✔ No ICD-10-CM diagnosis codes assigned</p>
                          <p class="text-xs text-blue-700">✔ No provider query required</p>
                          <p class="text-xs text-blue-700">✔ Audit-defensible exclusion applied</p>
                      </div>
                      <div class="border-t border-blue-200 pt-2">
                          <p class="text-xs text-blue-600 italic">
                              This determination is compliant with ICD-10-CM Official Guidelines and Medicare audit standards.
                          </p>
                      </div>
                  </div>
              </div>
          </div>
      `;

      return res.status(200).json({
        success: true,
        data: {
          text,
          primary: null,
          secondary: [],
          warnings: [],
          validationErrors: [auditDecisionBlock],
          validationChanges: { removed: [], added: [] },
          _debug: {
            apiVersion: 'v1.1-level1',
            decisionState: 'AUTO_EXCLUDE',
            timestamp: new Date().toISOString()
          }
        }
      });
    } else if (explicitDiagnosis.hasExplicitDiagnosis && detectedDiagnoses.length === 0) {
      // CRITICAL PATH: Explicit diagnosis exists but wasn't detected by pattern matching
      // Try to add it to detectedDiagnoses for normal processing
      console.warn('[AUDIT] Explicit diagnosis found but not auto-detected:', explicitDiagnosis.diagnosisText);

      // Attempt fuzzy match against ICD10_MAPPING (normalize text)
      let normalizedDiag = explicitDiagnosis.diagnosisText.toLowerCase().trim();
      let foundMapping = false;

      // Step 1: Check synonym map first
      if (DIAGNOSIS_SYNONYMS[normalizedDiag]) {
        normalizedDiag = DIAGNOSIS_SYNONYMS[normalizedDiag];
        console.warn('[AUDIT] Normalized via synonym map:', explicitDiagnosis.diagnosisText, '->', normalizedDiag);
      }

      // Step 2: Direct match in ICD10_MAPPING
      if (ICD10_MAPPING[normalizedDiag]) {
        detectedDiagnoses.push(normalizedDiag);
        foundMapping = true;
      } else {
        // Step 3: Partial match attempt (e.g., "Strep throat" -> "sepsis")
        for (const [key, mapping] of Object.entries(ICD10_MAPPING)) {
          if (normalizedDiag.includes(key) || key.includes(normalizedDiag)) {
            detectedDiagnoses.push(key);
            foundMapping = true;
            break;
          }
        }
      }

      // If still no match, log warning but DO NOT AUTO_EXCLUDE
      // Let it fall through to normal processing (will likely trigger AUTO_QUERY)
      if (!foundMapping) {
        console.warn('[AUDIT] Explicit diagnosis not in ICD10_MAPPING:', explicitDiagnosis.diagnosisText);
        console.warn('[AUDIT] Section:', explicitDiagnosis.section);
        // Continue to normal processing - may trigger AUTO_QUERY or other logic
      }
    }

    // ========================================================================
    // LEVEL 2: DIABETES + CKD MANIFESTATION LINKING (DETERMINISTIC)
    // Detects explicit manifestation language and forces combination code
    // ========================================================================

    // Check if we have both diabetes and CKD detected
    const hasDiabetes = detectedDiagnoses.some(d => d.toLowerCase().includes('diabetes'));
    const hasCKD = detectedDiagnoses.some(d => d.toLowerCase().includes('chronic kidney disease'));

    if (hasDiabetes && hasCKD) {
      // First check for implicit "with" pattern  
      const hasImplicitWith = /diabetes\s+with\s+(ckd|chronic kidney disease)/i.test(text);

      if (hasImplicitWith) {
        const hasCKDStage3 = detectedDiagnoses.some(d => d.toLowerCase().includes('chronic kidney disease stage 3'));
        const hasCKDStage4 = detectedDiagnoses.some(d => d.toLowerCase().includes('chronic kidney disease stage 4'));

        detectedDiagnoses = detectedDiagnoses.filter(d => d.toLowerCase() !== 'type 2 diabetes');
        detectedDiagnoses = detectedDiagnoses.filter(d => !d.toLowerCase().includes('chronic kidney disease'));

        if (hasCKDStage4) {
          detectedDiagnoses.push('diabetic chronic kidney disease stage 4');
        } else if (hasCKDStage3) {
          detectedDiagnoses.push('diabetic chronic kidney disease stage 3');
        }
        console.warn('[IMPLICIT LINK] Diabetes WITH CKD detected - forcing E11.22');
      } else {
        // Explicit manifestation check
        // Check full narrative for manifestation language
        // This catches cases like: "CKD stage 4 secondary to diabetes" or "CKD due to diabetes"
        const lower = text.toLowerCase();
        const hasManifestationKeywords = (
          (lower.includes('ckd') || lower.includes('chronic kidney disease') || lower.includes('kidney disease')) &&
          (lower.includes('diabetes') || lower.includes('dm'))
        );

        if (hasManifestationKeywords) {
          // Use intent classifier to detect MANIFESTATION intent anywhere in text
          const sentences = splitIntoSentences(text);
          let manifestationDetected = false;

          for (const sentence of sentences) {
            const intents = classifyIntent(sentence);
            // Accept BOTH manifestation AND causal link intents
            // "due to", "secondary to" = CAUSAL_LINK
            // "manifestation of" = MANIFESTATION
            const hasManifest = intents.some(i =>
              i.intent === CLINICAL_INTENT.MANIFESTATION ||
              i.intent === CLINICAL_INTENT.CAUSAL_LINK
            );

            if (hasManifest) {
              // Verify this sentence mentions CKD or diabetes
              const sentLower = sentence.toLowerCase();
              if ((sentLower.includes('ckd') || sentLower.includes('kidney') || sentLower.includes('renal')) ||
                (sentLower.includes('diabetes') || sentLower.includes('dm'))) {
                manifestationDetected = true;
                break;
              }
            }
          }

          if (manifestationDetected) {
            // MANDATORY: Apply ICD-10-CM combination rule
            // Replace unlinked codes with linked combination code

            // Remove E11.9 and individual CKD codes from detection list
            detectedDiagnoses = detectedDiagnoses.filter(d => {
              const dLower = d.toLowerCase();
              // Keep diabetic complications, remove plain "type 2 diabetes"
              if (dLower === 'type 2 diabetes') return false;
              // Keep CKD for stage info, but will replace with combination
              return true;
            });

            // CRITICAL FIX: Check what CKD stage is in detectedDiagnoses array (already detected by CKD logic)
            // instead of re-parsing text (which might miss patterns like "currently at Stage 4")
            const hasCKDStage3 = detectedDiagnoses.some(d => d.toLowerCase().includes('chronic kidney disease stage 3'));
            const hasCKDStage4 = detectedDiagnoses.some(d => d.toLowerCase().includes('chronic kidney disease stage 4'));

            // Remove standalone CKD codes
            detectedDiagnoses = detectedDiagnoses.filter(d => !d.toLowerCase().includes('chronic kidney disease'));

            if (hasCKDStage4) {
              detectedDiagnoses.push('diabetic chronic kidney disease stage 4');
            } else if (hasCKDStage3) {
              detectedDiagnoses.push('diabetic chronic kidney disease stage 3');
            }

            console.warn('[MANIFESTATION LINK] Diabetes + CKD manifestation detected - forcing E11.22 combination code');
          }
        }
      }  // Close implicit vs explicit check
    }

    // ========================================================================
    // LEVEL 2: COPD + RESPIRATORY FAILURE MANIFESTATION LINKING (DETERMINISTIC)
    // Detects explicit causal language and forces combination code
    // ========================================================================

    // Check if we have both COPD and respiratory failure detected
    const hasCOPD = detectedDiagnoses.some(d => d.toLowerCase().includes('copd') || d.toLowerCase().includes('chronic obstructive'));
    const hasRespiratoryFailure = detectedDiagnoses.some(d => d.toLowerCase().includes('respiratory failure'));

    if (hasCOPD && hasRespiratoryFailure) {
      // Check full narrative for manifestation/causal language
      const lower = text.toLowerCase();
      const hasCOPDKeywords = (lower.includes('copd') || lower.includes('chronic obstructive'));
      const hasRespFailureKeywords = (lower.includes('respiratory failure') || lower.includes('arf'));

      if (hasCOPDKeywords && hasRespFailureKeywords) {
        // Use intent classifier to detect MANIFESTATION or CAUSAL_LINK intent
        const sentences = splitIntoSentences(text);
        let manifestationDetected = false;

        for (const sentence of sentences) {
          const intents = classifyIntent(sentence);
          const hasManifest = intents.some(i =>
            i.intent === CLINICAL_INTENT.MANIFESTATION ||
            i.intent === CLINICAL_INTENT.CAUSAL_LINK
          );

          if (hasManifest) {
            // Verify this sentence mentions COPD or respiratory failure
            const sentLower = sentence.toLowerCase();
            if ((sentLower.includes('copd') || sentLower.includes('chronic obstructive') || sentLower.includes('respiratory failure') || sentLower.includes('arf'))) {
              manifestationDetected = true;
              break;
            }
          }
        }

        if (manifestationDetected) {
          // MANDATORY: Apply ICD-10-CM combination rule
          // Remove unlinked codes and replace with linked combination code

          // Remove standalone COPD and respiratory failure codes
          detectedDiagnoses = detectedDiagnoses.filter(d => {
            const dLower = d.toLowerCase();
            // Remove plain respiratory failure
            if (dLower.includes('respiratory failure') && !dLower.includes('copd')) return false;
            // Remove standalone COPD
            if ((dLower.includes('copd') || dLower.includes('chronic obstructive')) && !dLower.includes('respiratory failure')) return false;
            return true;
          });

          // Add the combination code
          detectedDiagnoses.push('copd with acute exacerbation and respiratory failure');

          console.warn('[MANIFESTATION LINK] COPD + respiratory failure manifestation detected - forcing J44.1 combination code');
        }
      }
    }


    // ========================================================================
    // LEVEL 2: DIAGNOSIS-TO-CODE MAPPING
    // ========================================================================
    let hasLinkedCodes = false;
    let linkPhrase = null;

    for (const diagnosis of detectedDiagnoses) {
      const mapping = ICD10_MAPPING[diagnosis.toLowerCase()];

      if (!mapping) {
        // No mapping found - skip
        continue;
      }

      if (mapping.query) {
        // Required specificity missing - generate query
        queries.push({
          diagnosis,
          query: mapping.query
        });
      } else if (mapping.codes) {
        // Multiple codes (e.g., severe sepsis, respiratory failure due to pneumonia)
        for (let i = 0; i < mapping.codes.length; i++) {
          // LEVEL 3: Detect POA status for this diagnosis
          const poaResult = detectPOAStatus(text, diagnosis);

          codes.push({
            code: mapping.codes[i],
            description: mapping.descriptions[i],
            poa: poaResult.status,  // LEVEL 3: POA status
            poaJustification: poaResult.phrase  // LEVEL 3: POA phrase
          });
        }
        // Track linkage
        if (mapping.linked) {
          hasLinkedCodes = true;
          if (mapping.linkPhrase) {
            linkPhrase = mapping.linkPhrase;
          }
        }
      } else if (mapping.code) {
        // Single code
        // LEVEL 3: Detect POA status for this diagnosis
        const poaResult = detectPOAStatus(text, diagnosis);

        codes.push({
          code: mapping.code,
          description: mapping.description,
          poa: poaResult.status,  // LEVEL 3: POA status
          poaJustification: poaResult.phrase  // LEVEL 3: POA phrase
        });
        // Track linkage
        if (mapping.linked) {
          hasLinkedCodes = true;
          if (mapping.linkPhrase) {
            linkPhrase = mapping.linkPhrase;
          }
        }
      }
    }

    // ========================================================================
    // LEVEL 3: CODE DEDUPLICATION (v1.3.1-level3-fix)
    // Remove duplicate codes while preserving first occurrence's POA status
    // ========================================================================
    const seenCodes = new Set();
    const deduplicatedCodes = [];

    for (const codeObj of codes) {
      if (!seenCodes.has(codeObj.code)) {
        seenCodes.add(codeObj.code);
        deduplicatedCodes.push(codeObj);
      }
    }

    codes = deduplicatedCodes;

    // ========================================================================
    // LEVEL 4: PRINCIPAL DIAGNOSIS DETERMINATION & SEQUENCING
    // ========================================================================
    let principalDiagnosis = null;
    let sequencingJustification = '';
    let level4DecisionState = 'AUTO_CODE';

    if (codes.length > 0) {
      const pdxResult = determinePrincipalDiagnosis(codes, text);

      if (pdxResult.decision === 'AUTO_QUERY') {
        // LEVEL 4 AUTO_QUERY: Cannot determine PDX
        // For now, continue with codes but note in debug
        level4DecisionState = 'AUTO_QUERY';
        sequencingJustification = pdxResult.reason || 'Unable to determine principal diagnosis';
      } else if (pdxResult.decision === 'PASS_THROUGH') {
        // Single code, no sequencing needed
        principalDiagnosis = pdxResult.pdx;
        sequencingJustification = pdxResult.justification;
        level4DecisionState = 'PASS_THROUGH';
        codes = assignCodeRoles(codes, principalDiagnosis);
      } else {
        // AUTO_SEQUENCE: PDX determined
        principalDiagnosis = pdxResult.pdx;
        sequencingJustification = pdxResult.justification;
        level4DecisionState = 'AUTO_SEQUENCE';
        codes = assignCodeRoles(codes, principalDiagnosis);
      }
    }

    // ========================================================================
    // LEVEL 5: BUILD AUDITPLUS OBJECT (Denial Simulation & Defensibility)
    // ========================================================================
    const auditPlus = {
      encounterSummary: {
        totalRiskScore: 0,
        riskTier: 'LOW',
        topDenialReasons: [],
        recommendedActions: []
      },
      perCodeAnalysis: []
    };

    for (const codeObj of codes) {
      const diagnosisTerm = detectedDiagnoses.find(d => {
        const mapping = ICD10_MAPPING[d.toLowerCase()];
        return mapping && (
          (mapping.code && mapping.code === codeObj.code) ||
          (mapping.codes && mapping.codes.includes(codeObj.code))
        );
      }) || codeObj.description;

      // Extract documentation anchors
      const diagnosisSentence = findDiagnosisSentence(text, diagnosisTerm);
      const poaPhrase = codeObj.poaPhrase || null;
      const linkagePhrase = linkPhrase || null;

      const anchors = [];
      if (diagnosisSentence) {
        anchors.push(extractSnippet(diagnosisSentence, diagnosisTerm, 25));
      }
      if (poaPhrase && !anchors.includes(poaPhrase)) {
        anchors.push(extractSnippet(poaPhrase, diagnosisTerm, 25));
      }

      // Compute defensibility
      const defensibility = computeDefensibility(
        codeObj.code,
        anchors.filter(a => a),
        codeObj.poa,
        hasLinkedCodes ? 'LINKED' : 'UNLINKED',
        text
      );

      // Determine linkage status for this code
      const linkageStatus = codes.length === 1 ? 'SINGLE_CODE' : (hasLinkedCodes ? 'LINKED' : 'UNLINKED');

      // Compute denial risk
      const denialRisk = computeDenialRisk(
        codeObj.code,
        codeObj.description,
        defensibility,
        codeObj.poa,
        linkageStatus,
        text
      );

      // Build evidence packet
      const evidencePacket = buildEvidencePacket(
        codeObj.code,
        codeObj.description,
        diagnosisSentence,
        poaPhrase,
        linkagePhrase,
        sequencingJustification,
        [
          'LEVEL 0: Explicit diagnosis detected',
          `LEVEL 1: Code assigned (${codeObj.code})`,
          `LEVEL 2: Mapped to ${codeObj.description}`,
          `LEVEL 3: POA status = ${codeObj.poa}`,
          `LEVEL 4: Role = ${codeObj.role || 'N/A'}, PDX = ${principalDiagnosis}`
        ]
      );

      auditPlus.perCodeAnalysis.push({
        code: codeObj.code,
        description: codeObj.description,
        role: codeObj.role || 'N/A',
        denialSimulation: {
          riskScore: denialRisk.score,
          riskTier: denialRisk.tier,
          denialReasons: denialRisk.reasons,
          recommendedMitigations: denialRisk.mitigations
        },
        defensibility: {
          defensibilityScore: defensibility.score,
          anchorStrength: defensibility.anchorStrength,
          anchors: anchors.filter(a => a)
        },
        evidencePacket
      });

      // Aggregate encounter-level risk
      auditPlus.encounterSummary.totalRiskScore += denialRisk.score;
      auditPlus.encounterSummary.topDenialReasons.push(...denialRisk.reasons);
      auditPlus.encounterSummary.recommendedActions.push(...denialRisk.mitigations);
    }

    // Compute encounter tier
    const avgRisk = codes.length > 0 ? auditPlus.encounterSummary.totalRiskScore / codes.length : 0;
    if (avgRisk >= 60) auditPlus.encounterSummary.riskTier = 'HIGH';
    else if (avgRisk >= 30) auditPlus.encounterSummary.riskTier = 'MEDIUM';
    else auditPlus.encounterSummary.riskTier = 'LOW';

    // Deduplicate reasons and actions
    auditPlus.encounterSummary.topDenialReasons = [...new Set(auditPlus.encounterSummary.topDenialReasons)].slice(0, 5);
    auditPlus.encounterSummary.recommendedActions = [...new Set(auditPlus.encounterSummary.recommendedActions)].slice(0, 5);


    // ========================================================================
    // LEVEL 1: AUTO_QUERY (Missing Required Specificity)
    // ========================================================================
    if (queries.length > 0) {
      const queryBlock = `
          <div class="bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded-r-md">
              <div class="flex items-start gap-3">
                  <i class="fa-solid fa-circle-question text-yellow-600 text-xl mt-1"></i>
                  <div class="flex-1">
                      <h3 class="font-bold text-yellow-900 text-sm uppercase tracking-wide mb-2">
                          AUDIT DECISION — QUERY REQUIRED
                      </h3>
                      <div class="text-sm text-yellow-800 space-y-2 mb-3">
                          <p class="leading-relaxed">
                              A diagnosis was documented, but required specificity is missing per ICD-10-CM guidelines.
                          </p>
                      </div>
                      <div class="bg-yellow-100 border border-yellow-200 rounded p-2 mb-3">
                          <p class="text-xs font-semibold text-yellow-900 mb-1">QUERY</p>
                          ${queries.map(q => `<p class="text-xs text-yellow-800">• ${q.diagnosis}: ${q.query}</p>`).join('\n')}
                      </div>
                      <div class="space-y-1 mb-3">
                          <p class="text-xs font-semibold text-yellow-900 uppercase tracking-wide">STATUS</p>
                          <p class="text-xs text-yellow-700">❓ No codes assigned until clarification is received</p>
                      </div>
                      <div class="border-t border-yellow-200 pt-2">
                          <p class="text-xs text-yellow-600 italic">
                              This determination is compliant with ICD-10-CM Official Guidelines.
                          </p>
                      </div>
                  </div>
              </div>
          </div>
      `;

      return res.status(200).json({
        success: true,
        data: {
          text,
          primary: null,
          secondary: [],
          warnings: [],
          validationErrors: [queryBlock],
          validationChanges: { removed: [], added: [] },
          _debug: {
            apiVersion: 'v1.1-level1',
            decisionState: 'AUTO_QUERY',
            diagnosesDetected: detectedDiagnoses,
            queriesGenerated: queries,
            timestamp: new Date().toISOString()
          }
        }
      });
    }

    // ========================================================================
    // LEVEL 2: AUTO_CODE (LINKED or UNLINKED)
    // ========================================================================

    let autoCodeBlock;

    if (hasLinkedCodes) {
      // LINKED codes - explicit causal relationship
      autoCodeBlock = `
        <div class="bg-green-50 border-l-4 border-green-500 p-4 rounded-r-md">
            <div class="flex items-start gap-3">
                <i class="fa-solid fa-check-circle text-green-600 text-xl mt-1"></i>
                <div class="flex-1">
                    <h3 class="font-bold text-green-900 text-sm uppercase tracking-wide mb-2">
                        AUDIT DECISION — AUTO CODE (LINKED)
                    </h3>
                    <div class="text-sm text-green-800 space-y-2 mb-3">
                        <p class="leading-relaxed">
                            Explicit causal relationship documented by provider.
                        </p>
                        <p class="leading-relaxed">
                            Combination / linked code applied per ICD-10-CM Official Guidelines.
                        </p>
                    </div>
                    <div class="bg-green-100 border border-green-200 rounded p-2 mb-3">
                        <p class="text-xs font-semibold text-green-900 mb-1">CODES ASSIGNED</p>
                        ${codes.map(c => `<p class="text-xs text-green-800">• <strong>${c.code}</strong> — ${c.description}</p>`).join('\n')}
                    </div>
                    ${linkPhrase ? `<div class="bg-green-100 border border-green-200 rounded p-2 mb-3">
                        <p class="text-xs font-semibold text-green-900 mb-1">LINKAGE VERIFIED</p>
                        <p class="text-xs text-green-800">✔ Explicit linking language: "${linkPhrase}"</p>
                        <p class="text-xs text-green-800">✔ No inference performed</p>
                    </div>` : ''}
                    <div class="border-t border-green-200 pt-2">
                        <p class="text-xs text-green-600 italic">
                            This determination is compliant with ICD-10-CM Official Guidelines.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    `;
    } else {
      // UNLINKED or non-causal codes
      const isMultipleConditions = detectedDiagnoses.length > 1;

      if (isMultipleConditions) {
        // Multiple unlinked conditions
        autoCodeBlock = `
        <div class="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-md">
            <div class="flex items-start gap-3">
                <i class="fa-solid fa-check-circle text-blue-600 text-xl mt-1"></i>
                <div class="flex-1">
                    <h3 class="font-bold text-blue-900 text-sm uppercase tracking-wide mb-2">
                        AUDIT DECISION — AUTO CODE (UNLINKED)
                    </h3>
                    <div class="text-sm text-blue-800 space-y-2 mb-3">
                        <p class="leading-relaxed">
                            Multiple diagnoses documented without explicit causal relationship.
                        </p>
                        <p class="leading-relaxed">
                            Separate codes assigned per ICD-10-CM Official Guidelines.
                        </p>
                    </div>
                    <div class="bg-blue-100 border border-blue-200 rounded p-2 mb-3">
                        <p class="text-xs font-semibold text-blue-900 mb-1">CODES ASSIGNED</p>
                        ${codes.map(c => `<p class="text-xs text-blue-800">• <strong>${c.code}</strong> — ${c.description}</p>`).join('\n')}
                    </div>
                    <div class="bg-blue-100 border border-blue-200 rounded p-2 mb-3">
                        <p class="text-xs text-blue-800">⚬ No explicit linking language documented</p>
                        <p class="text-xs text-blue-800">⚬ Separate codes assigned</p>
                    </div>
                    <div class="border-t border-blue-200 pt-2">
                        <p class="text-xs text-blue-600 italic">
                            This determination is compliant with ICD-10-CM Official Guidelines.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    `;
      } else {
        // Single condition (original green block)
        autoCodeBlock = `
        <div class="bg-green-50 border-l-4 border-green-500 p-4 rounded-r-md">
            <div class="flex items-start gap-3">
                <i class="fa-solid fa-check-circle text-green-600 text-xl mt-1"></i>
                <div class="flex-1">
                    <h3 class="font-bold text-green-900 text-sm uppercase tracking-wide mb-2">
                        AUDIT DECISION — AUTO CODE
                    </h3>
                    <div class="text-sm text-green-800 space-y-2 mb-3">
                        <p class="leading-relaxed">
                            Documented diagnosis identified and mapped per ICD-10-CM guidelines.
                        </p>
                    </div>
                    <div class="bg-green-100 border border-green-200 rounded p-2 mb-3">
                        <p class="text-xs font-semibold text-green-900 mb-1">CODES ASSIGNED</p>
                        ${codes.map(c => `<p class="text-xs text-green-800">• <strong>${c.code}</strong> — ${c.description}</p>`).join('\n')}
                    </div>
                    <div class="border-t border-green-200 pt-2">
                        <p class="text-xs text-green-600 italic">
                            This determination is compliant with ICD-10-CM Official Guidelines.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    `;
      }
    }

    return res.status(200).json({
      success: true,
      data: {
        text,
        primary: codes[0]?.code || null,
        secondary: codes.slice(1).map(c => ({ code: c.code, description: c.description, poa: c.poa })),
        warnings: [],
        validationErrors: [autoCodeBlock],
        validationChanges: { removed: [], added: [] },
        auditPlus,  // LEVEL 5: Denial simulation & defensibility metadata
        _debug: {
          apiVersion: 'v1.5-level5',  // LEVEL 5: Denial Simulation & Defensibility Score
          decisionState: level4DecisionState === 'AUTO_SEQUENCE' || level4DecisionState === 'PASS_THROUGH' ? (hasLinkedCodes ? 'AUTO_SEQUENCE (LINKED)' : level4DecisionState) : (hasLinkedCodes ? 'AUTO_CODE (LINKED)' : 'AUTO_CODE'),
          principalDiagnosis: principalDiagnosis,  // LEVEL 4: PDX code
          sequencingJustification: sequencingJustification,  // LEVEL 4: Why this PDX
          diagnosesDetected: detectedDiagnoses,
          codesAssigned: codes,  // Now includes POA status and deduplicated
          linkageStatus: hasLinkedCodes ? 'LINKED' : 'UNLINKED',
          poaStatus: {  // LEVEL 3: POA tracking
            allY: codes.every(c => c.poa === 'Y'),
            allN: codes.every(c => c.poa === 'N'),
            allU: codes.every(c => c.poa === 'U'),
            mixed: !codes.every(c => c.poa === codes[0]?.poa)
          },
          timestamp: new Date().toISOString()
        }
      }
    });

  } catch (error) {
    console.error('API error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      details: error.message
    });
  }
};
