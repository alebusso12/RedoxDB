/* RedoxDB — Cyclic voltammogram reader: data files or images → Epa, Epc, E1/2, ΔEp, Ep/2, reversibility. */
(function () {
  "use strict";
  const { esc, fmt } = RDB;

  let cv = null;          // { E:[], I:[] } in V and A, anodic current positive
  let segments = [];      // [{from, to, dir}]
  let lastPeaks = null;

  function render(root) {
    root.innerHTML = `
    <div class="split">
      <div class="card stack">
        <h2>CV reader</h2>
        <div class="row"><label class="check"><input type="radio" name="cv-src" value="file" checked> Data file</label>
          <label class="check"><input type="radio" name="cv-src" value="img"> Image of a CV</label></div>
        <div id="cv-file-box" class="stack">
          <label class="field">Export from your potentiostat (CSV, TXT, DTA…)<input id="cv-file" type="file" accept=".csv,.txt,.tsv,.dat,.dta,.asc,.ids,.mpt"></label>
          <div class="grid c2">
            <label class="field">Potential column<select id="cv-ecol"></select></label>
            <label class="field">Current column<select id="cv-icol"></select></label>
            <label class="field">Potential unit<select id="cv-eunit"><option value="1">V</option><option value="0.001">mV</option></select></label>
            <label class="field">Current unit<select id="cv-iunit"><option value="1">A</option><option value="1e-3">mA</option><option value="1e-6">µA</option><option value="1e-9">nA</option></select></label>
          </div>
          <button class="btn small" id="cv-demo" type="button">Load a simulated example</button>
        </div>
        <div id="cv-img-box" class="stack" hidden>
          <label class="field">Image (PNG/JPG, e.g. a screenshot of a SI figure)<input id="cv-img" type="file" accept="image/*"></label>
          <p class="hint">1) Click two points on the x axis and enter their potentials. 2) Click two points on the y axis and enter their currents. 3) Click on the curve to pick its colour. The trace is extracted automatically.</p>
          <div class="grid c2">
            <label class="field">x₁ (V)<input id="dg-x1" type="number" step="0.1"></label>
            <label class="field">x₂ (V)<input id="dg-x2" type="number" step="0.1"></label>
            <label class="field">y₁ (µA)<input id="dg-y1" type="number" step="any"></label>
            <label class="field">y₂ (µA)<input id="dg-y2" type="number" step="any"></label>
          </div>
          <label class="field">Colour tolerance<input id="dg-tol" type="range" min="10" max="160" value="70"></label>
          <div class="row"><button class="btn small" id="dg-reset" type="button">Restart calibration</button><span class="hint" id="dg-step"></span></div>
        </div>
        <hr style="border:0;border-top:1px solid var(--border)">
        <label class="field">Current convention of the data<select id="cv-conv"><option value="iupac">IUPAC: oxidation current positive</option><option value="us">US/polarographic: reduction current positive</option></select></label>
        <label class="field">Measured against<select id="cv-ref">${RDB.refOptions("SCE")}</select></label>
        <label class="field" id="cv-custom-wrap" hidden>Offset: E(vs SCE) = E(vs ref) + <input id="cv-custom" type="number" step="0.001" value="0"></label>
        <label class="field">Internal ferrocene: measured E<sub>1/2</sub>(Fc⁺/Fc) in the same units (optional)<input id="cv-fc" type="number" step="0.001" placeholder="e.g. 0.452"></label>
        <label class="field" id="cv-fcsolv-wrap">Solvent for Fc → SCE<select id="cv-fcsolv"><option value="0.38">MeCN (+0.38)</option><option value="0.45">DMF (+0.45)</option><option value="0.46">CH₂Cl₂ (+0.46)</option><option value="0.40">THF (+0.40 approx.)</option></select></label>
        <div class="grid c2">
          <label class="field">Cycle<select id="cv-cycle"></select></label>
          <label class="field">Peak sensitivity<select id="cv-sens"><option value="0.1">normal</option><option value="0.04">high (small peaks)</option><option value="0.25">low (big peaks only)</option></select></label>
          <label class="field">Scan rate (mV/s, optional)<input id="cv-rate" type="number" step="1"></label>
          <label class="field">Electrons (n)<input id="cv-n" type="number" value="1" min="1" step="1"></label>
        </div>
      </div>
      <div class="stack">
        <div class="card stack">
          <div id="cv-dig" class="digitiser" hidden><canvas id="dg-canvas"></canvas></div>
          <div id="cv-plot"><p class="hint">Load a CV to start.</p></div>
          <div class="row end"><button class="btn small" id="cv-svg" type="button" disabled>Download plot (SVG)</button><button class="btn small" id="cv-csv" type="button" disabled>Download results (CSV)</button></div>
        </div>
        <div class="card stack">
          <h3>Redox events</h3>
          <div id="cv-out"><p class="hint">No data yet.</p></div>
          <p class="hint">Reversible couple: E<sub>1/2</sub> = (E<sub>pa</sub> + E<sub>pc</sub>)/2; Nernstian ΔE<sub>p</sub> ≈ 59/n mV at 25 °C and |i<sub>pc</sub>/i<sub>pa</sub>| ≈ 1.
          Irreversible wave: E<sub>p</sub> and E<sub>p/2</sub> (potential at half peak current) are reported; E<sub>p/2</sub> is the better estimate of the thermodynamic potential for photoredox comparisons
          (Roth, Romero, Nicewicz, ${RDB.doiLink("10.1055/s-0035-1561297")}; Elgrishi et al., J. Chem. Educ. 2018, ${RDB.doiLink("10.1021/acs.jchemed.7b00361")}).</p>
        </div>
      </div>
    </div>`;
    const $ = id => root.querySelector("#" + id);
    let table = null;

    root.querySelectorAll("input[name=cv-src]").forEach(r => r.addEventListener("change", () => {
      const img = root.querySelector("input[name=cv-src]:checked").value === "img";
      $("cv-file-box").hidden = img; $("cv-img-box").hidden = !img; $("cv-dig").hidden = !img;
    }));
    $("cv-ref").addEventListener("change", () => { $("cv-custom-wrap").hidden = $("cv-ref").value !== "custom"; analyse(); });
    ["cv-custom", "cv-fc", "cv-fcsolv", "cv-cycle", "cv-sens", "cv-n", "cv-conv"].forEach(id => $(id).addEventListener("input", analyse));
    ["cv-ecol", "cv-icol", "cv-eunit", "cv-iunit"].forEach(id => $(id).addEventListener("input", fromTable));

    $("cv-file").addEventListener("change", async () => {
      const f = $("cv-file").files[0];
      if (!f) return;
      table = RDB.parseNumericTable(await f.text());
      if (table.cols.length < 2) { $("cv-out").innerHTML = '<p class="err">Could not find two numeric columns in this file.</p>'; return; }
      const opts = table.headers.map((h, i) => `<option value="${i}">${esc(h)}</option>`).join("");
      $("cv-ecol").innerHTML = opts; $("cv-icol").innerHTML = opts;
      const find = re => table.headers.findIndex(h => re.test(h));
      let ei = find(/pot|^e\b|we\(1\)\.potential|ewe|volt|\(v\)|\/v|\bv\b/i), ii = find(/cur|^i\b|<i>|\(a\)|\/a|amp|µa|ua|ma\b/i);
      if (ei < 0) ei = 0;
      if (ii < 0 || ii === ei) ii = ei === 0 ? 1 : 0;
      $("cv-ecol").value = ei; $("cv-icol").value = ii;
      const eh = table.headers[ei] || "", ih = table.headers[ii] || "";
      $("cv-eunit").value = /mv/i.test(eh) ? "0.001" : "1";
      $("cv-iunit").value = /µa|ua|micro/i.test(ih) ? "1e-6" : /\bma\b|\(ma\)|\/ma/i.test(ih) ? "1e-3" : /na\b/i.test(ih) ? "1e-9" : "1";
      fromTable();
    });
    function fromTable() {
      if (!table) return;
      const E = table.cols[+$("cv-ecol").value].map(v => v * +$("cv-eunit").value);
      const I = table.cols[+$("cv-icol").value].map(v => v * +$("cv-iunit").value);
      load(E, I);
    }
    $("cv-demo").onclick = () => { table = null; const d = simulate(); load(d.E, d.I); };

    function load(E, I) {
      const keep = E.map((e, i) => isFinite(e) && isFinite(I[i]));
      cv = { E: E.filter((_, i) => keep[i]), I: I.filter((_, i) => keep[i]) };
      segments = splitSegments(cv.E);
      // cycles = consecutive pairs of segments
      const nCyc = Math.max(1, Math.floor(segments.length / 2));
      $("cv-cycle").innerHTML = `<option value="all">All data</option>` + Array.from({ length: nCyc }, (_, i) => `<option value="${i}"${i === Math.min(nCyc - 1, 1) && nCyc > 1 ? " selected" : ""}>Cycle ${i + 1}</option>`).join("");
      if (nCyc === 1) $("cv-cycle").value = "0";
      $("cv-svg").disabled = false; $("cv-csv").disabled = false;
      analyse();
    }

    function analyse() {
      if (!cv) return;
      const sign = $("cv-conv").value === "us" ? -1 : 1;
      const ref = $("cv-ref").value, cust = $("cv-custom").value;
      const fc = RDB.num($("cv-fc").value);
      const fcOff = Number($("cv-fcsolv").value);
      // E(vs SCE) of a measured potential
      const toSCE = e => fc != null ? (e - fc) + fcOff : RDB.toSCE(e, ref, cust);
      const cyc = $("cv-cycle").value;
      let segs = segments;
      if (cyc !== "all") segs = segments.slice(+cyc * 2, +cyc * 2 + 2);
      if (!segs.length) segs = segments;
      const I = cv.I.map(v => v * sign);
      const sens = Number($("cv-sens").value);
      const range = Math.max(...I) - Math.min(...I);
      const peaks = [];
      segs.forEach(s => {
        const e = cv.E.slice(s.from, s.to + 1), i = smooth(I.slice(s.from, s.to + 1), 7);
        findPeaks(e, i, s.dir, sens * range).forEach(p => peaks.push(p));
      });
      // pair anodic (on positive-going segments) with cathodic (negative-going) within 0.3 V
      const an = peaks.filter(p => p.type === "a"), ca = peaks.filter(p => p.type === "c");
      const used = new Set(), events = [];
      an.forEach(a => {
        let best = null;
        ca.forEach((c, k) => {
          if (used.has(k) || c.E > a.E + 0.02) return;
          const d = a.E - c.E;
          if (d < 0.3 && (!best || d < best.d)) best = { k, c, d };
        });
        if (best) { used.add(best.k); events.push({ kind: "rev", a, c: best.c }); }
        else events.push({ kind: "irr-ox", a });
      });
      ca.forEach((c, k) => { if (!used.has(k)) events.push({ kind: "irr-red", c }); });
      events.sort((x, y) => ((x.a || x.c).E) - ((y.a || y.c).E));
      const n = Math.max(1, +$("cv-n").value || 1);
      const rows = events.map(ev => {
        if (ev.kind === "rev") {
          const e12 = (ev.a.E + ev.c.E) / 2, dEp = (ev.a.E - ev.c.E) * 1000;
          const ratio = Math.abs(ev.c.ipCorr / ev.a.ipCorr);
          const quasi = dEp > 59 / n * 1.6 || ratio < 0.8 || ratio > 1.25;
          return { type: quasi ? "quasi-reversible" : "reversible", Epa: ev.a.E, Epc: ev.c.E, E12: e12, dEp, ratio, Ep2: null, value: e12, valueType: "E1/2" };
        }
        const p = ev.a || ev.c;
        return { type: ev.kind === "irr-ox" ? "irreversible oxidation" : "irreversible reduction", Epa: ev.a ? p.E : null, Epc: ev.c ? p.E : null, E12: null, dEp: null, ratio: null, Ep2: p.Ep2, value: p.Ep2 ?? p.E, valueType: p.Ep2 != null ? "Ep/2" : "Ep" };
      });
      rows.forEach(r => { r.sce = toSCE(r.value); r.kind = (r.Epa != null && r.Epc == null) || (r.type.includes("rev") && r.value > 0) ? "ox" : "red"; });
      // a reversible couple could be either; by position relative to rest potential (first point) decide
      const rest = cv.E[0];
      rows.forEach(r => { if (r.type.includes("reversible") && !r.type.startsWith("irr")) r.kind = r.value > rest ? "ox" : "red"; });
      lastPeaks = { rows, toSCE };
      drawPlot(segs, I, rows);
      const showRef = fc != null ? "Fc⁺/Fc → SCE" : (ref === "SCE" ? "SCE" : "→ SCE");
      $("cv-out").innerHTML = rows.length ? `<div class="table-wrap"><table><thead><tr><th>Event</th><th class="num">E<sub>pa</sub></th><th class="num">E<sub>pc</sub></th><th class="num">E<sub>1/2</sub></th><th class="num">E<sub>p/2</sub></th><th class="num">ΔE<sub>p</sub> (mV)</th><th class="num">|i<sub>pc</sub>/i<sub>pa</sub>|</th><th class="num">Value vs SCE</th><th></th></tr></thead><tbody>
        ${rows.map((r, k) => `<tr><td>${esc(r.type)}</td><td class="num">${fmt(r.Epa, 3)}</td><td class="num">${fmt(r.Epc, 3)}</td><td class="num">${fmt(r.E12, 3)}</td><td class="num">${fmt(r.Ep2, 3)}</td><td class="num">${r.dEp != null ? r.dEp.toFixed(0) : "—"}</td><td class="num">${r.ratio != null ? r.ratio.toFixed(2) : "—"}</td>
          <td class="num"><b>${fmt(r.sce, 2)}</b> <span class="hint">${r.valueType}</span></td>
          <td><button class="btn small" data-use="${k}">Use as E<sub>${r.kind}</sub></button></td></tr>`).join("")}
        </tbody></table></div><p class="hint">Measured potentials are in the units of the file (${esc(showRef)} conversion applied only in the last column).${fc != null ? " Ferrocene-referenced: E(SCE) = E − E<sub>1/2</sub>(Fc) + " + fcOff.toFixed(2) + " V." : ""}</p>` : '<p class="hint">No peaks found. Try a higher sensitivity or another cycle.</p>';
      $("cv-out").querySelectorAll("[data-use]").forEach(b => b.onclick = () => {
        const r = rows[+b.dataset.use];
        const key = r.kind === "ox" ? "eox" : "ered";
        sessionStorage.setItem("rdb-cv-" + key, r.sce.toFixed(3));
        location.hash = "#estar?" + key + "=" + r.sce.toFixed(3);
      });
    }

    function drawPlot(segs, I, rows) {
      const series = [];
      const all = $("cv-cycle").value === "all";
      (all ? [{ from: 0, to: cv.E.length - 1 }] : segs).forEach((s, k) => {
        series.push({ x: cv.E.slice(s.from, s.to + 1), y: I.slice(s.from, s.to + 1).map(v => v * 1e6), color: k % 2 ? "var(--accent)" : "var(--accent-2)" });
      });
      const vl = [];
      rows.forEach(r => {
        if (r.Epa != null) vl.push({ x: r.Epa, color: "var(--accent-2)", label: "Epa " + r.Epa.toFixed(2), row: vl.length % 3 });
        if (r.Epc != null) vl.push({ x: r.Epc, color: "var(--accent)", label: "Epc " + r.Epc.toFixed(2), row: vl.length % 3 });
      });
      RDBPlot.plot($("cv-plot"), { series, vlines: vl, xLabel: "E (V, as measured)", yLabel: "i (µA, oxidation positive)", height: 400 });
    }

    $("cv-svg").onclick = () => { const s = $("cv-plot").querySelector("svg"); if (s) RDB.download("cv.svg", RDBPlot.svgString(s), "image/svg+xml"); };
    $("cv-csv").onclick = () => {
      if (!lastPeaks) return;
      RDB.download("cv-results.csv", RDB.toCSV(lastPeaks.rows.map(r => ({ event: r.type, Epa: r.Epa, Epc: r.Epc, E12: r.E12, Ep2: r.Ep2, dEp_mV: r.dEp, ratio: r.ratio, value_vs_SCE: r.sce, value_type: r.valueType })),
        ["event", "Epa", "Epc", "E12", "Ep2", "dEp_mV", "ratio", "value_vs_SCE", "value_type"]), "text/csv");
    };

    initDigitiser(root, (E, I) => load(E, I));
  }

  // ---------- analysis helpers ----------
  function splitSegments(E) {
    const segs = [];
    if (E.length < 3) return [{ from: 0, to: E.length - 1, dir: 1 }];
    const span = Math.max(...E) - Math.min(...E);
    const tol = span * 0.01;
    let start = 0, dir = 0, ext = 0;
    for (let i = 1; i < E.length; i++) {
      const d = E[i] - E[ext];
      if (dir === 0) { if (Math.abs(d) > tol) { dir = Math.sign(d); ext = i; } continue; }
      if (Math.sign(d) === dir || d === 0) { if ((E[i] - E[ext]) * dir >= 0) ext = i; continue; }
      if (Math.abs(E[i] - E[ext]) > tol) { segs.push({ from: start, to: ext, dir }); start = ext; dir = -dir; ext = i; }
    }
    segs.push({ from: start, to: E.length - 1, dir: dir || 1 });
    return segs.filter(s => s.to - s.from > 4);
  }
  function smooth(y, w) {
    const h = Math.floor(w / 2);
    return y.map((_, i) => {
      let s = 0, n = 0;
      for (let k = Math.max(0, i - h); k <= Math.min(y.length - 1, i + h); k++) { s += y[k]; n++; }
      return s / n;
    });
  }
  /* Local baseline for a peak at index k: find the current minimum in the 0.4 V before the peak (in sweep
     order) and extrapolate a line fitted to the 80 mV preceding that minimum (capacitive/background slope). */
  function localBaseline(e, y, k) {
    let j0 = k;
    for (let j = k; j >= 0 && Math.abs(e[k] - e[j]) <= 0.4; j--) if (y[j] < y[j0]) j0 = j;
    const xs = [], ys = [];
    for (let j = j0; j >= 0 && Math.abs(e[j0] - e[j]) <= 0.08; j--) { xs.push(e[j]); ys.push(y[j]); }
    if (xs.length < 4) return () => y[j0];
    const { a, b } = linfit(xs, ys);
    // a background slope steeper than the rise to the peak would invert the peak: cap it
    const rise = (y[k] - y[j0]) / ((e[k] - e[j0]) || 1);
    const bb = Math.abs(b) > Math.abs(rise) * 0.5 ? 0 : b;
    return x => y[j0] + bb * (x - e[j0]);
  }
  /* Peaks on one sweep. dir>0: anodic maxima; dir<0: cathodic minima. ip and Ep/2 are corrected with a
     local baseline taken just before each peak. */
  function findPeaks(e, i, dir, minProm) {
    const out = [];
    const sgn = dir > 0 ? 1 : -1;
    const y = i.map(v => v * sgn);  // peaks are maxima of y
    const n = y.length;
    let base = null;
    for (let k = 2; k < n - 2; k++) {
      if (!(y[k] >= y[k - 1] && y[k] >= y[k + 1] && y[k] > y[k - 2] && y[k] >= y[k + 2])) continue;
      // prominence: drop on both sides before a higher point
      let lmin = y[k], rmin = y[k];
      for (let j = k - 1; j >= 0 && y[j] <= y[k]; j--) lmin = Math.min(lmin, y[j]);
      for (let j = k + 1; j < n && y[j] <= y[k]; j++) rmin = Math.min(rmin, y[j]);
      const prom = y[k] - Math.max(lmin, rmin);
      // a peak at the very end of the sweep (switching potential) is not a peak
      if (prom < minProm || k > n - 4) continue;
      base = localBaseline(e, y, k);
      const ip = y[k] - base(e[k]);
      if (ip <= 0) continue;
      // Ep/2: on the rising side, where corrected current = ip/2
      let ep2 = null;
      for (let j = k; j > 0; j--) {
        const c1 = y[j] - base(e[j]), c0 = y[j - 1] - base(e[j - 1]);
        if (c1 >= ip / 2 && c0 < ip / 2) { ep2 = e[j - 1] + (e[j] - e[j - 1]) * (ip / 2 - c0) / (c1 - c0 || 1); break; }
      }
      out.push({ type: dir > 0 ? "a" : "c", E: e[k], ip: y[k] * sgn, ipCorr: ip * sgn, Ep2: ep2 });
    }
    // keep the most prominent if two peaks are closer than 40 mV
    return out.filter((p, idx) => !out.some((q, j) => j !== idx && Math.abs(q.E - p.E) < 0.04 && Math.abs(q.ipCorr) > Math.abs(p.ipCorr)));
  }
  function linfit(x, y) {
    const n = x.length;
    const mx = x.reduce((s, v) => s + v, 0) / n, my = y.reduce((s, v) => s + v, 0) / n;
    let sxy = 0, sxx = 0;
    for (let k = 0; k < n; k++) { sxy += (x[k] - mx) * (y[k] - my); sxx += (x[k] - mx) ** 2; }
    const b = sxx ? sxy / sxx : 0;
    return { a: my - b * mx, b };
  }
  // Simulated example: one reversible couple at +0.45 V and one irreversible reduction at −1.6 V (vs SCE).
  function simulate() {
    const E = [], I = [];
    const pts = 600;
    const wave = (x, e0, w) => 1 / (1 + Math.exp(-(x - e0) / w));
    const peak = (x, e0, s) => Math.exp(-((x - e0) ** 2) / (2 * s * s));
    for (let c = 0; c < 2; c++) {
      for (let k = 0; k <= pts; k++) { const x = -0.2 + 1.2 * k / pts; E.push(x); I.push(1e-6 * (8 * peak(x, 0.48, 0.045) + 3 * wave(x, 0.50, 0.03) + 0.3 * x) + 2e-7 * (Math.random() - .5)); }
      for (let k = 0; k <= pts * 2; k++) { const x = 1.0 - 2.9 * k / (pts * 2); E.push(x); I.push(1e-6 * (-7.6 * peak(x, 0.42, 0.045) + 3 * wave(x, 0.50, 0.03) * (x > 0.2 ? 1 : 0.2) - 9 * peak(x, -1.62, 0.07) - 3 * wave(-x, 1.66, 0.05) + 0.3 * x - 0.6) + 2e-7 * (Math.random() - .5)); }
      for (let k = 0; k <= pts; k++) { const x = -1.9 + 1.7 * k / pts; E.push(x); I.push(1e-6 * (-3 * wave(-x, 1.66, 0.05) * (1 - k / pts) + 0.3 * x - 0.3) + 2e-7 * (Math.random() - .5)); }
    }
    return { E, I };
  }

  // ---------- image digitiser ----------
  function initDigitiser(root, onTrace) {
    const $ = id => root.querySelector("#" + id);
    const cvs = $("dg-canvas"), ctx = cvs.getContext("2d", { willReadFrequently: true });
    let img = null, clicks = [], color = null;
    const steps = ["Click a first point on the x axis (enter its value in x₁)", "Click a second point on the x axis (x₂)", "Click a first point on the y axis (y₁)", "Click a second point on the y axis (y₂)", "Click on the curve to pick its colour", "Trace extracted — adjust the tolerance or restart"];
    const stepEl = $("dg-step");
    const setStep = () => { stepEl.textContent = img ? steps[Math.min(clicks.length + (color ? 1 : 0), 5)] : ""; };
    $("cv-img").addEventListener("change", () => {
      const f = $("cv-img").files[0];
      if (!f) return;
      const im = new Image();
      im.onload = () => { img = im; cvs.width = im.naturalWidth; cvs.height = im.naturalHeight; clicks = []; color = null; redraw(); setStep(); };
      im.src = URL.createObjectURL(f);
    });
    $("dg-reset").onclick = () => { clicks = []; color = null; redraw(); setStep(); };
    $("dg-tol").addEventListener("input", () => { if (color) trace(); });
    ["dg-x1", "dg-x2", "dg-y1", "dg-y2"].forEach(id => $(id).addEventListener("input", () => { if (color) trace(); }));
    cvs.addEventListener("click", ev => {
      if (!img) return;
      const r = cvs.getBoundingClientRect();
      const x = (ev.clientX - r.left) * cvs.width / r.width, y = (ev.clientY - r.top) * cvs.height / r.height;
      if (clicks.length < 4) { clicks.push({ x, y }); redraw(); setStep(); return; }
      redraw(true);
      const d = ctx.getImageData(Math.round(x), Math.round(y), 1, 1).data;
      color = [d[0], d[1], d[2]];
      trace();
    });
    function redraw(clean) {
      if (!img) return;
      ctx.drawImage(img, 0, 0);
      if (clean) return;
      ctx.lineWidth = Math.max(2, cvs.width / 400);
      clicks.forEach((c, k) => {
        ctx.strokeStyle = k < 2 ? "#d8463b" : "#3b4fd8";
        ctx.beginPath(); ctx.arc(c.x, c.y, 8, 0, 7); ctx.stroke();
        ctx.fillStyle = ctx.strokeStyle; ctx.font = `${Math.max(14, cvs.width / 60)}px sans-serif`;
        ctx.fillText(["x₁", "x₂", "y₁", "y₂"][k], c.x + 10, c.y - 10);
      });
    }
    function trace() {
      const x1 = RDB.num($("dg-x1").value), x2 = RDB.num($("dg-x2").value), y1 = RDB.num($("dg-y1").value), y2 = RDB.num($("dg-y2").value);
      if ([x1, x2, y1, y2].some(v => v == null) || clicks.length < 4) { stepEl.textContent = "Enter x₁, x₂, y₁, y₂ values first."; return; }
      redraw(true);
      const W = cvs.width, H = cvs.height;
      const data = ctx.getImageData(0, 0, W, H).data;
      const tol = Number($("dg-tol").value);
      const match = (px) => Math.hypot(data[px] - color[0], data[px + 1] - color[1], data[px + 2] - color[2]) < tol;
      // pixel → value (linear axes; calibration points may be anywhere)
      const ex = (clicks[1].x - clicks[0].x) || 1, ey = (clicks[3].y - clicks[2].y) || 1;
      const toE = px => x1 + (px - clicks[0].x) * (x2 - x1) / ex;
      const toI = py => (y1 + (py - clicks[2].y) * (y2 - y1) / ey) * 1e-6;
      const upper = [], lower = [];
      for (let x = 0; x < W; x++) {
        let top = -1, bot = -1;
        for (let y = 0; y < H; y++) if (match((y * W + x) * 4)) { if (top < 0) top = y; bot = y; }
        if (top < 0) continue;
        upper.push([x, top]); lower.push([x, bot]);
      }
      if (upper.length < 10) { stepEl.textContent = "Too few pixels match this colour — raise the tolerance or click exactly on the line."; return; }
      // In image coordinates smaller y = higher current. With IUPAC plots the upper branch is the forward (oxidative) sweep.
      ctx.fillStyle = "rgba(216,70,59,.9)"; upper.forEach(p => ctx.fillRect(p[0], p[1], 2, 2));
      ctx.fillStyle = "rgba(59,79,216,.9)"; lower.forEach(p => ctx.fillRect(p[0], p[1], 2, 2));
      const E = [], I = [];
      const leftToRight = toE(W) > toE(0);
      const up = leftToRight ? upper : upper.slice().reverse();
      const lo = leftToRight ? lower.slice().reverse() : lower;
      up.forEach(p => { E.push(toE(p[0])); I.push(toI(p[1])); });
      lo.forEach(p => { E.push(toE(p[0])); I.push(toI(p[1])); });
      stepEl.textContent = steps[5];
      onTrace(E, I);
    }
  }

  window.RDBCV = { render, splitSegments, findPeaks };
})();
