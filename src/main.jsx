import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import clinicCsvUrl from '../data/clinic_visits.csv?url&no-inline';
import Experiments from './Experiments.jsx';
import Challenge from './Challenge.jsx';
import { makeChallengePopulation, meanWait, parseClinicVisits, sampleWithoutReplacement, sampleSystematic, sampleStratified } from './sampling.js';
import './style.css';

const maxSeed = 2 ** 32 - 1;
const emptySample = [];
const methodDescriptions = {
  random: 'Draw distinct appointments at random from the full population. Every set of this size is equally likely.',
  systematic: 'Choose a random start and step through appointments in chronological order, from week to weekday to slot. In an unordered list, the same interval would step through list positions without following a time sequence.',
  stratified: 'Allocate the sample in proportion to visit type, rounding to whole rows and giving each type at least one. Draw randomly without replacement within each type. Weight each group’s sample mean by its share of the population.',
};

function newSeed() {
  return crypto.getRandomValues(new Uint32Array(1))[0];
}

function ScatterPlot({ sample, population, populationMean, yMax }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;

    function draw() {
      const { width, height } = canvas.getBoundingClientRect();
      const ratio = window.devicePixelRatio || 1;
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      const ctx = canvas.getContext('2d');
      ctx.scale(ratio, ratio);

      const left = 57;
      const right = width - 28;
      const top = 16;
      const bottom = height - 55;
      const x = index => left + (index - 1) / (population.length - 1) * (right - left);
      const y = wait => bottom - wait / yMax * (bottom - top);

      ctx.font = '12px system-ui';
      ctx.fillStyle = '#344456';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      for (let wait = 0; wait <= yMax; wait += 10) {
        ctx.strokeStyle = '#e2e8ef';
        ctx.beginPath();
        ctx.moveTo(left, y(wait));
        ctx.lineTo(right, y(wait));
        ctx.stroke();
        ctx.fillText(String(wait), left - 8, y(wait));
      }

      ctx.strokeStyle = '#7b8794';
      ctx.beginPath();
      ctx.moveTo(left, top);
      ctx.lineTo(left, bottom);
      ctx.lineTo(right, bottom);
      ctx.stroke();

      ctx.textAlign = 'center';
      for (const index of [1, 2500, 5000, 7500, 10000]) {
        ctx.fillText(index.toLocaleString('en-US'), x(index), bottom + 16);
      }
      ctx.fillText('Appointment index', (left + right) / 2, height - 12);
      ctx.save();
      ctx.translate(12, (top + bottom) / 2);
      ctx.rotate(-Math.PI / 2);
      ctx.fillText('Waiting time (minutes)', 0, 0);
      ctx.restore();

      function points(rows, color, radius) {
        ctx.fillStyle = color;
        ctx.beginPath();
        for (const row of rows) {
          const px = x(row.index);
          const py = y(row.waitTime);
          ctx.moveTo(px + radius, py);
          ctx.arc(px, py, radius, 0, 2 * Math.PI);
        }
        ctx.fill();
      }

      points(population, '#c6cdd5', 1.5);
      ctx.strokeStyle = '#a04422';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      ctx.moveTo(left, y(populationMean));
      ctx.lineTo(right, y(populationMean));
      ctx.stroke();
      points(sample, '#175bc2', 3);
    }

    draw();
    const observer = new ResizeObserver(draw);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [sample, population, populationMean, yMax]);

  return (
    <canvas ref={canvasRef} role="img"
      aria-label={`Scatter plot of waiting time by chronological appointment index. All 10,000 appointments appear in light gray. ${sample.length} selected appointments appear in blue. A dashed line marks the population mean.`} />
  );
}

function App({ population, modifiedPopulation, populationMean, visitTypeCount, yMax }) {
  const [method, setMethod] = useState('random');
  const [sizeInput, setSizeInput] = useState('100');
  const [seedInput, setSeedInput] = useState(() => String(newSeed()));
  const size = Number(sizeInput);
  const seed = Number(seedInput);
  let error;
  if (!Number.isInteger(size) || size < 1 || size > population.length) {
    error = 'Enter a whole sample size from 1 to 10,000.';
  } else if (!seedInput || !Number.isInteger(seed) || seed < 0 || seed > maxSeed) {
    error = 'Enter a whole seed from 0 to 4,294,967,295.';
  } else if (method === 'stratified' && size < visitTypeCount) {
    error = `Set the sample size to at least ${visitTypeCount} to include every visit type.`;
  }

  let result;
  if (!error) {
    if (method === 'systematic') result = sampleSystematic(population, size, seed);
    else if (method === 'stratified') result = sampleStratified(population, size, seed);
    else result = { sample: sampleWithoutReplacement(population, size, seed) };
  }
  const sample = result?.sample ?? emptySample;
  const estimate = result ? result.estimate ?? meanWait(sample) : undefined;

  return (
    <main>
      <h1>Clinic Waiting Times</h1>
      <p>10,000 simulated appointments in chronological order.</p>
      <div className="toolbar controls">
        <label>Sampling method
          <select value={method} onChange={event => setMethod(event.target.value)}>
            <option value="random">Simple random</option>
            <option value="systematic">Systematic</option>
            <option value="stratified">Stratified by visit type</option>
          </select>
        </label>
        <label>Sample size (n)
          <input type="number" min="1" max={population.length} step="1" value={sizeInput}
            onChange={event => setSizeInput(event.target.value)} />
        </label>
        <label>Random seed
          <input type="number" min="0" max={maxSeed} step="1" value={seedInput}
            onChange={event => setSeedInput(event.target.value)} />
        </label>
        <button onClick={() => setSeedInput(String(newSeed()))}>Draw a new sample</button>
      </div>
      <p>{methodDescriptions[method]}</p>
      {error && <p role="status">{error}</p>}
      <div className="toolbar">
        <div aria-live="polite">
          <dl>
            <div><dt>True population mean</dt><dd>{populationMean.toFixed(2)} min</dd></div>
            <div>
              <dt>{method === 'stratified' ? 'Sample estimate (population-weighted mean)' : 'Sample mean'}</dt>
              <dd>{estimate === undefined ? '—' : `${estimate.toFixed(2)} min`}</dd>
            </div>
          </dl>
        </div>
      </div>
      {result?.interval !== undefined && (
        <p>
          {result.whole
            ? `Whole-number interval: ${result.interval} rows. Start: row ${result.start}. Select every ${result.interval} row(s) from the start.`
            : `Fractional interval: ${result.interval.toPrecision(7)} rows. Start: ${result.start.toPrecision(7)}. Round each successive position up to a row number. First selected row: ${sample[0].index}.`}
        </p>
      )}
      {result?.strata && (
        <table>
          <caption>Allocation by visit type</caption>
          <thead><tr><th scope="col">Visit type</th><th scope="col">Population</th>
            <th scope="col">Selected</th><th scope="col">Weight</th><th scope="col">Sample mean (min)</th></tr></thead>
          <tbody>{result.strata.map(group => (
            <tr key={group.visitType}>
              <th scope="row">{group.visitType}</th><td>{group.populationSize.toLocaleString()}</td>
              <td>{group.allocation}</td><td>{(group.weight * 100).toFixed(2)}%</td>
              <td>{group.mean.toFixed(2)}</td>
            </tr>
          ))}</tbody>
        </table>
      )}
      <figure>
        <ScatterPlot sample={sample} population={population} populationMean={populationMean} yMax={yMax} />
        <figcaption>
          <span><i className="population" /> All appointments</span>
          <span><i className="sample" /> Selected appointments ({sample.length.toLocaleString()})</span>
          <span><i className="mean" /> True population mean</span>
        </figcaption>
      </figure>
      {result && <details>
        <summary>Selected appointment indices ({sample.length.toLocaleString()})</summary>
        <p>{sample.map(row => row.index).sort((a, b) => a - b).join(', ')}</p>
      </details>}
      <Experiments population={population} initialSeed={seedInput} maxSeed={maxSeed} />
      <Challenge baseline={population} modified={modifiedPopulation} maxSeed={maxSeed} />
    </main>
  );
}

async function startApp() {
  const root = createRoot(document.getElementById('root'));
  root.render(<main role="status">Loading clinic visits…</main>);

  try {
    const response = await fetch(clinicCsvUrl);
    if (!response.ok) throw new Error(`Clinic CSV request failed (${response.status})`);

    const population = parseClinicVisits(await response.text());
    root.render(<App
      population={population}
      modifiedPopulation={makeChallengePopulation(population)}
      populationMean={meanWait(population)}
      visitTypeCount={new Set(population.map(row => row.visitType)).size}
      yMax={Math.ceil(Math.max(...population.map(row => row.waitTime)) / 10) * 10}
    />);
  } catch (error) {
    console.error(error);
    root.render(<main role="alert">Could not load clinic visits. Reload the page to try again.</main>);
  }
}

startApp();
