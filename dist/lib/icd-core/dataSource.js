"use strict";
/// <reference lib="es2021" />
// @ts-nocheck
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractCodesFromText = extractCodesFromText;
exports.loadICDMaster = loadICDMaster;
exports.initIcdData = initIcdData;
exports.getCode = getCode;
exports.getICDEntry = getICDEntry;
exports.getExcludes1Codes = getExcludes1Codes;
exports.getExcludes2Codes = getExcludes2Codes;
exports.getIncludesStrings = getIncludesStrings;
exports.getNotesStrings = getNotesStrings;
exports.getRulesStrings = getRulesStrings;
exports.getChapterForCode = getChapterForCode;
exports.searchCodesByTerm = searchCodesByTerm;
exports.searchCodesFuzzy = searchCodesFuzzy;
exports.searchIndex = searchIndex;
exports.rankedSearch = rankedSearch;
exports.getSuggestions = getSuggestions;
exports.normalizeSearchTerm = normalizeSearchTerm;
exports.getIcdDatasetStats = getIcdDatasetStats;
// ICD-10-CM Encoder core – generated with Codex helper
// Responsibility: Load ICD data and provide search utilities
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
let codes = [];
let indexedCodes = [];
let indexTerms = [];
let normalizedIndexTerms = [];
let codeMap = new Map();
let indexedCodeMap = new Map();
let codesByToken = new Map();
let indexTermsByToken = new Map();
let initialized = false;
let loadingPromise = null;
let resolvedDataPath;
let icdMasterCache = null;
let icdMasterMap = null;
const MASTER_DATA_FILE = 'icd-master.json';
function resolveDataDirectory() {
    const candidates = [
        path.resolve(process.cwd(), 'data'),
        path.resolve(__dirname, '..', '..', 'data'),
        path.resolve(__dirname, '..', '..', '..', 'data'),
    ];
    return candidates.find((candidate) => fs.existsSync(candidate));
}
function resolveDataPath() {
    if (resolvedDataPath)
        return resolvedDataPath;
    const explicitPath = process.env.ICD_DATA_PATH ? path.resolve(process.env.ICD_DATA_PATH) : undefined;
    if (explicitPath && fs.existsSync(explicitPath)) {
        resolvedDataPath = explicitPath;
        console.log('[ICD] Using ICD_DATA_PATH override:', resolvedDataPath);
        return resolvedDataPath;
    }
    const dataDir = resolveDataDirectory();
    if (!dataDir)
        return undefined;
    const candidate = path.join(dataDir, MASTER_DATA_FILE);
    if (fs.existsSync(candidate)) {
        resolvedDataPath = candidate;
        console.log('[ICD] Resolved dataset path:', resolvedDataPath);
    }
    return resolvedDataPath;
}
function normalizeTerm(term) {
    return term
        .toLowerCase()
        .replace(/[^a-z0-9\s\.]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}
function readJson(filePath) {
    try {
        const raw = fs.readFileSync(filePath, 'utf-8');
        return JSON.parse(raw);
    }
    catch (error) {
        throw new Error(`Failed to parse ICD data at ${filePath}: ${(error === null || error === void 0 ? void 0 : error.message) || error}`);
    }
}
function extractCodesFromText(text) {
    const results = new Set();
    const sanitized = text
        .replace(/([A-Z]\d{2}\.[A-Z0-9]{1,4})(?=[A-Z]\d)/gi, '$1 ')
        .replace(/([A-Z]\d{2})(?=[A-Z]\d)/gi, '$1 ');
    const rangePattern = /([A-Z]\d{2}(?:\.[A-Z0-9]+)?)[\-–]([A-Z]\d{2}(?:\.[A-Z0-9]+)?)/gi;
    let rangeMatch;
    while ((rangeMatch = rangePattern.exec(sanitized))) {
        const [start, end] = [rangeMatch[1].toUpperCase(), rangeMatch[2].toUpperCase()];
        const prefixLength = Math.min(start.length, end.length);
        const sharedPrefix = start.slice(0, prefixLength - 1);
        const startSuffix = start.slice(sharedPrefix.length);
        const endSuffix = end.slice(sharedPrefix.length);
        if (/^\d+$/.test(startSuffix) && /^\d+$/.test(endSuffix)) {
            const startNum = parseInt(startSuffix, 10);
            const endNum = parseInt(endSuffix, 10);
            if (endNum >= startNum && endNum - startNum <= 20) {
                for (let i = startNum; i <= endNum; i++) {
                    results.add(`${sharedPrefix}${i}`);
                }
                continue;
            }
        }
        results.add(start);
        results.add(end);
    }
    const codePattern = /[A-Z][0-9][A-Z0-9](?:\.[A-Z0-9]{1,4})?/gi;
    let match;
    while ((match = codePattern.exec(sanitized))) {
        results.add(match[0].toUpperCase());
    }
    return Array.from(results);
}
function toIcdCode(raw) {
    let shortDescription = raw.shortDescription || raw.title || raw.description || raw.longDescription || raw.code;
    let longDescription = raw.longDescription || raw.title || raw.description || shortDescription;
    const synonyms = [];
    // Fix for massive duplication/concat issues in raw source (e.g. E11.42)
    // Pattern: "Type 2 diabetes mellitus with diabetic polyneuropathy Type 2 diabetes mellitus with diabetic neuralgia AHA: ..."
    // We detect if the title contains the same starting phrase twice
    // Specific fix for "Type 2 diabetes mellitus with" duplication
    const t2Prefix = "Type 2 diabetes mellitus with ";
    if (longDescription.includes(t2Prefix) && longDescription.indexOf(t2Prefix) !== longDescription.lastIndexOf(t2Prefix)) {
        // Start validation
        const parts = longDescription.split(t2Prefix).filter((p) => p.trim().length > 0);
        // Since split removes the delimiter, we need to reconstruct
        // But wait, split behavior: "Type 2 ... with foo Type 2 ... with bar" -> ["", "foo ", "bar"]
        // So we prepend the prefix back
        const reconstructed = parts.map((p) => (t2Prefix + p).trim());
        // The first part is the main description
        // Subsequent parts are synonyms
        // Check for AHA reference in the last part
        // Example: "Type 2 diabetes mellitus with diabetic neuralgia AHA: 2020,1Q,12"
        if (reconstructed.length > 0) {
            let mainDesc = reconstructed[0];
            // Loop through others as synonyms
            for (let i = 1; i < reconstructed.length; i++) {
                let syn = reconstructed[i];
                // Clean AHA ref if present
                if (syn.includes('AHA:')) {
                    syn = syn.split('AHA:')[0].trim();
                }
                synonyms.push(syn);
            }
            // Also clean main description if it has AHA ref (though usually it's at end of string)
            if (mainDesc.includes('AHA:')) {
                mainDesc = mainDesc.split('AHA:')[0].trim();
            }
            longDescription = mainDesc;
            shortDescription = mainDesc; // Sync them for consistency
        }
    }
    else {
        // Generic cleanup for AHA refs if single line
        if (longDescription.includes('AHA:')) {
            longDescription = longDescription.split('AHA:')[0].trim();
        }
        if (shortDescription.includes('AHA:')) {
            shortDescription = shortDescription.split('AHA:')[0].trim();
        }
    }
    const type = (raw.type || '').toString().toLowerCase();
    const isHeader = raw.isHeader !== undefined ? raw.isHeader : type === 'header';
    const isBillable = raw.isBillable !== undefined ? raw.isBillable : type !== 'header';
    return {
        ...raw,
        code: raw.code,
        shortDescription,
        longDescription,
        chapter: raw.chapter || raw.category || raw.block || raw.section || 'Unknown',
        block: raw.block || raw.section || raw.category || undefined,
        isBillable,
        isHeader,
        synonyms: synonyms.length > 0 ? synonyms : undefined
    };
}
function normalizeIndexTermsShape(rawTerms) {
    const normalized = [];
    rawTerms.forEach((item, idx) => {
        if (!item)
            return;
        if (item.code) {
            normalized.push({
                id: item.id || `idx-${idx}`,
                term: item.term || item.originalTerm || item.code,
                originalTerm: item.originalTerm || item.term || item.code,
                code: item.code,
                weight: item.weight || 1,
                tags: item.tags,
            });
            return;
        }
        if (Array.isArray(item.codes)) {
            item.codes.forEach((code, codeIdx) => {
                normalized.push({
                    id: item.id || `idx-${idx}-${codeIdx}`,
                    term: item.term,
                    originalTerm: item.term,
                    code,
                    weight: item.weight || 1,
                    tags: item.tags,
                });
            });
        }
    });
    return normalized;
}
function hydrateInMemoryIndexes(dataset, dataSourceLabel) {
    codes = (dataset.codes || []).map(toIcdCode);
    indexTerms = normalizeIndexTermsShape(dataset.indexTerms || []);
    codeMap = new Map(codes.map((entry) => [entry.code.toUpperCase(), entry]));
    indexedCodeMap = new Map();
    codesByToken = new Map();
    indexTermsByToken = new Map();
    indexedCodes = codes.map((entry) => {
        const normalizedShort = normalizeTerm(entry.shortDescription || entry.code);
        const normalizedLong = normalizeTerm(entry.longDescription || entry.shortDescription || entry.code);
        const tokens = new Set([
            ...normalizedShort.split(' '),
            ...normalizedLong.split(' '),
            entry.code.toLowerCase(),
            entry.code.replace('.', '').toLowerCase(),
        ]);
        const indexed = {
            entry,
            codeUpper: entry.code.toUpperCase(),
            normalizedShort,
            normalizedLong,
            tokens,
        };
        tokens.forEach((token) => {
            if (!codesByToken.has(token))
                codesByToken.set(token, []);
            codesByToken.get(token).push(indexed);
        });
        indexedCodeMap.set(indexed.codeUpper, indexed);
        return indexed;
    });
    normalizedIndexTerms = indexTerms.map((item) => {
        const normalizedTerm = normalizeTerm(item.term);
        const tokens = new Set(normalizedTerm.split(' '));
        const indexed = {
            ...item,
            normalizedTerm,
            tokens,
        };
        tokens.forEach((token) => {
            if (!indexTermsByToken.has(token))
                indexTermsByToken.set(token, []);
            indexTermsByToken.get(token).push(indexed);
        });
        return indexed;
    });
    initialized = true;
    console.log('[ICD] ICD database loaded successfully', JSON.stringify({ dataSource: dataSourceLabel, codes: codes.length, indexTerms: indexTerms.length }));
}
function loadICDMaster() {
    var _a;
    if (icdMasterCache)
        return icdMasterCache;
    const datasetPath = resolveDataPath();
    if (!datasetPath) {
        throw new Error('ICD master database not found: expected data/icd-master.json');
    }
    if (!fs.existsSync(datasetPath)) {
        throw new Error(`ICD master database missing at ${datasetPath}`);
    }
    const parsed = readJson(datasetPath);
    const values = Array.isArray(parsed)
        ? parsed
        : parsed && typeof parsed === 'object'
            ? Object.values(parsed)
            : null;
    if (!values) {
        throw new Error('ICD master database is corrupted or in an unsupported format.');
    }
    icdMasterCache = { codes: values, indexTerms: (_a = parsed === null || parsed === void 0 ? void 0 : parsed.indexTerms) !== null && _a !== void 0 ? _a : [] };
    if (Array.isArray(parsed)) {
        icdMasterMap = Object.fromEntries(parsed.map((entry) => { var _a, _b, _c; return [(_c = (_b = (_a = entry.code) === null || _a === void 0 ? void 0 : _a.toUpperCase) === null || _b === void 0 ? void 0 : _b.call(_a)) !== null && _c !== void 0 ? _c : entry.code, entry]; }));
    }
    else if (parsed && typeof parsed === 'object') {
        icdMasterMap = parsed;
    }
    console.log(`ICD MASTER DATABASE LOADED: ${icdMasterCache.codes.length} ENTRIES`);
    return icdMasterCache;
}
async function initIcdData() {
    if (initialized)
        return;
    if (loadingPromise)
        return loadingPromise;
    loadingPromise = (async () => {
        const dataset = loadICDMaster();
        hydrateInMemoryIndexes(dataset, 'icd-master.json');
    })();
    return loadingPromise;
}
function getCode(code) {
    const needle = code.trim().toUpperCase();
    return codeMap.get(needle);
}
function ensureCodeMapHydrated() {
    if (codeMap.size === 0 && icdMasterCache) {
        codeMap = new Map(icdMasterCache.codes.map((entry) => [entry.code.toUpperCase(), toIcdCode(entry)]));
    }
    else if (!icdMasterCache) {
        loadICDMaster();
        if (icdMasterCache) {
            codeMap = new Map(icdMasterCache.codes.map((entry) => [entry.code.toUpperCase(), toIcdCode(entry)]));
        }
    }
}
function ensureMasterMapHydrated() {
    if (!icdMasterMap) {
        loadICDMaster();
        if (!icdMasterMap && icdMasterCache) {
            icdMasterMap = Object.fromEntries(icdMasterCache.codes.map((entry) => [entry.code.toUpperCase(), entry]));
        }
    }
}
function normalizeTextArray(value) {
    if (!value)
        return [];
    if (Array.isArray(value))
        return value.filter(Boolean).map((item) => item.toString());
    return [value.toString()];
}
function collectCodesFromGuidance(entries) {
    const collected = new Set();
    entries.forEach((entry) => {
        extractCodesFromText(entry).forEach((code) => collected.add(code));
    });
    return Array.from(collected);
}
function getICDEntry(code) {
    ensureMasterMapHydrated();
    const needle = code.trim().toUpperCase();
    return icdMasterMap === null || icdMasterMap === void 0 ? void 0 : icdMasterMap[needle];
}
function getExcludes1Codes(code) {
    var _a;
    const entry = getICDEntry(code);
    if (!entry)
        return [];
    const explicit = normalizeTextArray(entry.excludes1);
    const noted = normalizeTextArray((_a = entry.notes) === null || _a === void 0 ? void 0 : _a.filter((note) => /Excludes\s*1/i.test(note)));
    return collectCodesFromGuidance([...explicit, ...noted]);
}
function getExcludes2Codes(code) {
    var _a;
    const entry = getICDEntry(code);
    if (!entry)
        return [];
    const explicit = normalizeTextArray(entry.excludes2);
    const noted = normalizeTextArray((_a = entry.notes) === null || _a === void 0 ? void 0 : _a.filter((note) => /Excludes\s*2/i.test(note)));
    return collectCodesFromGuidance([...explicit, ...noted]);
}
function getIncludesStrings(code) {
    const entry = getICDEntry(code);
    if (!entry)
        return [];
    return normalizeTextArray(entry.includes);
}
function getNotesStrings(code) {
    const entry = getICDEntry(code);
    if (!entry)
        return [];
    return normalizeTextArray(entry.notes);
}
function getRulesStrings(code) {
    const entry = getICDEntry(code);
    if (!entry)
        return [];
    return normalizeTextArray(entry.rules);
}
function getChapterForCode(code) {
    var _a;
    ensureCodeMapHydrated();
    return (_a = getCode(code)) === null || _a === void 0 ? void 0 : _a.chapter;
}
function searchCodesByTerm(term, limit = 20) {
    const normalized = normalizeTerm(term);
    if (!normalized)
        return [];
    const tokens = normalized.split(' ');
    const candidateSet = new Set();
    tokens.forEach((token) => {
        const bucket = codesByToken.get(token);
        bucket === null || bucket === void 0 ? void 0 : bucket.forEach((entry) => candidateSet.add(entry));
    });
    const candidates = candidateSet.size > 0 ? [...candidateSet] : indexedCodes;
    const matches = candidates
        .map((item) => {
        const score = computeScore(normalized, item);
        return { entry: item.entry, score };
    })
        .filter((item) => item.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);
    return matches.map((item) => item.entry);
}
function computeScore(term, entry) {
    let score = 0;
    const normalizedCode = entry.codeUpper.toLowerCase();
    if (normalizedCode.startsWith(term))
        score += 5;
    if (entry.normalizedShort.includes(term))
        score += 3;
    if (entry.normalizedLong.includes(term))
        score += 2;
    return score;
}
function levenshteinDistance(a, b) {
    const dp = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
    for (let i = 0; i <= a.length; i++)
        dp[i][0] = i;
    for (let j = 0; j <= b.length; j++)
        dp[0][j] = j;
    for (let i = 1; i <= a.length; i++) {
        for (let j = 1; j <= b.length; j++) {
            const cost = a[i - 1] === b[j - 1] ? 0 : 1;
            dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
        }
    }
    return dp[a.length][b.length];
}
function searchCodesFuzzy(term, limit = 10) {
    const normalized = normalizeTerm(term);
    if (!normalized)
        return [];
    const tokens = normalized.split(' ');
    const candidateSet = new Set();
    tokens.forEach((token) => {
        const bucket = codesByToken.get(token);
        bucket === null || bucket === void 0 ? void 0 : bucket.forEach((item) => candidateSet.add(item));
    });
    const candidates = candidateSet.size > 0 ? [...candidateSet] : indexedCodes;
    const matches = candidates
        .map((item) => {
        const distance = levenshteinDistance(normalized, item.normalizedShort.slice(0, normalized.length));
        const altDistance = levenshteinDistance(normalized, item.normalizedLong.slice(0, Math.max(normalized.length, 6)));
        const bestDistance = Math.min(distance, altDistance);
        const score = Math.max(0, normalized.length - bestDistance);
        return { code: item.entry, score };
    })
        .filter((entry) => entry.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);
    return matches;
}
function searchIndex(term, limit = 20) {
    const normalized = normalizeTerm(term);
    if (!normalized)
        return [];
    const tokens = normalized.split(' ');
    const candidateSet = new Set();
    tokens.forEach((token) => {
        const bucket = indexTermsByToken.get(token);
        bucket === null || bucket === void 0 ? void 0 : bucket.forEach((entry) => candidateSet.add(entry));
    });
    const candidates = candidateSet.size > 0 ? [...candidateSet] : normalizedIndexTerms;
    const matches = candidates
        .map((item) => {
        const matchScore = similarity(normalized, item.normalizedTerm);
        return { item, score: matchScore };
    })
        .filter((item) => item.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, limit)
        .map((item) => {
        const code = getCode(item.item.code) || {
            code: item.item.code,
            shortDescription: item.item.term,
            longDescription: item.item.term,
            chapter: 'Unknown',
            isBillable: true,
            isHeader: false,
        };
        return {
            code: code,
            score: item.score + item.item.weight,
            matchedTerm: item.item.originalTerm,
        };
    });
    return matches;
}
function similarity(search, candidate) {
    if (candidate === search)
        return 10;
    if (candidate.startsWith(search))
        return 7;
    if (candidate.includes(search))
        return 5;
    const searchTokens = new Set(search.split(' '));
    const candidateTokens = new Set(candidate.split(' '));
    const overlap = [...searchTokens].filter((token) => candidateTokens.has(token)).length;
    return overlap > 0 ? overlap : 0;
}
function computeCodeDepthScore(code) {
    const compact = code.code.replace(/\./g, '');
    const depthScore = Math.min(20, compact.length * 3);
    const specificity = code.isBillable ? 20 : 8;
    return depthScore + specificity;
}
function normalizedConfidence(score) {
    return Math.max(0, Math.min(100, Math.round(score)));
}
function buildRankedEntry(code, matchedTerm, matchType, matchScore, confidenceBoost = 0) {
    const codeDepthScore = computeCodeDepthScore(code);
    const matchConfidence = matchType === 'exact' ? 30 : matchType === 'index' ? 15 : matchType === 'term' ? 10 : 0;
    const fuzzyPenalty = matchType === 'fuzzy' ? -15 : 0;
    const combinedScore = matchScore * 10 + codeDepthScore + matchConfidence + confidenceBoost + fuzzyPenalty;
    const confidence = normalizedConfidence(combinedScore);
    return {
        code: code.code,
        description: code.longDescription || code.shortDescription || code.code,
        matchedTerm,
        matchType,
        confidence,
        source: 'icd-master',
        score: combinedScore,
    };
}
function pickBetterResult(current, next) {
    if (!current)
        return next;
    if (current.matchType === 'fuzzy' && next.matchType !== 'fuzzy')
        return next;
    if (next.matchType === 'exact' && current.matchType !== 'exact')
        return next;
    return next.score > current.score ? next : current;
}
function rankedSearch(term, limit = 20) {
    const normalized = normalizeTerm(term);
    if (!normalized)
        return { results: [], suggestions: [], refinements: [] };
    const indexResults = searchIndex(term, limit * 2);
    const codeMatches = searchCodesByTerm(term, limit * 2);
    const fuzzyMatches = searchCodesFuzzy(term, limit * 2);
    const combined = new Map();
    indexResults.forEach((match) => {
        const matchType = match.matchedTerm && normalizeTerm(match.matchedTerm) === normalized ? 'exact' : 'index';
        const ranked = buildRankedEntry(match.code, match.matchedTerm || term, matchType, match.score, match.score * 2);
        combined.set(match.code.code, pickBetterResult(combined.get(match.code.code), ranked));
    });
    codeMatches.forEach((code) => {
        const indexed = indexedCodeMap.get(code.code.toUpperCase());
        const baseScore = indexed ? computeScore(normalized, indexed) : 1;
        const matchType = normalizeTerm(code.code) === normalized || normalizeTerm(code.shortDescription) === normalized ? 'exact' : 'term';
        const ranked = buildRankedEntry(code, term, matchType, baseScore, baseScore * 2);
        combined.set(code.code, pickBetterResult(combined.get(code.code), ranked));
    });
    fuzzyMatches.forEach((match) => {
        const ranked = buildRankedEntry(match.code, term, 'fuzzy', match.score);
        combined.set(match.code.code, pickBetterResult(combined.get(match.code.code), ranked));
    });
    const results = Array.from(combined.values())
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);
    const suggestions = results.slice(0, Math.min(10, results.length));
    const refinements = buildRefinements(normalized, suggestions);
    return { results, suggestions, refinements };
}
function buildRefinements(query, ranked) {
    const seen = new Set();
    const refinements = [];
    normalizedIndexTerms
        .filter((item) => item.normalizedTerm.startsWith(query) && item.normalizedTerm !== query)
        .slice(0, 15)
        .forEach((item) => {
        const suggestion = item.normalizedTerm;
        if (!seen.has(suggestion)) {
            refinements.push(suggestion);
            seen.add(suggestion);
        }
    });
    ranked.forEach((entry) => {
        const tokens = normalizeTerm(entry.description).split(' ');
        tokens.forEach((token) => {
            if (token.length > 3 && token.startsWith(query.split(' ')[0]) && !seen.has(token)) {
                refinements.push(token);
                seen.add(token);
            }
        });
    });
    return refinements.slice(0, 10);
}
function getSuggestions(term, limit = 10) {
    const { suggestions, refinements } = rankedSearch(term, limit);
    return { suggestions: suggestions.slice(0, limit), refinements };
}
function normalizeSearchTerm(term) {
    return normalizeTerm(term);
}
function getIcdDatasetStats() {
    if (!initialized) {
        throw new Error('ICD data has not been initialized. Call initIcdData() first.');
    }
    const billableCodes = codes.filter((code) => code.isBillable !== false).length;
    const chapters = new Set(codes.map((code) => code.chapter).filter(Boolean)).size;
    const blocks = new Set(codes.map((code) => code.block).filter(Boolean)).size;
    return {
        totalCodes: codes.length,
        billableCodes,
        chapters,
        blocks,
    };
}
// Preload ICD data on module import to keep lookups fast.
void initIcdData();
