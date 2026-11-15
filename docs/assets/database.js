/* RedoxDB — Database view: search, filters, structure search, detail card, export. */
(function () {
  "use strict";
  const { esc, fmt, fmtV, doiLink, molSVG, molFromSmiles } = RDB;

  const COLS = [
    { key: "struct", label: "Structure", sort: false },
    { key: "name", label: "Name" },
    { key: "category", label: "Type" },
    { key: "e_ox", label: "E<sub>ox</sub>", num: true },
    { key: "e_red", label: "E<sub>red</sub>", num: true },
    { key: "e00", label: "E<sub>0,0</sub> (eV)", num: true },
    { key: "e_star_ox", label: "E*<sub>ox</sub>", num: true },
    { key: "e_star_red", label: "E*<sub>red</sub>", num: true },
    { key: "confidence", label: "Check" }
  ];

  let state = { mols: [], sortKey: "name", sortDir: 1, filtered: [], sss: null };

  function confBadge(c) {
    if (c === "high") return '<span class="badge ok" title="Checked against the source">verified</span>';
    if (c === "medium") return '<span class="badge warn" title="From a review table or reliable recollection; not re-checked">medium</span>';
    return '<span class="badge bad" title="Approximate — verify in the source before use">low</span>';
  }
  function catBadge(m) {
    return m.category === "photocatalyst" ? '<span class="badge pc">PC</span>' : '<span class="badge sub">substrate</span>';
  }

  function render(root, mols) {
    state.mols = mols;
    const solvents = [...new Set(mols.map(m => m.solvent).filter(Boolean))].sort();
    root.innerHTML = `
      <div class="card stack">
        <div class="grid c3">
          <label class="field">Search (name, alias, CAS, group)<input id="q" type="search" placeholder="e.g. 4CzIPN, acridinium, NHPI"></label>
          <label class="field">Type<select id="f-cat"><option value="">All</option><option value="photocatalyst">Photocatalysts</option><option value="substrate">Substrates / reagents</option></select></label>
          <label class="field">Kind<select id="f-kind"><option value="">All</option><option value="organic">Organic</option><option value="organometallic">Organometallic</option><option value="inorganic">Inorganic</option></select></label>
        </div>
        <div class="grid c4">
          <label class="field">Potential<select id="f-pot">
            <option value="e_ox">E_ox (ground)</option><option value="e_red">E_red (ground)</option>
            <option value="e_star_ox">E*_ox (excited, reductant)</option><option value="e_star_red">E*_red (excited, oxidant)</option></select></label>
          <label class="field">from (V vs SCE)<input id="f-min" type="number" step="0.05" placeholder="−3.0"></label>
          <label class="field">to (V vs SCE)<input id="f-max" type="number" step="0.05" placeholder="+3.0"></label>
          <label class="field">Solvent<select id="f-solv"><option value="">All</option>${solvents.map(c => `<option>${esc(c)}</option>`).join("")}</select></label>
        </div>
        <div class="grid c4">
          <label class="field">Structure (SMILES)<input id="f-smiles" placeholder="e.g. c1ccc2ccccc2c1"></label>
          <label class="field">Structure search<select id="f-smode"><option value="sub">Substructure</option><option value="exact">Exact</option><option value="sim">Similarity ≥ 0.6</option></select></label>
          <label class="field">Reliability<select id="f-conf"><option value="">All</option><option value="high">Verified only</option><option value="hm">Verified + medium</option></select></label>
          <div class="row" style="align-self:end"><button class="btn" id="f-reset" type="button">Reset</button><button class="btn" id="f-csv" type="button">Export CSV</button></div>
        </div>
        <p class="hint" id="f-count"></p>
      </div>
      <div class="table-wrap" style="margin-top:14px"><table><thead><tr>${COLS.map(c => `<th data-k="${c.key}" class="${c.num ? "num" : ""}">${c.label}</th>`).join("")}</tr></thead><tbody id="tbody"></tbody></table></div>`;

    const $ = id => root.querySelector("#" + id);
    const ids = ["q", "f-cat", "f-kind", "f-pot", "f-min", "f-max", "f-solv", "f-conf", "f-smode"];
    ids.forEach(id => $(id).addEventListener("input", apply));
    let smiT;
    $("f-smiles").addEventListener("input", () => { clearTimeout(smiT); smiT = setTimeout(apply, 350); });
    $("f-reset").onclick = () => { ids.concat("f-smiles").forEach(id => { const e = $(id); e.value = e.tagName === "SELECT" ? e.options[0].value : ""; }); apply(); };
    $("f-csv").onclick = () => RDB.download("redoxdb.csv", RDB.toCSV(state.filtered, ["id"].concat(RDB.MOL_FIELDS)), "text/csv");
    root.querySelectorAll("th[data-k]").forEach(th => th.addEventListener("click", () => {
      const k = th.dataset.k;
      if (k === "struct") return;
      state.sortDir = state.sortKey === k ? -state.sortDir : 1;
      state.sortKey = k;
      apply();
    }));
    $("tbody").addEventListener("click", e => {
      const tr = e.target.closest("tr[data-id]");
      if (tr) showDetail(state.mols.find(m => String(m.id) === tr.dataset.id));
    });
    // deep link: #db?q=...
    const qs = new URLSearchParams(location.hash.split("?")[1] || "");
    if (qs.get("q")) $("q").value = qs.get("q");
    apply();

    function apply() {
      const q = $("q").value.trim().toLowerCase();
      const cat = $("f-cat").value, kind = $("f-kind").value, solv = $("f-solv").value;
      const pot = $("f-pot").value, lo = RDB.num($("f-min").value), hi = RDB.num($("f-max").value);
      const conf = $("f-conf").value;
      const smi = $("f-smiles").value.trim(), smode = $("f-smode").value;
      let query = null, qIdx = null, qId = null;
      if (smi && window.OCL) {
        const qm = molFromSmiles(smi);
        if (qm) {
          if (smode === "sub") { qm.setFragment(true); query = qm; qIdx = qm.getIndex(); }
          else if (smode === "exact") qId = qm.getIDCode();
          else qIdx = qm.getIndex();
        }
      }
      const out = state.mols.filter(m => {
        if (cat && m.category !== cat) return false;
        if (kind && m.kind !== kind) return false;
        if (solv && m.solvent !== solv) return false;
        if (conf === "high" && m.confidence !== "high") return false;
        if (conf === "hm" && !(m.confidence === "high" || m.confidence === "medium")) return false;
        if (lo != null || hi != null) {
          const v = m[pot];
          if (v == null) return false;
          if (lo != null && v < lo) return false;
          if (hi != null && v > hi) return false;
        }
        if (q) {
          const hay = [m.name, m.iupac_name, m.cas, m.notes, ...(m.aliases || []), ...(m.functional_groups || [])].join(" ").toLowerCase();
          if (!hay.includes(q)) return false;
        }
        if (qId || qIdx) {
          const mm = m.smiles ? cachedMol(m) : null;
          if (!mm) return false;
          if (qId) return mm.idcode === qId;
          if (smode === "sub") {
            try {
              const s = new window.OCL.SSSearcher();
              s.setFragment(query); s.setMolecule(mm.mol);
              return s.isFragmentInMolecule();
            } catch (e) { return false; }
          }
          m._sim = window.OCL.SSSearcherWithIndex.getSimilarityTanimoto(qIdx, mm.index);
          return m._sim >= 0.6;
        }
        return true;
      });
      const k = (qIdx && smode === "sim") ? "_sim" : state.sortKey;
      const dir = (qIdx && smode === "sim") ? -1 : state.sortDir;
      out.sort((a, b) => {
        const x = a[k], y = b[k];
        if (x == null && y == null) return 0;
        if (x == null) return 1;
        if (y == null) return -1;
        return (typeof x === "number" ? x - y : String(x).localeCompare(String(y))) * dir;
      });
      state.filtered = out;
      $("f-count").textContent = `${out.length} of ${state.mols.length} molecules`;
      $("tbody").innerHTML = out.map(row).join("") || `<tr><td colspan="${COLS.length}" class="hint">No match.</td></tr>`;
    }
  }

  const molCache = new Map();
  function cachedMol(m) {
    if (molCache.has(m.id)) return molCache.get(m.id);
    const mol = molFromSmiles(m.smiles);
    const v = mol ? { mol, idcode: mol.getIDCode(), index: mol.getIndex() } : null;
    molCache.set(m.id, v);
    return v;
  }

  function potCell(v, type) {
    if (v == null) return '<td class="num">—</td>';
    const cls = v < 0 ? "neg" : "pos";
    const t = type && type !== "E1/2" ? ` <span class="hint" title="${esc(type)}">${type === "Ep" ? "p" : type === "calc" ? "c" : ""}</span>` : "";
    return `<td class="num ${cls}">${fmt(v, 2)}${t}</td>`;
  }
  function row(m) {
    return `<tr data-id="${esc(m.id)}">
      <td><div class="struct">${RDB.structHTML(m.smiles, 132, 72)}</div></td>
      <td><b>${esc(m.name)}</b>${m.aliases && m.aliases.length ? `<div class="hint">${esc(m.aliases.slice(0, 2).join(", "))}</div>` : ""}</td>
      <td>${catBadge(m)}</td>
      ${potCell(m.e_ox, m.e_ox_type)}${potCell(m.e_red, m.e_red_type)}
      <td class="num">${fmt(m.e00, 2)}</td>
      ${potCell(m.e_star_ox)}${potCell(m.e_star_red)}
      <td>${confBadge(m.confidence)}</td></tr>`;
  }

  function showDetail(m) {
    if (!m) return;
    const prop = (k, v) => v == null || v === "" || (Array.isArray(v) && !v.length) ? "" : `<dt>${k}</dt><dd>${v}</dd>`;
    const html = `
      <h2>${esc(m.name)} ${catBadge(m)} ${confBadge(m.confidence)}</h2>
      ${m.iupac_name ? `<p class="hint">${esc(m.iupac_name)}</p>` : ""}
      <div class="grid c2">
        <div><div class="big-struct">${RDB.structHTML(m.smiles, 340, 225)}</div>
          ${m.smiles ? `<p class="mono hint" style="word-break:break-all;margin-top:6px">${esc(m.smiles)}</p>` : ""}</div>
        <div class="stack">
          <div class="kpis">
            <div class="kpi"><div class="lab">E<sub>ox</sub> (M<sup>•+</sup>/M)</div><div class="val">${fmtV(m.e_ox)}</div></div>
            <div class="kpi"><div class="lab">E<sub>red</sub> (M/M<sup>•−</sup>)</div><div class="val">${fmtV(m.e_red)}</div></div>
            <div class="kpi"><div class="lab">E*<sub>ox</sub> (M<sup>•+</sup>/M*)</div><div class="val">${fmtV(m.e_star_ox)}</div></div>
            <div class="kpi"><div class="lab">E*<sub>red</sub> (M*/M<sup>•−</sup>)</div><div class="val">${fmtV(m.e_star_red)}</div></div>
          </div>
          <dl class="props">
            ${prop("Aliases", esc((m.aliases || []).join(", ")))}
            ${prop("Kind", esc(m.kind))}
            ${prop("CAS", esc(m.cas))}
            ${prop("E<sub>0,0</sub>", m.e00 != null ? fmt(m.e00, 2) + " eV" + (m.excited_state ? " (" + esc(m.excited_state) + ")" : "") : "")}
            ${prop("Lifetime", m.tau_ns != null ? fmt(m.tau_ns, m.tau_ns < 10 ? 1 : 0) + " ns" : "")}
            ${prop("λ<sub>abs</sub> / λ<sub>em</sub>", m.lambda_abs_nm || m.lambda_em_nm ? `${m.lambda_abs_nm || "—"} / ${m.lambda_em_nm || "—"} nm` : "")}
            ${prop("E<sub>ox</sub> type", esc(m.e_ox_type))}${prop("E<sub>red</sub> type", esc(m.e_red_type))}
            ${prop("Activated group", esc((m.functional_groups || []).join("; ")))}
            ${prop("Solvent", esc(m.solvent))}${prop("Electrolyte", esc(m.electrolyte))}
            ${prop("Original reference", esc(m.ref_original))}${prop("Conversion", esc(m.conversion))}
            ${prop("Source (DOI)", doiLink(m.doi))}${prop("Review", m.review_doi ? doiLink(m.review_doi) : "")}
            ${prop("Notes", esc(m.notes))}
          </dl>
        </div>
      </div>
      <div class="row end" style="margin-top:14px">
        <a class="btn" href="#advisor?pc=${encodeURIComponent(m.id)}">Use in advisor</a>
        <a class="btn" href="#submit?fix=${encodeURIComponent(m.id)}">Suggest a correction</a>
      </div>`;
    const md = RDB.modal(html);
    md.el.querySelectorAll("a[href^='#']").forEach(a => a.addEventListener("click", md.close));
  }

  window.RDBDatabase = { render, showDetail, confBadge, catBadge };
})();
