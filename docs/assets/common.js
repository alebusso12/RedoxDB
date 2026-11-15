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
  const METAL_RE = /\[(Ir|Ru|Os|Cu|Fe|Cr|Co|Ni|Pt|Pd|Au|Ag|Zr|Ce|Re|W|Zn|Mg|U|Ti|Cd|Mo|Mn|V|Rh|Eu|La|Sm)\b[^\]]*\]/;
  function isMetalIon(f) { return METAL_RE.test(f) && (f.match(/[A-Za-z]/g) || []).length <= 6; }
  /* Fragments that are only counter-ions: PF6-, BF4-, ClO4-, OTf-, alkali cations, tetraalkylammonium.
     Halide anions count as ligands only when there are three or more of them (e.g. [CeCl6]2-). */
  function isCounterIon(frag, halideCount) {
    if (METAL_RE.test(frag)) return false;
    if (/^\[(Na|K|Li|Cs)\+\]$/.test(frag)) return true;
    if (/^\[(Cl|Br|I|F)-\]$/.test(frag)) return halideCount < 3;
    if (/\[N\+\]/.test(frag) && !/[cn]/.test(frag.replace(/\[N\+\]/g, ""))) return true;   // R4N+
    const heavy = (frag.match(/Cl|Br|[BCNOFPSI]/g) || []).length;
    if (!/[cC]/.test(frag.replace(/Cl/g, ""))) return heavy <= 7;                // PF6-, BF4-, ClO4-, SbF6-
    return heavy <= 9 && /S/.test(frag) && /F/.test(frag) && !/c/.test(frag);  // OTf-
  }

  /* Metal complexes are stored as dot-separated fragments (metal ion + ligands + counter-ions). To draw the
     whole complex, each ligand gets 2D coordinates, its donor atoms are found (anionic C/N/O/S, pyridine-type N,
     phosphine P, nitrile N), chelating ligands are put in their syn (chelating) conformation, and the ligands are
     arranged around the metal, which is joined to the donors with metal–ligand bonds. Macrocycles (porphyrins,
     phthalocyanines) keep the metal at the centre of their four N donors. */
  function buildComplex(smiles) {
    const K = window.OCL.Molecule;
    const all = smiles.split(".").filter(Boolean);
    // carbonyl complexes (e.g. Re(bpy)(CO)3Cl) carry their halide as a ligand
    const halides = all.filter(f => /^\[(Cl|Br|I|F)-\]$/.test(f)).length + (all.some(f => f === "[C-]#[O+]") ? 3 : 0);
    const frags = all.filter(f => !isCounterIon(f, halides));
    const metalFrag = frags.find(isMetalIon);
    const ligs = frags.filter(f => f !== metalFrag);
    if (!metalFrag || !ligs.length) return null;
    const metalNo = K.fromSmiles(metalFrag).getAtomicNo(0);
    const info = ligs.map(f => {
      const L = K.fromSmiles(f);
      L.inventCoordinates();
      L.ensureHelperArrays(K.cHelperRings);
      const n = L.getAllAtoms(), cand = [];
      for (let a = 0; a < n; a++) {
        const z = L.getAtomicNo(a), q = L.getAtomCharge(a), conn = L.getConnAtoms(a);
        if (q < 0 && [6, 7, 8, 16, 9, 17, 35, 53].includes(z)) cand.push(a);
        else if (z === 7 && L.isAromaticAtom(a) && L.getAllHydrogens(a) === 0 && conn === 2) cand.push(a);
        else if (z === 15 && conn === 3) cand.push(a);
        else if (z === 7 && conn === 1 && L.getConnBondOrder(a, 0) === 3) cand.push(a);
      }
      // acac-type ligands: the anionic O and the carbonyl O both bind
      if (cand.length === 1 && L.getAtomicNo(cand[0]) === 8) {
        for (let a = 0; a < n; a++) if (a !== cand[0] && L.getAtomicNo(a) === 8 && L.getConnAtoms(a) === 1 && L.getConnBondOrder(a, 0) === 2) cand.push(a);
      }
      let donors = cand.slice(0, 1), best = 99;
      const macro = cand.length >= 4 && n > 20 && cand.filter(a => L.getAtomicNo(a) === 7).length >= 4 && L.getAtomRingSize(cand[0]) >= 5 && (() => {
        const Ns = cand.filter(a => L.getAtomicNo(a) === 7);
        return Ns.some((x, i) => Ns.slice(i + 1).some(y => L.getPathLength(x, y) >= 5));
      })();
      if (macro) donors = cand.filter(a => L.getAtomicNo(a) === 7).slice(0, 4);
      else for (let i = 0; i < cand.length; i++) for (let j = i + 1; j < cand.length; j++) {
        const p = L.getPathLength(cand[i], cand[j]);
        if (p >= 2 && p < best && p <= 8) { best = p; donors = [cand[i], cand[j]]; }
      }
      if (!macro && donors.length === 2) makeSyn(L, donors[0], donors[1]);
      return { L, donors, macro };
    });
    let bl = 0, nb = 0;
    info.forEach(({ L }) => { for (let b = 0; b < L.getAllBonds(); b++) { const a1 = L.getBondAtom(0, b), a2 = L.getBondAtom(1, b); bl += Math.hypot(L.getAtomX(a1) - L.getAtomX(a2), L.getAtomY(a1) - L.getAtomY(a2)); nb++; } });
    bl = bl / nb || 1;
    const M = new K(256, 256);
    const mi = M.addAtom(metalNo);
    M.setAtomX(mi, 0); M.setAtomY(mi, 0);
    const outer = info.filter(x => !x.macro);
    info.forEach(({ L, donors, macro }) => {
      const n = L.getAllAtoms();
      let cx = 0, cy = 0;
      for (let a = 0; a < n; a++) { cx += L.getAtomX(a); cy += L.getAtomY(a); }
      cx /= n; cy /= n;
      const mx = donors.length ? donors.reduce((t, a) => t + L.getAtomX(a), 0) / donors.length : cx;
      const my = donors.length ? donors.reduce((t, a) => t + L.getAtomY(a), 0) / donors.length : cy;
      let rot = 0, tx = 0, ty = 0;
      if (!macro) {
        const k = outer.indexOf(outer.find(o => o.L === L));
        const ang = Math.PI / 2 + 2 * Math.PI * k / Math.max(1, outer.length);
        rot = ang - Math.atan2(cy - my, cx - mx);
        const dd = donors.length > 1 ? Math.hypot(L.getAtomX(donors[0]) - L.getAtomX(donors[1]), L.getAtomY(donors[0]) - L.getAtomY(donors[1])) : 0;
        const r = donors.length > 1 ? Math.sqrt(Math.max(0.2 * bl * bl, (1.75 * bl) ** 2 - (dd / 2) ** 2)) : 1.75 * bl;
        tx = r * Math.cos(ang); ty = r * Math.sin(ang);
      }
      const c = Math.cos(rot), s = Math.sin(rot), map = [];
      for (let a = 0; a < n; a++) {
        const x = L.getAtomX(a) - mx, y = L.getAtomY(a) - my;
        const na = M.addAtom(L.getAtomicNo(a));
        M.setAtomX(na, x * c - y * s + tx); M.setAtomY(na, x * s + y * c + ty);
        M.setAtomCharge(na, donors.includes(a) ? 0 : L.getAtomCharge(a));
        // an anionic donor bound to the metal must not get an implicit H (e.g. Cl–M, not HCl–M)
        if (donors.includes(a) && L.getAtomCharge(a) < 0) M.setAtomAbnormalValence(na, L.getOccupiedValence(a));
        map[a] = na;
      }
      for (let b = 0; b < L.getAllBonds(); b++) {
        const nb2 = M.addBond(map[L.getBondAtom(0, b)], map[L.getBondAtom(1, b)]);
        M.setBondType(nb2, L.getBondType(b));
      }
      donors.forEach(d => { const b = M.addBond(mi, map[d]); M.setBondType(b, K.cBondTypeMetalLigand); });
    });
    return M;
  }
  // Put the two donor atoms of a chelating ligand on the same side (e.g. bpy drawn cis, not anti).
  function makeSyn(L, d1, d2) {
    const nbrs = a => { const r = []; for (let i = 0; i < L.getConnAtoms(a); i++) r.push(L.getConnAtom(a, i)); return r; };
    let path = null;
    for (const a of nbrs(d1)) for (const b of nbrs(a)) if (b !== d1 && nbrs(b).includes(d2)) path = [a, b];
    if (!path) return;
    const [a, b] = path;
    const ax = L.getAtomX(a), ay = L.getAtomY(a), bx = L.getAtomX(b), by = L.getAtomY(b);
    const side = (x, y) => Math.sign((bx - ax) * (y - ay) - (by - ay) * (x - ax));
    if (side(L.getAtomX(d1), L.getAtomY(d1)) === side(L.getAtomX(d2), L.getAtomY(d2))) return;
    const seen = new Set([b]), st = [b];
    while (st.length) { const x = st.pop(); for (const y of nbrs(x)) if (y !== a && !seen.has(y)) { seen.add(y); st.push(y); } }
    if (seen.has(a)) return;
    const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy;
    seen.forEach(x => {
      const px = L.getAtomX(x) - ax, py = L.getAtomY(x) - ay, t = (px * dx + py * dy) / l2;
      L.setAtomX(x, ax + 2 * t * dx - px); L.setAtomY(x, ay + 2 * t * dy - py);
    });
  }

  function rawSVG(smiles) {
    if (rawCache.has(smiles)) return rawCache.get(smiles);
    let out = null;
    try {
      let m = null;
      if (smiles.indexOf(".") >= 0 && METAL_RE.test(smiles)) m = buildComplex(smiles);
      if (!m) {
        // plain molecule (drop counter-ions so salts are drawn as the organic ion)
        const parts = smiles.split(".");
        const halides = parts.filter(f => /^\[(Cl|Br|I|F)-\]$/.test(f)).length;
        const keep = parts.length > 1 ? parts.filter(f => !isCounterIon(f, halides)) : parts;
        m = window.OCL.Molecule.fromSmiles((keep.length ? keep : parts).join("."));
        m.inventCoordinates();
      }
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
  function structHTML(smiles, w = 180, h = 120) { return molSVG(smiles, w, h); }
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
      return selectAll("molecules", q => opts.all ? q.order("name") : q.eq("status", "approved").order("name"));
    }
    const data = (await fetchLocal("../data/molecules.json")).map(normMol);
    return opts.all ? data : data.filter(m => m.status === "approved");
  }
  // Supabase returns at most 1000 rows per request: page through larger tables.
  async function selectAll(table, filter) {
    const out = [];
    for (let from = 0; ; from += 1000) {
      let q = sb.from(table).select("*").range(from, from + 999);
      if (filter) q = filter(q);
      const { data, error } = await q;
      if (error) throw error;
      out.push(...data);
      if (data.length < 1000) break;
    }
    return out;
  }
  /* All reported values (measurements) attached to their molecules as m.meas. */
  async function attachMeasurements(mols) {
    let list = [];
    try {
      if (sb) list = await selectAll("measurements");
      else {
        const raw = await fetchLocal("../data/measurements.json");
        const byKey = new Map(mols.map(m => [m.import_key, m.id]));
        list = raw.map(r => Object.assign({}, r, { molecule_id: byKey.get(r.molecule_key) }));
      }
    } catch (e) { list = []; }
    const byId = new Map(mols.map(m => [m.id, m]));
    mols.forEach(m => { m.meas = []; });
    list.forEach(r => { const m = byId.get(r.molecule_id); if (m) m.meas.push(r); });
    return mols;
  }
  /* Summary of one quantity: mean ± SD of experimental values used in the average, and computed mean. */
  function measStats(m, q) {
    const all = (m.meas || []).filter(r => r.quantity === q && r.status !== "rejected");
    const ex = all.filter(r => r.kind === "experimental" && r.in_average !== false).map(r => Number(r.value));
    const calc = all.filter(r => r.kind === "computational").map(r => Number(r.value));
    const stat = v => {
      if (!v.length) return null;
      const mean = v.reduce((a, b) => a + b, 0) / v.length;
      const sd = v.length > 1 ? Math.sqrt(v.reduce((a, b) => a + (b - mean) ** 2, 0) / (v.length - 1)) : null;
      return { mean, sd, n: v.length, min: Math.min(...v), max: Math.max(...v) };
    };
    return { all, exp: stat(ex), calc: stat(calc) };
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
    loadMolecules, loadReactions, attachMeasurements, measStats, selectAll, session, signIn, signOut, myRole, gate, initTheme,
    download, toCSV, modal, parseNumericTable
  };
})();
