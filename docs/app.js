/* Renders the whole page from results.json and models/model_<A|B|C>.json. No numbers are typed in here. */
(function () {
  "use strict";
  var R = null;
  var REPO_URL = "https://github.com/HasiniL2780/water-potability-screening";
  var S = { scenario: "A", model: null, metric: "balanced_accuracy", exp: "rf" };
  var FAM = ["baseline", "logreg", "tree", "forest"];
  var FNAME = { baseline: "Baseline", logreg: "Logistic regression", tree: "Decision tree", forest: "Random forest" };
  var COLORS = { baseline: "var(--c-base)", logreg: "var(--c-lr)", tree: "var(--c-tree)", forest: "var(--c-forest)" };
  var METRIC_SHORT = { balanced_accuracy: "Balanced accuracy", ap_np: "Average precision (non-potable)", recall_np: "Non-potable recall",
    false_potable_share: "Wrong 'potable' share (lower is better)", recall_p: "Potable recall", precision_np: "Non-potable precision" };
  var UNITS = { ph: "", Hardness: "mg/L", Solids: "mg/L (TDS)", Chloramines: "ppm", Sulfate: "mg/L", Conductivity: "µS/cm",
    Organic_carbon: "ppm", Trihalomethanes: "µg/L", Turbidity: "NTU" };
  var FINAL_BADGE = ' <span class="badge-final" title="Final model for this scenario">FINAL</span>';
  var CL = function () { return Math.round(R.meta.ci_level * 100) + "%"; };

  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function f(v, d) { return (v === null || v === undefined || isNaN(v)) ? "not defined" : Number(v).toFixed(d === undefined ? 3 : d); }
  function pc(v, d) { return (v === null || v === undefined || isNaN(v)) ? "not defined" : (v * 100).toFixed(d === undefined ? 0 : d) + "%"; }
  function ci(o, d) { return (!o || o.value === null || o.ci_low === null) ? "" : "[" + f(o.ci_low, d) + ", " + f(o.ci_high, d) + "]"; }
  function incl0(o) { return o && o.ci_low !== null && o.ci_low <= 0 && o.ci_high >= 0; }
  function sc() { return R.scenarios[S.scenario]; }
  function finalFam(s) { return (s || sc()).final_model; }
  function setHTML(id, h) { var e = $(id); if (e) { e.innerHTML = h; } }
  function nonNull(o) { return o && o.value !== null; }

  /* ---------- header / static fills ---------- */
  function fills() {
    var ds = R.meta, map = {
      class0_pct: pc(ds.class_share["0"]), n_rows: ds.n_rows.toLocaleString("en"), n_features: Object.keys(ds.missing_counts).length,
      seed: ds.seed, cv_folds: ds.split.cv_folds, n_boot: ds.n_bootstrap.toLocaleString("en"), baseline_recall_np: f(R.scenarios.A.models.baseline.test.recall_np.value, 2)
    };
    document.querySelectorAll("[data-fill]").forEach(function (e) { var k = e.getAttribute("data-fill"); if (k in map) { e.textContent = map[k]; } });
    var fb = R.differences.final_vs_baseline;
    function stat(b, l) { return '<div class="stat"><b>' + b + "</b><span>" + l + "</span></div>"; }
    setHTML("hero-stats",
      stat(ds.n_rows.toLocaleString("en"), "water samples, " + pc(ds.class_share["0"]) + " labelled non-potable") +
      stat(f(R.scenarios.A.models.baseline.test.balanced_accuracy.value, 2), "balanced accuracy of the majority baseline") +
      ["A", "B", "C"].map(function (k) {
        return stat(f(R.scenarios[k].models[finalFam(R.scenarios[k])].test.balanced_accuracy.value, 2),
          "final model, scenario " + k + (incl0(fb[k].balanced_accuracy) ? " (not clearly above baseline)" : ""));
      }).join(""));
    var fams = ["A", "B", "C"].map(function (k) { return finalFam(R.scenarios[k]); }), allSame = fams.every(function (x) { return x === fams[0]; });
    setHTML("final-note", "<strong>Final model:</strong> " + (allSame ? FNAME[fams[0]].toLowerCase() + " in all three scenarios" :
      ["A", "B", "C"].map(function (k, i) { return FNAME[fams[i]].toLowerCase() + " in scenario " + k; }).join(", ")) + ', chosen by cross-validation (see <a href="#settings">Settings</a>).');
    var names = ["A", "B", "C"];
    setHTML("scenario-diagram", names.map(function (k) {
      var s = R.scenarios[k];
      return '<div class="scen-card"><h4><span>Scenario ' + k + "</span> &middot; " + esc(s.label) + "</h4><p class=\"note\">" + s.n_features + " features</p><div class=\"chips\">" +
        s.features.map(function (x) { return '<span class="chip' + (s.new_features.indexOf(x) >= 0 && k !== "A" ? " new" : "") + '">' + esc(x) + "</span>"; }).join("") + "</div></div>";
    }).join(""));
    var m = R.meta.missing_counts;
    setHTML("data-summary",
      stat(ds.class_counts["0"].toLocaleString("en"), "not potable (0)") + stat(ds.class_counts["1"].toLocaleString("en"), "potable (1)") +
      Object.keys(m).filter(function (k) { return m[k] > 0; }).map(function (k) { return stat(m[k], "missing " + k + " (" + pc(m[k] / ds.n_rows, 1) + ")"); }).join(""));
    var sp = ds.split, trp = ds.n_train / ds.n_rows * 100, tep = ds.n_test / ds.n_rows * 100;
    setHTML("split-diagram", '<div class="tr" style="width:' + trp + '%">Training ' + ds.n_train + " &middot; " + sp.cv_folds + "-fold CV</div><div class=\"te\" style=\"width:" + tep + '%">Test ' + ds.n_test + "</div>");
    var b = R.scenarios.A.models.baseline;
    setHTML("baseline-facts", "Test: non-potable recall " + f(b.test.recall_np.value, 2) + ", balanced accuracy " + f(b.test.balanced_accuracy.value, 2) + ", potable precision not defined (it never says &ldquo;potable&rdquo;).");
    var VARS = [["ph", "Acidity/alkalinity (pH scale 0 to 14)", ""], ["Hardness", "Capacity of water to precipitate soap (calcium and magnesium salts)", "mg/L"], ["Solids", "Total dissolved solids", "mg/L"],
      ["Chloramines", "Disinfectant (chloramine) concentration", "ppm"], ["Sulfate", "Dissolved sulfate", "mg/L"], ["Conductivity", "Electrical conductivity", "µS/cm"],
      ["Organic_carbon", "Total organic carbon", "ppm"], ["Trihalomethanes", "Disinfection by-products", "µg/L"], ["Turbidity", "Cloudiness (light scattering)", "NTU"]];
    var gm = R.data_summary.group_means, mp = R.data_summary.missing_pct, inA = R.scenarios.A.features, inB = R.scenarios.B.features;
    setHTML("var-table", '<table><thead><tr><th>Feature</th><th>Meaning</th><th>Unit</th><th>Mean, non-potable</th><th>Mean, potable</th><th>Missing</th><th>First used in</th></tr></thead><tbody>' +
      VARS.map(function (v) { var k = v[0]; return "<tr><td>" + esc(k) + "</td><td>" + v[1] + "</td><td>" + (v[2] || "&ndash;") + "</td><td>" + f(gm[k]["0"], 2) + "</td><td>" + f(gm[k]["1"], 2) + "</td><td>" + (mp[k] > 0 ? f(mp[k], 1) + "%" : "0%") + "</td><td>" + (inA.indexOf(k) >= 0 ? "A" : inB.indexOf(k) >= 0 ? "B" : "C") + "</td></tr>"; }).join("") + "</tbody></table>");
    var rows = "";
    ["A", "B", "C"].forEach(function (k) {
      var sc = R.scenarios[k];
      ["logreg", "tree", "forest"].forEach(function (fm) {
        var m = sc.models[fm], bp = m.best_params || {}, txt = Object.keys(bp).map(function (n) { return n.replace(/_/g, " ") + " " + (bp[n] === null ? "none" : bp[n]); }).join(", ").replace(/nonpot_x([0-9.]+)/, "non-potable x$1").replace(/_subsample/, " subsample").replace(/missing indicator true/, "missing indicator on").replace(/missing indicator false/, "missing indicator off");
        rows += '<tr class="' + (m.is_final ? "final final-strong" : "") + '"><td>' + k + "</td><td>" + esc(m.name) + (m.is_final ? FINAL_BADGE : "") + "</td><td>" + esc(txt) + "</td><td>" + f(m.cv.ap_np.mean) + "</td></tr>";
      });
    });
    setHTML("settings-table", '<table class="text-table"><thead><tr><th>Scenario</th><th>Model</th><th>Chosen settings</th><th>CV average precision</th></tr></thead><tbody>' + rows + "</tbody></table>");
    setHTML("repro-meta", [["Seed", ds.seed], ["Bootstrap resamples", ds.n_bootstrap], ["Stratified cross-validation, training part only", ds.split.cv_folds + "-fold"]].map(function (a) { return '<div class="stat"><b>' + esc(a[1]) + "</b><span>" + a[0] + "</span></div>"; }).join("") +
      '<p class="note" style="grid-column:1/-1">' + esc(ds.test_set_note) + "</p>");
  }

  /* ---------- results ---------- */
  function kpi(label, o, d, warn) {
    return '<div class="kpi' + (warn ? " warnk" : "") + '"><div class="v">' + (nonNull(o) ? f(o.value, d) : "not defined") + '</div><div class="l">' + label + '</div><div class="ci">' + (o && o.ci_low !== null && o.ci_low !== undefined ? CL() + " " + ci(o, d) : "") + "</div></div>";
  }
  function confusionOK(c) {
    /* tp = non-potable correctly flagged; fn = non-potable predicted potable (costly); fp = potable predicted non-potable */
    return '<div class="cm"><div class="hd"></div><div class="hd">Predicted non-potable</div><div class="hd">Predicted potable</div>' +
      '<div class="hd">Truly non-potable (' + (c.tp + c.fn) + ')</div><div class="ok"><b>' + c.tp + '</b>correct</div><div class="bad"><b>' + c.fn + '</b>false &ldquo;potable&rdquo;</div>' +
      '<div class="hd">Truly potable (' + (c.fp + c.tn) + ')</div><div class="bad"><b>' + c.fp + '</b>false &ldquo;non-potable&rdquo;</div><div class="ok"><b>' + c.tn + "</b>correct</div></div>";
  }
  function resultsPanel() {
    var s = sc(), fam = S.model || finalFam(s), m = s.models[fam], t = m.test, isFinal = !S.model || S.model === finalFam(s);
    $("model-reset").hidden = !S.model || S.model === finalFam(s);
    var fb = R.differences.final_vs_baseline[S.scenario], h = "";
    h += '<p><strong>Scenario ' + S.scenario + " (" + esc(s.label) + ")</strong>, " + esc(m.name) + (m.is_final ? " &mdash; the final model for this scenario" : "") + ".</p>";
    if (fam === "baseline") { h += '<p class="note">The baseline always answers &ldquo;non-potable&rdquo;. It sets the level every model has to beat.</p>'; }
    if (fam === "logreg" && m.confusion.fn === 0 && m.confusion.tn === 0) {
      h += '<p class="banner" style="background:var(--warn-soft)">At threshold 0.5 this logistic regression calls <strong>every</strong> test sample non-potable, exactly like the baseline. Its probabilities do carry a little signal (see average precision), but not enough to cross 0.5.</p>';
    }
    h += '<div class="kpis">' + kpi(METRIC_SHORT.balanced_accuracy, t.balanced_accuracy, 3) + kpi(METRIC_SHORT.ap_np, t.ap_np, 3) + kpi("Non-potable recall", t.recall_np, 3) +
      kpi("Wrong &lsquo;potable&rsquo; share", t.false_potable_share, 3, true) + kpi("Potable recall", t.recall_p, 3) + "</div>";
    if (isFinal && fam !== "baseline") {
      h += '<p class="note">Versus the baseline (paired bootstrap, ' + CL() + "): balanced accuracy " + (fb.balanced_accuracy.value >= 0 ? "+" : "") + f(fb.balanced_accuracy.value) + " " + ci(fb.balanced_accuracy) +
        (incl0(fb.balanced_accuracy) ? " &mdash; includes 0, so the data cannot distinguish this model from the baseline." : " &mdash; excludes 0.") + "</p>";
    }
    h += '<div class="two-col"><div>' + confusionOK(m.confusion) + "</div><div><p class=\"note\">Cross-validation on the training part (mean &plusmn; sd across " + R.meta.split.cv_folds + " folds): average precision " +
      f(m.cv.ap_np.mean) + " &plusmn; " + f(m.cv.ap_np.std) + "; balanced accuracy " + f(m.cv.balanced_accuracy.mean) + ". Training minus validation average precision gap: <strong>" + f(m.cv_train_vs_val.gap) + "</strong>.</p>" +
      (m.best_params && fam !== "baseline" ? "<p class=\"note\">Settings: " + esc(JSON.stringify(m.best_params).replace(/[{}"]/g, "").replace(/,/g, ", ")) + "</p>" : "") + "</div></div>";
    h += '<h3>All models, scenario ' + S.scenario + '</h3><div class="table-wrap"><table><thead><tr><th>Model</th><th>CV AP</th><th>Train&minus;val gap</th><th>Test bal. acc.</th><th>Test AP</th><th>Non-pot. recall</th><th>Wrong &lsquo;potable&rsquo;</th></tr></thead><tbody>';
    FAM.forEach(function (k) {
      var mm = s.models[k];
      h += '<tr class="' + (mm.is_final ? "final final-strong" : "") + '"><td>' + esc(mm.name) + (mm.is_final ? FINAL_BADGE : "") + "</td><td>" + f(mm.cv.ap_np.mean) + "</td><td>" + f(mm.cv_train_vs_val.gap) + "</td><td>" + f(mm.test.balanced_accuracy.value) + "</td><td>" + f(mm.test.ap_np.value) + "</td><td>" + f(mm.test.recall_np.value) + "</td><td>" + f(mm.test.false_potable_share.value) + "</td></tr>";
    });
    h += "</tbody></table></div>";
    var bAcc = s.models.baseline.test.accuracy.value, fAcc = s.models[finalFam(s)].test.accuracy.value;
    h += '<p class="note"><strong>Accuracy, read against the baseline:</strong> always answering &ldquo;non-potable&rdquo; is right ' + pc(bAcc) + ' of the time; this scenario&rsquo;s final model is right ' + pc(fAcc) + ' of the time (' + (fAcc < bAcc ? "below" : "above") + ' the baseline). Accuracy rewards ignoring the minority class, so it is a secondary number; we judge models by balanced accuracy and average precision.</p>';
    h += '<p class="note">Final model chosen by cross-validation: ' + esc(s.selection.rule) + ". Best mean CV AP: " + esc(FNAME[s.selection.best_by_mean]) + " (" + f(s.selection.best_mean) + "); one-standard-error cutoff " + f(s.selection.cutoff) + ".</p>";
    setHTML("results-panel", h);
  }

  /* ---------- compare chart (inline SVG) ---------- */
  function compareChart() {
    var met = S.metric, W = 700, H = 320, L = 46, B = 40, T = 16, plotW = W - L - 10, plotH = H - B - T;
    var vals = [], maxV = 0;
    ["A", "B", "C"].forEach(function (k) { FAM.forEach(function (fm) { var o = R.scenarios[k].models[fm].test[met]; vals.push({ k: k, fm: fm, o: o }); if (nonNull(o)) { maxV = Math.max(maxV, o.ci_high !== null && o.ci_high !== undefined ? o.ci_high : o.value, o.value); } }); });
    maxV = Math.max(0.2, Math.ceil(maxV * 5) / 5); var nT = Math.round(maxV / 0.2) > 5 ? 5 : Math.round(maxV / 0.2);
    var y = function (v) { return T + plotH - (v / maxV) * plotH; };
    var legendNote = ""; var svg = '<svg viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="Grouped bar chart of ' + esc(METRIC_SHORT[met]) + ' by scenario and model on the test set">';
    for (var g = 0; g <= nT; g++) { var gv = maxV * g / nT; svg += '<line x1="' + L + '" x2="' + (W - 10) + '" y1="' + y(gv) + '" y2="' + y(gv) + '" stroke="var(--line)"/><text x="' + (L - 6) + '" y="' + (y(gv) + 4) + '" text-anchor="end" font-size="11" fill="var(--muted)">' + gv.toFixed(2) + "</text>"; }
    var gw = plotW / 3, bw = gw / 5.2;
    ["A", "B", "C"].forEach(function (k, gi) {
      FAM.forEach(function (fm, mi) {
        var o = R.scenarios[k].models[fm].test[met], x = L + gi * gw + gw * 0.08 + mi * bw * 1.15;
        if (nonNull(o)) {
          svg += '<rect x="' + x + '" y="' + y(o.value) + '" width="' + bw + '" height="' + (T + plotH - y(o.value)) + '" fill="' + COLORS[fm] + '" rx="2"><title>' + esc(FNAME[fm]) + (R.scenarios[k].models[fm].is_final ? " (final model)" : "") + ", scenario " + k + ": " + f(o.value) + " " + ci(o) + "</title></rect>";
          if (R.scenarios[k].models[fm].is_final) { svg += '<text x="' + (x + bw / 2) + '" y="' + (y(o.ci_high !== null && o.ci_high !== undefined ? o.ci_high : o.value) - 4) + '" text-anchor="middle" font-size="14" fill="var(--text)" aria-hidden="true">&#9733;</text>'; }
          if (o.ci_low !== null && o.ci_low !== undefined) { svg += '<line x1="' + (x + bw / 2) + '" x2="' + (x + bw / 2) + '" y1="' + y(o.ci_low) + '" y2="' + y(o.ci_high) + '" stroke="var(--text)" stroke-width="1.4"/>'; }
        } else {
          svg += '<text x="' + (x + bw / 2) + '" y="' + (T + plotH - 4) + '" font-size="9" text-anchor="middle" fill="var(--muted)" transform="rotate(-90 ' + (x + bw / 2) + " " + (T + plotH - 4) + ')">not defined</text>';
        }
      });
      svg += '<text x="' + (L + gi * gw + gw / 2) + '" y="' + (H - 14) + '" text-anchor="middle" font-size="13" fill="var(--text)">Scenario ' + k + "</text>";
    });
    if (met === "balanced_accuracy") { svg += '<line x1="' + L + '" x2="' + (W - 10) + '" y1="' + y(0.5) + '" y2="' + y(0.5) + '" stroke="var(--bad)" stroke-dasharray="5 4"/>'; legendNote = " Dashed red line: 0.5, the chance level."; }
    svg += "</svg>";
    setHTML("compare-chart", svg + '<div class="legend">' + FAM.map(function (fm) { return '<span><i style="background:' + COLORS[fm] + '"></i>' + FNAME[fm] + "</span>"; }).join("") + '<span><b aria-hidden="true">&#9733;</b> final model for that scenario</span><span class="muted">Whiskers: ' + CL() + " bootstrap interval. Hover a bar for exact values." + legendNote + "</span></div>");
  }

  /* ---------- experiments ---------- */
  function img(src, alt, cap) { return '<figure class="figure"><img src="' + src + '" alt="' + esc(alt) + '" loading="lazy"><figcaption>' + cap + "</figcaption></figure>"; }
  function expRF() {
    var e = R.experiments.rf_tuning[S.scenario], g = e.grid.slice().sort(function (a, b) { return b.cv_ap - a.cv_ap; }).slice(0, 8);
    var h = img("assets/rf_tuning.png", "Random-forest tuning: cross-validation average precision against training-minus-validation gap for each tried setting", "All tried settings: score against overfitting gap, per scenario.");
    h += "<p>Scenario " + S.scenario + ": " + esc(JSON.stringify(e.tuned_params).replace(/[{}"]/g, "").replace(/_/g, " ").replace(/:/g, " ").replace(/,/g, ", ").replace(/missing indicator true/, "missing indicator on").replace(/missing indicator false/, "missing indicator off")) + " was chosen: best mean CV average precision, then the smallest training-versus-validation gap among settings within one standard error (CV AP " + f(e.tuned_cv_ap) + ", gap " + f(e.tuned_gap) + ").</p>";
    h += '<details><summary>Top 8 tried settings by CV score (' + e.grid.length + ' tried)</summary><div class="table-wrap"><table><thead><tr><th>max_depth</th><th>min_samples_leaf</th><th>max_features</th><th>CV AP</th><th>Gap</th></tr></thead><tbody>' +
      g.map(function (r) { return "<tr><td>" + r.max_depth + "</td><td>" + r.min_samples_leaf + "</td><td>" + r.max_features + "</td><td>" + f(r.cv_ap) + "</td><td>" + f(r.gap) + "</td></tr>"; }).join("") + "</tbody></table></div></details>";
    return h;
  }
  function expCW() {
    var e = R.experiments.class_weight[S.scenario], h = img("assets/class_weight.png", "Effect of class weights on cross-validation average precision and non-potable recall", "Class-weight options compared by cross-validation.");
    h += "<p>Weighting non-potable samples more can raise non-potable recall, but it trades against potable recall and does not create information. Choice per model (scenario " + S.scenario + "): " + ["logreg", "tree", "forest"].map(function (fm) { return FNAME[fm] + " &rarr; <strong>" + esc(e[fm].chosen) + "</strong>"; }).join("; ") + ".</p>";
    var o = e.forest.options;
    h += '<div class="table-wrap"><table><thead><tr><th>Random forest, class weight</th><th>CV AP</th><th>Non-pot. recall</th><th>Potable recall</th><th>Balanced acc.</th></tr></thead><tbody>' +
      Object.keys(o).map(function (k) { var r = o[k]; return '<tr class="' + (k === e.forest.chosen ? "final" : "") + '"><td>' + esc(k) + (k === e.forest.chosen ? " (chosen)" : "") + "</td><td>" + f(r.cv_ap.mean) + "</td><td>" + f(r.recall_np.mean) + "</td><td>" + f(r.recall_p.mean) + "</td><td>" + f(r.balanced_accuracy.mean) + "</td></tr>"; }).join("") + "</tbody></table></div>";
    return h;
  }
  function thrRow(rule) {
    var a = R.threshold_analysis[rule][S.scenario], t = a.test, c = a.confusion;
    return "<tr><td>" + rule + "</td><td>" + f(a.threshold, 2) + "</td><td>" + f(t.recall_np.value) + " " + ci(t.recall_np, 2) + "</td><td>" + f(t.recall_p.value) + "</td><td>" + f(t.false_potable_share.value) + "</td><td>" + f(t.balanced_accuracy.value) + "</td><td>" + c.fn + " / " + c.fp + "</td></tr>";
  }
  function expThr() {
    var e = R.experiments.threshold[S.scenario], sw = e.sweep, h = img("assets/threshold_tradeoff.png", "Trade-off between non-potable recall and potable recall as the decision threshold moves, from training out-of-fold predictions", "Training out-of-fold sweep for the final model of each scenario.");
    h += '<h3>Frozen rules applied once to the test set</h3><div class="table-wrap"><table><thead><tr><th>Rule</th><th>Threshold</th><th>Non-pot. recall (' + CL() + ')</th><th>Potable recall</th><th>Wrong &lsquo;potable&rsquo;</th><th>Bal. acc.</th><th>False potable / false non-potable (count)</th></tr></thead><tbody>' + ["default", "balanced", "recall90"].map(thrRow).join("") + "</tbody></table></div>";
    h += '<p class="note">Rules were fixed on training predictions before looking at the test set: ' + ["balanced", "recall90"].map(function (k) { return "<strong>" + k + "</strong> = " + esc(R.meta.rule_text[k]); }).join("; ") + ". Reaching high non-potable recall costs many false &ldquo;non-potable&rdquo; calls, because the model cannot separate the classes well.</p>";
    return h;
  }
  function thrUpdate() {
    var sl = $("thr-slider"); if (!sl) { return; }
    var sw = R.experiments.threshold[S.scenario].sweep; sl.max = sw.threshold.length - 1; var i = +sl.value;
    function k(l, v, d) { return '<div class="kpi"><div class="v">' + (v === null ? "not defined" : f(v, d)) + '</div><div class="l">' + l + "</div></div>"; }
    setHTML("thr-out", k("Threshold", sw.threshold[i], 2) + k("Non-potable recall", sw.recall_np[i]) + k("Potable recall", sw.recall_p[i]) + k("Wrong &lsquo;potable&rsquo; share", sw.false_potable_share[i]) + k("Balanced accuracy", sw.balanced_accuracy[i]));
  }
  function expInd() {
    var e = R.experiments.missing_indicator[S.scenario], h = img("assets/missing_indicators.png", "Cross-validation score with and without missing-value indicator columns", "Missing-value indicators: with versus without.");
    h += "<p>Median imputation hides <em>which</em> values were missing. An indicator column adds that fact. A model adopts indicators only when the paired fold difference is positive and larger than its standard error.</p>";
    h += '<div class="table-wrap"><table><thead><tr><th>Model (scenario ' + S.scenario + ')</th><th>CV AP without</th><th>CV AP with</th><th>Paired difference &plusmn; SE</th><th>Adopted?</th></tr></thead><tbody>' +
      ["logreg", "tree", "forest"].map(function (fm) { var r = e[fm]; return "<tr><td>" + FNAME[fm] + "</td><td>" + f(r.cv_ap_without) + "</td><td>" + f(r.cv_ap_with) + "</td><td>" + (r.paired_diff_mean >= 0 ? "+" : "") + f(r.paired_diff_mean, 4) + " &plusmn; " + f(r.paired_diff_se, 4) + "</td><td>" + (r.adopted ? "yes" : "no") + "</td></tr>"; }).join("") + "</tbody></table></div>";
    if (S.scenario === "B") { h += '<p class="note">Scenario B has no features with missing values, so indicators cannot add anything (differences are noise).</p>'; }
    return h;
  }
  function expPR() {
    var p = R.experiments.pr_curves[S.scenario], h = img("assets/pr_curves.png", "Precision-recall curves with non-potable as the positive class for each model and scenario, with the no-skill line at the non-potable share", "Precision-recall curves (non-potable = positive). The dashed line is the no-skill level, the non-potable share.");
    h += "<p>Scenario " + S.scenario + ": average precision on the test set &mdash; " + ["logreg", "tree", "forest"].map(function (fm) { return FNAME[fm] + " " + f(p.ap_test[fm]); }).join(", ") + "; no-skill level " + f(p.prevalence_test) + ".</p>";
    h += '<div class="table-wrap"><table><thead><tr><th>Operating point</th><th>Threshold</th><th>Test recall</th><th>Test precision</th><th>Training OOF recall</th><th>Training OOF precision</th></tr></thead><tbody>' +
      Object.keys(p.operating_points).map(function (k) { var o = p.operating_points[k]; return "<tr><td>" + k + "</td><td>" + f(o.threshold, 2) + "</td><td>" + f(o.test_recall) + "</td><td>" + f(o.test_precision) + "</td><td>" + f(o.oof_recall) + "</td><td>" + f(o.oof_precision) + "</td></tr>"; }).join("") + "</tbody></table></div>";
    h += '<p class="note">Precision stays close to the no-skill level over most of the curve: recall can be bought, but not cheaply.</p>';
    return h;
  }
  function expPanel() {
    var fn = { rf: expRF, cw: expCW, thr: expThr, ind: expInd, pr: expPR }[S.exp];
    setHTML("exp-panel", fn());
  }

  /* ---------- errors ---------- */
  function errorsPanel() {
    var s = sc(), fam = finalFam(s), c = s.models[fam].confusion, tot = c.tp + c.fn + c.fp + c.tn, h = "";
    var dots = "", i;
    for (i = 0; i < c.fn; i++) { dots += '<i class="d-fp" title="false potable"></i>'; }
    for (i = 0; i < c.fp; i++) { dots += '<i class="d-fn" title="false non-potable"></i>'; }
    for (i = 0; i < c.tp + c.tn; i++) { dots += '<i class="d-ok" title="correct"></i>'; }
    h += '<div class="control-group"><span class="control-label">Scenario</span>' + ["A", "B", "C"].map(function (k) { return '<button type="button" class="seg" data-action="scenario" data-value="' + k + '" aria-pressed="' + (k === S.scenario) + '">' + k + "</button>"; }).join("") + "</div>";
    h += '<div class="two-col"><div class="panel"><div class="dots" role="img" aria-label="' + c.fn + " false potable, " + c.fp + " false non-potable, " + (c.tp + c.tn) + ' correct out of ' + tot + ' test samples">' + dots + '</div><div class="legend"><span><i style="background:var(--bad)"></i>false &ldquo;potable&rdquo; (' + c.fn + ')</span><span><i style="background:var(--warn)"></i>false &ldquo;non-potable&rdquo; (' + c.fp + ')</span><span><i style="background:var(--line)"></i>correct (' + (c.tp + c.tn) + ")</span></div></div><div>" + confusionOK(c) + "</div></div>";
    var m = s.missing_error_analysis || R.scenarios.A.missing_error_analysis;
    var wm = m.with_missing, wo = m.without_missing;
    h += "<p>Of the samples the final model called potable, " + pc(s.models[fam].test.false_potable_share.value) + " were actually non-potable (scenario " + S.scenario + "). Where the label was non-potable, the model called " + pc(c.fn / (c.tp + c.fn)) + " of them potable.</p>";
    h += '<p class="note">Rows with a missing value (final model, scenario ' + S.scenario + ', ' + wm.n_rows + " test rows) had error rate " + pc(wm.error_rate) + " versus " + pc(wo.error_rate) + " for complete rows, so missingness alone does not explain the errors. The mistakes are spread across the data because the features overlap between the classes, not because of a few odd rows.</p>";
    var mis = (R.misclassified[S.scenario] || []);
    if (mis.length) {
      var feats = s.features;
      h += "<details><summary>Example misclassified test rows (" + mis.length + ": most confident and seeded-random)</summary><div class=\"table-wrap\"><table><thead><tr><th>Row</th><th>Error</th><th>Chosen by</th><th>P(non-potable)</th>" + feats.map(function (x) { return "<th>" + esc(x) + "</th>"; }).join("") + "</tr></thead><tbody>" +
        mis.map(function (r) { return "<tr><td>" + r.row_index + "</td><td>" + (r.type === "false_potable" ? "false potable" : "false non-potable") + "</td><td>" + esc(r.selection.replace("_", " ")) + "</td><td>" + f(r.p_nonpotable, 2) + "</td>" + feats.map(function (x) { var v = r.features[x]; return "<td>" + (typeof v === "number" ? f(v, 2) : esc(v)) + "</td>"; }).join("") + "</tr>"; }).join("") + "</tbody></table></div></details>";
    }
    h += '<details><summary>Confusion-matrix figure, all scenarios</summary>' + img("assets/confusion_matrices.png", "Confusion matrices for the final model of each scenario", "Final model, threshold 0.5.") + "</details>";
    setHTML("errors-panel", h);
  }

  /* ---------- conclusions (every sentence derived from results.json) ---------- */
  function conclusions() {
    var fb = R.differences.final_vs_baseline, same = R.differences_same_family.forest, L = [], inc = [], exc = [], low = [];
    ["A", "B", "C"].forEach(function (k) {
      (incl0(fb[k].balanced_accuracy) ? inc : exc).push(k);
      var s = R.scenarios[k]; if (s.models[finalFam(s)].test.accuracy.value < s.models.baseline.test.accuracy.value) { low.push(k); }
    });
    var bal = ["A", "B", "C"].map(function (k) { return k + " " + f(R.scenarios[k].models[finalFam(R.scenarios[k])].test.balanced_accuracy.value, 2); }).join(", ");
    L.push("<strong>Against the baseline:</strong> balanced accuracy is " + bal + " versus 0.50. " + (exc.length ? "Scenario" + (exc.length > 1 ? "s " : " ") + exc.join(" and ") + (exc.length > 1 ? " are" : " is") + " above the baseline with an interval that excludes 0, but the gain is modest. " : "") + (inc.length ? "In scenario " + inc.join(" and ") + " the interval includes 0, so the model cannot be told apart from always guessing non-potable." : ""));
    var d = same.C_minus_A.balanced_accuracy;
    L.push("<strong>More measurements help:</strong> random forest balanced accuracy rises by " + f(d.value, 3) + " " + ci(d) + " from scenario A to C" + (incl0(d) ? " (the interval includes 0)." : " (the interval excludes 0). This is an association in one dataset, not proof that any measurement matters."));
    L.push("<strong>A &ldquo;potable&rdquo; call is not reliable:</strong> the share of &ldquo;potable&rdquo; calls that were actually non-potable is " + ["A", "B", "C"].map(function (k) { return k + " " + pc(R.scenarios[k].models[finalFam(R.scenarios[k])].test.false_potable_share.value); }).join(", ") + ".");
    if (low.length) { L.push("<strong>Accuracy misleads:</strong> in scenario " + low.join(" and ") + " the final model&rsquo;s accuracy is below the " + pc(R.scenarios.A.models.baseline.test.accuracy.value) + " of the baseline, which is why we judge by balanced accuracy and average precision."); }
    L.push("<strong>Bottom line:</strong> the features carry limited information about the recorded label, and Kaggle lists the data as synthetically generated. This study compares models; it is not a water-safety check.");
    setHTML("conclusions-panel", '<div class="panel"><ul class="limits">' + L.map(function (x) { return "<li>" + x + "</li>"; }).join("") + "</ul></div>");
  }

  /* ---------- events & boot ---------- */
  function syncPressed() {
    document.querySelectorAll("[data-action]").forEach(function (b) {
      var a = b.getAttribute("data-action"), v = b.getAttribute("data-value");
      var cur = { scenario: S.scenario, model: S.model || finalFam(), metric: S.metric, exp: S.exp }[a];
      if (cur !== undefined && b.hasAttribute("aria-pressed")) { b.setAttribute("aria-pressed", String(cur === v)); }
    });
  }
  function renderAll() { thrUpdate(); resultsPanel(); compareChart(); expPanel(); errorsPanel(); syncPressed(); }
  function onClick(ev) {
    var b = ev.target.closest("[data-action]"); if (!b) { return; }
    var a = b.getAttribute("data-action"), v = b.getAttribute("data-value");
    if (a === "scenario") { S.scenario = v; S.model = null; renderAll(); }
    else if (a === "model") { S.model = v; resultsPanel(); syncPressed(); }
    else if (a === "model-reset") { S.model = null; resultsPanel(); syncPressed(); }
    else if (a === "metric") { S.metric = v; compareChart(); syncPressed(); }
    else if (a === "exp") { S.exp = v; expPanel(); syncPressed(); }
  }
  function navSpy() {
    var links = document.querySelectorAll(".topnav a"), ids = [].map.call(links, function (a) { return a.getAttribute("href").slice(1); });
    function spy() { var cur = ids[0]; ids.forEach(function (id) { var e = $(id); if (e && e.getBoundingClientRect().top < 120) { cur = id; } }); links.forEach(function (a) { a.classList.toggle("active", a.getAttribute("href") === "#" + cur); }); }
    window.addEventListener("scroll", spy, { passive: true }); spy();
  }
  function boot() {
    document.addEventListener("click", onClick);
    navSpy();
    $("thr-slider").addEventListener("input", thrUpdate);
    fetch("results.json").then(function (r) { if (!r.ok) { throw new Error("results.json: HTTP " + r.status); } return r.json(); }).then(function (j) {
      R = j; var sw0 = R.experiments.threshold.A.sweep; $("thr-slider").value = sw0.threshold.indexOf(0.5); fills(); renderAll(); conclusions();
    }).catch(function (e) { $("load-error").hidden = false; $("load-error-detail").textContent = String(e.message || e); });
  }
  boot();
})();
