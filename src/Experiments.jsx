import React, { useState } from 'react';
import { baselineExperiments, histogramSeries } from './sampling.js';

const methodNames = {
  random: 'Simple random',
  systematic: 'Systematic',
  stratified: 'Stratified by visit type',
};
const minutes = value => value.toFixed(2);

function Histograms({ results }) {
  const { min, max, peak, series } = histogramSeries(results);
  const reference = (results[0].trueMean - min) / (max - min) * 100;

  return <>
    <p>Each histogram uses the same horizontal scale and bar-height scale within this experiment.
      The dashed line marks the true population mean of {minutes(results[0].trueMean)} minutes.</p>
    <div className="histograms">
      {results.map((result, index) => (
        <div key={`${result.method}-${result.size}`}>
          <h4>{methodNames[result.method]} · n = {result.size}</h4>
          <div className="histogram" role="img"
            aria-label={`Histogram of ${methodNames[result.method]} estimates at n = ${result.size}, with true mean at ${minutes(result.trueMean)} minutes. The vertical scale is percent of estimates per bin.`}>
            {series[index].map((share, bin) => (
              <div key={bin} className="histogram-bin"
                style={{ height: `${share / peak * 100}%` }}
                title={`${minutes(min + bin * (max - min) / series[index].length)} to ${minutes(min + (bin + 1) * (max - min) / series[index].length)} min: ${(share * 100).toFixed(1)}%`} />
            ))}
            <span className="histogram-reference" style={{ left: `${reference}%` }} />
          </div>
          <div className="histogram-axis"><span>{min}</span><span>{max}</span></div>
        </div>
      ))}
    </div>
    <p className="histogram-label">Horizontal scale: estimated mean (minutes). Vertical scale:
      share of estimates per bin, from 0% to {(peak * 100).toFixed(1)}%.</p>
  </>;
}

export function ResultsTable({ results, comparePopulations = false }) {
  return <div className="results-table">
      <table>
        <caption>Repeated-sampling results (bias, SD, and RMSE in minutes)</caption>
        <thead><tr>
          {comparePopulations && <th scope="col">Population</th>}
          <th scope="col">Method and settings</th><th scope="col">n</th>
          <th scope="col">Type</th><th scope="col">Seed</th><th scope="col">Repetitions or starts</th>
          <th scope="col">True mean (min)</th>
          <th scope="col">Bias</th><th scope="col">SD</th><th scope="col">RMSE</th>
        </tr></thead>
        <tbody>{results.map(result => (
          <tr key={`${result.population ?? 'baseline'}-${result.method}-${result.size}`}>
            {comparePopulations && <td>{result.population}</td>}
            <th scope="row">{methodNames[result.method]}
              {result.interval && <small>Interval {Number(result.interval.toPrecision(8))} rows, {result.rowOrder ?? 'chronological order'}</small>}
              {result.strata && <small>{result.strata.map(
                group => `${group.visitType}: ${group.allocation}`
              ).join(', ')} · population-weighted estimate</small>}
            </th>
            <td>{result.size}</td><td>{result.exact ? 'Exact' : 'Monte Carlo'}</td>
            <td>{result.seed ?? '—'}</td>
            <td>{result.count} {result.exact ? 'starts' : 'repetitions'}</td>
            <td>{minutes(result.trueMean)}</td>
            <td>{minutes(result.bias)}</td><td>{minutes(result.sd)}</td><td>{minutes(result.rmse)}</td>
          </tr>
        ))}</tbody>
      </table>
  </div>;
}

export function Experiment({ title, results, populationLabel = 'Baseline, all 10,000 clinic appointments', showTable = true }) {
  return <section className="experiment">
    <h3>{title}</h3>
    <p>Population: {populationLabel}.</p>
    <Histograms results={results} />
    {showTable && <ResultsTable results={results} />}
  </section>;
}

export default function Experiments({ population, initialSeed, maxSeed }) {
  const [seed, setSeed] = useState(initialSeed);
  const [repetitions, setRepetitions] = useState('100');
  const [results, setResults] = useState(null);

  function run(event) {
    event.preventDefault();
    setResults(baselineExperiments(population, Number(seed), Number(repetitions)));
  }

  return <section className="experiment">
    <h2>Repeated-sampling experiments</h2>
    <p>Sample size is the number of appointments per draw. Repetitions count separate draws.
      Whole-number systematic intervals use every possible start once and need no seed.</p>
    <form className="toolbar controls" onSubmit={run}>
      <label>Experiment seed
        <input type="number" min="0" max={maxSeed} step="1" required value={seed}
          onChange={event => setSeed(event.target.value)} />
      </label>
      <label>Monte Carlo repetitions
        <input type="number" min="100" max="1000" step="1" required value={repetitions}
          onChange={event => setRepetitions(event.target.value)} />
      </label>
      <button type="submit">Run experiments</button>
    </form>
    <p>100 repetitions usually show the main pattern. 1,000 give smoother histograms and more
      stable summaries. Small differences can be hard to distinguish at 100 repetitions, and
      summaries can still vary at 1,000. Rerun with a different seed to check your conclusions.</p>
    {results && <>
      <Experiment title="Experiment A · Compare methods at n = 100" results={results.methods} />
      <Experiment title="Experiment B · Compare simple random sample sizes" results={results.sizes} />
    </>}
  </section>;
}
