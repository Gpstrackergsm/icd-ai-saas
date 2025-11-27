const fs = require('fs');
const path = require('path');

const icdDataPath = path.join(__dirname, 'icd-data.json');

function loadIcdIndex() {
  try {
    const raw = fs.readFileSync(icdDataPath, 'utf8');
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed;
    }
    console.warn('icd-data.json is not an array.');
    return [];
  } catch (error) {
    console.error('Failed to load icd-data.json', error.message);
    return [];
  }
}

const icdIndex = loadIcdIndex();

function normalizeQuery(query) {
  return (query || '').toString().trim().toLowerCase();
}

function searchIcd(query) {
  const normalized = normalizeQuery(query);
  if (!normalized) return [];

  const matches = icdIndex.filter((entry) => {
    const code = (entry.code || '').toString().toLowerCase();
    const description = (entry.description || '').toString().toLowerCase();
    const chapter = (entry.chapter || '').toString().toLowerCase();
    return (
      code.includes(normalized) ||
      description.includes(normalized) ||
      chapter.includes(normalized)
    );
  });

  return matches.slice(0, 50);
}

module.exports = { icdDataPath, icdIndex, loadIcdIndex, searchIcd };
