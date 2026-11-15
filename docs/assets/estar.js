/* RedoxDB — Excited-state potential calculator, E0,0 from spectra, quenching ΔG (Rehm–Weller). */
(function () {
  "use strict";
  const { esc, fmt, fmtV, num } = RDB;
  const HC = 1239.84; // eV·nm
  const F_KCAL = 23.061; // kcal mol⁻¹ eV⁻¹

  // Dielectric constants (25 °C) for the Coulomb term.
  const SOLVENTS = [
    ["MeCN", 37.5], ["DMF", 36.7], ["DMSO", 46.7], ["CH2Cl2", 8.93], ["MeOH", 32.7], ["H2O", 78.4],
    ["acetone", 20.7], ["THF", 7.58], ["DCE", 10.4], ["toluene", 2.38], ["benzene", 2.27]
  ];

  let mols = [];

  function render(root, molecules) {
    mols = molecules;
    const pcs = mols.filter(m => m.category === "photocatalyst").sort((a, b) => a.name.localeCompare(b.name));
    root.innerHTML = `
    <div class="split">
      <div class="card stack">
        <h2>Excited-state potentials</h2>
        <label class="field">Start from a database catalyst (optional)
          <select id="es-pick"><option value="">— enter your own data —</option>${pcs.map(m => `<option value="${m.id}">${esc(m.name)}</option>`).join("")}</select></label>
        <label class="field">Reference electrode of your data<select id="es-ref">${RDB.refOptions("SCE")}</select></label>
        <label class="field" id="es-custom-wrap" hidden>Offset: E(vs SCE) = E(vs ref) + <input id="es-custom" type="number" step="0.001" value="0"></label>
        <div class="grid c2">
          <label class="field">E<sub>ox</sub> = E(PC<sup>•+</sup>/PC), V<input id="es-eox" type="number" step="0.01" placeholder="e.g. 0.77"></label>
          <label class="field">E<sub>red</sub> = E(PC/PC<sup>•−</sup>), V<input id="es-ered" type="number" step="0.01" placeholder="e.g. −1.33"></label>
        </div>
        <h3>E<sub>0,0</sub></h3>
        <label class="field">How do you know E<sub>0,0</sub>?<select id="es-e00mode">
          <option value="ev">I have it in eV</option>
          <option value="cross">λ where normalised absorption and emission cross (nm)</option>
          <option value="em77">Emission maximum at 77 K / highest-energy vibronic band (nm)</option>
          <option value="onset">Emission onset, 10% of max on the blue edge (nm)</option>
          <option value="em">Room-temperature emission maximum (nm) — rough</option>
          <option value="spectra">Upload absorption + emission spectra</option>
          <option value="kcal">Triplet / singlet energy in kcal/mol</option>
        </select></label>
        <label class="field" id="es-e00-wrap"><span id="es-e00-lab">E<sub>0,0</sub> (eV)</span><input id="es-e00" type="number" step="0.01" placeholder="e.g. 2.76"></label>
        <div id="es-spec-wrap" class="stack" hidden>
          <label class="field">Absorption spectrum (wavelength, absorbance)<input id="es-abs" type="file" accept=".csv,.txt,.tsv,.dat"></label>
          <label class="field">Emission spectrum (wavelength, intensity)<input id="es-em" type="file" accept=".csv,.txt,.tsv,.dat"></label>
          <p class="hint">Both are normalised to their lowest-energy maximum; the crossing between the two maxima gives E<sub>0,0</sub> = hc/λ<sub>cross</sub>.</p>
        </div>
        <label class="field">Excited state<select id="es-state"><option>S1</option><option>T1</option><option>MLCT (T1)</option><option>other</option></select></label>
        <p class="hint">Use E<sub>0,0</sub> of the state that reacts: long-lived triplets (Ir, Ru, Cu, 4CzIPN delayed) usually react from T<sub>1</sub>; singlets only if τ is long enough for bimolecular quenching.</p>
      </div>

      <div class="stack">
        <div class="card stack">
          <h3>Result</h3>
          <div class="kpis" id="es-out"></div>
          <div class="formula" id="es-formula"></div>
          <div id="es-plot"></div>
          <div id="es-near"></div>
        </div>
        <div class="card stack">
          <h3>Will it quench? (ΔG of photoinduced electron transfer)</h3>
          <div class="grid c3">
            <label class="field">Quencher from database<select id="q-pick"><option value="">— or type values —</option>${mols.filter(m => m.category === "substrate").sort((a, b) => a.name.localeCompare(b.name)).map(m => `<option value="${m.id}">${esc(m.name)}</option>`).join("")}</select></label>
            <label class="field">Quencher E<sub>ox</sub> (V vs SCE)<input id="q-eox" type="number" step="0.01"></label>
            <label class="field">Quencher E<sub>red</sub> (V vs SCE)<input id="q-ered" type="number" step="0.01"></label>
          </div>
          <div class="grid c3">
            <label class="check"><input id="q-coul" type="checkbox"> Coulomb term (Rehm–Weller)</label>
            <label class="field">Solvent<select id="q-solv">${SOLVENTS.map(s => `<option value="${s[1]}">${s[0]} (ε = ${s[1]})</option>`).join("")}</select></label>
            <label class="field">Encounter distance r (Å)<input id="q-r" type="number" step="0.5" value="7"></label>
          </div>
          <div id="q-out"></div>
          <p class="hint">ΔG<sub>red.q.</sub> = E<sub>ox</sub>(Q) − E*<sub>red</sub>(PC) + w ; ΔG<sub>ox.q.</sub> = E*<sub>ox</sub>(PC) − E<sub>red</sub>(Q) + w, with w = −e²/(4πε₀εr) = −14.40/(ε·r[Å]) eV for neutral partners forming an ion pair.
          Rehm &amp; Weller, Isr. J. Chem. 1970, ${RDB.doiLink("10.1002/ijch.197000029")}.</p>
        </div>
      </div>
    </div>`;

    const $ = id => root.querySelector("#" + id);
    let spectra = { abs: null, em: null };
    const lastResult = { eStarOx: null, eStarRed: null };

    const e00Labels = { ev: "E<sub>0,0</sub> (eV)", cross: "λ<sub>cross</sub> (nm)", em77: "λ<sub>em</sub> at 77 K (nm)", onset: "λ<sub>onset</sub> (nm)", em: "λ<sub>em,max</sub> (nm)", kcal: "E (kcal/mol)" };
    $("es-e00mode").addEventListener("change", () => {
      const md = $("es-e00mode").value;
      $("es-spec-wrap").hidden = md !== "spectra";
      $("es-e00-wrap").hidden = md === "spectra";
      $("es-e00-lab").innerHTML = e00Labels[md] || "";
      compute();
    });
    $("es-ref").addEventListener("change", () => { $("es-custom-wrap").hidden = $("es-ref").value !== "custom"; compute(); });
    ["es-eox", "es-ered", "es-e00", "es-custom", "es-state", "q-eox", "q-ered", "q-coul", "q-solv", "q-r"].forEach(id => $(id).addEventListener("input", compute));
    $("es-pick").addEventListener("change", () => {
      const m = mols.find(x => String(x.id) === $("es-pick").value);
      if (!m) return;
      $("es-ref").value = "SCE"; $("es-custom-wrap").hidden = true;
      $("es-eox").value = m.e_ox ?? ""; $("es-ered").value = m.e_red ?? "";
      $("es-e00mode").value = "ev"; $("es-e00-lab").innerHTML = e00Labels.ev; $("es-spec-wrap").hidden = true; $("es-e00-wrap").hidden = false;
      $("es-e00").value = m.e00 ?? "";
      if (m.excited_state) $("es-state").value = ["S1", "T1", "MLCT (T1)"].includes(m.excited_state) ? m.excited_state : "other";
      compute();
    });
    $("q-pick").addEventListener("change", () => {
      const m = mols.find(x => String(x.id) === $("q-pick").value);
      if (!m) return;
      $("q-eox").value = m.e_ox ?? ""; $("q-ered").value = m.e_red ?? "";
      compute();
    });
    const readFile = (input, key) => input.addEventListener("change", async () => {
      const f = input.files[0];
      if (!f) return;
      const t = RDB.parseNumericTable(await f.text());
      spectra[key] = t.cols.length >= 2 ? { x: t.cols[0], y: t.cols[1] } : null;
      compute();
    });
    readFile($("es-abs"), "abs"); readFile($("es-em"), "em");

    // deep link #estar?pc=ID
    const qs = new URLSearchParams(location.hash.split("?")[1] || "");
    if (qs.get("pc")) { $("es-pick").value = qs.get("pc"); $("es-pick").dispatchEvent(new Event("change")); }
    // values sent from the CV reader (already vs SCE); keep the other one from earlier visits
    const fromCV = k => qs.get(k) || (() => { try { return sessionStorage.getItem("rdb-cv-" + k); } catch (e) { return null; } })();
    if (!qs.get("pc") && (qs.get("eox") || qs.get("ered"))) {
      if (fromCV("eox")) $("es-eox").value = fromCV("eox");
      if (fromCV("ered")) $("es-ered").value = fromCV("ered");
    }
    compute();

    function e00Value() {
      const md = $("es-e00mode").value, v = num($("es-e00").value);
      if (md === "spectra") return crossing();
      if (v == null) return { e00: null };
      if (md === "ev") return { e00: v, how: "given" };
      if (md === "kcal") return { e00: v / F_KCAL, how: `${v} kcal/mol ÷ 23.061` };
      return { e00: HC / v, how: `1239.84 / ${v} nm` };
    }
    function normalise(s) {
      // sort by wavelength, normalise to the maximum of the longest-wavelength band (> 300 nm)
      const pts = s.x.map((x, i) => [x, s.y[i]]).filter(p => isFinite(p[0]) && isFinite(p[1])).sort((a, b) => a[0] - b[0]);
      const vis = pts.filter(p => p[0] > 300);
      const use = vis.length > 5 ? vis : pts;
      const mx = Math.max(...use.map(p => p[1]));
      return pts.map(p => [p[0], p[1] / mx]);
    }
    function crossing() {
      if (!spectra.abs || !spectra.em) return { e00: null, msg: "Upload both spectra." };
      const a = normalise(spectra.abs), e = normalise(spectra.em);
      // lowest-energy absorption maximum (last max above 300 nm) and emission maximum
      const absMax = a.filter(p => p[0] > 300).reduce((b, p) => (p[1] >= 0.98 ? p : b), a[0]);
      const emMax = e.reduce((b, p) => (p[1] > b[1] ? p : b), e[0]);
      if (emMax[0] <= absMax[0]) return { e00: null, msg: "Emission maximum must lie at longer wavelength than the absorption maximum." };
      const interp = (arr, x) => {
        for (let i = 1; i < arr.length; i++) if (arr[i][0] >= x) {
          const [x0, y0] = arr[i - 1], [x1, y1] = arr[i];
          return y0 + (y1 - y0) * (x - x0) / (x1 - x0 || 1);
        }
        return NaN;
      };
      let prev = null, found = null;
      for (let x = absMax[0]; x <= emMax[0]; x += 0.25) {
        const d = interp(a, x) - interp(e, x);
        if (prev != null && isFinite(d) && Math.sign(d) !== Math.sign(prev)) { found = x; break; }
        prev = d;
      }
      if (found == null) return { e00: null, msg: "The normalised spectra do not cross between the two maxima." };
      return { e00: HC / found, how: `crossing at ${found.toFixed(1)} nm → 1239.84 / ${found.toFixed(1)}`, lambda: found, a, e };
    }

    function compute() {
      const ref = $("es-ref").value, cust = $("es-custom").value;
      const eox = RDB.toSCE(num($("es-eox").value), ref, cust);
      const ered = RDB.toSCE(num($("es-ered").value), ref, cust);
      const E = e00Value();
      const e00 = E.e00;
      const eso = eox != null && e00 != null ? eox - e00 : null;
      const esr = ered != null && e00 != null ? ered + e00 : null;
      lastResult.eStarOx = eso; lastResult.eStarRed = esr;
      const inRef = v => ref !== "SCE" && v != null ? `<div class="hint">${fmt(RDB.fromSCE(v, ref, cust), 2)} V vs ${esc(ref === "custom" ? "your ref." : RDB.REFERENCES.find(r => r.id === ref).label.split(" (")[0])}</div>` : "";
      $("es-out").innerHTML = `
        <div class="kpi"><div class="lab">E<sub>0,0</sub></div><div class="val">${e00 != null ? e00.toFixed(2) + " eV" : "—"}</div><div class="hint">${e00 != null ? (e00 * F_KCAL).toFixed(1) + " kcal/mol · " + (HC / e00).toFixed(0) + " nm" : esc(E.msg || "")}</div></div>
        <div class="kpi"><div class="lab">E<sub>ox</sub> vs SCE</div><div class="val">${fmtV(eox)}</div></div>
        <div class="kpi"><div class="lab">E<sub>red</sub> vs SCE</div><div class="val">${fmtV(ered)}</div></div>
        <div class="kpi"><div class="lab">E*<sub>ox</sub> = E(PC<sup>•+</sup>/PC*)</div><div class="val neg">${fmtV(eso)}</div>${inRef(eso)}<div class="hint">excited state as reductant</div></div>
        <div class="kpi"><div class="lab">E*<sub>red</sub> = E(PC*/PC<sup>•−</sup>)</div><div class="val pos">${fmtV(esr)}</div>${inRef(esr)}<div class="hint">excited state as oxidant</div></div>`;
      $("es-formula").innerHTML = `E*<sub>ox</sub> = E<sub>ox</sub> − E<sub>0,0</sub> = ${fmt(eox, 2)} − ${fmt(e00, 2)} = <b>${fmt(eso, 2)} V</b><br>
        E*<sub>red</sub> = E<sub>red</sub> + E<sub>0,0</sub> = ${fmt(ered, 2)} + ${fmt(e00, 2)} = <b>${fmt(esr, 2)} V</b>
        ${E.how ? `<br><span class="hint">E<sub>0,0</sub>: ${esc(E.how)}${ref !== "SCE" ? ` · converted to SCE with offset ${fmt(RDB.refOffset(ref, cust), 3)} V` : ""}</span>` : ""}
        <br><span class="hint">Approximation: entropy and work terms neglected (see Romero &amp; Nicewicz, ${RDB.doiLink("10.1021/acs.chemrev.6b00057")}).</span>`;
      // spectra plot
      if ($("es-e00mode").value === "spectra" && E.a) {
        RDBPlot.plot($("es-plot"), {
          series: [{ x: E.a.map(p => p[0]), y: E.a.map(p => p[1]), color: "var(--accent)", label: "absorption" },
                   { x: E.e.map(p => p[0]), y: E.e.map(p => p[1]), color: "var(--accent-2)", label: "emission" }],
          vlines: [{ x: E.lambda, label: `λ = ${E.lambda.toFixed(1)} nm`, color: "var(--text)" }],
          xLabel: "Wavelength (nm)", yLabel: "Normalised intensity", height: 260, yRange: [0, 1.1]
        });
      } else $("es-plot").innerHTML = "";
      // nearest catalysts
      if (eso != null || esr != null) {
        const pcs = mols.filter(m => m.category === "photocatalyst" && (m.e_star_ox != null || m.e_star_red != null));
        const d = m => Math.hypot(eso != null && m.e_star_ox != null ? m.e_star_ox - eso : 0.5, esr != null && m.e_star_red != null ? m.e_star_red - esr : 0.5);
        const near = pcs.sort((a, b) => d(a) - d(b)).slice(0, 6);
        $("es-near").innerHTML = `<h3>Closest catalysts in the database</h3><div class="table-wrap"><table><thead><tr><th>Catalyst</th><th class="num">E*<sub>ox</sub></th><th class="num">E*<sub>red</sub></th><th class="num">E<sub>0,0</sub></th></tr></thead><tbody>
          ${near.map(m => `<tr data-id="${m.id}"><td>${esc(m.name)}</td><td class="num">${fmt(m.e_star_ox, 2)}</td><td class="num">${fmt(m.e_star_red, 2)}</td><td class="num">${fmt(m.e00, 2)}</td></tr>`).join("")}</tbody></table></div>`;
        $("es-near").querySelectorAll("tr[data-id]").forEach(tr => tr.onclick = () => RDBDatabase.showDetail(mols.find(m => String(m.id) === tr.dataset.id)));
      } else $("es-near").innerHTML = "";
      quench(eso, esr);
    }

    function quench(eso, esr) {
      const qox = num($("q-eox").value), qred = num($("q-ered").value);
      const w = $("q-coul").checked ? -14.40 / (Number($("q-solv").value) * (num($("q-r").value) || 7)) : 0;
      const verdict = g => g == null ? "" : g < -0.1 ? '<span class="badge ok">favourable</span>' : g <= 0.1 ? '<span class="badge warn">near thermoneutral</span>' : '<span class="badge bad">unfavourable</span>';
      const line = (title, g, expl) => `<tr><td>${title}<div class="hint">${expl}</div></td><td class="num">${g == null ? "—" : (g > 0 ? "+" : "") + g.toFixed(2) + " eV"}</td><td class="num">${g == null ? "—" : (g * F_KCAL).toFixed(1) + " kcal/mol"}</td><td>${verdict(g)}</td></tr>`;
      const gRed = qox != null && esr != null ? qox - esr + w : null;
      const gOx = qred != null && eso != null ? eso - qred + w : null;
      $("q-out").innerHTML = (qox == null && qred == null) ? '<p class="hint">Enter the quencher potentials (or pick one) to see the driving force.</p>' :
        `<div class="table-wrap"><table><thead><tr><th>Pathway</th><th class="num">ΔG</th><th class="num"></th><th></th></tr></thead><tbody>
        ${line("Reductive quenching: PC* + Q → PC<sup>•−</sup> + Q<sup>•+</sup>", gRed, "PC* oxidises the quencher")}
        ${line("Oxidative quenching: PC* + Q → PC<sup>•+</sup> + Q<sup>•−</sup>", gOx, "PC* reduces the quencher")}
        </tbody></table></div>${w ? `<p class="hint">Coulomb term w = ${w.toFixed(3)} eV included.</p>` : ""}`;
    }
  }

  window.RDBEstar = { render };
})();
