import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { meanWait, parseClinicVisits, sampleWithoutReplacement, sampleSystematic, sampleStratified } from '../src/sampling.js';
import { baselineExperiments, challengeComparisons, histogramSeries, makeChallengePopulation, repeatSampling, summarizeEstimates } from '../src/sampling.js';

const csv = readFileSync(new URL('../data/clinic_visits.csv', import.meta.url), 'utf8');
const rows = parseClinicVisits(csv);

test('all clinic rows parse in chronological file order and the rounded mean matches', () => {
  assert.equal(rows.length, 10000);
  assert.ok(rows.every((row, i) => row.index === i + 1 && Number.isInteger(row.waitTime) && row.waitTime >= 0));
  assert.equal(meanWait(rows).toFixed(2), '22.68');
});

test('seeded samples have 100 distinct population rows and reproduce exactly', () => {
  const originalOrder = rows.slice();
  for (const seed of [0, 1, 100, 4294967295]) {
    const sample = sampleWithoutReplacement(rows, 100, seed);
    assert.equal(sample.length, 100);
    assert.equal(new Set(sample).size, 100);
    assert.ok(sample.every(row => rows[row.index - 1] === row));
    assert.deepEqual(sample, sampleWithoutReplacement(rows, 100, seed));
  }
  assert.deepEqual(rows, originalOrder);
});

test('mean calculation matches a known synthetic example', () => {
  const synthetic = [{ waitTime: 0 }, { waitTime: 18 }, { waitTime: 12 }];
  assert.equal(meanWait(synthetic), 10);
  assert.equal(meanWait(sampleWithoutReplacement(synthetic, 3, 123)), 10);
});

test('systematic samples use the seeded start and follow both interval designs', () => {
  for (const size of [1, 100, 101, 9999, rows.length]) {
    for (const seed of [0, 1, 100, 4294967295]) {
      const result = sampleSystematic(rows, size, seed);
      const { sample, interval, start, whole } = result;
      assert.equal(interval, rows.length / size);
      assert.equal(whole, rows.length % size === 0);
      assert.ok(start > 0 && start <= interval);
      if (whole) assert.ok(Number.isInteger(start));
      assert.equal(sample.length, size);
      assert.equal(new Set(sample).size, size);
      sample.forEach((row, i) => {
        assert.equal(row, rows[Math.ceil(start + i * interval) - 1]);
      });
      assert.deepEqual(result, sampleSystematic(rows, size, seed));
    }
  }
});

test('stratified samples honor the allocation, weights, bounds, and seed', () => {
  const counts = { 'Follow-up': 5475, New: 2469, 'Same-day': 2056 };
  for (const size of [3, 4, 100, 101, 9999, rows.length]) {
    const result = sampleStratified(rows, size, 100);
    const { sample, strata } = result;
    assert.equal(strata.length, 3);
    assert.equal(sample.length, size);
    assert.equal(new Set(sample).size, size);
    assert.ok(sample.every(row => rows[row.index - 1] === row));
    assert.equal(strata.reduce((sum, group) => sum + group.allocation, 0), size);
    for (const group of strata) {
      assert.equal(group.populationSize, counts[group.visitType]);
      assert.ok(group.allocation >= 1 && group.allocation <= group.populationSize);
      assert.equal(group.weight, group.populationSize / rows.length);
      assert.equal(sample.filter(row => row.visitType === group.visitType).length, group.allocation);
    }
    assert.ok(Math.abs(strata.reduce((sum, group) => sum + group.weight, 0) - 1) < 1e-12);
    assert.deepEqual(result, sampleStratified(rows, size, 100));
  }
  const byType = Object.fromEntries(sampleStratified(rows, 100, 100).strata.map(
    group => [group.visitType, group.allocation]
  ));
  assert.deepEqual(byType, { 'Follow-up': 55, New: 25, 'Same-day': 20 });
  assert.throws(() => sampleStratified(rows, 2, 100), /cover every visit type/);
});

test('stratified estimate weights stratum means by population share', () => {
  const synthetic = [
    { visitType: 'A', waitTime: 0 }, { visitType: 'A', waitTime: 0 },
    { visitType: 'A', waitTime: 0 }, { visitType: 'B', waitTime: 40 },
  ];
  const { estimate, sample } = sampleStratified(synthetic, 2, 100);
  assert.equal(estimate, 10);
  assert.equal(meanWait(sample), 20);
});

test('minimum allocations reconcile an overallocated set of rounded quotas', () => {
  const synthetic = [
    ...Array.from({ length: 8 }, () => ({ visitType: 'A', waitTime: 0 })),
    { visitType: 'B', waitTime: 10 },
    { visitType: 'C', waitTime: 20 },
  ];
  const { strata } = sampleStratified(synthetic, 3, 0);
  assert.deepEqual(strata.map(group => group.allocation), [1, 1, 1]);
});

test('repeated-sampling summaries match known bias, SD and RMSE', () => {
  const { bias, sd, rmse } = summarizeEstimates([1, 3, 5], 2);
  assert.equal(bias, 1);
  assert.equal(sd, Math.sqrt(8 / 3));
  assert.equal(rmse, Math.sqrt(11 / 3));
  assert.ok(Math.abs(rmse ** 2 - bias ** 2 - sd ** 2) < 1e-12);
});

test('whole-number systematic sampling enumerates every start once and ignores seed and repetitions', () => {
  const synthetic = [0, 2, 6, 10].map(waitTime => ({ waitTime }));
  const result = repeatSampling(synthetic, 'systematic', 2, 123, 1000);
  assert.equal(result.exact, true);
  assert.equal(result.count, 2);
  assert.equal(result.seed, null);
  assert.deepEqual(result.estimates, [3, 6]);
  assert.deepEqual(result, repeatSampling(synthetic, 'systematic', 2, 456, 100));
});

test('fractional systematic results use reproducible Monte Carlo repetitions', () => {
  const synthetic = [0, 2, 6, 10, 12].map(waitTime => ({ waitTime }));
  const result = repeatSampling(synthetic, 'systematic', 2, 123, 100);
  assert.equal(result.exact, false);
  assert.equal(result.estimates.length, 100);
  assert.equal(result.seed, 123);
  assert.deepEqual(result, repeatSampling(synthetic, 'systematic', 2, 123, 100));
});

test('experiments share the n = 100 SRS result and normalize histogram bin shares', () => {
  const synthetic = Array.from({ length: 200 }, (_, i) => ({
    visitType: i < 150 ? 'A' : 'B', waitTime: i % 32,
  }));
  for (const repetitions of [100, 1000]) {
    const result = baselineExperiments(synthetic, 123, repetitions);
    assert.deepEqual(result.methods.map(row => row.method), ['random', 'systematic', 'stratified']);
    assert.deepEqual(result.sizes.map(row => row.size), [1, 10, 100]);
    assert.equal(result.methods[0], result.sizes[2]);
    assert.deepEqual(result.methods.map(row => row.count), [repetitions, 2, repetitions]);
    assert.ok(result.sizes.every(row => row.count === repetitions && !row.exact));
    assert.deepEqual(result, baselineExperiments(synthetic, 123, repetitions));
    const { min, max, series } = histogramSeries(result.methods);
    assert.ok(min <= result.methods[0].trueMean && max >= result.methods[0].trueMean);
    assert.ok(series.every(bins => Math.abs(bins.reduce((sum, share) => sum + share, 0) - 1) < 1e-12));
  }
});

test('challenge comparisons use the matching population mean and one shared sample size', () => {
  const baseline = [1, 3, 7, 9].map(waitTime => ({ waitTime }));
  const modified = [2, 8, 12, 22].map(waitTime => ({ waitTime }));
  const comparison = challengeComparisons(baseline, modified, 2, 7, 100);
  assert.deepEqual(comparison.map(results => results.map(result => result.method)),
    [['systematic', 'random'], ['systematic', 'random']]);
  assert.deepEqual(comparison.map(results => results.map(result => result.trueMean)), [[5, 5], [11, 11]]);
  for (const results of comparison) {
    assert.ok(results.every(result => result.size === 2));
    assert.deepEqual(results.map(result => [result.exact, result.count]), [[true, 2], [false, 100]]);
    for (const result of results) {
      assert.deepEqual(
        { bias: result.bias, sd: result.sd, rmse: result.rmse },
        summarizeEstimates(result.estimates, result.trueMean)
      );
    }
  }
  const fractional = challengeComparisons(baseline, modified, 3, 7, 1000);
  assert.ok(fractional.flat().every(result => !result.exact && result.count === 1000));
  const rerun = challengeComparisons(baseline, modified, 2, 42, 1000);
  rerun.forEach(([exact, monteCarlo], index) => {
    assert.deepEqual(exact, comparison[index][0]);
    assert.equal(monteCarlo.seed, 42);
    assert.equal(monteCarlo.count, 1000);
    assert.equal(monteCarlo.estimates.length, 1000);
  });
});

test('challenge population interleaves all clinic rows and preserves their values and mean', () => {
  const original = rows.map(row => ({ ...row }));
  const modified = makeChallengePopulation(rows);
  assert.equal(modified.length, rows.length);
  assert.equal(new Set(modified).size, rows.length);
  assert.deepEqual(rows, original);
  assert.equal(meanWait(modified), meanWait(rows));
  const sorted = rows.toSorted((a, b) => a.waitTime - b.waitTime);
  modified.forEach((row, i) => {
    assert.equal(row, sorted[(i % 100) * 100 + Math.floor(i / 100)]);
  });
});
