import React, { useState } from 'react';
import { Experiment, ResultsTable } from './Experiments.jsx';
import { challengeComparisons, meanWait } from './sampling.js';

const populationLabels = ['Baseline, chronological CSV order', 'Modified, repeating 100-appointment order'];

export default function Challenge({ baseline, modified, maxSeed }) {
  const [populationIndex, setPopulationIndex] = useState(0);
  const [seed, setSeed] = useState('42');
  const [repetitions, setRepetitions] = useState('100');
  const [results, setResults] = useState(null);
  const activePopulation = populationIndex === 0 ? baseline : modified;

  function run(event) {
    event.preventDefault();
    setResults(challengeComparisons(baseline, modified, 100, Number(seed), Number(repetitions)));
  }

  return <section className="experiment">
    <h2>Stage 5 challenge</h2>
    <p>Compare systematic and simple random sampling at the same sample size on both populations.</p>
    <p>Sample size: 100. Systematic uses all 100 starts (Exact). The seed and repetition count
      apply to simple random sampling (Monte Carlo).</p>
    <p>The modified population interleaves 100 groups of 100 appointments sorted by waiting time.
      Appointments with equal waits keep their CSV order within the sorted list.</p>
    <form className="toolbar controls" onSubmit={run}>
      <label>Challenge seed
        <input type="number" min="0" max={maxSeed} step="1" required value={seed}
          onChange={event => setSeed(event.target.value)} />
      </label>
      <label>Challenge Monte Carlo repetitions
        <input type="number" min="100" max="1000" step="1" required value={repetitions}
          onChange={event => setRepetitions(event.target.value)} />
      </label>
      <button type="submit">Run challenge</button>
    </form>
    {results && <ResultsTable comparePopulations results={results.flatMap((conditions, index) =>
      conditions.map(result => ({
        ...result,
        population: index === 0 ? 'Baseline' : 'Modified',
        rowOrder: index === 0 ? 'chronological order' : 'modified row order',
      }))
    )} />}
    <div className="toolbar controls">
      <label>Challenge population to view
        <select value={populationIndex} onChange={event => setPopulationIndex(Number(event.target.value))}>
          <option value="0">Baseline</option>
          <option value="1">Modified</option>
        </select>
      </label>
      <p>True population mean: {meanWait(activePopulation).toFixed(2)} min</p>
    </div>
    {results && <Experiment title={populationIndex === 0 ? 'Baseline distributions' : 'Modified distributions'}
      results={results[populationIndex]} populationLabel={populationLabels[populationIndex]}
      showTable={false} />}
  </section>;
}
