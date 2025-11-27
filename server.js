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
    return res.json({ results: {}, meta: { multiple: false, terms: [] } });
  }

  const groupedResults = terms.reduce((acc, term) => {
    acc[term] = searchIcd(term);
    return acc;
  }, {});

  res.json({
    results: groupedResults,
    meta: {
      multiple: terms.length > 1,
      terms,
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
