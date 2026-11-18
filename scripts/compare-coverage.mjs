import { readFile } from 'node:fs/promises';

const readSummary = async path => JSON.parse(await readFile(path, 'utf8')).total;
const beforePath = process.argv[2] || 'coverage-before/coverage-summary.json';
const afterPath = process.argv[3] || 'coverage-after/coverage-summary.json';

const [before, after] = await Promise.all([readSummary(beforePath), readSummary(afterPath)]);
const signed = value => `${value >= 0 ? '+' : ''}${value}`;

const rows = ['lines', 'statements', 'branches', 'functions'].map(metric => ({
  metric,
  before: `${before[metric].covered}/${before[metric].total} (${before[metric].pct}%)`,
  after: `${after[metric].covered}/${after[metric].total} (${after[metric].pct}%)`,
  'covered Δ': signed(after[metric].covered - before[metric].covered),
  'percentage-point Δ': signed(Number((after[metric].pct - before[metric].pct).toFixed(2))),
}));

console.table(rows);
