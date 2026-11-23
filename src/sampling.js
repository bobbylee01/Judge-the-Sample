export function parseClinicVisits(csv) {
  const [, ...lines] = csv.trim().split(/\r?\n/);
  return lines.map((line, index) => {
    const [, , , , visitType, waitTime] = line.split(',');
    if (!waitTime?.trim() || !Number.isFinite(Number(waitTime))) {
      throw new Error(`Invalid wait time at appointment ${index + 1}`);
    }
    return { index: index + 1, visitType, waitTime: Number(waitTime) };
  });
}

export function meanWait(rows) {
  return rows.reduce((total, row) => total + row.waitTime, 0) / rows.length;
}

function seededRandom(seed) {
  let state = seed >>> 0;
  return () => {
    // Mulberry32 produces one unsigned 32-bit value per call.
    state = (state + 0x6d2b79f5) >>> 0;
    let bits = Math.imul(state ^ (state >>> 15), state | 1);
    bits ^= bits + Math.imul(bits ^ (bits >>> 7), bits | 61);
    return (bits ^ (bits >>> 14)) >>> 0;
  };
}

function checkSize(rows, size) {
  if (!Number.isInteger(size) || size < 1 || size > rows.length) {
    throw new RangeError('Sample size must be an integer from 1 to the population size.');
  }
}

function randomIndex(random, count) {
  const limit = 2 ** 32 - (2 ** 32 % count);
  let draw = random();
  while (draw >= limit) draw = random();
  return draw % count;
}

function drawRows(rows, size, random) {
  const shuffled = rows.slice();
  // Partial Fisher–Yates shuffle. Reject the leftover range before taking a modulus.
  for (let i = 0; i < size; i += 1) {
    const j = i + randomIndex(random, rows.length - i);
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, size);
}

export function sampleWithoutReplacement(rows, size, seed) {
  checkSize(rows, size);
  return drawRows(rows, size, seededRandom(seed));
}

export function sampleSystematic(rows, size, seed) {
  checkSize(rows, size);
  return drawSystematic(rows, size, seededRandom(seed));
}

function drawSystematic(rows, size, random) {
  const interval = rows.length / size;
  const whole = Number.isInteger(interval);
  const start = whole
    ? randomIndex(random, interval) + 1
    : (random() + 1) / 2 ** 32 * interval;
  return { sample: systematicRows(rows, size, interval, start), interval, start, whole };
}

function systematicRows(rows, size, interval, start) {
  return Array.from({ length: size }, (_, i) => {
    const index = Math.min(rows.length, Math.ceil(start + i * interval));
    return rows[index - 1];
  });
}

function allocateStrata(rows, size) {
  checkSize(rows, size);
  const groups = Array.from(Map.groupBy(rows, row => row.visitType), ([visitType, members]) => {
    const quota = size * members.length / rows.length;
    return { visitType, members, quota, allocation: Math.max(1, Math.floor(quota)) };
  });
  if (size < groups.length) {
    throw new RangeError('Sample size must cover every visit type.');
  }

  let allocated = groups.reduce((sum, group) => sum + group.allocation, 0);
  // Reconcile the total by prioritizing the largest shortfall or excess against quota.
  while (allocated !== size) {
    const step = allocated < size ? 1 : -1;
    const candidates = groups.filter(group =>
      step === 1 ? group.allocation < group.members.length : group.allocation > 1
    );
    candidates.sort((a, b) =>
      step * ((b.quota - b.allocation) - (a.quota - a.allocation))
    );
    candidates[0].allocation += step;
    allocated += step;
  }

  return groups;
}

function drawStrata(rows, groups, random) {
  const sample = [];
  const strata = groups.map(({ visitType, members, allocation }) => {
    const selected = drawRows(members, allocation, random);
    sample.push(...selected);
    return {
      visitType,
      populationSize: members.length,
      allocation,
      weight: members.length / rows.length,
      mean: meanWait(selected),
    };
  });
  const estimate = strata.reduce((sum, stratum) => sum + stratum.weight * stratum.mean, 0);
  return { sample, strata, estimate };
}

export function sampleStratified(rows, size, seed) {
  return drawStrata(rows, allocateStrata(rows, size), seededRandom(seed));
}

export function summarizeEstimates(estimates, trueMean) {
  const mean = estimates.reduce((sum, estimate) => sum + estimate, 0) / estimates.length;
  const meanSquaredDistance = center => estimates.reduce(
    (sum, estimate) => sum + (estimate - center) ** 2, 0
  ) / estimates.length;
  return {
    bias: mean - trueMean,
    sd: Math.sqrt(meanSquaredDistance(mean)),
    rmse: Math.sqrt(meanSquaredDistance(trueMean)),
  };
}

export function repeatSampling(rows, method, size, seed, repetitions) {
  checkSize(rows, size);
  const interval = rows.length / size;
  const exact = method === 'systematic' && Number.isInteger(interval);
  const count = exact ? interval : repetitions;
  const random = exact ? null : seededRandom(seed);
  const groups = method === 'stratified' ? allocateStrata(rows, size) : null;
  const estimates = Array.from({ length: count }, (_, i) => {
    if (exact) return meanWait(systematicRows(rows, size, interval, i + 1));
    if (method === 'systematic') return meanWait(drawSystematic(rows, size, random).sample);
    if (groups) return drawStrata(rows, groups, random).estimate;
    return meanWait(drawRows(rows, size, random));
  });
  const trueMean = meanWait(rows);
  return {
    method, size, seed: exact ? null : seed, exact, count, estimates, trueMean,
    ...summarizeEstimates(estimates, trueMean),
    strata: groups?.map(({ visitType, allocation }) => ({ visitType, allocation })),
    interval: method === 'systematic' ? interval : null,
  };
}

export function baselineExperiments(rows, seed, repetitions) {
  if (!Number.isInteger(repetitions) || repetitions < 100 || repetitions > 1000) {
    throw new RangeError('Enter a whole repetition count from 100 to 1,000.');
  }
  const random100 = repeatSampling(rows, 'random', 100, seed, repetitions);
  return {
    methods: [random100, repeatSampling(rows, 'systematic', 100, seed, repetitions),
      repeatSampling(rows, 'stratified', 100, seed, repetitions)],
    sizes: [repeatSampling(rows, 'random', 1, seed, repetitions),
      repeatSampling(rows, 'random', 10, seed, repetitions), random100],
  };
}

export function makeChallengePopulation(rows, groupSize = 100) {
  if (!Number.isInteger(groupSize) || groupSize < 1 || rows.length % groupSize !== 0) {
    throw new RangeError('The population must divide into equal groups.');
  }
  const sorted = rows.toSorted((a, b) => a.waitTime - b.waitTime);
  const modified = [];
  for (let position = 0; position < groupSize; position += 1) {
    for (let groupStart = 0; groupStart < sorted.length; groupStart += groupSize) {
      modified.push(sorted[groupStart + position]);
    }
  }
  return modified;
}

export function challengeComparisons(baseline, modified, size, seed, repetitions) {
  return [baseline, modified].map(rows => [
    repeatSampling(rows, 'systematic', size, seed, repetitions),
    repeatSampling(rows, 'random', size, seed, repetitions),
  ]);
}

export function histogramSeries(results, binCount = 20) {
  const values = results.flatMap(result => [...result.estimates, result.trueMean]);
  const min = Math.floor(Math.min(...values));
  const max = Math.max(min + 1, Math.ceil(Math.max(...values)));
  const width = (max - min) / binCount;
  const series = results.map(result => {
    const bins = Array(binCount).fill(0);
    for (const estimate of result.estimates) {
      bins[Math.min(binCount - 1, Math.floor((estimate - min) / width))] += 1;
    }
    return bins.map(count => count / result.count);
  });
  return { min, max, series, peak: Math.max(...series.flat()) };
}
