/* RedoxDB — submission form (new molecule or correction). Shared with the admin editor. */
(function () {
  "use strict";
  const { esc, num } = RDB;

  const FIELDS = [
    ["name", "Name *", "text"], ["aliases", "Aliases (comma separated)", "text"], ["iupac_name", "IUPAC name", "text"],
    ["smiles", "SMILES", "text"], ["cas", "CAS", "text"],
    ["category", "Type *", "select", ["photocatalyst", "substrate"]],
    ["kind", "Kind", "select", ["organic", "organometallic", "inorganic"]],
    ["class", "Class", "text"], ["functional_groups", "Activated group(s) (comma separated)", "text"],
    ["e_ox", "E_ox (M•+/M), V", "number"], ["e_ox_type", "E_ox type", "select", ["", "E1/2", "Ep", "Ep/2", "calc"]],
    ["e_red", "E_red (M/M•−), V", "number"], ["e_red_type", "E_red type", "select", ["", "E1/2", "Ep", "Ep/2", "calc"]],
    ["e00", "E0,0 (eV)", "number"], ["excited_state", "Excited state", "select", ["", "S1", "T1", "MLCT (T1)", "mixed"]],
    ["e_star_ox", "E*ox (M•+/M*), V — blank = E_ox − E0,0", "number"], ["e_star_red", "E*red (M*/M•−), V — blank = E_red + E0,0", "number"],
    ["tau_ns", "Lifetime τ (ns)", "number"], ["lambda_abs_nm", "λ abs (nm)", "number"], ["lambda_em_nm", "λ em (nm)", "number"],
    ["solvent", "Solvent", "text"], ["electrolyte", "Electrolyte", "text"],
    ["doi", "Source DOI *", "text"], ["review_doi", "Review DOI", "text"],
    ["confidence", "Reliability", "select", ["medium", "high", "low"]],
    ["notes", "Notes", "textarea"]
  ];
  const ARRAYS = ["aliases", "functional_groups"];
  const NUMS = ["e_ox", "e_red", "e00", "e_star_ox", "e_star_red", "tau_ns", "lambda_abs_nm", "lambda_em_nm"];

  function formHTML(prefix, withRef) {
    return `<div class="grid c3">${FIELDS.map(([k, lab, type, opts]) => {
      const id = prefix + k;
      if (type === "select") return `<label class="field">${esc(lab)}<select id="${id}">${opts.map(o => `<option value="${esc(o)}">${esc(o || "—")}</option>`).join("")}</select></label>`;
      if (type === "textarea") return `<label class="field" style="grid-column:1/-1">${esc(lab)}<textarea id="${id}" rows="3"></textarea></label>`;
      return `<label class="field">${esc(lab)}<input id="${id}" type="${type === "number" ? "number" : "text"}" ${type === "number" ? 'step="any"' : ""}></label>`;
    }).join("")}
    ${withRef ? `<label class="field">Potentials above are vs<select id="${prefix}ref">${RDB.refOptions("SCE")}</select></label>
    <label class="field">Custom offset (if chosen)<input id="${prefix}refcustom" type="number" step="0.001" value="0"></label>` : ""}
    </div><div class="row" style="margin-top:10px"><div class="big-struct" id="${prefix}preview" style="height:160px;max-width:260px"></div><p class="hint" id="${prefix}smimsg"></p></div>`;
  }
  function fill(root, prefix, m) {
    FIELDS.forEach(([k]) => {
      const e = root.querySelector("#" + prefix + k);
      if (!e) return;
      const v = m ? m[k] : null;
      e.value = v == null ? "" : Array.isArray(v) ? v.join(", ") : v;
    });
    preview(root, prefix);
  }
  function read(root, prefix) {
    const o = {};
    FIELDS.forEach(([k]) => {
      const e = root.querySelector("#" + prefix + k);
      let v = e.value.trim();
      if (ARRAYS.includes(k)) o[k] = v ? v.split(",").map(s => s.trim()).filter(Boolean) : [];
      else if (NUMS.includes(k)) o[k] = num(v);
      else o[k] = v || null;
    });
    const refSel = root.querySelector("#" + prefix + "ref");
    if (refSel && refSel.value !== "SCE") {
      const off = RDB.refOffset(refSel.value, root.querySelector("#" + prefix + "refcustom").value);
      ["e_ox", "e_red", "e_star_ox", "e_star_red"].forEach(k => { if (o[k] != null) o[k] = +(o[k] + off).toFixed(3); });
      o.ref_original = refSel.value;
      o.conversion = `E(SCE) = E(${refSel.value}) ${off >= 0 ? "+" : "−"} ${Math.abs(off).toFixed(3)} V`;
    } else if (refSel) o.ref_original = "SCE";
    if (o.e_star_ox == null && o.e_ox != null && o.e00 != null) o.e_star_ox = +(o.e_ox - o.e00).toFixed(3);
    if (o.e_star_red == null && o.e_red != null && o.e00 != null) o.e_star_red = +(o.e_red + o.e00).toFixed(3);
    if (o.doi) o.doi = o.doi.replace(/^https?:\/\/(dx\.)?doi\.org\//i, "").trim();
    if (o.review_doi) o.review_doi = o.review_doi.replace(/^https?:\/\/(dx\.)?doi\.org\//i, "").trim();
    return o;
  }
  function validate(o) {
    const errs = [];
    if (!o.name) errs.push("Name is required.");
    if (!o.category) errs.push("Type is required.");
    if (!o.doi) errs.push("A source DOI is required.");
    else if (!/^10\.\d{4,9}\/\S+$/.test(o.doi)) errs.push("The DOI does not look like 10.xxxx/…");
    ["e_ox", "e_red", "e_star_ox", "e_star_red"].forEach(k => { if (o[k] != null && Math.abs(o[k]) > 4) errs.push(k + " is outside ±4 V."); });
    if (o.e00 != null && (o.e00 < 0.5 || o.e00 > 5)) errs.push("E0,0 should be between 0.5 and 5 eV.");
    if (o.smiles && window.OCL && !RDB.molFromSmiles(o.smiles)) errs.push("The SMILES cannot be parsed.");
    if (o.e_ox == null && o.e_red == null && o.e_star_ox == null && o.e_star_red == null) errs.push("Give at least one potential.");
    return errs;
  }
  function preview(root, prefix) {
    const s = root.querySelector("#" + prefix + "smiles").value.trim();
    root.querySelector("#" + prefix + "preview").innerHTML = s ? RDB.molSVG(s, 260, 160) : "";
    root.querySelector("#" + prefix + "smimsg").textContent = s && window.OCL && !RDB.molFromSmiles(s) ? "SMILES not recognised" : "";
  }
  function wirePreview(root, prefix) {
    let t;
    root.querySelector("#" + prefix + "smiles").addEventListener("input", () => { clearTimeout(t); t = setTimeout(() => preview(root, prefix), 300); });
  }

  function render(root, mols, ctx) {
    const qs = new URLSearchParams(location.hash.split("?")[1] || "");
    const fix = qs.get("fix") ? mols.find(m => String(m.id) === qs.get("fix")) : null;
    root.innerHTML = `<div class="card stack">
      <h2>${fix ? "Suggest a correction: " + esc(fix.name) : "Submit a molecule"}</h2>
      <p class="hint">${fix ? "Change the fields that are wrong; the curator sees old and new values side by side." : "New entries are stored as pending and appear after a curator approves them."} All potentials are stored vs SCE: choose your reference and they are converted.</p>
      ${formHTML("s-", true)}
      <div class="row"><button class="btn primary" id="s-send">${fix ? "Send correction" : "Submit"}</button>${fix ? '<a class="btn" href="#submit">New molecule instead</a>' : ""}</div>
      <div id="s-msg"></div></div>`;
    fill(root, "s-", fix);
    wirePreview(root, "s-");
    root.querySelector("#s-send").onclick = async () => {
      const o = read(root, "s-");
      const errs = validate(o);
      const msg = root.querySelector("#s-msg");
      if (errs.length) { msg.innerHTML = `<p class="err">${errs.map(esc).join("<br>")}</p>`; return; }
      o.status = "pending";
      if (fix) o.corrects_id = fix.id;
      if (!RDB.remote) {
        RDB.download((fix ? "correction-" : "submission-") + (o.name || "entry").replace(/\W+/g, "_") + ".json", JSON.stringify(o, null, 2), "application/json");
        msg.innerHTML = '<p class="notice info">Local preview: the entry was saved as a JSON file. Add it to <code>data/raw/</code> and rebuild.</p>';
        return;
      }
      o.submitted_by = ctx.email;
      const { error } = await RDB.sb.from("molecules").insert(o);
      msg.innerHTML = error ? `<p class="err">${esc(error.message)}</p>` : '<p class="notice info">Thank you — the entry is in the review queue.</p>';
    };
  }

  window.RDBSubmit = { render, formHTML, fill, read, validate, wirePreview, FIELDS };
})();
