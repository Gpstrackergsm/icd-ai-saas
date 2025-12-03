"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateCompliance = validateCompliance;
// Categories requiring laterality
const LATERALITY_CATEGORIES = [
    'C50', // Breast cancer
    'C34', // Lung cancer
    'S42', 'S52', 'S72', 'S82', // Fractures
    'H', // Eye/Ear (most)
    'M', // Musculoskeletal (most)
    'L89', // Pressure ulcers
];
// Categories requiring 7th character
const SEVENTH_CHAR_CATEGORIES = [
    'S', 'T', // Injury/Poisoning
    'O', // Obstetrics (some)
    'M48.4', 'M48.5', // Fatigue fractures
    'M80', 'M84.3', 'M84.4', 'M84.5', 'M84.6' // Pathological fractures
];
function validateCompliance(codes) {
    const warnings = [];
    codes.forEach(c => {
        const cleanCode = c.code.replace('.', '');
        // 1. Laterality Validation
        // Check if category requires laterality
        const needsLaterality = LATERALITY_CATEGORIES.some(cat => c.code.startsWith(cat));
        if (needsLaterality) {
            // Strict enforcement: If it doesn't explicitly say Left, Right, or Bilateral, it's unspecified.
            // We want to warn even if it says "unspecified", to nudge the user.
            if (!/left|right|bilateral/i.test(c.label)) {
                warnings.push(`Code ${c.code} (${c.label}) requires laterality (Left/Right). Please specify side.`);
            }
        }
        // 2. 7th Character Validation
        const needs7th = SEVENTH_CHAR_CATEGORIES.some(cat => c.code.startsWith(cat));
        if (needs7th) {
            // O codes are tricky, not all need 7th. S and T almost always do (except T36-T50 underdosing/poisoning sometimes 6th)
            // S and T codes usually need 7 chars.
            if ((c.code.startsWith('S') || c.code.startsWith('T')) && cleanCode.length < 7) {
                warnings.push(`Code ${c.code} requires a 7th character extension (A, D, S). Current length: ${cleanCode.length}`);
            }
        }
    });
    return {
        valid: warnings.length === 0,
        warnings
    };
}
