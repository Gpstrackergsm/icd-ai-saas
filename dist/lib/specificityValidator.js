"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateSpecificity = validateSpecificity;
// Regex patterns for categories requiring specific lengths
// This is a heuristic approach; a full database would be ideal but this covers major domains
const SPECIFICITY_RULES = [
    // S-codes (Injury): Most require 7 characters
    { pattern: /^[ST]\d{2}/, minLength: 7, message: 'Injury/Trauma codes usually require 7 characters (including extension)' },
    // V, W, X, Y (External Causes): Most require 7 characters
    { pattern: /^[VWXY]\d{2}/, minLength: 7, message: 'External cause codes usually require 7 characters' },
    // O-codes (Obstetrics): Many require 6 or 7 characters (trimester, fetus)
    { pattern: /^O\d{2}/, minLength: 5, message: 'Obstetrics codes often require 5-7 characters to specify trimester/fetus' },
    // Diabetes (E08-E13): Usually 5-6 characters
    { pattern: /^E(0[89]|1[013])/, minLength: 5, message: 'Diabetes codes usually require at least 5 characters to specify complication' },
    // C-codes (Neoplasms): Often 5-6 characters for site/laterality
    { pattern: /^C\d{2}/, minLength: 4, message: 'Neoplasm codes usually require 4-6 characters' },
    // M-codes (Musculoskeletal): Often 5-6 characters for site/laterality
    { pattern: /^M\d{2}/, minLength: 5, message: 'Musculoskeletal codes usually require 5-6 characters for site/laterality' },
    // J-codes (Respiratory): Variable, but J44, J45 need specificity
    { pattern: /^J4[45]/, minLength: 5, message: 'COPD/Asthma codes usually require 5 characters' },
    // I-codes (Cardio): I21 needs 5 chars
    { pattern: /^I21/, minLength: 5, message: 'MI codes usually require 5 characters' },
];
function validateSpecificity(codes) {
    const warnings = [];
    codes.forEach(c => {
        // Remove dot for length check
        const cleanCode = c.code.replace('.', '');
        for (const rule of SPECIFICITY_RULES) {
            if (rule.pattern.test(c.code)) {
                if (cleanCode.length < rule.minLength) {
                    warnings.push(`Code ${c.code} may be too short. ${rule.message}`);
                }
                break; // Stop after first matching rule
            }
        }
        // General check for "unspecified" in label
        if (/unspecified/i.test(c.label) && !warnings.some(w => w.includes(c.code))) {
            // This is a softer warning, maybe too noisy?
            // warnings.push(`Code ${c.code} is unspecified. Consider a more specific code if documentation allows.`);
        }
    });
    return {
        valid: warnings.length === 0,
        warnings
    };
}
