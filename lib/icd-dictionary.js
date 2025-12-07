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
 * Lookup an ICD code to get its official description/title.
 * @param {string} code The ICD-10-CM code (e.g. "E11.9")
 * @returns {string|null} The official title or null if not found
 */
function lookupDescription(code) {
    if (!icdMaster) loadMaster();

    // 1. Direct lookup
    if (icdMaster[code] && icdMaster[code].title) {
        return icdMaster[code].title;
    }

    // 2. Try stripped dot lookup (some dictionaries might use E119)
    const stripped = code.replace('.', '');
    if (icdMaster[stripped] && icdMaster[stripped].title) {
        return icdMaster[stripped].title;
    }

    // 3. Fallback: try to approximate or return null
    return null;
}

module.exports = {
    lookupDescription
};
