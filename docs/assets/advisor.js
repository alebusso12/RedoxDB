/* RedoxDB — Reactivity advisor (catalyst → reactions/substrates, reaction → catalysts) and Redox map. */
(function () {
  "use strict";
  const { esc, fmt, fmtV, num } = RDB;
  const KCAL = 23.061;
  const GOOD = -0.05, BORDER = 0.15, SOFT_TOL = 0.5;

  /* Thermodynamics of one full cycle. pc: {e_ox, e_red, e_star_ox, e_star_red}; D: {E_ox, soft}; A: {E_red, soft}
     Reductive quenching:  PC* + D → PC•− + D•+  (ΔG1 = E_ox(D) − E*red) ; PC•− + A → PC + A•− (ΔG2 = E_red(PC) − E_red(A))
     Oxidative quenching:  PC* + A → PC•+ + A•−  (ΔG1 = E*ox − E_red(A)) ; PC•+ + D → PC + D•+ (ΔG2 = E_ox(D) − E_ox(PC)) */
  function cycles(pc, D, A, key) {
    const out = [];
    const dE = D && D.E_ox != null ? D.E_ox : null, aE = A && A.E_red != null ? A.E_red : null;
    const step = (g, soft, label) => ({ g, soft: !!soft, label });
    if (pc.e_star_red != null) {
      out.push({
        mode: "reductive",
        steps: [
          step(dE != null ? dE - pc.e_star_red : null, D && D.soft, "PC* oxidises " + (D ? D.name : "donor")),
          step(aE != null && pc.e_red != null ? pc.e_red - aE : null, A && A.soft, "PC•− reduces " + (A ? A.name : "acceptor"))
        ]
      });
    }
    if (pc.e_star_ox != null) {
      out.push({
        mode: "oxidative",
        steps: [
          step(aE != null ? pc.e_star_ox - aE : null, A && A.soft, "PC* reduces " + (A ? A.name : "acceptor")),
          step(dE != null && pc.e_ox != null ? dE - pc.e_ox : null, D && D.soft, "PC•+ oxidises " + (D ? D.name : "donor"))
        ]
      });
    }
    out.forEach(c => {
      const hard = c.steps.filter(s => s.g != null && !s.soft).map(s => s.g);
      const soft = c.steps.filter(s => s.g != null && s.soft).map(s => s.g);
      const known = c.steps.filter(s => s.g != null).length;
      c.worst = hard.length ? Math.max(...hard) : null;
      c.softWorst = soft.length ? Math.max(...soft) : null;
      c.complete = known === 2;
      // the photochemical step (index 0) and the step on the key substrate must both be known
      const keyIdx = key === "donor" ? (c.mode === "reductive" ? 0 : 1) : key === "acceptor" ? (c.mode === "reductive" ? 1 : 0) : 0;
      c.ok = c.steps[0].g != null && c.steps[keyIdx].g != null;
      let v = c.worst == null ? (c.softWorst != null && c.softWorst <= SOFT_TOL ? "border" : "unknown") : c.worst <= GOOD ? "good" : c.worst <= BORDER ? "border" : "bad";
      if (v !== "bad" && c.softWorst != null && c.softWorst > SOFT_TOL) v = "border";
      // a photochemical step on an estimated intermediate cannot make a cycle "feasible" on its own
      if (v === "good" && c.steps[0].soft) v = "border";
      if (!c.ok) v = "unknown";
      c.verdict = v;
      c.score = c.worst != null ? c.worst : (c.softWorst != null ? c.softWorst - 0.3 : 9);
    });
    return out.sort((a, b) => a.score - b.score);
  }
  /* Preference: better verdict, then a photochemical step on a real substrate (not an estimated
     intermediate), then the mechanism reported in the literature, then the larger driving force. */
  function bestCycle(pc, D, A, reported, key) {
    const cs = cycles(pc, D, A, key).filter(c => c.ok);
    const rank = { good: 0, border: 1, bad: 2, unknown: 3 };
    cs.sort((a, b) => rank[a.verdict] - rank[b.verdict] || (b.complete - a.complete) || (a.steps[0].soft - b.steps[0].soft) ||
      ((a.mode === reported ? 0 : 1) - (b.mode === reported ? 0 : 1)) || a.score - b.score);
    return cs[0] || null;
  }
  function verdictBadge(v) {
    return { good: '<span class="badge ok">feasible</span>', border: '<span class="badge warn">borderline</span>', bad: '<span class="badge bad">unlikely</span>', unknown: '<span class="badge">insufficient data</span>' }[v] || "";
  }
  function g(v) { return v == null ? "—" : (v > 0 ? "+" : "") + v.toFixed(2) + " eV"; }
  function marginBar(v) {
    if (v == null) return "";
    const w = Math.min(100, Math.abs(v) / 1.0 * 100);
    const c = v <= GOOD ? "var(--ok)" : v <= BORDER ? "var(--warn)" : "var(--bad)";
    return `<div class="margin-bar" title="${g(v)}"><span style="width:${w}%;background:${c}"></span></div>`;
  }
  // practical warnings that thermodynamics alone does not capture
  function practical(pc) {
    const w = [];
    if (pc.lambda_abs_nm && pc.lambda_abs_nm < 400) w.push(`absorbs at ${pc.lambda_abs_nm} nm (UV)`);
    if (pc.tau_ns != null && pc.tau_ns < 5) w.push(`short-lived excited state (τ ≈ ${pc.tau_ns} ns)`);
    if (pc.confidence === "low") w.push("potentials not verified");
    return w.length ? `<div class="hint" style="color:var(--warn)">⚠ ${esc(w.join(" · "))}</div>` : "";
  }
  function cycleText(c) {
    return c.steps.map(s => `${esc(s.label)}: <b>${g(s.g)}</b>${s.soft ? ' <span class="hint">(indicative)</span>' : ""}`).join("<br>");
  }

  let mols = [], reactions = [];

  function render(root, molecules, rxns) {
    mols = molecules; reactions = rxns;
    const pcs = mols.filter(m => m.category === "photocatalyst" && (m.e_star_ox != null || m.e_star_red != null)).sort((a, b) => a.name.localeCompare(b.name));
    const subs = mols.filter(m => m.category === "substrate").sort((a, b) => a.name.localeCompare(b.name));
    root.innerHTML = `
      <div class="row" style="margin-bottom:14px">
        <label class="check"><input type="radio" name="adv-mode" value="pc" checked> I have a photocatalyst → what can it do?</label>
        <label class="check"><input type="radio" name="adv-mode" value="rx"> I have a target reaction → which photocatalyst?</label>
      </div>
      <div id="adv-pc" class="split">
        <div class="card stack">
          <h3>Your photocatalyst</h3>
          <label class="field">From the database<select id="a-pc"><option value="">— custom values —</option>${pcs.map(m => `<option value="${m.id}">${esc(m.name)}</option>`).join("")}</select></label>
          <div class="grid c2">
            <label class="field">E*<sub>red</sub> (PC*/PC<sup>•−</sup>)<input id="a-esr" type="number" step="0.01"></label>
            <label class="field">E*<sub>ox</sub> (PC<sup>•+</sup>/PC*)<input id="a-eso" type="number" step="0.01"></label>
            <label class="field">E<sub>red</sub> (PC/PC<sup>•−</sup>)<input id="a-er" type="number" step="0.01"></label>
            <label class="field">E<sub>ox</sub> (PC<sup>•+</sup>/PC)<input id="a-eo" type="number" step="0.01"></label>
          </div>
          <p class="hint">V vs SCE. Missing E* values? Compute them in the <a href="#estar">E* calculator</a>.</p>
          <p class="hint">Verdict thresholds: feasible if every electron-transfer step has ΔG ≤ ${GOOD} eV, borderline up to +${BORDER} eV. Steps marked "indicative" involve estimated potentials (radical intermediates, terminal oxidants) and only downgrade the verdict if worse than +${SOFT_TOL} eV.</p>
        </div>
        <div class="stack">
          <div class="card stack"><h3>Reactions to test</h3><div id="a-rx"></div></div>
          <div class="card stack"><h3>Substrates in the database it can activate</h3><div id="a-sub"></div></div>
        </div>
      </div>
      <div id="adv-rx" class="split" hidden>
        <div class="card stack">
          <h3>Target transformation</h3>
          <label class="field">Reaction from the library<select id="r-rx"><option value="">— custom: define the electron transfer —</option>${reactions.map(r => `<option value="${esc(r.id)}">${esc(r.name)}</option>`).join("")}</select></label>
          <div id="r-desc" class="hint"></div>
          <div id="r-custom" class="stack">
            <label class="field">Substrate to activate (database)<select id="r-sub"><option value="">— or type its potential —</option>${subs.map(m => `<option value="${m.id}">${esc(m.name)} (${m.e_ox != null ? "Eox " + fmt(m.e_ox, 2) : ""}${m.e_ox != null && m.e_red != null ? ", " : ""}${m.e_red != null ? "Ered " + fmt(m.e_red, 2) : ""})</option>`).join("")}</select></label>
            <label class="field">It must be<select id="r-dir"><option value="ox">oxidised (electron donor)</option><option value="red">reduced (electron acceptor)</option></select></label>
            <label class="field">Its potential (V vs SCE)<input id="r-E" type="number" step="0.01"></label>
            <label class="field">Partner that closes the cycle (sacrificial donor/acceptor, optional)<select id="r-partner"><option value="">— none / not known —</option>${subs.map(m => `<option value="${m.id}">${esc(m.name)}</option>`).join("")}</select></label>
          </div>
          <label class="check"><input id="r-avoid" type="checkbox" checked> Penalise catalysts far stronger than needed (chemoselectivity)</label>
          <label class="check"><input id="r-vis" type="checkbox"> Visible-light catalysts only (λ<sub>abs</sub> ≥ 400 nm or unknown)</label>
        </div>
        <div class="card stack"><h3>Ranked photocatalysts</h3><div id="r-out"></div></div>
      </div>`;
    const $ = id => root.querySelector("#" + id);
    root.querySelectorAll("input[name=adv-mode]").forEach(r => r.addEventListener("change", () => {
      const v = root.querySelector("input[name=adv-mode]:checked").value;
      $("adv-pc").hidden = v !== "pc"; $("adv-rx").hidden = v !== "rx";
    }));
    // --- mode A
    $("a-pc").addEventListener("change", () => {
      const m = mols.find(x => String(x.id) === $("a-pc").value);
      if (m) { $("a-esr").value = m.e_star_red ?? ""; $("a-eso").value = m.e_star_ox ?? ""; $("a-er").value = m.e_red ?? ""; $("a-eo").value = m.e_ox ?? ""; }
      runPC();
    });
    ["a-esr", "a-eso", "a-er", "a-eo"].forEach(id => $(id).addEventListener("input", runPC));
    // --- mode B
    ["r-rx", "r-sub", "r-dir", "r-E", "r-partner", "r-avoid", "r-vis"].forEach(id => $(id).addEventListener("input", e => {
      if (e.target.id === "r-sub") {
        const m = mols.find(x => String(x.id) === $("r-sub").value);
        if (m) {
          if (m.e_ox != null && (m.e_red == null || $("r-dir").value === "ox")) { $("r-dir").value = "ox"; $("r-E").value = m.e_ox; }
          else if (m.e_red != null) { $("r-dir").value = "red"; $("r-E").value = m.e_red; }
        }
      }
      if (e.target.id === "r-dir") {
        const m = mols.find(x => String(x.id) === $("r-sub").value);
        if (m) $("r-E").value = ($("r-dir").value === "ox" ? m.e_ox : m.e_red) ?? "";
      }
      runRX();
    }));
    const qs = new URLSearchParams(location.hash.split("?")[1] || "");
    if (qs.get("pc")) { $("a-pc").value = qs.get("pc"); $("a-pc").dispatchEvent(new Event("change")); }
    if (qs.get("rx")) { root.querySelector("input[name=adv-mode][value=rx]").click(); $("r-rx").value = qs.get("rx"); }
    runPC(); runRX();

    function runPC() {
      const pc = { e_star_red: num($("a-esr").value), e_star_ox: num($("a-eso").value), e_red: num($("a-er").value), e_ox: num($("a-eo").value) };
      if (pc.e_star_red == null && pc.e_star_ox == null) {
        $("a-rx").innerHTML = '<p class="hint">Choose a catalyst or enter at least one excited-state potential.</p>';
        $("a-sub").innerHTML = "";
        return;
      }
      const rank = { good: 0, border: 1, bad: 2, unknown: 3 };
      const rows = reactions.map(r => ({ r, c: bestCycle(pc, r.donor, r.acceptor, r.reported_quenching, r.key) })).filter(x => x.c)
        .sort((a, b) => rank[a.c.verdict] - rank[b.c.verdict] || a.c.score - b.c.score);
      $("a-rx").innerHTML = `<div class="table-wrap"><table><thead><tr><th>Reaction</th><th>Best cycle</th><th>Electron-transfer steps</th><th>Verdict</th></tr></thead><tbody>
        ${rows.map(({ r, c }) => `<tr data-rx="${esc(r.id)}"><td><b>${esc(r.name)}</b><div class="hint">${esc(r.family)} · ${r.doi ? RDB.doiLink(r.doi) : esc(r.citation)}</div>${r.pcet ? '<div class="hint">⚠ works through PCET, not plain ET</div>' : ""}</td>
          <td>${c.mode} quenching${r.reported_quenching === c.mode ? "" : ` <span class="hint">(reported: ${esc(r.reported_quenching)})</span>`}</td>
          <td class="hint">${cycleText(c)}</td><td>${verdictBadge(c.verdict)}${marginBar(c.worst)}</td></tr>`).join("")}</tbody></table></div>`;
      $("a-rx").querySelectorAll("tr[data-rx]").forEach(tr => tr.onclick = e => { if (!e.target.closest("a")) showReaction(reactions.find(r => r.id === tr.dataset.rx)); });

      // substrates the excited state (and the reduced/oxidised PC) can reach
      const list = [];
      mols.filter(m => m.category === "substrate").forEach(m => {
        if (m.e_ox != null && pc.e_star_red != null) list.push({ m, how: "PC* oxidises it", g: m.e_ox - pc.e_star_red });
        if (m.e_red != null && pc.e_star_ox != null) list.push({ m, how: "PC* reduces it", g: pc.e_star_ox - m.e_red });
        if (m.e_red != null && pc.e_red != null) list.push({ m, how: "PC•− reduces it (after reductive quenching)", g: pc.e_red - m.e_red });
        if (m.e_ox != null && pc.e_ox != null) list.push({ m, how: "PC•+ oxidises it (after oxidative quenching)", g: m.e_ox - pc.e_ox });
      });
      const feas = list.filter(x => x.g <= BORDER).sort((a, b) => a.how.localeCompare(b.how) || a.g - b.g);
      const groups = {};
      feas.forEach(x => (groups[x.how] = groups[x.how] || []).push(x));
      $("a-sub").innerHTML = Object.keys(groups).length ? Object.entries(groups).map(([how, xs]) => `
        <details${how.startsWith("PC*") ? " open" : ""}><summary><b>${esc(how)}</b> — ${xs.length} substrates</summary>
        <div class="table-wrap" style="margin-top:8px"><table><thead><tr><th>Substrate</th><th>Class / group</th><th class="num">ΔG</th><th class="num">kcal/mol</th><th>Reliability</th></tr></thead><tbody>
        ${xs.map(x => `<tr data-id="${x.m.id}"><td>${esc(x.m.name)}</td><td class="hint">${esc(x.m.class || "")}${x.m.functional_groups && x.m.functional_groups.length ? " · " + esc(x.m.functional_groups[0]) : ""}</td><td class="num">${g(x.g)}</td><td class="num">${(x.g * KCAL).toFixed(1)}</td><td>${RDBDatabase.confBadge(x.m.confidence)}</td></tr>`).join("")}
        </tbody></table></div></details>`).join("") : '<p class="hint">No substrate in the database is within reach.</p>';
      $("a-sub").querySelectorAll("tr[data-id]").forEach(tr => tr.onclick = () => RDBDatabase.showDetail(mols.find(m => String(m.id) === tr.dataset.id)));
    }

    function runRX() {
      const r = reactions.find(x => x.id === $("r-rx").value);
      $("r-custom").hidden = !!r;
      let D = null, A = null, need = null;
      if (r) {
        D = r.donor; A = r.acceptor;
        $("r-desc").innerHTML = `${esc(r.summary)}<br>Key step: ${r.key === "donor" ? `oxidise <b>${esc(D.name)}</b> (E<sub>ox</sub> ${fmtV(D.E_ox)})` : `reduce <b>${esc(A.name)}</b> (E<sub>red</sub> ${fmtV(A.E_red)})`}. ${r.doi ? RDB.doiLink(r.doi) : ""}
          <br>Catalysts used in the original work: ${esc(r.typical_pc.join(", "))}.${r.notes ? "<br>" + esc(r.notes) : ""}`;
        need = r.key === "donor" ? { dir: "ox", E: D.E_ox } : { dir: "red", E: A.E_red };
      } else {
        $("r-desc").innerHTML = "";
        const E = num($("r-E").value), dir = $("r-dir").value;
        const sub = mols.find(x => String(x.id) === $("r-sub").value);
        const partner = mols.find(x => String(x.id) === $("r-partner").value);
        if (E == null) { $("r-out").innerHTML = '<p class="hint">Choose a reaction, or a substrate and the direction of electron transfer.</p>'; return; }
        const nm = sub ? sub.name : "substrate";
        if (dir === "ox") { D = { name: nm, E_ox: E }; A = partner && partner.e_red != null ? { name: partner.name, E_red: partner.e_red } : null; }
        else { A = { name: nm, E_red: E }; D = partner && partner.e_ox != null ? { name: partner.name, E_ox: partner.e_ox } : null; }
        need = { dir, E };
      }
      const avoid = $("r-avoid").checked;
      const rank = { good: 0, border: 1, bad: 2, unknown: 3 };
      const visOnly = $("r-vis").checked;
      const rows = pcs.filter(pc => !visOnly || !(pc.lambda_abs_nm && pc.lambda_abs_nm < 400))
        .map(pc => ({ pc, c: bestCycle(pc, D, A, r ? r.reported_quenching : null, r ? r.key : (need.dir === "ox" ? "donor" : "acceptor")) })).filter(x => x.c && x.c.verdict !== "unknown");
      rows.forEach(x => {
        x.score = x.c.score;
        // photochemical driving force of the key step; very negative = much stronger than needed
        x.key = x.c.steps[0].g;
        if (avoid && x.key != null && x.key < -0.8) x.score += (-0.8 - x.key) * 0.5;
      });
      rows.sort((a, b) => rank[a.c.verdict] - rank[b.c.verdict] || (b.c.complete - a.c.complete) || a.score - b.score);
      $("r-out").innerHTML = rows.length ? `<p class="hint">${rows.filter(x => x.c.verdict === "good").length} feasible, ${rows.filter(x => x.c.verdict === "border").length} borderline out of ${rows.length} catalysts with data.</p>
        <div class="table-wrap"><table><thead><tr><th>#</th><th>Photocatalyst</th><th>Cycle</th><th>Electron-transfer steps</th><th class="num">E*<sub>ox</sub> / E*<sub>red</sub></th><th>Verdict</th></tr></thead><tbody>
        ${rows.slice(0, 60).map((x, k) => `<tr data-id="${x.pc.id}"><td>${k + 1}</td><td><b>${esc(x.pc.name)}</b><div class="hint">${esc(x.pc.class || "")}</div>${practical(x.pc)}</td><td>${x.c.mode}</td><td class="hint">${cycleText(x.c)}</td>
          <td class="num">${fmt(x.pc.e_star_ox, 2)} / ${fmt(x.pc.e_star_red, 2)}</td><td>${verdictBadge(x.c.verdict)}${marginBar(x.c.worst)}${avoid && x.key != null && x.key < -0.8 ? '<div class="hint">much stronger than needed</div>' : ""}</td></tr>`).join("")}
        </tbody></table></div>` : '<p class="hint">No catalyst in the database has the potentials needed for this analysis.</p>';
      $("r-out").querySelectorAll("tr[data-id]").forEach(tr => tr.onclick = () => RDBDatabase.showDetail(mols.find(m => String(m.id) === tr.dataset.id)));
    }
  }

  function showReaction(r) {
    if (!r) return;
    RDB.modal(`<h2>${esc(r.name)}</h2><p class="hint">${esc(r.family)}</p><p>${esc(r.summary)}</p>
      <dl class="props"><dt>Electron donor</dt><dd>${esc(r.donor.name)} · E<sub>ox</sub> ${fmtV(r.donor.E_ox)}${r.donor.soft ? " (estimate)" : ""}</dd>
      <dt>Electron acceptor</dt><dd>${esc(r.acceptor.name)} · E<sub>red</sub> ${fmtV(r.acceptor.E_red)}${r.acceptor.soft ? " (estimate)" : ""}</dd>
      <dt>Reported mechanism</dt><dd>${esc(r.reported_quenching)} quenching</dd>
      <dt>Catalysts used</dt><dd>${esc(r.typical_pc.join(", "))}</dd>
      <dt>Source</dt><dd>${esc(r.citation)}${r.doi ? " · " + RDB.doiLink(r.doi) : ""}</dd>
      ${r.notes ? `<dt>Notes</dt><dd>${esc(r.notes)}</dd>` : ""}</dl>`);
  }

  /* ---------- Redox map: each catalyst as a bar from E*ox (strongest reducing) to E*red (strongest oxidising) ---------- */
  function renderMap(root, molecules) {
    const pcs = molecules.filter(m => m.category === "photocatalyst" && (m.e_star_ox != null || m.e_star_red != null));
    const subs = molecules.filter(m => m.category === "substrate").sort((a, b) => a.name.localeCompare(b.name));
    const classes = [...new Set(pcs.map(m => m.kind))];
    root.innerHTML = `
      <div class="card stack">
        <div class="grid c4">
          <label class="field">Show<select id="m-kind"><option value="">All catalysts</option>${classes.map(c => `<option>${esc(c)}</option>`).join("")}</select></label>
          <label class="field">Sort by<select id="m-sort"><option value="e_star_red">E*red (oxidising power)</option><option value="e_star_ox">E*ox (reducing power)</option><option value="name">Name</option></select></label>
          <label class="field">Overlay a substrate<select id="m-sub"><option value="">—</option>${subs.map(m => `<option value="${m.id}">${esc(m.name)}</option>`).join("")}</select></label>
          <label class="field">…or a potential (V vs SCE)<input id="m-E" type="number" step="0.05"></label>
        </div>
        <p class="hint">Blue dot: E*<sub>ox</sub> = E(PC<sup>•+</sup>/PC*), the excited state as reductant (it can reduce substrates with E<sub>red</sub> to its right). Red dot: E*<sub>red</sub> = E(PC*/PC<sup>•−</sup>), the excited state as oxidant (it can oxidise substrates with E<sub>ox</sub> to its left). Click a row for details.</p>
        <div id="m-plot" style="overflow-x:auto"></div>
        <div class="row end"><button class="btn small" id="m-svg">Download SVG</button></div>
      </div>`;
    const $ = id => root.querySelector("#" + id);
    ["m-kind", "m-sort", "m-sub", "m-E"].forEach(id => $(id).addEventListener("input", draw));
    $("m-svg").onclick = () => { const s = $("m-plot").querySelector("svg"); if (s) RDB.download("redox-map.svg", RDBPlot.svgString(s), "image/svg+xml"); };
    draw();
    function draw() {
      const kind = $("m-kind").value, sk = $("m-sort").value;
      let list = pcs.filter(m => !kind || m.kind === kind);
      list = list.slice().sort((a, b) => {
        if (sk === "name") return a.name.localeCompare(b.name);
        if (a[sk] == null) return b[sk] == null ? 0 : 1;
        if (b[sk] == null) return -1;
        return sk === "e_star_ox" ? a[sk] - b[sk] : b[sk] - a[sk];
      });
      const sub = molecules.find(m => String(m.id) === $("m-sub").value);
      const E = num($("m-E").value);
      const NS = "http://www.w3.org/2000/svg";
      const rowH = 20, left = 250, right = 30, top = 40, W = Math.max(760, $("m-plot").clientWidth || 900);
      const H = top + list.length * rowH + 30;
      const x0 = -3.0, x1 = 3.0;
      const sx = v => left + (v - x0) / (x1 - x0) * (W - left - right);
      let s = `<svg xmlns="${NS}" viewBox="0 0 ${W} ${H}" class="plot" style="min-width:700px">`;
      for (let t = -3; t <= 3; t += 0.5) {
        s += `<line x1="${sx(t)}" x2="${sx(t)}" y1="${top - 6}" y2="${H - 24}" stroke="var(--border)"/>`;
        s += `<text x="${sx(t)}" y="${top - 12}" text-anchor="middle" font-size="11">${t > 0 ? "+" : ""}${t.toFixed(1)}</text>`;
      }
      s += `<text x="${(left + W - right) / 2}" y="14" text-anchor="middle" font-size="12">E (V vs SCE)   ← stronger excited-state reductant · stronger excited-state oxidant →</text>`;
      list.forEach((m, i) => {
        const y = top + i * rowH + rowH / 2;
        const col = m.kind === "organic" ? "var(--pc)" : "var(--text)";
        s += `<g data-id="${m.id}" style="cursor:pointer"><rect x="0" y="${y - rowH / 2}" width="${W}" height="${rowH}" fill="transparent"/>`;
        s += `<text x="${left - 8}" y="${y + 4}" text-anchor="end" font-size="11" fill="${col}" style="fill:${col}">${esc(m.name.length > 38 ? m.name.slice(0, 36) + "…" : m.name)}</text>`;
        if (m.e_star_ox != null && m.e_star_red != null) s += `<line x1="${sx(m.e_star_ox)}" x2="${sx(m.e_star_red)}" y1="${y}" y2="${y}" stroke="var(--muted)" stroke-width="2" opacity=".5"/>`;
        if (m.e_star_ox != null) s += `<circle cx="${sx(m.e_star_ox)}" cy="${y}" r="5" fill="var(--accent)"><title>${esc(m.name)} E*ox ${fmt(m.e_star_ox, 2)} V</title></circle>`;
        if (m.e_star_red != null) s += `<circle cx="${sx(m.e_star_red)}" cy="${y}" r="5" fill="var(--accent-2)"><title>${esc(m.name)} E*red ${fmt(m.e_star_red, 2)} V</title></circle>`;
        s += `</g>`;
      });
      const vline = (v, label, color) => { s += `<line x1="${sx(v)}" x2="${sx(v)}" y1="${top - 6}" y2="${H - 24}" stroke="${color}" stroke-width="2" stroke-dasharray="6 4"/><text x="${sx(v) + 4}" y="${H - 8}" font-size="11" fill="${color}" style="fill:${color}">${esc(label)}</text>`; };
      if (sub) {
        if (sub.e_ox != null) vline(sub.e_ox, `${sub.name} Eox ${fmt(sub.e_ox, 2)}`, "var(--accent-2)");
        if (sub.e_red != null) vline(sub.e_red, `${sub.name} Ered ${fmt(sub.e_red, 2)}`, "var(--accent)");
      }
      if (E != null) vline(E, `${fmt(E, 2)} V`, "var(--ok)");
      s += `</svg>`;
      $("m-plot").innerHTML = list.length ? s : '<p class="hint">No catalyst with excited-state data.</p>';
      $("m-plot").querySelectorAll("g[data-id]").forEach(gEl => gEl.addEventListener("click", () => RDBDatabase.showDetail(molecules.find(m => String(m.id) === gEl.dataset.id))));
    }
  }

  window.RDBAdvisor = { render, renderMap, cycles, bestCycle };
})();
