"use strict";
/// <reference lib="es2021" />
// @ts-nocheck
Object.defineProperty(exports, "__esModule", { value: true });
exports.applyGuidelineRules = applyGuidelineRules;
const dataSource_1 = require("./dataSource");
function mapCkdStageCode(stage, ckdStage) {
    if (ckdStage === 'ESRD' || stage === 'ESRD')
        return 'N18.6';
    if (ckdStage === 5 || stage === '5')
        return 'N18.5';
    if (ckdStage === 4 || stage === '4')
        return 'N18.4';
    if (ckdStage === 3 || (stage === null || stage === void 0 ? void 0 : stage.startsWith('3'))) {
        if ((stage === null || stage === void 0 ? void 0 : stage.toLowerCase()) === '3a')
            return 'N18.31';
        if ((stage === null || stage === void 0 ? void 0 : stage.toLowerCase()) === '3b')
            return 'N18.32';
        return 'N18.3';
    }
    if (ckdStage === 2 || stage === '2')
        return 'N18.2';
    if (ckdStage === 1 || stage === '1')
        return 'N18.1';
    return 'N18.9';
}
function mapUlcerCode(site, laterality) {
    const lat = laterality === 'right' ? '1' : laterality === 'left' ? '2' : '0';
    // Default severity to 9 (unspecified)
    const severity = '9';
    let sub = '9'; // Unspecified part of lower leg
    if (site === 'ankle')
        sub = '3';
    else if (site === 'heel')
        sub = '4';
    else if (site === 'toe' || site === 'foot')
        sub = '5'; // Other part of foot
    else if (site === 'calf')
        sub = '2';
    return `L97.${sub}${lat}${severity}`;
}
function deriveDiabetesPrefix(diabetesConcept) {
    var _a, _b, _c;
    const diabetes = (_a = diabetesConcept === null || diabetesConcept === void 0 ? void 0 : diabetesConcept.attributes) === null || _a === void 0 ? void 0 : _a.diabetes;
    if (diabetes === null || diabetes === void 0 ? void 0 : diabetes.dueToUnderlyingCondition)
        return 'E08';
    if (diabetes === null || diabetes === void 0 ? void 0 : diabetes.dueToDrugOrChemical)
        return 'E09';
    if (diabetes === null || diabetes === void 0 ? void 0 : diabetes.subtype)
        return diabetes.subtype;
    if (((_b = diabetesConcept === null || diabetesConcept === void 0 ? void 0 : diabetesConcept.attributes) === null || _b === void 0 ? void 0 : _b.diabetesType) === 'type1')
        return 'E10';
    if (((_c = diabetesConcept === null || diabetesConcept === void 0 ? void 0 : diabetesConcept.attributes) === null || _c === void 0 ? void 0 : _c.diabetesType) === 'secondary')
        return 'E08';
    return 'E11';
}
function mapHeartFailureCode(type, acuity) {
    // Systolic heart failure
    if (type === 'systolic') {
        if (acuity === 'acute')
            return 'I50.21';
        if (acuity === 'chronic')
            return 'I50.22';
        if (acuity === 'acute_on_chronic')
            return 'I50.23';
        return 'I50.20';
    }
    // Diastolic heart failure
    if (type === 'diastolic') {
        if (acuity === 'acute')
            return 'I50.31';
        if (acuity === 'chronic')
            return 'I50.32';
        if (acuity === 'acute_on_chronic')
            return 'I50.33';
        return 'I50.30';
    }
    // Combined systolic and diastolic
    if (type === 'combined') {
        if (acuity === 'acute')
            return 'I50.41';
        if (acuity === 'chronic')
            return 'I50.42';
        if (acuity === 'acute_on_chronic')
            return 'I50.43';
        return 'I50.40';
    }
    // Unspecified heart failure
    if (acuity === 'acute')
        return 'I50.9';
    if (acuity === 'chronic')
        return 'I50.9';
    return 'I50.9';
}
function applyExclusionEngine(candidates) {
    const working = candidates.map((candidate) => ({ ...candidate }));
    const hasDiabetesDomain = working.some((c) => /^E0[89]|E1[013]/.test(c.code));
    const normalizeText = (value) => (value === null || value === void 0 ? void 0 : value.toLowerCase()) || '';
    const applyIncludesAndRules = (candidate) => {
        let score = candidate.score;
        const includesText = (0, dataSource_1.getIncludesStrings)(candidate.code);
        const haystack = normalizeText(candidate.source || candidate.reason);
        if (includesText.some((entry) => entry && haystack.includes(entry.toLowerCase()))) {
            score += 0.5;
        }
        const ruleText = (0, dataSource_1.getRulesStrings)(candidate.code).join(' ').toLowerCase();
        if (/code first/.test(ruleText))
            score += 0.1;
        if (/use additional code/.test(ruleText))
            score -= 0.1;
        return { ...candidate, score };
    };
    const updated = working.map(applyIncludesAndRules);
    const markExcludes2 = new Set();
    updated.forEach((candidate) => {
        const excludes2 = (0, dataSource_1.getExcludes2Codes)(candidate.code);
        excludes2.forEach((code) => {
            const conflict = updated.find((c) => c.code === code || c.code.startsWith(`${code}.`));
            if (conflict) {
                markExcludes2.add(candidate.code);
                markExcludes2.add(conflict.code);
            }
        });
    });
    const adjusted = updated.map((candidate) => markExcludes2.has(candidate.code) ? { ...candidate, score: candidate.score - 0.25 } : candidate);
    const specificity = (code) => code.replace(/\./g, '').length;
    const isDiabetesCode = (code) => /^E0[89]|E1[013]/.test(code);
    const decidePreferred = (a, b) => {
        const specA = specificity(a.code);
        const specB = specificity(b.code);
        if (specA !== specB)
            return specA > specB ? a : b;
        if (hasDiabetesDomain && isDiabetesCode(a.code) !== isDiabetesCode(b.code)) {
            return isDiabetesCode(a.code) ? a : b;
        }
        if (a.score !== b.score)
            return a.score >= b.score ? a : b;
        return a.code.localeCompare(b.code) <= 0 ? a : b;
    };
    const conflictsToRemove = new Set();
    const matchesExcluded = (candidateCode, excludedCode) => candidateCode === excludedCode || candidateCode.startsWith(`${excludedCode}.`) || excludedCode.startsWith(candidateCode);
    adjusted.forEach((candidate) => {
        const excludes1 = (0, dataSource_1.getExcludes1Codes)(candidate.code);
        excludes1.forEach((excludedCode) => {
            const conflict = adjusted.find((other) => other.code !== candidate.code && matchesExcluded(other.code, excludedCode));
            if (conflict && !conflictsToRemove.has(conflict.code) && !conflictsToRemove.has(candidate.code)) {
                const preferred = decidePreferred(candidate, conflict);
                const toDrop = preferred.code === candidate.code ? conflict : candidate;
                conflictsToRemove.add(toDrop.code);
            }
        });
    });
    let filtered = adjusted.filter((candidate) => !conflictsToRemove.has(candidate.code));
    if (!filtered.length && adjusted.length) {
        const best = adjusted.reduce((top, next) => decidePreferred(top, next));
        filtered = [best];
    }
    return filtered;
}
function mapRetinopathyCode(prefix, retinopathy) {
    const severity = (retinopathy === null || retinopathy === void 0 ? void 0 : retinopathy.severity) || 'unspecified';
    const withMacular = Boolean(retinopathy === null || retinopathy === void 0 ? void 0 : retinopathy.withMacularEdema);
    const withTraction = Boolean(retinopathy === null || retinopathy === void 0 ? void 0 : retinopathy.withTractionDetachmentMacula);
    if (severity === 'mild-npdr')
        return withMacular ? `${prefix}.321` : `${prefix}.329`;
    if (severity === 'moderate-npdr')
        return withMacular ? `${prefix}.331` : `${prefix}.339`;
    if (severity === 'severe-npdr')
        return withMacular ? `${prefix}.341` : `${prefix}.349`;
    if (severity === 'pdr') {
        if (withTraction)
            return `${prefix}.352`;
        return withMacular ? `${prefix}.351` : `${prefix}.359`;
    }
    return withMacular ? `${prefix}.311` : `${prefix}.319`;
}
function mapDiabeticNeuropathyCode(prefix, neuropathyType) {
    if (neuropathyType === 'mononeuropathy')
        return `${prefix}.41`;
    if (neuropathyType === 'polyneuropathy')
        return `${prefix}.42`;
    if (neuropathyType === 'autonomic')
        return `${prefix}.43`;
    if (neuropathyType === 'amyotrophy')
        return `${prefix}.44`;
    return `${prefix}.40`;
}
function isDiabeticNeuropathyCode(code) {
    return /^(E0[89]|E1[013])\.(4|61)/.test(code);
}
function isGenericNeuropathyCode(code) {
    return /^(G5[8-9]|G6[0-9]|H47\.|M14\.6)/.test(code);
}
function applyNeuropathyRules(ctx, working, warnings) {
    var _a, _b;
    const diabetesConcept = ctx.concepts.find((c) => c.type === 'diabetes');
    const diabeticNeuropathyContext = Boolean(((_a = diabetesConcept === null || diabetesConcept === void 0 ? void 0 : diabetesConcept.attributes.diabetes) === null || _a === void 0 ? void 0 : _a.neuropathy) || ((_b = diabetesConcept === null || diabetesConcept === void 0 ? void 0 : diabetesConcept.attributes.diabetes) === null || _b === void 0 ? void 0 : _b.charcotJoint));
    const hasDiabetes = Boolean(diabetesConcept);
    const hasNonDiabeticNeuropathyConcept = ctx.concepts.some((c) => c.attributes.neuropathy && c.type !== 'diabetes');
    const diabeticNeuropathyCandidates = working.filter((c) => isDiabeticNeuropathyCode(c.code));
    const genericNeuropathyCandidates = working.filter((c) => isGenericNeuropathyCode(c.code));
    const hasDiabeticNeuropathyCode = diabeticNeuropathyCandidates.length > 0;
    if (hasDiabetes && diabeticNeuropathyContext) {
        if (genericNeuropathyCandidates.length) {
            working = working.filter((c) => !isGenericNeuropathyCode(c.code));
        }
    }
    else if (!hasDiabetes && hasNonDiabeticNeuropathyConcept) {
        // Allow neurologic codes to remain; no action needed.
    }
    else if (genericNeuropathyCandidates.length && diabeticNeuropathyCandidates.length === 0 && hasDiabetes) {
        warnings.push('Neuropathy described with diabetes; consider diabetic neuropathy codes.');
    }
    if (hasDiabeticNeuropathyCode && !hasNonDiabeticNeuropathyConcept) {
        working = working.filter((candidate) => !isGenericNeuropathyCode(candidate.code));
        working = working.map((candidate) => isDiabeticNeuropathyCode(candidate.code)
            ? { ...candidate, baseScore: Math.max(candidate.baseScore, 12), guidelineRule: candidate.guidelineRule || 'diabetic_neuropathy_priority' }
            : candidate);
    }
    // Resolve Excludes1 conflicts between diabetic neuropathy and neurologic codes
    const conflicts = new Set();
    diabeticNeuropathyCandidates.forEach((candidate) => {
        const excludes = (0, dataSource_1.getExcludes1Codes)(candidate.code);
        excludes.forEach((excluded) => {
            if (genericNeuropathyCandidates.some((c) => c.code === excluded)) {
                conflicts.add(excluded);
            }
        });
    });
    genericNeuropathyCandidates.forEach((candidate) => {
        const excludes = (0, dataSource_1.getExcludes1Codes)(candidate.code);
        excludes.forEach((excluded) => {
            if (diabeticNeuropathyCandidates.some((c) => c.code === excluded)) {
                conflicts.add(candidate.code);
            }
        });
    });
    if (conflicts.size) {
        working = working.filter((c) => !conflicts.has(c.code));
    }
    // Prefer diabetic neuropathy codes over other nervous system chapters when both present
    if (hasDiabetes && diabeticNeuropathyCandidates.length) {
        const nervousSystemChapters = new Set(['Diseases of the nervous system', 'Diseases of the eye and adnexa', 'Diseases of the musculoskeletal system and connective tissue']);
        working = working.filter((candidate) => {
            if (isDiabeticNeuropathyCode(candidate.code))
                return true;
            if (isGenericNeuropathyCode(candidate.code))
                return false;
            const chapter = (0, dataSource_1.getChapterForCode)(candidate.code);
            if (chapter && nervousSystemChapters.has(chapter) && candidate.code.startsWith('M14.6'))
                return false;
            return true;
        });
    }
    return working;
}
function applyRespiratoryRules(ctx, working, warnings) {
    const hasCOPDConcept = ctx.concepts.some((c) => c.type === 'copd');
    const hasAsthmaConcept = ctx.concepts.some((c) => c.type === 'asthma');
    const copdConcept = ctx.concepts.find((c) => c.type === 'copd');
    const asthmaConcept = ctx.concepts.find((c) => c.type === 'asthma');
    const pneumoniaConcept = ctx.concepts.find((c) => c.type === 'symptom' && c.normalized.includes('pneumonia'));
    const copdCandidates = working.filter((c) => c.code.startsWith('J44'));
    const asthmaCandidates = working.filter((c) => c.code.startsWith('J45'));
    if (hasCOPDConcept && !copdCandidates.length) {
        working.push({
            code: 'J44.9',
            reason: 'COPD documented',
            baseScore: 6,
            conceptRefs: [(copdConcept === null || copdConcept === void 0 ? void 0 : copdConcept.raw) || 'copd'],
            guidelineRule: 'copd_default',
        });
    }
    if (hasAsthmaConcept && !asthmaCandidates.length) {
        working.push({
            code: 'J45.909',
            reason: 'Asthma documented',
            baseScore: 6,
            conceptRefs: [(asthmaConcept === null || asthmaConcept === void 0 ? void 0 : asthmaConcept.raw) || 'asthma'],
            guidelineRule: 'asthma_default',
        });
    }
    // COPD with acute lower respiratory infection
    if (copdConcept === null || copdConcept === void 0 ? void 0 : copdConcept.attributes.hasAcuteLowerRespInfection) {
        working.push({
            code: 'J44.0',
            reason: 'COPD with acute lower respiratory infection',
            baseScore: 10,
            conceptRefs: [copdConcept.raw],
            guidelineRule: 'copd_with_infection',
        });
        // REQUIRE organism-specific pneumonia code
        const organism = (pneumoniaConcept === null || pneumoniaConcept === void 0 ? void 0 : pneumoniaConcept.attributes.pneumoniaOrganism) || copdConcept.attributes.pneumoniaOrganism;
        if (!organism) {
            warnings.push('COPD with acute infection requires organism-specific pneumonia code (J12-J18); defaulting to J18.9');
            working.push({
                code: 'J18.9',
                reason: 'Unspecified pneumonia (default)',
                baseScore: 6,
                conceptRefs: [copdConcept.raw],
                guidelineRule: 'pneumonia_unspecified',
            });
        }
        else {
            // Map organism to specific code
            const organismMap = {
                'streptococcus': 'J13',
                'klebsiella': 'J15.0',
                'pseudomonas': 'J15.1',
                'staphylococcus': 'J15.2',
                'staph': 'J15.2',
                'haemophilus': 'J14',
                'viral': 'J12.9',
                'fungal': 'J18.1',
                'unspecified': 'J18.9',
            };
            const pneumoniaCode = organismMap[organism] || 'J18.9';
            working.push({
                code: pneumoniaCode,
                reason: `Pneumonia organism: ${organism}`,
                baseScore: 8,
                conceptRefs: [(pneumoniaConcept === null || pneumoniaConcept === void 0 ? void 0 : pneumoniaConcept.raw) || copdConcept.raw],
                guidelineRule: 'pneumonia_organism',
            });
        }
        // Remove generic COPD codes
        working = working.filter((c) => !['J44.9', 'J44.1'].includes(c.code));
    }
    else if (copdConcept === null || copdConcept === void 0 ? void 0 : copdConcept.attributes.hasAcuteExacerbation) {
        // COPD with acute exacerbation (no infection)
        working.push({
            code: 'J44.1',
            reason: 'COPD with acute exacerbation',
            baseScore: 9,
            conceptRefs: [copdConcept.raw],
            guidelineRule: 'copd_exacerbation',
        });
        working = working.filter((c) => c.code !== 'J44.9');
    }
    // Boost COPD codes
    working = working.map((candidate) => {
        if (candidate.code.startsWith('J44')) {
            return { ...candidate, baseScore: Math.max(candidate.baseScore, 8) };
        }
        return candidate;
    });
    // Asthma with status asthmaticus
    if (asthmaConcept === null || asthmaConcept === void 0 ? void 0 : asthmaConcept.attributes.statusAsthmaticus) {
        const severity = asthmaConcept.attributes.asthmaSeverity;
        const severityMap = {
            'mildIntermittent': 'J45.22',
            'mildPersistent': 'J45.32',
            'moderatePersistent': 'J45.42',
            'severePersistent': 'J45.52',
        };
        const asthmaCode = severityMap[severity] || 'J45.902';
        working.push({
            code: asthmaCode,
            reason: 'Asthma with status asthmaticus',
            baseScore: 10,
            conceptRefs: [asthmaConcept.raw],
            guidelineRule: 'asthma_status_asthmaticus',
        });
        // Remove generic asthma codes
        working = working.filter((c) => c.code !== 'J45.909');
    }
    if (hasCOPDConcept && asthmaCandidates.some((c) => c.code === 'J45.909')) {
        working = working.filter((c) => c.code !== 'J45.909');
    }
    return working;
}
function applyNeoplasmGuidelines(ctx, working, warnings, errors) {
    const neoplasmConcepts = ctx.concepts.filter((c) => c.type === 'neoplasm');
    if (!neoplasmConcepts.length)
        return { candidates: working, reorderedCodes: [] };
    const primaryConcepts = neoplasmConcepts.filter((n) => n.attributes.severity === 'primary');
    const secondaryConcepts = neoplasmConcepts.filter((n) => n.attributes.severity === 'secondary');
    const reorderedCodes = [];
    // Validate laterality for sites that require it
    primaryConcepts.forEach((primary) => {
        const site = primary.attributes.primaryNeoplasmSite;
        const laterality = primary.attributes.primaryNeoplasmLaterality;
        if (['breast', 'lung', 'kidney', 'ovary'].includes(site)) {
            if (!laterality || laterality === 'unspecified') {
                warnings.push(`${site} cancer requires laterality specification (left/right/bilateral)`);
            }
        }
    });
    // Validate primary vs metastatic site conflict
    if (secondaryConcepts.length && primaryConcepts.length) {
        const metastaticSites = secondaryConcepts.flatMap((s) => s.attributes.metastaticSites || []);
        const primarySites = primaryConcepts.map((p) => p.attributes.primaryNeoplasmSite);
        metastaticSites.forEach((metSite) => {
            if (primarySites.includes(metSite)) {
                errors.push(`Primary site cannot equal metastatic site: ${metSite}. Clarify documentation.`);
            }
        });
    }
    // Sequence secondary before primary (ICD-10-CM guideline)
    const secondaryCandidates = working.filter((c) => c.code.startsWith('C78') || c.code.startsWith('C79'));
    const primaryCandidates = working.filter((c) => /^C(0[0-9]|1[0-9]|2[0-6]|3[0-9]|4[0-9]|5[0-8]|6[0-9]|7[0-6])/.test(c.code) &&
        !c.code.startsWith('C78') &&
        !c.code.startsWith('C79'));
    if (secondaryCandidates.length && primaryCandidates.length) {
        // Remove both from working
        working = working.filter((c) => !secondaryCandidates.includes(c) && !primaryCandidates.includes(c));
        // Re-add in correct sequence: secondary first, then primary
        working.unshift(...secondaryCandidates, ...primaryCandidates);
        reorderedCodes.push(...secondaryCandidates.map((c) => c.code), ...primaryCandidates.map((c) => c.code));
    }
    // Remove unspecified secondary (C79.9) if specific secondary exists
    const hasSpecificSecondary = working.some((c) => (c.code.startsWith('C78') || c.code.startsWith('C79')) && c.code !== 'C79.9');
    if (hasSpecificSecondary) {
        working = working.filter((c) => c.code !== 'C79.9');
    }
    return { candidates: working, reorderedCodes };
}
function pickPreferredCandidate(a, b) {
    if (a.baseScore !== b.baseScore)
        return a.baseScore > b.baseScore ? a : b;
    if (a.code.length !== b.code.length)
        return a.code.length > b.code.length ? a : b;
    return a;
}
function collectGuidanceCodes(code) {
    const relatedText = [
        ...(0, dataSource_1.getIncludesStrings)(code),
        ...(0, dataSource_1.getRulesStrings)(code).filter((entry) => /code\s+(also|first)|use additional code/i.test(entry)),
        ...(0, dataSource_1.getNotesStrings)(code).filter((entry) => /(includes|code\s+(also|first)|use additional code)/i.test(entry)),
    ];
    const collected = new Set();
    relatedText.forEach((entry) => {
        (0, dataSource_1.extractCodesFromText)(entry).forEach((code) => collected.add(code));
    });
    return Array.from(collected);
}
function applyInclusionExclusionGuidance(working, pushWarning, markCandidate) {
    const existing = new Map(working.map((c) => [c.code, c]));
    const removals = new Set();
    const snapshot = [...working];
    snapshot.forEach((candidate) => {
        const excludes1 = (0, dataSource_1.getExcludes1Codes)(candidate.code);
        excludes1.forEach((excludedCode) => {
            const conflict = existing.get(excludedCode);
            if (conflict) {
                const preferred = pickPreferredCandidate(candidate, conflict);
                const toDrop = preferred === candidate ? conflict : candidate;
                if (toDrop) {
                    removals.add(toDrop.code);
                    pushWarning(`Removed ${toDrop.code} because it conflicts with ${preferred.code} (Excludes1).`);
                }
            }
        });
        const excludes2 = (0, dataSource_1.getExcludes2Codes)(candidate.code);
        excludes2.forEach((excludedCode) => {
            if (existing.has(excludedCode)) {
                pushWarning(`${candidate.code} has Excludes2 guidance with ${excludedCode}; ensure conditions are unrelated if both are coded.`);
            }
        });
        const guidanceCodes = collectGuidanceCodes(candidate.code);
        const missingGuidanceCodes = guidanceCodes.filter((code) => {
            if (existing.has(code))
                return false;
            const root = code.slice(0, 3);
            return !working.some((c) => c.code.toUpperCase().startsWith(root));
        });
        if (missingGuidanceCodes.length === 1) {
            const supportCode = missingGuidanceCodes[0];
            markCandidate(supportCode, `Added ${supportCode} because ${candidate.code} carries an ICD guidance note requiring additional coding.`, Math.max(4, candidate.baseScore - 1), 'icd_guidance', candidate.conceptRefs || []);
            pushWarning(`${candidate.code} requires additional code ${supportCode}; added per ICD guidance.`);
            const added = working.find((c) => c.code === supportCode);
            if (added)
                existing.set(supportCode, added);
        }
        else if (missingGuidanceCodes.length > 1) {
            pushWarning(`${candidate.code} requires additional related codes (${missingGuidanceCodes.join(', ')}); select the appropriate one based on documentation.`);
        }
    });
    if (removals.size) {
        working = working.filter((candidate) => !removals.has(candidate.code));
    }
    return working;
}
function applyDiabetesGuidelines(ctx, working, warnings) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j;
    const diabetesConcept = ctx.concepts.find((c) => c.type === 'diabetes');
    if (!diabetesConcept)
        return { candidates: working, reorderedCodes: [] };
    const diabetes = diabetesConcept.attributes.diabetes || {};
    const prefix = deriveDiabetesPrefix(diabetesConcept);
    const ckdConcept = ctx.concepts.find((c) => c.type === 'ckd');
    let primaryCode = `${prefix}.9`;
    const hasHyperosmolar = (_a = diabetes.hyperosmolarity) === null || _a === void 0 ? void 0 : _a.present;
    const hasKetoacidosis = (_b = diabetes.ketoacidosis) === null || _b === void 0 ? void 0 : _b.present;
    const hasHypoglycemia = (_c = diabetes.hypoglycemia) === null || _c === void 0 ? void 0 : _c.present;
    const hasNeuropathy = Boolean(diabetes.neuropathy);
    const neuropathyCode = hasNeuropathy ? mapDiabeticNeuropathyCode(prefix, diabetes.neuropathyType) : undefined;
    if (hasHyperosmolar) {
        primaryCode = `${prefix}.0${((_d = diabetes.hyperosmolarity) === null || _d === void 0 ? void 0 : _d.withComa) ? '1' : '0'}`;
    }
    else if (hasKetoacidosis) {
        if ((_e = diabetes.ketoacidosis) === null || _e === void 0 ? void 0 : _e.withHyperosmolarity) {
            primaryCode = `${prefix}.12`;
        }
        else {
            primaryCode = `${prefix}.1${((_f = diabetes.ketoacidosis) === null || _f === void 0 ? void 0 : _f.withComa) ? '1' : '0'}`;
        }
    }
    else if (hasHypoglycemia) {
        primaryCode = `${prefix}.64${((_g = diabetes.hypoglycemia) === null || _g === void 0 ? void 0 : _g.withComa) ? '1' : '9'}`;
    }
    else if (diabetes.uncontrolled) {
        primaryCode = `${prefix}.65`;
    }
    if (!hasHyperosmolar && !hasKetoacidosis && !hasHypoglycemia) {
        if (diabetes.footUlcer) {
            primaryCode = `${prefix}.621`;
        }
        else if ((_h = diabetes.peripheralAngiopathy) === null || _h === void 0 ? void 0 : _h.present) {
            primaryCode = `${prefix}.${diabetes.peripheralAngiopathy.withGangrene ? '52' : '51'}`;
        }
        else if (diabetes.charcotJoint) {
            primaryCode = `${prefix}.610`;
        }
        else if ((_j = diabetes.retinopathy) === null || _j === void 0 ? void 0 : _j.present) {
            primaryCode = mapRetinopathyCode(prefix, diabetes.retinopathy);
        }
        else if (diabetes.nephropathy && ckdConcept) {
            primaryCode = `${prefix}.22`;
        }
        else if (diabetes.nephropathy) {
            primaryCode = `${prefix}.21`;
        }
        else if (ckdConcept) {
            primaryCode = `${prefix}.22`;
        }
        else if (diabetes.neuropathy) {
            primaryCode = neuropathyCode || `${prefix}.40`;
        }
        else if (diabetes.cataract) {
            primaryCode = `${prefix}.36`;
        }
    }
    if (neuropathyCode) {
        primaryCode = neuropathyCode;
    }
    let filtered = working.filter((c) => !c.code.startsWith(prefix));
    const reorderedCodes = [];
    const primaryCandidate = {
        code: primaryCode,
        reason: 'Diabetes mapped per complications',
        baseScore: neuropathyCode ? 12 : 11,
        conceptRefs: [diabetesConcept.raw],
        guidelineRule: 'diabetes_guideline',
    };
    filtered.push(primaryCandidate);
    reorderedCodes.push(primaryCode);
    if (ckdConcept) {
        const stageCode = mapCkdStageCode(ckdConcept.attributes.stage || diabetes.ckdStage, ckdConcept.attributes.ckdStage);
        const existingStage = filtered.some((c) => c.code.startsWith('N18.'));
        if (!existingStage) {
            filtered.push({
                code: stageCode,
                reason: 'CKD stage documented',
                baseScore: 8,
                conceptRefs: [ckdConcept.raw],
                guidelineRule: 'ckd_stage_required',
            });
        }
        const ckdComboCode = `${prefix}.22`;
        if (!filtered.some((c) => c.code === ckdComboCode)) {
            filtered.push({
                code: ckdComboCode,
                reason: 'Diabetes with CKD combination',
                baseScore: 9,
                conceptRefs: [diabetesConcept.raw, ckdConcept.raw],
                guidelineRule: 'diabetes_ckd_combo',
            });
        }
    }
    if (diabetes.footUlcer) {
        const ulcerCode = mapUlcerCode(diabetes.ulcerSite || 'foot', diabetesConcept.attributes.laterality);
        filtered.push({
            code: ulcerCode,
            reason: 'Diabetic ulcer with site/laterality',
            baseScore: 8,
            conceptRefs: [diabetesConcept.raw],
            guidelineRule: 'diabetes_foot_ulcer',
        });
    }
    if (diabetes.neuropathy && neuropathyCode && !primaryCode.includes('.4')) {
        filtered.push({
            code: neuropathyCode,
            reason: 'Diabetic neuropathy additionally documented',
            baseScore: 9,
            conceptRefs: [diabetesConcept.raw],
            guidelineRule: 'diabetes_neuropathy_detail',
        });
    }
    if (diabetes.dueToUnderlyingCondition && /pancreatitis/.test(diabetesConcept.raw.toLowerCase())) {
        filtered.push({
            code: 'K86.1',
            reason: 'Underlying chronic pancreatitis documented with diabetes',
            baseScore: 7,
            conceptRefs: [diabetesConcept.raw],
            guidelineRule: 'diabetes_underlying_condition',
        });
    }
    if (primaryCode.includes('.64')) {
        warnings.push('Hypoglycemia coded as diabetic complication; ensure coma status documented.');
    }
    if (primaryCode.includes('.51') || primaryCode.includes('.52')) {
        filtered = filtered.filter((c) => !c.code.startsWith('I70'));
    }
    if (primaryCode.includes('.4') || primaryCode.includes('.610')) {
        filtered = filtered.filter((c) => !c.code.startsWith('G6'));
    }
    if (/\.3\d{2}$/.test(primaryCode)) {
        filtered = filtered.filter((c) => !(c.code.startsWith('H35') || c.code.startsWith('H36')));
    }
    if (hasNeuropathy) {
        filtered = filtered.filter((candidate) => {
            var _a;
            if (!((_a = diabetes.retinopathy) === null || _a === void 0 ? void 0 : _a.present) && candidate.code.startsWith(`${prefix}.3`))
                return false;
            if (!diabetes.nephropathy && !ckdConcept && candidate.code.startsWith(`${prefix}.2`))
                return false;
            if (!hasKetoacidosis && candidate.code.startsWith(`${prefix}.1`))
                return false;
            if (!hasHyperosmolar && candidate.code.startsWith(`${prefix}.0`))
                return false;
            return true;
        });
    }
    return { candidates: filtered, reorderedCodes, primaryCode };
}
function ensureUnique(codes) {
    const seen = new Map();
    codes.forEach((code) => {
        const existing = seen.get(code.code);
        if (!existing || existing.baseScore < code.baseScore) {
            seen.set(code.code, code);
        }
    });
    return Array.from(seen.values());
}
function hasCode(codes, code) {
    return codes.some((candidate) => candidate.code === code);
}
function applyGuidelineRules(ctx) {
    var _a;
    let working = ensureUnique(ctx.initialCandidates);
    const warnings = [];
    const errors = [];
    const addedCodes = [];
    const diabetesConcept = ctx.concepts.find((c) => c.type === 'diabetes');
    const hasDiabetes = Boolean(diabetesConcept);
    const ckdConcept = ctx.concepts.find((c) => c.type === 'ckd');
    const hasCKD = Boolean((ckdConcept === null || ckdConcept === void 0 ? void 0 : ckdConcept.attributes.hasCKD) || ckdConcept);
    const hypertensionConcept = ctx.concepts.find((c) => c.type === 'hypertension');
    const hasHypertension = Boolean((hypertensionConcept === null || hypertensionConcept === void 0 ? void 0 : hypertensionConcept.attributes.hasHypertension) || hypertensionConcept);
    const heartFailureConcept = ctx.concepts.find((c) => c.type === 'heart_failure');
    const hasHF = Boolean((heartFailureConcept === null || heartFailureConcept === void 0 ? void 0 : heartFailureConcept.attributes.hasHeartFailure) || heartFailureConcept);
    const hasPregnancy = ctx.concepts.some((c) => c.type === 'pregnancy');
    const hasInjury = ctx.concepts.some((c) => c.type === 'injury');
    const reorderedCodes = [];
    const markCandidate = (code, reason, baseScore, rule, refs) => {
        const existing = working.find((c) => c.code === code);
        if (existing) {
            existing.guidelineRule = rule;
            existing.reason = existing.reason || reason;
            existing.baseScore = Math.max(existing.baseScore, baseScore);
            return;
        }
        const candidate = { code, reason, baseScore, conceptRefs: refs, guidelineRule: rule };
        working.push(candidate);
        addedCodes.push(candidate);
    };
    const pushWarning = (message) => {
        if (!warnings.includes(message))
            warnings.push(message);
    };
    const removeCodes = (codesToRemove, reason) => {
        const before = working.length;
        working = working.filter((candidate) => !codesToRemove.includes(candidate.code));
        if (reason && before !== working.length)
            warnings.push(reason);
    };
    const diabetesResult = applyDiabetesGuidelines(ctx, working, warnings);
    working = diabetesResult.candidates;
    reorderedCodes.push(...diabetesResult.reorderedCodes);
    const diabeticPrimaryCode = diabetesResult.primaryCode;
    working = applyNeuropathyRules(ctx, working, warnings);
    // Hypertension combination logic
    let preferredHypertensionCode;
    if (hasHypertension && hasHF && hasCKD) {
        // I13.0: HTN with HF and stage 1-4 CKD
        // I13.2: HTN with HF and stage 5/ESRD CKD
        const ckdStage = ckdConcept === null || ckdConcept === void 0 ? void 0 : ckdConcept.attributes.ckdStage;
        preferredHypertensionCode = (ckdStage === 5 || ckdStage === 'ESRD') ? 'I13.2' : 'I13.0';
        markCandidate(preferredHypertensionCode, 'Hypertension with HF and CKD requires I13.x', 10, 'htn_hf_ckd_combo', ['hypertension', 'hf', 'ckd']);
        // Add specific HF type code
        const hfType = heartFailureConcept === null || heartFailureConcept === void 0 ? void 0 : heartFailureConcept.attributes.heartFailureType;
        const hfAcuity = heartFailureConcept === null || heartFailureConcept === void 0 ? void 0 : heartFailureConcept.attributes.acuity;
        const hfCode = mapHeartFailureCode(hfType, hfAcuity);
        markCandidate(hfCode, 'Heart failure type detail', 9, 'hf_type_detail', ['hf']);
        // Add CKD stage
        markCandidate(mapCkdStageCode(ckdConcept === null || ckdConcept === void 0 ? void 0 : ckdConcept.attributes.stage, ckdConcept === null || ckdConcept === void 0 ? void 0 : ckdConcept.attributes.ckdStage), 'CKD stage required', 9, 'ckd_stage_required', ['ckd']);
    }
    else if (hasHypertension && hasCKD && !hasHF) {
        preferredHypertensionCode =
            (ckdConcept === null || ckdConcept === void 0 ? void 0 : ckdConcept.attributes.ckdStage) === 5 || (ckdConcept === null || ckdConcept === void 0 ? void 0 : ckdConcept.attributes.stage) === '5' || (ckdConcept === null || ckdConcept === void 0 ? void 0 : ckdConcept.attributes.stage) === 'ESRD'
                ? 'I12.0'
                : 'I12.9';
        markCandidate(preferredHypertensionCode, 'Hypertensive CKD requires I12.x', 9, 'htn_ckd_combo', ['hypertension', 'ckd']);
        markCandidate(mapCkdStageCode(ckdConcept === null || ckdConcept === void 0 ? void 0 : ckdConcept.attributes.stage, ckdConcept === null || ckdConcept === void 0 ? void 0 : ckdConcept.attributes.ckdStage), 'CKD stage required', 9, 'ckd_stage_required', ['ckd']);
    }
    else if (hasHypertension && hasHF && !hasCKD) {
        preferredHypertensionCode = 'I11.0';
        markCandidate(preferredHypertensionCode, 'Hypertensive heart disease with HF requires I11.0', 9, 'htn_hf_combo', ['hypertension', 'hf']);
        // Add specific HF type code
        const hfType = heartFailureConcept === null || heartFailureConcept === void 0 ? void 0 : heartFailureConcept.attributes.heartFailureType;
        const hfAcuity = heartFailureConcept === null || heartFailureConcept === void 0 ? void 0 : heartFailureConcept.attributes.acuity;
        const hfCode = mapHeartFailureCode(hfType, hfAcuity);
        markCandidate(hfCode, 'Heart failure type detail', 9, 'hf_type_detail', ['hf']);
    }
    if (preferredHypertensionCode) {
        reorderedCodes.unshift(preferredHypertensionCode);
    }
    if (diabeticPrimaryCode && /\.4\d?/.test(diabeticPrimaryCode)) {
        const withoutPrimary = reorderedCodes.filter((code) => code !== diabeticPrimaryCode);
        reorderedCodes.length = 0;
        reorderedCodes.push(diabeticPrimaryCode, ...withoutPrimary);
    }
    // Remove essential hypertension when HF or CKD present
    if ((hasHF || hasCKD) && working.some((c) => c.code === 'I10')) {
        removeCodes(['I10'], 'Removed I10 because hypertensive complications are present.');
    }
    // Resolve hypertensive hierarchy conflicts: I13 outranks I12/I11/I10, I12 outranks I11/I10
    const hasI13 = working.some((c) => c.code.startsWith('I13'));
    const hasI12 = working.some((c) => c.code.startsWith('I12'));
    const hasI11 = working.some((c) => c.code.startsWith('I11'));
    if (hasI13) {
        removeCodes(working.filter((c) => c.code === 'I10' || c.code.startsWith('I11') || c.code.startsWith('I12')).map((c) => c.code), 'Removed less specific hypertension combinations because I13 captured HF and CKD.');
    }
    else if (hasI12) {
        removeCodes(working.filter((c) => c.code === 'I10' || c.code.startsWith('I11')).map((c) => c.code), 'Removed essential/heart disease hypertension because CKD combination applies.');
    }
    else if (hasI11) {
        removeCodes(['I10'], 'Removed essential hypertension because heart disease combination applies.');
    }
    // Always add CKD staging when present
    if (hasCKD) {
        const stage = ckdConcept === null || ckdConcept === void 0 ? void 0 : ckdConcept.attributes.stage;
        const ckdStageCode = (_a = working.find((c) => c.code.startsWith('N18.'))) === null || _a === void 0 ? void 0 : _a.code;
        if (!ckdStageCode) {
            const defaultStage = mapCkdStageCode(stage, ckdConcept === null || ckdConcept === void 0 ? void 0 : ckdConcept.attributes.ckdStage);
            markCandidate(defaultStage, 'CKD stage must be captured', 8, 'ckd_stage_required', ['ckd']);
        }
        // Drop unspecified CKD when a staged code exists
        const stagedCodes = working.filter((c) => /^N18\.[1-6]/.test(c.code));
        if (stagedCodes.length) {
            removeCodes(['N18.9'], 'Dropped unspecified CKD because staged CKD is documented.');
        }
    }
    // Apply neoplasm guidelines
    const neoplasmResult = applyNeoplasmGuidelines(ctx, working, warnings, errors);
    working = neoplasmResult.candidates;
    reorderedCodes.push(...neoplasmResult.reorderedCodes);
    // Pregnancy overrides endocrine/cardiac codes
    if (hasPregnancy) {
        const hadPregnancyCode = working.some((c) => c.code.startsWith('O'));
        if (!hadPregnancyCode) {
            markCandidate('O26.90', 'Pregnancy present – use O chapter codes', 8, 'pregnancy_override', ['pregnancy']);
        }
        const before = working.length;
        working = working.filter((c) => !(c.code.startsWith('E1') || c.code.startsWith('I1')));
        if (before !== working.length) {
            warnings.push('Removed endocrine/hypertensive codes because pregnancy codes take priority.');
        }
    }
    working = applyRespiratoryRules(ctx, working, warnings);
    working = applyInclusionExclusionGuidance(working, pushWarning, markCandidate);
    // Injury: ensure external cause present
    if (hasInjury) {
        const hasExternal = working.some((c) => c.code.startsWith('V') || c.code.startsWith('W') || c.code.startsWith('Y'));
        if (!hasExternal) {
            warnings.push('Injury requires external cause code; added W19.XXXA.');
            markCandidate('W19.XXXA', 'Default external cause for fall/unspecified injury', 6, 'injury_external_cause', ['injury']);
        }
        // enforce 7th character presence ONLY for injury/trauma/obstetrics codes (S, T, O chapters)
        working = working.map((c) => {
            var _a;
            // Only add 7th character to S (injury), T (trauma/poisoning), or O (obstetrics) codes
            // Pattern: S12.345, T14.567, O12.345 (6 chars after removing dot)
            if (/^[STO]\d{2}\.[A-Z0-9]{3}$/.test(c.code)) {
                const updated = { ...c, code: `${c.code}A`, guidelineRule: (_a = c.guidelineRule) !== null && _a !== void 0 ? _a : 'seventh_character_enforced' };
                return updated;
            }
            return c;
        });
    }
    if (working.length) {
        const ranked = working.map((candidate) => ({
            ...candidate,
            score: candidate.baseScore,
            source: candidate.guidelineRule || candidate.reason || 'rules_engine',
        }));
        const resolved = applyExclusionEngine(ranked);
        working = resolved.map((rc) => {
            const existing = working.find((c) => c.code === rc.code);
            if (existing)
                return { ...existing, baseScore: rc.score };
            return { code: rc.code, reason: rc.source, baseScore: rc.score, conceptRefs: [], guidelineRule: 'exclusion_engine' };
        });
    }
    const removedCodes = ctx.initialCandidates
        .map((c) => c.code)
        .filter((code) => !working.some((c) => c.code === code));
    return {
        addedCodes,
        removedCodes,
        reorderedCodes,
        warnings,
        errors,
        finalCandidates: working,
    };
}
