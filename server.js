const express = require('express');
const cors = require('cors');
const path = require('path');
const { icdIndex, searchIcd } = require('./icd-search');

const app = express();
app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use(express.static(path.join(__dirname, 'public')));

app.get('/search', (req, res) => {
  const rawQuery = req.query.q || '';
  const terms = rawQuery
    .split(',')
    .map((term) => term.trim())
    .filter(Boolean);

  if (!terms.length) {
    return res.json({ results: [], meta: { terms: [], totalUnique: 0 } });
  }

  const seenCodes = new Set();
  const uniqueResults = [];

  terms.forEach((term) => {
    const entries = Array.isArray(searchIcd(term)) ? searchIcd(term) : [];

    entries.forEach((entry) => {
      if (!entry || typeof entry !== 'object') return;

      const code = (entry.code ?? '').toString().trim();
      const description = (entry.description ?? '').toString().trim();
      const chapter = (entry.chapter ?? '').toString().trim();
      const normalizedCode = code.toLowerCase();

      if (!code || !description || seenCodes.has(normalizedCode)) return;

      seenCodes.add(normalizedCode);
      uniqueResults.push({ code, description, chapter });
    });
  });

  res.json({
    results: uniqueResults,
    meta: {
      terms,
      totalUnique: uniqueResults.length,
    },
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

const PORT = process.env.PORT || 3000;
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`icd-ai-saas server listening on port ${PORT}`);
  });
}

module.exports = { app, searchIcd, icdIndex };
