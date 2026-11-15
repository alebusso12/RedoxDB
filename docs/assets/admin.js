/* RedoxDB — admin page: review queue, entry editor, members (superadmin), activity log. */
(function () {
  "use strict";
  RDB.initTheme();
  const { esc, fmt, sb } = RDB;
  let ctx = null, all = [];

  const COMPARE = ["name", "smiles", "category", "kind", "e_ox", "e_ox_type", "e_red", "e_red_type", "e00", "excited_state",
    "e_star_ox", "e_star_red", "tau_ns", "solvent", "doi", "review_doi", "confidence", "notes"];

  async function load() {
    all = await RDB.loadMolecules({ all: true });
    const pend = all.filter(m => m.status === "pending");
    document.getElementById("q-count").textContent = pend.length || "";
  }
  async function update(id, patch) {
    if (!RDB.remote) { alert("Local preview: changes cannot be saved. Connect Supabase first (see README)."); return false; }
    const { error } = await sb.from("molecules").update(patch).eq("id", id);
    if (error) { alert(error.message); return false; }
    return true;
  }
  async function remove(id) {
    if (!RDB.remote) { alert("Local preview: changes cannot be saved."); return false; }
    const { error } = await sb.from("molecules").delete().eq("id", id);
    if (error) { alert(error.message); return false; }
    return true;
  }

  /* Literature import: only from a local copy of the repository (data/ is not published), superadmin only.
     Rows carry an import_key, so importing twice adds nothing. */
  async function localBatch() {
    try {
      const [m, r] = await Promise.all([fetch("../data/molecules.json", { cache: "no-cache" }), fetch("../data/reactions.json", { cache: "no-cache" })]);
      if (!m.ok || !r.ok) return null;
      return { mols: await m.json(), rxns: await r.json() };
    } catch (e) { return null; }
  }
  async function importBatch(batch, out) {
    const known = new Set(all.map(m => m.import_key).filter(Boolean));
    const rows = batch.mols.filter(m => !known.has(m.import_key)).map(m => {
      const o = {};
      RDB.MOL_FIELDS.concat(["status", "import_key"]).forEach(k => { o[k] = m[k] ?? null; });
      o.aliases = o.aliases || []; o.functional_groups = o.functional_groups || [];
      return o;
    });
    let done = 0;
    for (let i = 0; i < rows.length; i += 100) {
      const { error } = await sb.from("molecules").upsert(rows.slice(i, i + 100), { onConflict: "import_key", ignoreDuplicates: true });
      if (error) { out.innerHTML = `<span class="err">Stopped after ${done}: ${esc(error.message)}</span>`; return; }
      done += Math.min(100, rows.length - i);
      out.textContent = `Imported ${done} / ${rows.length} molecules…`;
    }
    const { error } = await sb.from("reactions").upsert(batch.rxns.map(r => ({ id: r.id, name: r.name, data: r, status: "approved" })), { onConflict: "id" });
    out.innerHTML = error ? `<span class="err">Reactions: ${esc(error.message)}</span>` : `Done: ${done} new molecules, ${batch.rxns.length} reaction types.`;
    await refresh();
  }

  // ------------------------------------------------------------------ queue
  async function renderQueue(el) {
    const pend = all.filter(m => m.status === "pending");
    const nw = pend.filter(m => !m.corrects_id), fixes = pend.filter(m => m.corrects_id);
    const batch = RDB.remote && ctx.role === "superadmin" ? await localBatch() : null;
    const missing = batch ? batch.mols.filter(m => !all.some(x => x.import_key === m.import_key)).length : 0;
    el.innerHTML = `<div class="stack">
      ${!RDB.remote ? '<p class="notice">Local preview: the queue is read-only until the site is connected to Supabase.</p>' : ""}
      ${batch && (missing || !all.length) ? `<div class="notice info row"><span>${missing} literature molecules from <code>data/molecules.json</code> are not in the database yet.</span><span class="spacer"></span><button class="btn small primary" id="imp-go">Import literature data</button><span id="imp-out" class="hint"></span></div>` : ""}
      <p class="hint">${nw.length} new or incomplete entries, ${fixes.length} corrections. Entries without any potential (from the literature import) also wait here until someone completes them.</p>
      <div class="row"><label class="check"><input type="checkbox" id="q-all"> select all</label>
        <button class="btn small" id="q-approve">Approve selected</button><button class="btn small danger" id="q-reject">Reject selected</button></div>
      ${fixes.map(fixCard).join("")}
      ${nw.map(newCard).join("") || '<p class="hint">The queue is empty.</p>'}
    </div>`;
    const imp = el.querySelector("#imp-go");
    if (imp) imp.onclick = () => { imp.disabled = true; importBatch(batch, el.querySelector("#imp-out")); };
    el.querySelectorAll("[data-act]").forEach(b => b.addEventListener("click", () => act(b.dataset.act, +b.dataset.id)));
    el.querySelector("#q-all").addEventListener("change", e => el.querySelectorAll(".q-sel").forEach(c => { c.checked = e.target.checked; }));
    const bulk = async status => {
      const ids = [...el.querySelectorAll(".q-sel:checked")].map(c => +c.value);
      if (!ids.length) return;
      const items = all.filter(m => ids.includes(m.id) && !m.corrects_id);
      if (status === "approved" && items.some(m => m.e_ox == null && m.e_red == null && m.e_star_ox == null && m.e_star_red == null)) {
        alert("Some selected entries have no potentials: complete them before approving."); return;
      }
      for (const m of items) await update(m.id, { status });
      await refresh();
    };
    el.querySelector("#q-approve").onclick = () => bulk("approved");
    el.querySelector("#q-reject").onclick = () => bulk("rejected");
  }
  function newCard(m) {
    return `<div class="card"><div class="row"><input type="checkbox" class="q-sel" value="${m.id}">
      <h3 style="margin:0">${esc(m.name)}</h3>${RDBDatabase.catBadge(m)}${RDBDatabase.confBadge(m.confidence)}<span class="spacer"></span>
      <span class="hint">${m.submitted_by ? "by " + esc(m.submitted_by) : "literature import"}</span></div>
      <div class="row" style="margin-top:8px"><div class="struct" style="width:140px;height:90px">${RDB.structHTML(m.smiles, 140, 90)}</div>
      <div class="hint">E<sub>ox</sub> ${fmt(m.e_ox)} · E<sub>red</sub> ${fmt(m.e_red)} · E<sub>0,0</sub> ${fmt(m.e00)} · E*<sub>ox</sub> ${fmt(m.e_star_ox)} · E*<sub>red</sub> ${fmt(m.e_star_red)}<br>
      ${esc(m.solvent || "")} · ${RDB.doiLink(m.doi)}<br>${esc(m.notes || "")}</div></div>
      <div class="row end"><button class="btn small" data-act="edit" data-id="${m.id}">Edit</button>
      <button class="btn small primary" data-act="approve" data-id="${m.id}">Approve</button>
      <button class="btn small danger" data-act="reject" data-id="${m.id}">Reject</button></div></div>`;
  }
  function fixCard(c) {
    const t = all.find(m => m.id === c.corrects_id);
    const same = (a, b) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null) || (a == null && Array.isArray(b) && !b.length);
    const diffs = t ? COMPARE.filter(k => !same(c[k], t[k])) : [];
    return `<div class="card" style="border-color:var(--pc)"><div class="row"><span class="badge pc">correction</span><h3 style="margin:0">${esc(t ? t.name : "deleted entry")}</h3><span class="spacer"></span><span class="hint">by ${esc(c.submitted_by || "?")}</span></div>
      <div class="table-wrap" style="margin-top:8px"><table><thead><tr><th>Field</th><th>Now</th><th>Proposed</th></tr></thead><tbody>
      ${diffs.map(k => `<tr><td>${k}</td><td>${esc(fmtv(t[k]))}</td><td><b>${esc(fmtv(c[k]))}</b></td></tr>`).join("") || '<tr><td colspan="3" class="hint">No changed field.</td></tr>'}
      </tbody></table></div>
      <div class="row end"><button class="btn small primary" data-act="merge" data-id="${c.id}">Apply correction</button><button class="btn small danger" data-act="reject" data-id="${c.id}">Reject</button></div></div>`;
  }
  const fmtv = v => v == null ? "—" : Array.isArray(v) ? v.join(", ") : String(v);

  async function act(what, id) {
    const m = all.find(x => x.id === id);
    if (!m) return;
    if (what === "edit") return editor(m);
    if (what === "approve") {
      if (m.e_ox == null && m.e_red == null && m.e_star_ox == null && m.e_star_red == null) { alert("This entry has no potentials: edit it first."); return; }
      if (await update(id, { status: "approved" })) await refresh();
    }
    if (what === "reject" && confirm(`Reject "${m.name}"?`)) { if (await update(id, { status: "rejected" })) await refresh(); }
    if (what === "merge") {
      const t = all.find(x => x.id === m.corrects_id);
      const patch = {};
      COMPARE.concat(["aliases", "functional_groups", "iupac_name", "cas", "lambda_abs_nm", "lambda_em_nm", "electrolyte", "ref_original", "conversion"])
        .forEach(k => { if (JSON.stringify(m[k] ?? null) !== JSON.stringify(t[k] ?? null)) patch[k] = m[k]; });
      if (await update(t.id, patch) && await update(m.id, { status: "merged" })) await refresh();
    }
  }

  // ------------------------------------------------------------------ editor
  function editor(m) {
    const md = RDB.modal(`<h2>Edit: ${esc(m.name)}</h2>
      ${RDBSubmit.formHTML("e-", false)}
      <label class="field" style="margin-top:10px">Curator note (not shown publicly)<textarea id="e-cnote" rows="2">${esc(m.curator_note || "")}</textarea></label>
      <div class="row" style="margin-top:12px">
        <label class="field" style="max-width:200px">Status<select id="e-status">${["pending", "approved", "rejected"].map(s => `<option${s === m.status ? " selected" : ""}>${s}</option>`).join("")}</select></label>
        <button class="btn small" id="e-pubchem" type="button">Name/CAS from PubChem</button>
        <span class="spacer"></span>
        <button class="btn danger" id="e-del">Delete permanently</button>
        <button class="btn primary" id="e-save">Save</button></div>
      <div id="e-msg"></div>`);
    const root = md.el;
    RDBSubmit.fill(root, "e-", m);
    RDBSubmit.wirePreview(root, "e-");
    root.querySelector("#e-save").onclick = async () => {
      const o = RDBSubmit.read(root, "e-");
      const errs = RDBSubmit.validate(o).filter(e => !(o.status === "pending" && /potential/.test(e)));
      if (errs.length) { root.querySelector("#e-msg").innerHTML = `<p class="err">${errs.map(esc).join("<br>")}</p>`; return; }
      o.curator_note = root.querySelector("#e-cnote").value.trim() || null;
      o.status = root.querySelector("#e-status").value;
      if (await update(m.id, o)) { md.close(); await refresh(); }
    };
    root.querySelector("#e-del").onclick = async () => {
      if (!confirm(`Delete "${m.name}" permanently? This cannot be undone (the activity log keeps a copy).`)) return;
      if (await remove(m.id)) { md.close(); await refresh(); }
    };
    root.querySelector("#e-pubchem").onclick = async () => {
      const smi = root.querySelector("#e-smiles").value.trim();
      const msg = root.querySelector("#e-msg");
      if (!smi) { msg.innerHTML = '<p class="err">Enter a SMILES first.</p>'; return; }
      msg.innerHTML = '<p class="hint">Asking PubChem…</p>';
      try {
        const base = "https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/smiles/";
        const p = await (await fetch(base + "property/IUPACName/JSON?smiles=" + encodeURIComponent(smi))).json();
        const cid = p.PropertyTable.Properties[0].CID;
        root.querySelector("#e-iupac_name").value = p.PropertyTable.Properties[0].IUPACName || "";
        const syn = await (await fetch(`https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${cid}/synonyms/JSON`)).json();
        const cas = (syn.InformationList.Information[0].Synonym || []).filter(s => /^\d{2,7}-\d{2}-\d$/.test(s));
        if (cas.length) root.querySelector("#e-cas").value = cas[0];
        msg.innerHTML = `<p class="hint">PubChem CID ${cid}${cas.length > 1 ? " · other CAS listed: " + esc(cas.slice(1, 4).join(", ")) : ""}. Check before saving.</p>`;
      } catch (e) { msg.innerHTML = '<p class="err">PubChem did not find this structure.</p>'; }
    };
  }

  // ------------------------------------------------------------------ all entries
  function renderEntries(el) {
    el.innerHTML = `<div class="card stack"><div class="grid c4">
      <label class="field">Search<input id="x-q" type="search"></label>
      <label class="field">Status<select id="x-st"><option value="">All</option><option>approved</option><option>pending</option><option>rejected</option><option>merged</option></select></label>
      <label class="field">Reliability<select id="x-cf"><option value="">All</option><option>high</option><option>medium</option><option>low</option></select></label>
      <div class="row" style="align-self:end"><button class="btn small" id="x-csv">Export all (CSV)</button><button class="btn small" id="x-json">Export all (JSON)</button></div></div>
      <p class="hint" id="x-n"></p></div>
      <div class="table-wrap" style="margin-top:14px"><table><thead><tr><th>Name</th><th>Type</th><th>Status</th><th>Reliability</th><th class="num">E<sub>ox</sub></th><th class="num">E<sub>red</sub></th><th class="num">E*<sub>ox</sub></th><th class="num">E*<sub>red</sub></th><th>DOI</th></tr></thead><tbody id="x-body"></tbody></table></div>`;
    const $ = id => el.querySelector("#" + id);
    const draw = () => {
      const q = $("x-q").value.toLowerCase(), st = $("x-st").value, cf = $("x-cf").value;
      const rows = all.filter(m => (!st || m.status === st) && (!cf || m.confidence === cf) && (!q || [m.name, ...(m.aliases || [])].join(" ").toLowerCase().includes(q)));
      $("x-n").textContent = rows.length + " entries";
      $("x-body").innerHTML = rows.map(m => `<tr data-id="${m.id}"><td>${esc(m.name)}</td><td>${RDBDatabase.catBadge(m)}</td><td>${esc(m.status)}</td><td>${RDBDatabase.confBadge(m.confidence)}</td>
        <td class="num">${fmt(m.e_ox)}</td><td class="num">${fmt(m.e_red)}</td><td class="num">${fmt(m.e_star_ox)}</td><td class="num">${fmt(m.e_star_red)}</td><td class="hint">${esc(m.doi || "")}</td></tr>`).join("");
    };
    ["x-q", "x-st", "x-cf"].forEach(id => $(id).addEventListener("input", draw));
    $("x-body").addEventListener("click", e => { const tr = e.target.closest("tr[data-id]"); if (tr) editor(all.find(m => m.id === +tr.dataset.id)); });
    $("x-csv").onclick = () => RDB.download("redoxdb-all.csv", RDB.toCSV(all, ["id", "status"].concat(RDB.MOL_FIELDS, ["curator_note"])), "text/csv");
    $("x-json").onclick = () => RDB.download("redoxdb-all.json", JSON.stringify(all, null, 1), "application/json");
    draw();
  }

  // ------------------------------------------------------------------ members (superadmin)
  async function renderMembers(el) {
    if (!RDB.remote) { el.innerHTML = '<p class="notice">Members are managed once the site is connected to Supabase.</p>'; return; }
    const { data, error } = await sb.from("members").select("*").order("role").order("email");
    if (error) { el.innerHTML = `<p class="err">${esc(error.message)}</p>`; return; }
    el.innerHTML = `<div class="split">
      <div class="card stack"><h3>Give someone access</h3>
        <label class="field">Email<input id="mb-email" type="email"></label>
        <label class="field">Role<select id="mb-role"><option value="viewer">viewer — reads data, uses tools, submits</option><option value="curator">curator — reviews and edits entries</option><option value="superadmin">superadmin — everything, including members</option></select></label>
        <label class="field">Note (optional)<input id="mb-note" placeholder="e.g. PhD student, group X"></label>
        <button class="btn primary" id="mb-add">Add member</button>
        <p class="hint">Then create their login in Supabase: <b>Authentication → Users → Add user → Create new user</b> with the same email, a password and <i>Auto Confirm User</i> ticked, and send them the password privately. Removing someone here revokes their access immediately.</p>
        <p id="mb-msg"></p></div>
      <div class="card"><h3>Members</h3><div class="table-wrap"><table><thead><tr><th>Email</th><th>Role</th><th>Note</th><th>Added</th><th></th></tr></thead><tbody>
      ${data.map(m => `<tr><td>${esc(m.email)}${m.email === (ctx.email || "").toLowerCase() ? ' <span class="badge">you</span>' : ""}</td>
        <td><select data-role="${esc(m.email)}">${["viewer", "curator", "superadmin"].map(r => `<option${r === m.role ? " selected" : ""}>${r}</option>`).join("")}</select></td>
        <td class="hint">${esc(m.note || "")}</td><td class="hint">${new Date(m.added_at).toLocaleDateString()}</td>
        <td><button class="btn small danger" data-del="${esc(m.email)}">Remove</button></td></tr>`).join("")}
      </tbody></table></div></div></div>`;
    const msg = el.querySelector("#mb-msg");
    el.querySelector("#mb-add").onclick = async () => {
      const email = el.querySelector("#mb-email").value.trim().toLowerCase();
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { msg.innerHTML = '<span class="err">Invalid email.</span>'; return; }
      const { error: e } = await sb.from("members").upsert({ email, role: el.querySelector("#mb-role").value, note: el.querySelector("#mb-note").value.trim() || null, added_by: ctx.email });
      if (e) msg.innerHTML = `<span class="err">${esc(e.message)}</span>`; else renderMembers(el);
    };
    el.querySelectorAll("[data-role]").forEach(s => s.addEventListener("change", async () => {
      const { error: e } = await sb.from("members").update({ role: s.value }).eq("email", s.dataset.role);
      if (e) { alert(e.message); renderMembers(el); }
    }));
    el.querySelectorAll("[data-del]").forEach(b => b.addEventListener("click", async () => {
      if (!confirm(`Remove ${b.dataset.del}? They lose access immediately.`)) return;
      const { error: e } = await sb.from("members").delete().eq("email", b.dataset.del);
      if (e) alert(e.message); else renderMembers(el);
    }));
  }

  async function renderAudit(el) {
    if (!RDB.remote) { el.innerHTML = '<p class="notice">The activity log is available once connected to Supabase.</p>'; return; }
    const { data, error } = await sb.from("audit").select("*").order("at", { ascending: false }).limit(300);
    if (error) { el.innerHTML = `<p class="err">${esc(error.message)}</p>`; return; }
    el.innerHTML = `<div class="table-wrap"><table><thead><tr><th>When</th><th>Who</th><th>Table</th><th>Row</th><th>Action</th><th>Change</th></tr></thead><tbody>
      ${data.map(a => {
        const ch = a.before && a.after ? Object.keys(a.after).filter(k => !["updated_at", "reviewed_at"].includes(k) && JSON.stringify(a.after[k]) !== JSON.stringify(a.before[k])).map(k => `${k}: ${fmtv(a.before[k])} → ${fmtv(a.after[k])}`).join("; ") : "";
        const label = (a.after || a.before || {}).name || (a.after || a.before || {}).email || a.row_id;
        return `<tr><td class="hint">${new Date(a.at).toLocaleString()}</td><td>${esc(a.actor || "system")}</td><td>${esc(a.tbl)}</td><td>${esc(label)}</td><td>${esc(a.action)}</td><td class="hint">${esc(ch)}</td></tr>`;
      }).join("")}</tbody></table></div>`;
  }

  // ------------------------------------------------------------------ routing
  const views = { queue: renderQueue, entries: renderEntries, members: renderMembers, audit: renderAudit };
  function route() {
    let sec = (location.hash.slice(1) || "queue").split("?")[0];
    if (!views[sec] || ((sec === "members" || sec === "audit") && ctx.role !== "superadmin")) sec = "queue";
    document.querySelectorAll("section[data-view]").forEach(s => { s.hidden = s.dataset.view !== sec; });
    document.querySelectorAll("nav.sections a").forEach(a => a.classList.toggle("active", a.dataset.sec === sec));
    views[sec](document.getElementById("v-" + sec));
  }
  async function refresh() { await load(); route(); }

  RDB.gate(async c => {
    ctx = c;
    if (c.role !== "superadmin" && c.role !== "curator") {
      document.getElementById("app-body").innerHTML = '<div class="card"><h2>Curators only</h2><p>Your account can use the site but not the admin page.</p><a class="btn" href="index.html">Back</a></div>';
      return;
    }
    if (c.role === "superadmin") { document.getElementById("nav-members").hidden = false; document.getElementById("nav-audit").hidden = false; }
    await load();
    window.addEventListener("hashchange", route);
    route();
  });
})();
