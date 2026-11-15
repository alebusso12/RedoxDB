/* RedoxDB — Tools: reference-electrode converter, energy/units, Stern–Volmer analysis, Randles–Ševčík.
   (The E* calculator and the CV reader live in estar.js and cv.js and share the Tools sub-navigation.) */
(function () {
  "use strict";
  const { esc, num, doiLink } = RDB;
  const HC = 1239.84, KCAL = 23.0605, KJ = 96.4853, CM = 8065.54, NA = 6.02214e23, H = 6.62607e-34, C = 2.99792e8;

  const TOOLS = [
    ["estar", "E* calculator"], ["cv", "CV reader"], ["ref", "Reference converter"],
    ["units", "Energy & photons"], ["sv", "Stern–Volmer"], ["rs", "Randles–Ševčík"]
  ];
  function subnav(active) {
    return `<nav class="subnav" aria-label="Tools">${TOOLS.map(([id, t]) => `<a href="#${id}" class="${id === active ? "active" : ""}">${t}</a>`).join("")}</nav>`;
  }

  /* Paste two (or three) columns of numbers → arrays. */
  function parsePairs(text) {
    const t = RDB.parseNumericTable(text || "");
    return t.cols.length >= 2 ? t.cols : null;
  }
  function linfit(x, y, through0) {
    const n = x.length;
    if (through0) {
      let sxy = 0, sxx = 0;
      for (let i = 0; i < n; i++) { sxy += x[i] * y[i]; sxx += x[i] * x[i]; }
      const b = sxy / sxx;
      return finish(0, b);
    }
    const mx = x.reduce((a, v) => a + v, 0) / n, my = y.reduce((a, v) => a + v, 0) / n;
    let sxy = 0, sxx = 0;
    for (let i = 0; i < n; i++) { sxy += (x[i] - mx) * (y[i] - my); sxx += (x[i] - mx) ** 2; }
    const b = sxy / sxx;
    return finish(my - b * mx, b);
    function finish(a, b) {
      const my2 = y.reduce((s, v) => s + v, 0) / n;
      let ssr = 0, sst = 0;
      for (let i = 0; i < n; i++) { ssr += (y[i] - (a + b * x[i])) ** 2; sst += (y[i] - my2) ** 2; }
      const se = n > 2 ? Math.sqrt(ssr / (n - 2) / x.reduce((s, v) => s + (v - x.reduce((q, w) => q + w, 0) / n) ** 2, 0)) : NaN;
      return { a, b, r2: 1 - ssr / sst, seB: se };
    }
  }
  const sig = (v, d = 3) => (v == null || !isFinite(v)) ? "—" : Math.abs(v) >= 1e4 || (Math.abs(v) < 1e-2 && v !== 0) ? v.toExponential(d - 1) : (+v.toPrecision(d)).toString();

  // ------------------------------------------------------------------ reference converter
  // Offsets to SCE in MeCN unless stated (Pavlishchuk & Addison 2000; Connelly & Geiger 1996).
  const REFS = [
    { id: "SCE", t: "SCE (sat. KCl)", o: 0 },
    { id: "SHE", t: "SHE / NHE", o: -0.241 },
    { id: "AgCl_sat", t: "Ag/AgCl (sat. KCl)", o: -0.045 },
    { id: "AgCl_3M", t: "Ag/AgCl (3 M KCl)", o: -0.032 },
    { id: "AgCl_1M", t: "Ag/AgCl (1 M KCl)", o: 0.000 },
    { id: "Ag001", t: "Ag/Ag⁺ (0.01 M AgNO₃, MeCN)", o: 0.298 },
    { id: "Ag01", t: "Ag/Ag⁺ (0.1 M AgNO₃, MeCN) ≈", o: 0.36 },
    { id: "Fc_MeCN", t: "Fc⁺/Fc in MeCN", o: 0.38 },
    { id: "Fc_DMF", t: "Fc⁺/Fc in DMF", o: 0.45 },
    { id: "Fc_DCM", t: "Fc⁺/Fc in CH₂Cl₂", o: 0.46 },
    { id: "Fc_THF", t: "Fc⁺/Fc in THF", o: 0.56 },
    { id: "Fc_DMSO", t: "Fc⁺/Fc in DMSO", o: 0.43 },
    { id: "DmFc_MeCN", t: "Me₁₀Fc⁺/Me₁₀Fc in MeCN (≈ −0.51 V vs Fc)", o: -0.13 },
    { id: "custom", t: "Custom (enter offset to SCE)", o: 0 }
  ];
  function renderRef(el) {
    const opts = sel => REFS.map(r => `<option value="${r.id}"${r.id === sel ? " selected" : ""}>${esc(r.t)}</option>`).join("");
    el.innerHTML = subnav("ref") + `
      <div class="split">
        <div class="card stack">
          <h2>Reference electrode converter</h2>
          <label class="field">Potential(s) to convert, V — one per line or comma separated<textarea id="rf-in" rows="4">-1.33</textarea></label>
          <label class="field">Measured vs<select id="rf-from">${opts("Fc_MeCN")}</select></label>
          <label class="field" id="rf-cf-w" hidden>Offset of your reference: E(SCE) = E(ref) + <input id="rf-cf" type="number" step="0.001" value="0"></label>
          <label class="field">Convert to<select id="rf-to">${opts("SCE")}</select></label>
          <label class="field" id="rf-ct-w" hidden>Offset of target reference: E(SCE) = E(ref) + <input id="rf-ct" type="number" step="0.001" value="0"></label>
          <h3>Internal standard (pseudo-reference)</h3>
          <p class="hint">Measured against an Ag wire or another pseudo-reference with ferrocene in the solution? Enter E½(Fc⁺/Fc) from the same scan and choose the solvent: values are first referenced to Fc⁺/Fc, then converted.</p>
          <div class="grid c2">
            <label class="field">E½(Fc⁺/Fc) measured, V<input id="rf-fc" type="number" step="0.001" placeholder="e.g. 0.215"></label>
            <label class="field">Solvent<select id="rf-fcs"><option value="Fc_MeCN">MeCN</option><option value="Fc_DMF">DMF</option><option value="Fc_DCM">CH₂Cl₂</option><option value="Fc_THF">THF</option><option value="Fc_DMSO">DMSO</option></select></label>
          </div>
        </div>
        <div class="card stack">
          <h3>Result</h3>
          <div id="rf-out"></div>
          <div id="rf-all"></div>
          <p class="hint">Offsets are for 25 °C and, for non-aqueous references, acetonitrile unless stated. Liquid-junction potentials make conversions between aqueous and non-aqueous references uncertain by ±0.02–0.05 V; internal ferrocene is the most reliable route. Sources: Pavlishchuk &amp; Addison, Inorg. Chim. Acta 2000 (${doiLink("10.1016/S0020-1693(99)00407-7")}); Connelly &amp; Geiger, Chem. Rev. 1996 (${doiLink("10.1021/cr940053x")}); Aranzaes, Daniel &amp; Astruc 2006 for decamethylferrocene (${doiLink("10.1139/v05-262")}).</p>
        </div>
      </div>`;
    const $ = id => el.querySelector("#" + id);
    const off = (id, cust) => id === "custom" ? (num(cust) || 0) : REFS.find(r => r.id === id).o;
    const run = () => {
      $("rf-cf-w").hidden = $("rf-from").value !== "custom";
      $("rf-ct-w").hidden = $("rf-to").value !== "custom";
      const vals = $("rf-in").value.split(/[\s,;]+/).map(s => s.replace("−", "-")).filter(Boolean).map(Number).filter(v => isFinite(v));
      const fc = num($("rf-fc").value);
      const toSCE = v => fc != null ? (v - fc) + off($("rf-fcs").value) : v + off($("rf-from").value, $("rf-cf").value);
      const fromSCE = v => v - off($("rf-to").value, $("rf-ct").value);
      const toName = REFS.find(r => r.id === $("rf-to").value).t;
      const fmt = v => (v > 0 ? "+" : "") + v.toFixed(3) + " V";
      $("rf-out").innerHTML = vals.length ? `<div class="table-wrap"><table><thead><tr><th class="num">Input</th><th class="num">vs SCE</th><th class="num">vs ${esc(toName)}</th></tr></thead><tbody>
        ${vals.map(v => `<tr><td class="num">${fmt(v)}</td><td class="num">${fmt(toSCE(v))}</td><td class="num"><b>${fmt(fromSCE(toSCE(v)))}</b></td></tr>`).join("")}</tbody></table></div>
        <p class="hint">${fc != null ? `E(vs Fc⁺/Fc) = E − ${fc.toFixed(3)} V, then + ${off($("rf-fcs").value).toFixed(3)} V to SCE.` : `E(SCE) = E + ${off($("rf-from").value, $("rf-cf").value).toFixed(3)} V.`}</p>` : '<p class="hint">Enter at least one number.</p>';
      if (vals.length) {
        const v = toSCE(vals[0]);
        $("rf-all").innerHTML = `<h4>${fmt(vals[0])} on every scale</h4><div class="table-wrap"><table><tbody>${REFS.filter(r => r.id !== "custom").map(r => `<tr><td>${esc(r.t)}</td><td class="num">${fmt(v - r.o)}</td></tr>`).join("")}</tbody></table></div>`;
      } else $("rf-all").innerHTML = "";
    };
    ["rf-in", "rf-from", "rf-to", "rf-cf", "rf-ct", "rf-fc", "rf-fcs"].forEach(id => $(id).addEventListener("input", run));
    run();
  }

  // ------------------------------------------------------------------ energy and photons
  function renderUnits(el) {
    el.innerHTML = subnav("units") + `
      <div class="grid c2">
        <div class="card stack">
          <h2>Photon energy</h2>
          <p class="hint">Type in any field; the others update. E (eV) = 1239.84 / λ (nm).</p>
          <div class="grid c2">
            <label class="field">Wavelength (nm)<input id="u-nm" type="number" step="any" value="450"></label>
            <label class="field">Energy (eV)<input id="u-ev" type="number" step="any"></label>
            <label class="field">kcal/mol<input id="u-kcal" type="number" step="any"></label>
            <label class="field">kJ/mol<input id="u-kj" type="number" step="any"></label>
            <label class="field">Wavenumber (cm⁻¹)<input id="u-cm" type="number" step="any"></label>
            <label class="field">Frequency (THz)<input id="u-thz" type="number" step="any"></label>
          </div>
          <p class="hint" id="u-col"></p>
        </div>
        <div class="card stack">
          <h2>Potential difference ↔ free energy</h2>
          <p class="hint">ΔG = −n F ΔE. For one electron, 1 V ≙ 1 eV = 23.06 kcal/mol = 96.49 kJ/mol.</p>
          <div class="grid c3">
            <label class="field">ΔE (V)<input id="g-v" type="number" step="any" value="0.25"></label>
            <label class="field">Electrons n<input id="g-n" type="number" step="1" value="1"></label>
            <div id="g-out" class="result"></div>
          </div>
          <p class="hint" id="g-k"></p>
        </div>
        <div class="card stack">
          <h2>Light source → photon flux</h2>
          <p class="hint">How many photons per second does your LED deliver? q = P λ / (h c N_A) (einstein s⁻¹). Use the optical power reaching the sample (measured with a power meter), not the electrical power of the LED.</p>
          <div class="grid c3">
            <label class="field">Optical power (mW)<input id="p-mw" type="number" step="any" value="100"></label>
            <label class="field">Wavelength (nm)<input id="p-nm" type="number" step="any" value="450"></label>
            <label class="field">Irradiation time (h)<input id="p-h" type="number" step="any" value="1"></label>
          </div>
          <div id="p-out"></div>
        </div>
        <div class="card stack">
          <h2>Diffusion limit</h2>
          <p class="hint">Upper bound for bimolecular quenching constants: k_diff = 8RT / (3η) (Stokes–Einstein–Smoluchowski, equal-sized neutral partners).</p>
          <div class="grid c2">
            <label class="field">Solvent<select id="d-s"><option value="0.341">MeCN (0.341 mPa·s)</option><option value="0.794">DMF (0.794)</option><option value="1.99">DMSO (1.99)</option><option value="0.413">CH₂Cl₂ (0.413)</option><option value="0.544">MeOH (0.544)</option><option value="0.890">H₂O (0.890)</option><option value="0.456">THF (0.456)</option><option value="0.306">acetone (0.306)</option><option value="0.560">toluene (0.560)</option></select></label>
            <label class="field">Temperature (°C)<input id="d-t" type="number" step="1" value="25"></label>
          </div>
          <div id="d-out" class="result"></div>
        </div>
      </div>`;
    const $ = id => el.querySelector("#" + id);
    const set = (src) => {
      let ev = null;
      const v = num($(src).value);
      if (v == null || v <= 0) return;
      if (src === "u-nm") ev = HC / v; else if (src === "u-ev") ev = v; else if (src === "u-kcal") ev = v / KCAL;
      else if (src === "u-kj") ev = v / KJ; else if (src === "u-cm") ev = v / CM; else if (src === "u-thz") ev = v * 1e12 * H / 1.602177e-19;
      const vals = { "u-nm": HC / ev, "u-ev": ev, "u-kcal": ev * KCAL, "u-kj": ev * KJ, "u-cm": ev * CM, "u-thz": ev * 1.602177e-19 / H / 1e12 };
      Object.entries(vals).forEach(([k, x]) => { if (k !== src) $(k).value = +x.toPrecision(5); });
      const nm = HC / ev;
      const col = nm < 380 ? "UV" : nm < 450 ? "violet/blue" : nm < 495 ? "blue" : nm < 570 ? "green" : nm < 590 ? "yellow" : nm < 620 ? "orange" : nm < 750 ? "red" : "near-IR";
      $("u-col").textContent = `${col} light. A photocatalyst absorbing here can use at most ${ev.toFixed(2)} eV of redox power (E*ox = E_ox − E₀,₀, E*red = E_red + E₀,₀).`;
    };
    ["u-nm", "u-ev", "u-kcal", "u-kj", "u-cm", "u-thz"].forEach(id => $(id).addEventListener("input", () => set(id)));
    set("u-nm");
    const g = () => {
      const v = num($("g-v").value) || 0, n = num($("g-n").value) || 1, ev = -n * v;
      $("g-out").innerHTML = `ΔG = <b>${ev.toFixed(3)} eV</b> = ${(ev * KCAL).toFixed(2)} kcal/mol = ${(ev * KJ).toFixed(1)} kJ/mol`;
      $("g-k").textContent = `Equilibrium constant at 25 °C: K = exp(−ΔG/RT) = ${sig(Math.exp(-ev * KJ * 1000 / (8.314 * 298.15)))}`;
    };
    ["g-v", "g-n"].forEach(id => $(id).addEventListener("input", g)); g();
    const p = () => {
      const P = (num($("p-mw").value) || 0) / 1000, l = (num($("p-nm").value) || 450) * 1e-9, h = num($("p-h").value) || 0;
      const q = P * l / (H * C) / NA;
      $("p-out").innerHTML = `<div class="kpis"><div class="kpi"><div class="lab">photon flux</div><div class="val">${sig(q)} einstein/s</div></div>
        <div class="kpi"><div class="lab">photons per second</div><div class="val">${sig(q * NA)}</div></div>
        <div class="kpi"><div class="lab">in ${h} h</div><div class="val">${sig(q * 3600 * h * 1000)} mmol photons</div></div></div>
        <p class="hint">Compare with the moles of product to estimate an upper-bound quantum yield (only part of the light is absorbed: measure Φ by actinometry for real values).</p>`;
    };
    ["p-mw", "p-nm", "p-h"].forEach(id => $(id).addEventListener("input", p)); p();
    const d = () => {
      const eta = Number($("d-s").value) * 1e-3, T = (num($("d-t").value) ?? 25) + 273.15;
      const k = 8 * 8.314 * T / (3 * eta) * 1000;
      $("d-out").innerHTML = `k_diff ≈ <b>${sig(k)} M⁻¹ s⁻¹</b>`;
    };
    ["d-s", "d-t"].forEach(id => $(id).addEventListener("input", d)); d();
  }

  // ------------------------------------------------------------------ Stern–Volmer
  function renderSV(el) {
    el.innerHTML = subnav("sv") + `
      <div class="split">
        <div class="card stack">
          <h2>Stern–Volmer analysis</h2>
          <p class="hint">Paste two columns: quencher concentration and either I₀/I (or τ₀/τ), or raw intensities (choose below; the first row must then be [Q] = 0).</p>
          <label class="field">Data<textarea id="sv-in" rows="8">0	1.00
0.005	1.31
0.010	1.62
0.020	2.21
0.040	3.45</textarea></label>
          <div class="grid c2">
            <label class="field">[Q] unit<select id="sv-u"><option value="1">M</option><option value="1e-3">mM</option></select></label>
            <label class="field">Second column is<select id="sv-y"><option value="ratio">I₀/I or τ₀/τ</option><option value="raw">raw intensity I</option></select></label>
            <label class="field">Unquenched lifetime τ₀ (ns)<input id="sv-tau" type="number" step="any" value="1100"></label>
            <label class="field">Solvent (diffusion limit)<select id="sv-s"><option value="0.341">MeCN</option><option value="0.794">DMF</option><option value="1.99">DMSO</option><option value="0.413">CH₂Cl₂</option><option value="0.544">MeOH</option><option value="0.890">H₂O</option></select></label>
          </div>
          <label class="check"><input id="sv-0" type="checkbox" checked> Force intercept to 1</label>
        </div>
        <div class="card stack">
          <div id="sv-plot"></div>
          <div id="sv-out"></div>
          <p class="hint">I₀/I = τ₀/τ = 1 + K_SV[Q], K_SV = k_q τ₀. Intensity data include static quenching (ground-state complexes); lifetime data show only dynamic quenching — if the two slopes differ, there is static quenching. Upward curvature also indicates combined static + dynamic quenching. Measure every reaction component as a potential quencher.</p>
        </div>
      </div>`;
    const $ = id => el.querySelector("#" + id);
    const run = () => {
      const cols = parsePairs($("sv-in").value);
      if (!cols) { $("sv-out").innerHTML = '<p class="err">Paste at least two numeric columns.</p>'; return; }
      let x = cols[0].map(v => v * Number($("sv-u").value)), y = cols[1].slice();
      if ($("sv-y").value === "raw") { const i0 = y[x.indexOf(Math.min(...x))]; y = y.map(v => i0 / v); }
      const force = $("sv-0").checked;
      const fit = force ? linfit(x, y.map(v => v - 1), true) : linfit(x, y, false);
      const intercept = force ? 1 : fit.a;
      const K = fit.b, tau = (num($("sv-tau").value) || 0) * 1e-9;
      const kq = tau ? K / tau : null;
      const kd = 8 * 8.314 * 298.15 / (3 * Number($("sv-s").value) * 1e-3) * 1000;
      const xs = [0, Math.max(...x)];
      RDBPlot.plot($("sv-plot"), {
        series: [{ x, y, type: "points", color: "var(--accent)", r: 4 }, { x: xs, y: xs.map(v => intercept + K * v), color: "var(--accent-2)", label: "fit" }],
        xLabel: "[Q] (M)", yLabel: "I₀/I", height: 300
      });
      $("sv-out").innerHTML = `<div class="kpis">
        <div class="kpi"><div class="lab">K_SV</div><div class="val">${sig(K)} M⁻¹</div></div>
        <div class="kpi"><div class="lab">intercept</div><div class="val">${intercept.toFixed(3)}</div></div>
        <div class="kpi"><div class="lab">R²</div><div class="val">${fit.r2.toFixed(4)}</div></div>
        <div class="kpi"><div class="lab">k_q = K_SV/τ₀</div><div class="val">${kq ? sig(kq) + " M⁻¹s⁻¹" : "—"}</div></div>
        <div class="kpi"><div class="lab">k_q / k_diff</div><div class="val">${kq ? sig(kq / kd, 2) : "—"}</div></div></div>
        <p class="hint">${kq ? (kq > 1.5 * kd ? "k_q exceeds the diffusion limit: static quenching or pre-association is likely." : kq > 0.3 * kd ? "Near-diffusion-controlled quenching: efficient electron (or energy) transfer." : "Quenching slower than diffusion: the transfer is slow or only weakly exergonic.") + ` Half of PC* is quenched at [Q] = 1/K_SV = ${sig(1 / K)} M.` : "Enter τ₀ to obtain k_q."}</p>`;
    };
    ["sv-in", "sv-u", "sv-y", "sv-tau", "sv-s", "sv-0"].forEach(id => $(id).addEventListener("input", run));
    run();
  }

  // ------------------------------------------------------------------ Randles–Ševčík
  function renderRS(el) {
    el.innerHTML = subnav("rs") + `
      <div class="split">
        <div class="card stack">
          <h2>Scan-rate study (Randles–Ševčík)</h2>
          <p class="hint">Paste scan rate (mV/s) and peak current (µA). The tool checks whether the species is freely diffusing (i_p ∝ v^½) and computes the diffusion coefficient.</p>
          <label class="field">Data<textarea id="rs-in" rows="7">25	12.1
50	17.0
100	24.3
200	34.0
400	48.6</textarea></label>
          <div class="grid c2">
            <label class="field">Electrons n<input id="rs-n" type="number" value="1" step="1"></label>
            <label class="field">Concentration (mM)<input id="rs-c" type="number" value="1" step="any"></label>
            <label class="field">Electrode diameter (mm)<input id="rs-d" type="number" value="3" step="any"></label>
            <label class="field">Temperature (°C)<input id="rs-t" type="number" value="25" step="1"></label>
          </div>
        </div>
        <div class="card stack">
          <div class="grid c2"><div id="rs-p1"></div><div id="rs-p2"></div></div>
          <div id="rs-out"></div>
          <p class="hint">i_p = 0.446 n F A C (n F v D / RT)^½ (reversible, freely diffusing species). Slope of log i_p vs log v: 0.5 for diffusion, 1 for an adsorbed species. Elgrishi et al., ${doiLink("10.1021/acs.jchemed.7b00361")}.</p>
        </div>
      </div>`;
    const $ = id => el.querySelector("#" + id);
    const run = () => {
      const cols = parsePairs($("rs-in").value);
      if (!cols) { $("rs-out").innerHTML = '<p class="err">Paste two numeric columns.</p>'; return; }
      const v = cols[0].map(x => x / 1000), ip = cols[1].map(x => x * 1e-6);
      const sq = v.map(Math.sqrt);
      const f1 = linfit(sq, ip, false);
      const f2 = linfit(v.map(Math.log10), ip.map(x => Math.log10(Math.abs(x))), false);
      const n = num($("rs-n").value) || 1, Cc = (num($("rs-c").value) || 1) * 1e-6, d = (num($("rs-d").value) || 3) / 10, T = (num($("rs-t").value) ?? 25) + 273.15;
      const A = Math.PI * (d / 2) ** 2, F = 96485, R = 8.314;
      // slope = 0.446 n F A C sqrt(n F D / RT)  →  D = (slope / (0.446 n F A C))² RT / (n F)
      const D = (f1.b / (0.446 * n * F * A * Cc)) ** 2 * R * T / (n * F);
      RDBPlot.plot($("rs-p1"), { series: [{ x: sq, y: ip.map(x => x * 1e6), type: "points", r: 4, color: "var(--accent)" }, { x: [0, Math.max(...sq)], y: [f1.a * 1e6, (f1.a + f1.b * Math.max(...sq)) * 1e6], color: "var(--accent-2)" }], xLabel: "v^½ (V^½ s^-½)", yLabel: "i_p (µA)", height: 240, legend: false });
      RDBPlot.plot($("rs-p2"), { series: [{ x: v.map(Math.log10), y: ip.map(x => Math.log10(Math.abs(x))), type: "points", r: 4, color: "var(--accent)" }], xLabel: "log v", yLabel: "log i_p", height: 240, legend: false });
      $("rs-out").innerHTML = `<div class="kpis">
        <div class="kpi"><div class="lab">i_p vs v^½: R²</div><div class="val">${f1.r2.toFixed(4)}</div></div>
        <div class="kpi"><div class="lab">slope log i_p / log v</div><div class="val">${f2.b.toFixed(2)}</div></div>
        <div class="kpi"><div class="lab">D</div><div class="val">${sig(D)} cm² s⁻¹</div></div>
        <div class="kpi"><div class="lab">electrode area</div><div class="val">${sig(A)} cm²</div></div></div>
        <p class="hint">${Math.abs(f2.b - 0.5) < 0.1 ? "Slope ≈ 0.5: diffusion-controlled, freely diffusing species." : f2.b > 0.8 ? "Slope close to 1: adsorption on the electrode is likely — polish and do a rinse test." : "Intermediate slope: mixed behaviour, coupled chemistry or ohmic drop."} Typical D for small molecules in MeCN: 1–3 × 10⁻⁵ cm² s⁻¹.</p>`;
    };
    ["rs-in", "rs-n", "rs-c", "rs-d", "rs-t"].forEach(id => $(id).addEventListener("input", run));
    run();
  }

  window.RDBTools = { subnav, renderRef, renderUnits, renderSV, renderRS, TOOLS };
})();
