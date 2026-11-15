/* RedoxDB — shared helpers: backend access, sign-in, formatting, structures, references. */
(function () {
  "use strict";
  const cfg = window.RDB_CONFIG || {};
  const remote = !!(cfg.supabaseUrl && cfg.supabaseAnonKey);
  const sb = remote && window.supabase ? window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey) : null;

  const MOL_FIELDS = ["name", "iupac_name", "aliases", "smiles", "cas", "category", "kind", "class", "functional_groups",
    "e_ox", "e_ox_type", "e_red", "e_red_type", "e00", "excited_state", "e_star_ox", "e_star_red", "tau_ns",
    "lambda_abs_nm", "lambda_em_nm", "solvent", "electrolyte", "ref_original", "conversion", "doi", "review_doi",
    "confidence", "notes"];

  // ---------- references (all potentials are stored vs SCE) ----------
  // Offsets: E(vs SCE) = E(vs ref) + offset. Values for MeCN, 25 °C; Fc is solvent dependent.
  const REFERENCES = [
    { id: "SCE", label: "SCE", offset: 0 },
    { id: "Fc", label: "Fc⁺/Fc (MeCN, +0.38 V vs SCE)", offset: 0.38 },
    { id: "Fc_DMF", label: "Fc⁺/Fc (DMF, +0.45 V vs SCE)", offset: 0.45 },
    { id: "Fc_DCM", label: "Fc⁺/Fc (CH₂Cl₂, +0.46 V vs SCE)", offset: 0.46 },
    { id: "AgAgCl_sat", label: "Ag/AgCl (sat. KCl)", offset: -0.045 },
    { id: "AgAgCl_3M", label: "Ag/AgCl (3 M KCl)", offset: -0.032 },
    { id: "AgAg+", label: "Ag/Ag⁺ (0.01 M AgNO₃, MeCN)", offset: 0.298 },
    { id: "NHE", label: "NHE / SHE", offset: -0.241 },
    { id: "custom", label: "Custom offset…", offset: 0 }
  ];
  const REF_DOI = "10.1021/cr00002a004"; // Connelly & Geiger, Chem. Rev. 1996 (Fc in non-aqueous solvents)

  function refOffset(id, custom) {
    if (id === "custom") return Number(custom) || 0;
    const r = REFERENCES.find(x => x.id === id);
    return r ? r.offset : 0;
  }
  function toSCE(v, refId, custom) { return v == null || v === "" || isNaN(v) ? null : Number(v) + refOffset(refId, custom); }
  function fromSCE(v, refId, custom) { return v == null ? null : Number(v) - refOffset(refId, custom); }
  function refOptions(selected) {
    return REFERENCES.map(r => `<option value="${r.id}"${r.id === selected ? " selected" : ""}>${esc(r.label)}</option>`).join("");
  }

  // ---------- formatting ----------
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }
  function fmt(v, d = 2, unit = "") {
    if (v == null || v === "" || isNaN(v)) return "—";
    const n = Number(v);
    return (n > 0 && unit === "V" ? "+" : "") + n.toFixed(d) + (unit ? " " + unit : "");
  }
  function fmtV(v) { return fmt(v, 2, "V"); }
  function doiLink(doi) {
    if (!doi) return "—";
    const d = String(doi).replace(/^https?:\/\/(dx\.)?doi\.org\//i, "");
    return `<a href="https://doi.org/${encodeURI(d)}" target="_blank" rel="noopener">${esc(d)}</a>`;
  }
  function num(v) { return v == null || v === "" || isNaN(v) ? null : Number(v); }

  // ---------- structures (OpenChemLib, loaded from CDN) ----------
  /* Structures are drawn once on a large canvas (OpenChemLib keeps a constant bond length there), cropped
     to the molecule, and then scaled to fill the requested box without distortion. Upscaling of very small
     molecules is capped so that O2 or a halide does not become a giant label. Line width stays constant on
     screen (vector-effect in the CSS), so small and large structures look alike. */
  const svgCache = new Map();
  const rawCache = new Map();
  let svgSeq = 0;
  function rawSVG(smiles) {
    if (rawCache.has(smiles)) return rawCache.get(smiles);
    let out = null;
    try {
      const m = window.OCL.Molecule.fromSmiles(smiles);
      const big = m.getAllAtoms() > 45;
      const s = m.toSVG(big ? 1400 : 700, big ? 1000 : 500, undefined, {
        autoCrop: true, autoCropMargin: 10, suppressChiralText: true, suppressCIPParity: true, suppressESR: true, noStereoProblem: true
      });
      const vb = s.match(/viewBox="([-\d.]+) ([-\d.]+) ([\d.]+) ([\d.]+)"/);
      if (vb) out = { svg: s, w: +vb[3], h: +vb[4] };
    } catch (e) { out = null; }
    rawCache.set(smiles, out);
    return out;
  }
  function molSVG(smiles, w = 180, h = 120, maxScale = 1.6) {
    if (!smiles || !window.OCL) return "";
    const key = smiles + "|" + w + "x" + h;
    if (svgCache.has(key)) return svgCache.get(key);
    const r = rawSVG(smiles);
    let out = "";
    if (r) {
      const k = Math.min(w / r.w, h / r.h, maxScale);
      const id = "m" + (++svgSeq);
      out = r.svg
        .replace(/id="mol\d+"/, `id="${id}"`).replace(/#mol\d+/g, "#" + id)
        .replace(/width="[^"]+" height="[^"]+"/, `width="${(r.w * k).toFixed(1)}" height="${(r.h * k).toFixed(1)}" preserveAspectRatio="xMidYMid meet"`)
        .replace(/font-family: sans-serif;/, "font-family: Inter, Helvetica, Arial, sans-serif;");
    }
    svgCache.set(key, out);
    return out;
  }
  /* Metal complexes are stored as dot-separated fragments (metal ion, ligands, counter-ions). Drawn as one
     molecule they scatter, and octahedral coordinates overlap, so they are shown as a metal label plus each
     distinct ligand with its multiplicity; counter-ions are left out of the drawing. */
  const METAL_RE = /\[(Ir|Ru|Os|Cu|Fe|Cr|Co|Ni|Pt|Pd|Au|Ag|Zr|Ce|Re|W|Zn|Mg|U|Ti|Cd|Mo|Mn|V|Rh|Eu|La|Sm)\b[^\]]*\]/;
  function isCounterIon(frag) {
    if (METAL_RE.test(frag)) return false;
    const heavy = (frag.match(/Cl|Br|[BCNOFPSI]/g) || []).length;
    if (!/[cC]/.test(frag.replace(/Cl/g, ""))) return heavy <= 7;                // PF6-, BF4-, Cl-, ClO4-, SbF6-
    return heavy <= 9 && /S/.test(frag) && /F/.test(frag) && !/c/.test(frag);  // OTf-, NTf2-like
  }
  function complexParts(smiles) {
    if (!smiles || smiles.indexOf(".") < 0 || !METAL_RE.test(smiles)) return null;
    const frags = smiles.split(".").filter(f => f && !isCounterIon(f));
    const metals = frags.filter(f => METAL_RE.test(f) && (f.match(/[A-Za-z]/g) || []).length <= 6);
    const ligands = frags.filter(f => !metals.includes(f));
    if (!metals.length || !ligands.length) return null;
    const groups = new Map();
    ligands.forEach(f => {
      let k = f;
      try { k = window.OCL.Molecule.fromSmiles(f).getIDCode(); } catch (e) { /* keep text key */ }
      const g = groups.get(k) || { smiles: f, n: 0 };
      g.n++; groups.set(k, g);
    });
    const metal = metals[0].match(METAL_RE)[1];
    const charge = (metals[0].match(/\+(\d*)/) || [])[0] || "";
    return { metal, charge, ligands: [...groups.values()].sort((a, b) => b.n - a.n) };
  }
  function structHTML(smiles, w = 180, h = 120) {
    const c = window.OCL ? complexParts(smiles) : null;
    if (!c) return molSVG(smiles, w, h);
    const n = Math.min(c.ligands.length, 3);
    const lw = Math.floor((w - 34) / n) - 4, lh = h - 6;
    return `<div class="complex" title="metal centre + ligands (counter-ions not drawn)">
      <span class="metal">${esc(c.metal)}${c.charge ? `<sup>${esc(c.charge.replace("+", ""))}+</sup>` : ""}</span>
      ${c.ligands.slice(0, 3).map(l => `<span class="lig">${molSVG(l.smiles, lw, lh - (l.n > 1 ? 12 : 0), 1.2)}${l.n > 1 ? `<b>×${l.n}</b>` : ""}</span>`).join("")}</div>`;
  }
  function molFromSmiles(smiles) { try { return window.OCL.Molecule.fromSmiles(smiles); } catch (e) { return null; } }

  // ---------- backend: data ----------
  async function fetchLocal(path) {
    const r = await fetch(path, { cache: "no-cache" });
    if (!r.ok) throw new Error("Cannot read " + path);
    return r.json();
  }
  // The local JSON uses camel-less raw field names (E_ox...); normalise to the database names.
  function normMol(m, i) {
    const o = {};
    for (const k of Object.keys(m)) o[k.toLowerCase()] = m[k];
    if (o.id == null) o.id = i + 1;
    if (!o.status) o.status = "approved";
    return o;
  }
  async function loadMolecules(opts = {}) {
    if (sb) {
      let q = sb.from("molecules").select("*").order("name");
      if (!opts.all) q = q.eq("status", "approved");
      const { data, error } = await q.range(0, 9999);
      if (error) throw error;
      return data;
    }
    const data = (await fetchLocal("../data/molecules.json")).map(normMol);
    return opts.all ? data : data.filter(m => m.status === "approved");
  }
  async function loadReactions() {
    if (sb) {
      const { data, error } = await sb.from("reactions").select("*").eq("status", "approved").order("name");
      if (error) throw error;
      return data.map(r => Object.assign({}, r.data || {}, { id: r.id, status: r.status }));
    }
    return fetchLocal("../data/reactions.json");
  }

  // ---------- backend: sign-in ----------
  async function session() {
    if (!sb) return null;
    const { data } = await sb.auth.getSession();
    return data.session;
  }
  async function signIn(email, password) {
    const { data, error } = await sb.auth.signInWithPassword({ email: email.trim(), password });
    if (error) throw error;
    return data.session;
  }
  async function signOut() { if (sb) await sb.auth.signOut(); location.reload(); }
  async function myRole() {
    if (!sb) return "superadmin"; // local preview: everything visible
    const { data, error } = await sb.rpc("my_role");
    if (error) return null;
    return data;
  }

  /* Gate: in remote mode nothing is shown until a listed member signs in.
     Calls onReady({role, email}) when access is granted. */
  async function gate(onReady) {
    const gateEl = document.getElementById("gate");
    const body = document.getElementById("app-body");
    const who = document.getElementById("who");
    const out = document.getElementById("signout");
    if (!remote) {
      try { await fetchLocal("../data/molecules.json"); }
      catch (e) {
        gateEl.hidden = false;
        gateEl.innerHTML = `<div class="card"><h2>Not open yet</h2><p class="hint">The site has not been connected to its database.</p></div>`;
        return;
      }
      body.hidden = false;
      if (who) { who.hidden = false; who.textContent = "Local preview"; }
      onReady({ role: "superadmin", email: null, local: true });
      return;
    }
    const s = await session();
    if (!s) {
      gateEl.hidden = false;
      const form = gateEl.querySelector("form");
      form.addEventListener("submit", async ev => {
        ev.preventDefault();
        const err = form.querySelector(".err");
        err.hidden = true;
        try {
          await signIn(form.email.value, form.password.value);
          location.reload();
        } catch (e) { err.textContent = e.message || "Sign-in failed"; err.hidden = false; }
      });
      return;
    }
    const role = await myRole();
    if (!role) {
      gateEl.hidden = false;
      gateEl.innerHTML = `<div class="card"><h2>No access</h2><p>You are signed in as <b>${esc(s.user.email)}</b>, but this account has not been given access. Ask the administrator.</p><button class="btn" id="gate-out">Sign out</button></div>`;
      document.getElementById("gate-out").onclick = signOut;
      return;
    }
    body.hidden = false;
    if (who) { who.hidden = false; who.textContent = s.user.email + " · " + role; }
    if (out) { out.hidden = false; out.onclick = signOut; }
    onReady({ role, email: s.user.email });
  }

  // ---------- theme ----------
  function initTheme() {
    const btn = document.getElementById("theme");
    const order = ["auto", "light", "dark"];
    let t = "auto";
    try { t = localStorage.getItem("rdb-theme") || "auto"; } catch (e) { /* storage off */ }
    const apply = () => {
      if (t === "auto") document.documentElement.removeAttribute("data-theme");
      else document.documentElement.setAttribute("data-theme", t);
      if (btn) btn.textContent = "Theme: " + t[0].toUpperCase() + t.slice(1);
    };
    apply();
    if (btn) btn.onclick = () => {
      t = order[(order.indexOf(t) + 1) % 3];
      try { localStorage.setItem("rdb-theme", t); } catch (e) { /* ignore */ }
      apply();
    };
  }

  // ---------- downloads ----------
  function download(name, text, type = "text/plain") {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([text], { type }));
    a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }
  function toCSV(rows, cols) {
    const q = v => {
      if (v == null) return "";
      const s = Array.isArray(v) ? v.join("; ") : String(v);
      return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
    };
    return [cols.join(","), ...rows.map(r => cols.map(c => q(r[c])).join(","))].join("\n");
  }

  /* Numeric table parser for instrument exports (CSV, TSV, semicolon, spaces; comma decimals;
     header lines skipped). Returns { headers: [..], cols: [[..], ..] } using the longest numeric block. */
  function parseNumericTable(text) {
    const lines = text.replace(/\r/g, "").split("\n");
    const sample = lines.slice(0, 200).join("\n");
    const counts = { "\t": (sample.match(/\t/g) || []).length, ";": (sample.match(/;/g) || []).length, ",": (sample.match(/,/g) || []).length };
    let delim = counts["\t"] ? "\t" : counts[";"] ? ";" : null;
    // comma as delimiter only if lines don't look like decimal commas between two numbers each
    if (!delim && counts[","]) {
      const decComma = lines.slice(0, 50).some(l => /^\s*-?\d+,\d+\s+-?\d+,\d+/.test(l));
      delim = decComma ? null : ",";
    }
    const split = l => (delim ? l.split(delim) : l.trim().split(/\s+/)).map(s => s.trim());
    const toNum = s => {
      if (s === "") return NaN;
      let t = s.replace(/^"|"$/g, "");
      if (delim !== "," && /^-?\d*,\d+(e[-+]?\d+)?$/i.test(t)) t = t.replace(",", ".");
      return /^[-+]?(\d+\.?\d*|\.\d+)(e[-+]?\d+)?$/i.test(t) ? parseFloat(t) : NaN;
    };
    let best = { start: 0, len: 0, ncol: 0 }, cur = null, lastHeader = null, header = null;
    lines.forEach((l, i) => {
      if (!l.trim()) { cur = null; return; }
      const parts = split(l);
      const nums = parts.map(toNum);
      const nNum = nums.filter(v => !isNaN(v)).length;
      if (nNum >= 2 && nNum >= parts.length - 1) {
        if (!cur || cur.ncol !== parts.length) cur = { start: i, len: 0, ncol: parts.length, header: lastHeader };
        cur.len++;
        if (cur.len > best.len) best = Object.assign({}, cur);
      } else { cur = null; lastHeader = parts; }
    });
    header = best.header;
    const cols = Array.from({ length: best.ncol }, () => []);
    for (let i = best.start; i < best.start + best.len; i++) {
      split(lines[i]).forEach((s, j) => { if (j < best.ncol) cols[j].push(toNum(s)); });
    }
    const headers = Array.from({ length: best.ncol }, (_, j) => (header && header[j]) || "column " + (j + 1));
    return { headers, cols };
  }

  // ---------- modal ----------
  function modal(html) {
    const back = document.createElement("div");
    back.className = "modal-back";
    back.innerHTML = `<div class="modal" role="dialog" aria-modal="true"><button class="btn small ghost close" aria-label="Close">✕</button>${html}</div>`;
    const close = () => { back.remove(); document.removeEventListener("keydown", onKey); };
    const onKey = e => { if (e.key === "Escape") close(); };
    back.addEventListener("click", e => { if (e.target === back || e.target.closest(".close")) close(); });
    document.addEventListener("keydown", onKey);
    document.body.appendChild(back);
    return { el: back.querySelector(".modal"), close };
  }

  window.RDB = {
    remote, sb, MOL_FIELDS, REFERENCES, REF_DOI, refOffset, toSCE, fromSCE, refOptions,
    esc, fmt, fmtV, num, doiLink, molSVG, structHTML, molFromSmiles,
    loadMolecules, loadReactions, session, signIn, signOut, myRole, gate, initTheme,
    download, toCSV, modal, parseNumericTable
  };
})();
