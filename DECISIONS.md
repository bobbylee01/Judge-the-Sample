# My decisions and evidence notes

Written by me, not by my AI agent. Write my challenge hypothesis (section 5) **before** consulting
my agent about it, and do not edit it afterwards; add a dated revision below instead.

| Stage | What I record here |
|---|---|
| 1 | Section 1 |
| 2–5 | Section 2: my design choice, written before I switch my agent to build |
| 4 | Section 3: method and sample-size rows; section 4: findings (a) and (b) |
| 5 | Section 5: hypothesis first; then section 3: challenge rows; section 5: finding (c) |
| All | Section 6: AI use |

## 1. Population and target

- Scenario and file: Clinic Waiting Times, data/clinic_visits.csv
- One row means: one patient appointment at the clinic.
- Number of rows (N): 10,000
- Row order, and what it means in this file: the appointments are ordered chronologically by week, weekday, and appointment slot.
- Target column and units: wait_time, measured in minutes.
- My finite population is (and what it is not): All 10,000 appointments in the dataset, it is not a representation of every appointment at every clinic.
- True mean I calculated (and how): reference population mean is 22.68 minutes, calculated by dividing the sum of the wait_time column by 10,000.

## 2. Design choices

For each stage: the option I chose, why, and what it is meant to help a user learn.

- Stage 2, visualization (include one visual feature meant to reveal a sampling problem): I chose a scatter plot to show clinic wait times, this makes it easier to show how samples are spread and to see any missed areas.
- Stage 3, sampling interactions and stratification column: I chose a dropdown to switch between simple random, systematic, and stratified sampling. I also included settings for sample size and random seed. Visit type was used to separate the appointments into groups, this helps users understand how each method selects appointments differently.
- Stage 4, presentation of the method comparison and sample-size experiments: I chose histograms to show the distribution of sample means and a results table containing bias, standard deviation, and RMSE. This makes it easy to compare the accuracy and consistency of each sampling method.
- Stage 5, challenge controls and my alternative method or correction: I chose to challenge systematic sampling by changing the ordering of appointments to create a repeating waiting-time pattern. I compared it to simple random sampling. The control allow for switching between the original and modified population so the differences are clear.

## 3. Results table

One row per result I read from my app. Add rows as needed. Rerun and update a row whenever I
like: my app does not need to keep a history of runs. Seed is "exact" for exact enumeration;
type is Monte Carlo or exact. In Settings I record the settings that matter for the result, such
as the stratification column and allocation, or my challenge-control values. True mean is the
true mean of the population that result was drawn from (the modified copy's own recalculated
value for modified rows). Keep each result in its own row: never pool estimates.

| Experiment | Population or condition | Method | Settings | Seed (or exact) | n | Repetitions or starts | Type | True mean | Bias | SD | RMSE |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Methods at n = 100 | baseline | Simple random | | | 100 | | | | | | |
| Methods at n = 100 | baseline | Systematic | | | 100 | | | | | | |
| Methods at n = 100 | baseline | Stratified | | | 100 | | | | | | |
| Sample size | baseline | Simple random | | | 1 | | | | | | |
| Sample size | baseline | Simple random | | | 10 | | | | | | |
| Challenge | baseline | (method I challenged) | | | | | | | | | |
| Challenge | modified | (method I challenged) | | | | | | | | | |
| Challenge | baseline | (alternative or correction) | | | | | | | | | |
| Challenge | modified | (alternative or correction) | | | | | | | | | |

The simple random n = 100 row is also the n = 100 sample-size result when the population and
settings match. If I reran it with different settings, I add a separate row. All four challenge
rows use the same n; a challenge baseline row may repeat a matching stage 4 result.

## 4. Findings (in my own words, using my own numbers)

- (a) Method comparison: the three sampling methods compared at n = 100 (bias versus variability, and for which population):
- (b) Sample-size finding: how sample size affects the spread of estimates and the estimation error, and what a larger sample cannot fix:

## 5. Challenge (hypothesis written independently, before consulting my agent)

Hypothesis, written before I consult my agent:

- Date written: 11/21/26
- Method I chose to challenge: systematic sampling
- The change to the population or its ordering: I will create a modified copy of the population where waiting times follow a repeating pattern of 100 appointments, this way starting positions chosen will be high or low wait times.
- Why the selection rule would interact with that change: Systematic sampling selects appointments at regular intervals, certain starting position could choose similar waiting times instead of a full representation.
- Evidence I expect across repeated samples: I expect systematic samplings to have a larger standard deviation and RMSE on the modified population because different starting positions should produce varying sample means, simple random sampling should be less affected by the repeating pattern.
- Alternative method or correction I will compare, and why: I will compare systematic sampling against simple random sampling because simple random sampling does not rely on a fixed interval.
- Evidence that would contradict my hypothesis: Systematic sampling having a similar or lower standard deviation or RMSE than simple random sampling would not support my hypothesis.

After I test it:

- Test settings (conditions, methods, alternative method or correction, n, seeds); results are in the table above:
- (c) Challenge interpretation: did the evidence support my hypothesis? Bias versus variability, other explanations, what the alternative or correction showed, and any dated revision (keep the original above):

## 6. AI use

- Tools used:
- What I asked my agent to do, and what I checked myself:
- Automated checks my agent reported (I did not let it interpret my results):
