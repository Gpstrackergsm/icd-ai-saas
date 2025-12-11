const fs = require('fs');
const path = require('path');

let icdMaster = null;

function loadMaster() {
    if (icdMaster) return;
    try {
        const masterPath = path.join(__dirname, '../data/icd-master.json');
        if (fs.existsSync(masterPath)) {
            const raw = fs.readFileSync(masterPath, 'utf8');
            icdMaster = JSON.parse(raw);
        } else {
            console.warn('ICD Master dictionary not found at:', masterPath);
            icdMaster = {};
        }
    } catch (err) {
        console.error('Failed to load ICD Master dictionary:', err);
        icdMaster = {};
    }
}

/**
 * Lookup an ICD code to get its official description and metadata.
 * @param {string} code The ICD-10-CM code (e.g. "E11.9")
 * @returns {object|null} Object with { description, annotations, references } or null
 */
function lookupDetail(code) {
    if (!icdMaster) loadMaster();

    // STRICT OVERRIDE FOR VBAC (O75.82)
    // The master database contains corrupted/long text for this code.
    // We enforce the strict short description here to prevent downstream clobbering.
    if (code === 'O75.82') {
        return {
            description: 'Vaginal delivery following previous cesarean (VBAC)',
            annotations: [],
            references: []
        };
    }

    let entry = null;

    // 1. Direct lookup
    if (icdMaster[code]) {
        entry = icdMaster[code];
    } else {
        // 2. Try stripped dot lookup
        const stripped = code.replace('.', '');
        if (icdMaster[stripped]) {
            entry = icdMaster[stripped];
        }
    }

    if (!entry || !entry.title) return null;

    return parseMetadata(entry.title);
}

/**
 * Extracts metadata (annotations, references) from the raw ICD title
 * and returns a clean description.
 * @param {string} rawTitle 
 */
function parseMetadata(rawTitle) {
    let description = rawTitle;
    const annotations = [];
    const references = [];

    // 1. Extract AHA references (e.g., "AHA: 2023,3Q,19")
    const ahaMatch = description.match(/\bAHA:\s*(.*)$/);
    if (ahaMatch) {
        // Split by semicolon to handle multiple references
        const refString = ahaMatch[1];
        refString.split(';').forEach(r => references.push(r.trim()));
        // Remove from description
        description = description.replace(ahaMatch[0], '');
    }

    // 2. Extract Annotations Keywords
    const keywords = ['HCC', 'Rx', 'ESR', 'COM', 'Q'];
    keywords.forEach(kw => {
        const regex = new RegExp(`\\b${kw}\\b`, 'g');
        if (regex.test(description)) {
            annotations.push(kw);
            description = description.replace(regex, '');
        }
    });

    // 3. Cleanup whitespace
    description = description.replace(/\s+/g, ' ').trim();

    return { description, annotations, references };
}

/**
 * Legacy lookup for backward compatibility (returns just string)
 */
function lookupDescription(code) {
    const detail = lookupDetail(code);
    return detail ? detail.description : null;
}

module.exports = {
    lookupDescription,
    lookupDetail
};
