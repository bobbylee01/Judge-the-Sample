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
- Stage 5, challenge controls and my alternative method or correction: I chose to challenge systematic sampling by changing the ordering of appointments to create a repeating waiting-time pattern. I compared it to simple random sampling. The controls allow for switching between the original and modified population so the differences are clear.

## 3. Results table

One row per result I read from my app. Add rows as needed. Rerun and update a row whenever I
like: my app does not need to keep a history of runs. Seed is "exact" for exact enumeration;
type is Monte Carlo or exact. In Settings I record the settings that matter for the result, such
as the stratification column and allocation, or my challenge-control values. True mean is the
true mean of the population that result was drawn from (the modified copy's own recalculated
value for modified rows). Keep each result in its own row: never pool estimates.

| Experiment | Population or condition | Method | Settings | Seed (or exact) | n | Repetitions or starts | Type | True mean | Bias | SD | RMSE |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Methods at n = 100 | baseline | Simple random | Default | 786948014 | 100 | 1000 | Monte Carlo | 22.68 | 0.07 | 1.45 | 1.46 |
| Methods at n = 100 | baseline | Systematic | interval 100, chronological order | exact | 100 | 100 starts | exact | 22.68 | 0 | 6.96 | 6.96 |
| Methods at n = 100 | baseline | Stratified | visit_type: Follow-up 55, New 25, Same-day 20; population-weighted | 786948014 | 100 | 1000 | Monte Carlo | 22.68 | -0.05 | 1.28 | 1.28 |
| Sample size | baseline | Simple random | Default | 786948014 | 1 | 1000 | Monte Carlo | 22.68 | 0.21 | 14.06 | 14.06 |
| Sample size | baseline | Simple random | Default | 786948014 | 10 | 1000 | Monte Carlo | 22.68| 0.07 | 4.61 | 4.61 |
| Challenge | baseline | Systematic | Interval 100, chronological order | exact | 100 | 100 starts | exact | 22.68 | 0.00 | 6.96 | 6.96 |
| Challenge | modified | Systematic | Interval 100, repeating order | exact | 100 | 100 starts | exact | 22.68 | 0.00 | 14.43 | 14.43 |
| Challenge | baseline | Simple random | Original population | 42 | 100 | 100 | Monte Carlo | 22.68 | 0.03 | 1.37 | 1.37 |
| Challenge | modified | Simple random | Modified population | 42 | 100 | 100 | Monte Carlo | 22.68 | -0.04 | 1.49 | 1.49 |

The simple random n = 100 row is also the n = 100 sample-size result when the population and
settings match. If I reran it with different settings, I add a separate row. All four challenge
rows use the same n; a challenge baseline row may repeat a matching stage 4 result

## 4. Findings (in my own words, using my own numbers)

- (a) Method comparison: the three sampling methods compared at n = 100 (bias versus variability, and for which population): I compared simple random, systematic, and stratified sampling on the original population at n = 100. Stratified sampling had the lowest RMSE at 1.28, simple random at 1.46, systematic had the highest at 6.96. Each method had low bias with systematic sampling having the highest variability, with a SD of 6.96 compared to 1.45 for simple random and 1.28 for stratified sampling.
- (b) Sample-size finding: how sample size affects the spread of estimates and the estimation error, and what a larger sample cannot fix: increasing the sample size reduced the spread of the estimates. The SD decreased from 14.06 at n = 1 to 4.61 at n = 10 and 1.45 at n = 100. The RMSE also decreased as sample size increased. This shows that larger samples generally produce more consistent estimates. However, increasing sample size will not fix problems caused by a sampling method interacting poorly with the population ordering.

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

- Test settings (conditions, methods, alternative method or correction, n, seeds); results are in the table above: I compared systematic sampling and simple random sampling on the original and modified populations. Each condition used n = 100. Systematic sampling used all 100 possible starting positions (exact), and each simple random sampling used 100 repetitions with seed 42 (Monte Carlo). Both populations had a true mean of 22.68 minutes.
- (c) Challenge interpretation: did the evidence support my hypothesis? Bias versus variability, other explanations, what the alternative or correction showed, and any dated revision (keep the original above): The results support my hypothesis. Systematic sampling had an SD and RMSE of 6.96 on the original population and 14.43 on the modified. Simple random sampling had a RMSE of 1.37 on the original population and 1.49 on the modified. Both methods had little bias, the main differences being variability. The repeating pattern caused systematic sampling to choose appointments with similar waiting times, producing a wider range of estimates. Simple random sampling was less affected because it did not follow the fixed interval, this shows that systematic sampling can perform worse when the population ordering matches the sampling interval.

## 6. AI use

- Tools used: Codex in VS Code
- What I asked my agent to do, and what I checked myself: I used the agent to help build the app, implementing all the functionality. I checked the results in the application, compared the different sampling methods and verified the that the values were correct.
- Automated checks my agent reported (I did not let it interpret my results): The agent reported all 13 automated tests and the Vite production build passed.
