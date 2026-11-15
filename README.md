# Screening Water Samples for Potability: A Baseline-Driven Classification Study

ES 335 course project.

**Team:** [Name 1, Roll No.], [Name 2, Roll No.]

**Live website:** `https://hasinil2780.github.io/water-potability-screening/` (after you enable GitHub Pages, see below)
**Repository:** https://github.com/HasiniL2780/water-potability-screening

## Research question

Using the measured physicochemical parameters in the Water Potability dataset, how well can machine-learning models predict the *recorded* potability label, and how does performance change across three hypothetical feature-availability scenarios, compared with a majority-class baseline?

One row of the data is one water sample: nine measured values plus the recorded label `Potability` (1 = potable, 0 = not potable).

| Scenario | Name | Features |
|---|---|---|
| A | Quick on-site check | ph, Conductivity, Turbidity |
| B | Basic test kit | A + Solids, Hardness, Chloramines |
| C | Full panel | all 9 features |

Scenarios are experimental feature subsets, not validated testing procedures.

**Main purpose:** compare logistic regression, a decision tree and a random forest across A, B and C against the majority-class baseline. The project is not a general water-quality application.

## Data

Kaggle "Water Potability" (Kadiwal, A.), https://www.kaggle.com/datasets/adityakadiwal/water-potability. 3,276 rows, 9 features, 1,998 non-potable and 1,278 potable. Missing values: ph 491, Sulfate 781, Trihalomethanes 162. Licence: **CC0: Public Domain** (as listed on the Kaggle page), so the CSV is included at `data/water_potability.csv`. Kaggle's metadata lists the provenance as "Synthetically generated"; results therefore describe this dataset, not real water samples. To re-download, see `data/README.md`. Never commit your Kaggle API key.

## Method in brief

- **Split:** stratified 80/20 (2,620 train / 656 test), seed 42. The test set scores the final models.
- **Preprocessing (inside a scikit-learn Pipeline, fitted on training folds only):** column selection by scenario, median imputation, optional missing-value indicator (kept only if cross-validation shows a gain larger than its standard error), standard scaling for logistic regression only.
- **Selection:** 5-fold stratified cross-validation on the training part; scorer = average precision with non-potable as the positive class; settings, class weights, indicators and thresholds are all chosen here. The final family per scenario is the one with the highest mean CV score, preferring a simpler family within one standard error.
- **Uncertainty:** 2,000 paired bootstrap resamples of the test rows, 95% percentile intervals.
- **Settings and how they were chosen (all in the notebook):** random-forest hyperparameter tuning, class weights, decision-threshold rules (default 0.5, balanced, 90% non-potable recall; all frozen on training out-of-fold predictions), missing-value indicators, precision-recall curves.

## Results (test set, threshold 0.5; source `docs/results.json`)

| | A | B | C |
|---|---|---|---|
| Final model | forest | forest | forest |
| Balanced accuracy (baseline 0.500) | 0.481 | 0.557 | 0.626 |
| Average precision (baseline 0.61) | 0.619 | 0.730 | 0.750 |
| Accuracy (baseline 0.61) | 0.463 | 0.570 | 0.657 |
| Share of "potable" calls that are actually non-potable | 0.625 | 0.546 | 0.429 |
| Non-potable recall (baseline 1.000, meaningless alone) | 0.400 | 0.618 | 0.767 |
| Potable recall | 0.562 | 0.496 | 0.484 |
| CV average precision (final model) | 0.646 | 0.720 | 0.762 |

- Balanced accuracy minus baseline (95% paired-bootstrap interval): A -0.019 [-0.057, +0.022], B +0.057 [+0.016, +0.094], C +0.126 [+0.090, +0.163]. Where the interval includes 0 the data cannot tell the model from the baseline.
- Random forest, C minus A balanced accuracy: +0.145 [+0.095, +0.194].
- **The results are weak.** Accuracy is below the baseline in A and B. Even in C, 43% of "potable" calls are wrong. Logistic regression stays at the baseline. The classes overlap heavily for every feature, which tuning cannot fix.
- Moving the threshold trades one error for the other: the 90%-recall rule catches about 90% of non-potable samples but wrongly flags 242, 215 and 174 potable samples (A, B, C).

Evaluation note: all selection used cross-validation on the training part only; the hold-out set was also used for reporting while the project was developed, so treat its scores as slightly optimistic. Cross-validation and test scores agree closely.

## Repository layout

```
notebooks/water_potability.ipynb   full analysis; writes docs/results.json and docs/assets/
docs/                              website: index.html, style.css, app.js, results.json, assets/, .nojekyll
data/water_potability.csv          the dataset (CC0), plus data/README.md with source and download steps
DEFENSE_NOTES.md, requirements.txt, .gitignore
```

## Setup and run

1. Data: `data/water_potability.csv` is included (CC0). If it is missing, download it from Kaggle into `data/`.
2. `python -m venv .venv`, activate it, then `pip install -r requirements.txt`.
3. Run the notebook: `jupyter nbconvert --to notebook --execute --inplace notebooks/water_potability.ipynb` (about 3 minutes). It overwrites `docs/results.json` and `docs/assets/`.
4. Preview the site: `cd docs`, `python -m http.server 8000`, open `http://localhost:8000` (not `[::]`, and not by double-clicking the file).

Execution note: the committed results were produced by running the notebook's code cells sequentially in one Python process with a helper script, because Jupyter could not be installed in the build environment (recorded in `results.json`, `meta.executed_via`). Re-running with nbconvert on your machine should give the same numbers with the pinned library versions; Jupyter versions in `requirements.txt` are left unpinned for that reason.

## Publish on GitHub Pages

Push the repository, then Settings, Pages, Deploy from a branch, `main`, folder `/docs`. All paths are relative and `.nojekyll` is included. After deploying, open the URL in a private window and check: page loads, figures show, no console errors, scenario and model buttons and the threshold slider work. Make sure the repository is accessible to the instructor.

## Limitations

- No safety claim: "potable" predictions are not safe-to-drink statements. The data has no microbial or heavy-metal measurements and the label's origin is unclear.
- Association, not causation. One split, one seed; bootstrap intervals reflect test-set sampling only. Tuning was staged, so CV scores of tuned settings are slightly optimistic.
- Kaggle lists the data as synthetically generated, so findings concern this dataset, not real water. Not to be generalised to Indian rivers or any region.
- The scenario grouping is our assumption, not a property of the data.

## AI-use disclosure

[Replace with your statement: which parts were produced with AI assistance (e.g. code, analysis, website drafting) and how the team checked and understood them.]

## Citations

- Kadiwal, A. *Water Potability* [dataset]. Kaggle. https://www.kaggle.com/datasets/adityakadiwal/water-potability
- Pedregosa et al. (2011). Scikit-learn: Machine Learning in Python. *JMLR* 12, 2825-2830.
- Harris et al. (2020). Array programming with NumPy. *Nature* 585, 357-362.
- The pandas development team, pandas; Hunter (2007), Matplotlib. *Computing in Science & Engineering* 9(3), 90-95.
