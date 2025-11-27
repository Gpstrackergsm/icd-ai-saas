const { searchIcd, icdIndex } = require('./icd-search');

function runTests() {
  const queries = ['E11.9', 'pneumonia', 'diabetes', 'hypertension', 'mental disorders'];

  console.log('Loaded ICD records:', icdIndex.length);
  for (const query of queries) {
    const results = searchIcd(query);
    console.log(`\nQuery: ${query}`);
    results.slice(0, 5).forEach((entry) => {
      console.log(` - ${entry.code}: ${entry.description} (${entry.chapter})`);
    });
    if (results.length === 0) {
      console.log(' - No results found');
    }
  }
}

runTests();
