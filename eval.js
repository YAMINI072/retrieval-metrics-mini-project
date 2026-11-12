// Evaluate keyword and semantic retrieval results using MRR and Recall@10.
// Run with: node eval.js
const fs = require('fs');

function loadTestSet(path) {
  const lines = fs.readFileSync(path, 'utf8').trim().split(/\r?\n/).slice(1);
  return lines.map(line => {
    const [query, ids] = line.split(',');
    return { query, correctIds: ids.split(';').map(Number) };
  });
}

const testSet = loadTestSet('test-set.csv');
const results = JSON.parse(fs.readFileSync('search-results.json', 'utf8'));

function rankOf(rankedIds, correctIds) {
  const correct = new Set(correctIds.map(Number));
  const index = rankedIds.findIndex(id => correct.has(Number(id)));
  return index === -1 ? null : index + 1;
}

function reciprocalRank(rankedIds, correctIds) {
  const rank = rankOf(rankedIds, correctIds);
  return rank === null ? 0 : 1 / rank;
}

if (testSet.length === 0) throw new Error('The test set is empty.');
const scores = { keyword: [], semantic: [] };
const hits = { keyword: 0, semantic: 0 };
const rows = [];

for (const { query, correctIds } of testSet) {
  const queryResults = results[query];
  if (!queryResults || !Array.isArray(queryResults.keyword) || !Array.isArray(queryResults.semantic)) {
    throw new Error(`Missing or invalid search results for query: ${query}`);
  }
  const keywordRank = rankOf(queryResults.keyword, correctIds);
  const semanticRank = rankOf(queryResults.semantic, correctIds);
  scores.keyword.push(reciprocalRank(queryResults.keyword, correctIds));
  scores.semantic.push(reciprocalRank(queryResults.semantic, correctIds));
  if (keywordRank !== null) hits.keyword++;
  if (semanticRank !== null) hits.semantic++;
  rows.push({ query, keywordRank, semanticRank });
}

const mean = values => values.reduce((sum, value) => sum + value, 0) / values.length;
const fmt = value => value.toFixed(2);
console.log('| Query | Keyword rank | Semantic rank |');
console.log('|---|---|---|');
for (const row of rows) {
  console.log(`| ${row.query} | ${row.keywordRank ?? 'miss'} | ${row.semanticRank ?? 'miss'} |`);
}
console.log(`| **Summary** | **MRR ${fmt(mean(scores.keyword))} · Recall@10 ${fmt(hits.keyword / testSet.length)}** | **MRR ${fmt(mean(scores.semantic))} · Recall@10 ${fmt(hits.semantic / testSet.length)}** |`);
