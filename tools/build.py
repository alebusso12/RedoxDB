#!/usr/bin/env python3
"""Merge data/raw/*.json into data/molecules.json and write supabase/seed.sql.

- Field names are lower-cased to match the database (E_ox -> e_ox).
- Missing E* values are computed from E_ox/E_red and E00 (and marked in notes).
- Inconsistent E* (|E* - (E ± E00)| > 0.05 V) are reported, the published value is kept.
- Entries without any potential become status 'pending' (curators complete them).
- Duplicates (same name and category, case-insensitive) keep the entry with the higher confidence.
- data/overrides.json (optional) patches entries by name after merging: curator-checked values.

Usage: python3 tools/build.py
"""
import glob
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RAW = os.path.join(ROOT, "data", "raw")
OUT = os.path.join(ROOT, "data", "molecules.json")
SEED = os.path.join(ROOT, "supabase", "seed.sql")
OVR = os.path.join(ROOT, "data", "overrides.json")
REACTIONS = os.path.join(ROOT, "data", "reactions.json")

FIELDS = ["name", "iupac_name", "aliases", "smiles", "cas", "category", "kind", "class", "functional_groups",
          "e_ox", "e_ox_type", "e_red", "e_red_type", "e00", "excited_state", "e_star_ox", "e_star_red", "tau_ns",
          "lambda_abs_nm", "lambda_em_nm", "solvent", "electrolyte", "ref_original", "conversion", "doi", "review_doi",
          "confidence", "notes"]
POT = ["e_ox", "e_red", "e_star_ox", "e_star_red"]
NUM = POT + ["e00", "tau_ns", "lambda_abs_nm", "lambda_em_nm"]
RANK = {"high": 3, "medium": 2, "low": 1, None: 0}
DOI_RE = re.compile(r"^10\.\d{4,9}/\S+$")


def norm(e):
    o = {k.lower(): v for k, v in e.items()}
    out = {k: o.get(k) for k in FIELDS}
    for k in ("aliases", "functional_groups"):
        v = out[k]
        out[k] = [] if v is None else ([v] if isinstance(v, str) else list(v))
    for k in NUM:
        v = out[k]
        if isinstance(v, str):
            try:
                v = float(v.replace("−", "-").replace("+", ""))
            except ValueError:
                v = None
        out[k] = v
    for k in ("doi", "review_doi"):
        if out[k]:
            out[k] = re.sub(r"^https?://(dx\.)?doi\.org/", "", str(out[k]).strip(), flags=re.I)
            if not DOI_RE.match(out[k]):
                out[k] = None
    # Ep/2 values were stored as "Ep" with a note by the compilers
    for k in ("e_ox_type", "e_red_type"):
        if out[k] == "Ep" and out["notes"] and out["notes"].lower().startswith("ep/2"):
            out[k] = "Ep/2"
    if out["confidence"] not in RANK:
        out["confidence"] = "low"
    return out


def complete(e, warnings):
    notes = []
    if e["e00"] is not None:
        if e["e_star_ox"] is None and e["e_ox"] is not None:
            e["e_star_ox"] = round(e["e_ox"] - e["e00"], 3)
            notes.append("E*ox calculated as E_ox − E00")
        if e["e_star_red"] is None and e["e_red"] is not None:
            e["e_star_red"] = round(e["e_red"] + e["e00"], 3)
            notes.append("E*red calculated as E_red + E00")
        if e["e_star_ox"] is not None and e["e_ox"] is not None and abs(e["e_star_ox"] - (e["e_ox"] - e["e00"])) > 0.05:
            warnings.append(f"{e['name']}: E*ox {e['e_star_ox']} vs E_ox−E00 {e['e_ox'] - e['e00']:.2f}")
        if e["e_star_red"] is not None and e["e_red"] is not None and abs(e["e_star_red"] - (e["e_red"] + e["e00"])) > 0.05:
            warnings.append(f"{e['name']}: E*red {e['e_star_red']} vs E_red+E00 {e['e_red'] + e['e00']:.2f}")
    if notes:
        e["notes"] = ((e["notes"] + " · ") if e["notes"] else "") + "; ".join(notes)
    for k in POT:
        if e[k] is not None and abs(e[k]) > 4:
            warnings.append(f"{e['name']}: {k} = {e[k]} outside ±4 V")


def key(name):
    return re.sub(r"[\s\-_,()\[\]{}]+", "", name.lower())


def main():
    merged, warnings = {}, []
    for f in sorted(glob.glob(os.path.join(RAW, "*.json"))):
        for raw in json.load(open(f, encoding="utf-8")):
            e = norm(raw)
            if not e["name"] or e["category"] not in ("photocatalyst", "substrate"):
                warnings.append(f"{os.path.basename(f)}: skipped entry without name/category: {raw.get('name')}")
                continue
            e["source_file"] = os.path.basename(f)
            k = e["category"][:3] + ":" + key(e["name"])  # same molecule may be both PC and substrate
            if k in merged:
                old = merged[k]
                if RANK[e["confidence"]] > RANK[old["confidence"]]:
                    merged[k] = e
                warnings.append(f"duplicate name: {e['name']} (kept {merged[k]['source_file']})")
            else:
                merged[k] = e
    if os.path.exists(OVR):
        for name, patch in json.load(open(OVR, encoding="utf-8")).items():
            hits = [k for k in merged if k.split(":", 1)[1] == key(name)]
            if not hits:
                warnings.append(f"override for unknown entry: {name}")
            for k in hits:
                merged[k].update({kk.lower(): vv for kk, vv in patch.items()})
    for e in merged.values():
        complete(e, warnings)

    # ---- measurements: every reported value with its method and source
    meas = []
    def add_meas(e, q, v, **kw):
        m = {"molecule_key": None, "quantity": q, "value": v, "value_type": None, "kind": "experimental",
             "method": None, "solvent": e.get("solvent"), "electrolyte": e.get("electrolyte"),
             "ref_original": e.get("ref_original"), "conversion": e.get("conversion"),
             "doi": None, "confidence": "medium", "notes": None, "source": None}
        m.update(kw)
        m["_mol"] = e
        meas.append(m)
    for e in merged.values():
        for q in ("e_ox", "e_red", "e00", "e_star_ox", "e_star_red"):
            v = e.get(q)
            if v is None:
                continue
            t = e.get(q + "_type") if q in ("e_ox", "e_red") else None
            derived = q.startswith("e_star") and e.get("notes") and (q.replace("e_star_", "E*") + " calculated") in e["notes"]
            if q == "e00":
                vt, method = "E0,0", "spectroscopy (absorption/emission)" + (f", {e['excited_state']}" if e.get("excited_state") else "")
            elif q.startswith("e_star"):
                vt = "derived" if derived else "reported"
                method = ("Rehm–Weller estimate: " + ("E_ox − E0,0" if q == "e_star_ox" else "E_red + E0,0")) if derived else "excited-state potential as reported (ground-state CV + E0,0)"
            else:
                vt = t or "E1/2"
                method = {"Ep": "CV, peak potential E_p", "Ep/2": "CV, half-peak potential E_p/2", "E1/2": "CV, E1/2", "calc": "computational (method not specified)"}.get(vt, "CV")
            add_meas(e, q, v, value_type=vt, kind="computational" if vt == "calc" else "experimental", method=method,
                     doi=e.get("doi") or e.get("review_doi"), confidence=e.get("confidence") or "low",
                     notes=e.get("notes"), source="RedoxDB first literature compilation" + (" (via review)" if not e.get("doi") and e.get("review_doi") else ""))

    # Roth, Romero, Nicewicz 2016 (experimental E_p/2 + B3LYP + M06-2X)
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    import sources_roth2016 as R
    by_cas = {}
    for e in merged.values():
        if e.get("cas"):
            by_cas.setdefault(e["cas"].strip(), []).append(e)
    by_name = {key(e["name"]): e for e in merged.values()}
    for e in merged.values():
        for al in e.get("aliases") or []:
            by_name.setdefault(key(al), e)
    created = 0
    for row in R.ROWS:
        name, cas, smi, ex, b3, m6 = row[:6]
        note = row[6] if len(row) > 6 else None
        cand = [x for x in by_cas.get(cas, []) if x["category"] == "substrate"] or by_cas.get(cas, [])
        e = cand[0] if cand else by_name.get(key(name))
        if e is None:
            e = {k: None for k in FIELDS}
            e.update({"name": name, "cas": cas, "smiles": smi, "category": "substrate",
                      "kind": "organometallic" if "Fe" in smi else ("inorganic" if "Ce+4" in smi else "organic"),
                      "aliases": [], "functional_groups": [], "solvent": "MeCN", "electrolyte": "0.1 M nBu4NPF6",
                      "ref_original": "Ag/AgCl (3.5 M NaCl)", "conversion": "E(SCE) = E(Ag/AgCl) − 0.03 V",
                      "confidence": "high", "source_file": "roth2016"})
            merged["sub:" + key(name)] = e
            by_cas.setdefault(cas, []).append(e)
            by_name[key(name)] = e
            created += 1
        if not e.get("cas"):
            e["cas"] = cas
        q = "e_ox" if ex > 0 else "e_red"
        common = dict(solvent="MeCN", electrolyte="0.1 M nBu4NPF6", ref_original="Ag/AgCl (3.5 M NaCl)",
                      conversion="E(SCE) = E(Ag/AgCl) − 0.03 V", doi=R.DOI, source="Roth, Romero, Nicewicz, Synlett 2016 (SI)")
        add_meas(e, q, ex, value_type="Ep/2", method=R.EXP_METHOD, confidence="high", notes=note, **common)
        for lab, v in (("B3LYP", b3), ("M062X", m6)):
            if v is not None:
                add_meas(e, q, v, value_type="calc", kind="computational", method=R.CALC[lab], confidence="high",
                         notes="calculated in the same paper (DFT)", **dict(common, electrolyte=None, ref_original=None, conversion="computed vs SCE"))
    for name, q, v, note in R.PC_ROWS:
        e = by_name.get(key(name))
        if e is None:
            warnings.append(f"Roth PC row without match: {name}")
            continue
        add_meas(e, q, v, value_type="Ep/2", method=R.EXP_METHOD, confidence="high", notes=note or None,
                 solvent="MeCN", electrolyte="0.1 M nBu4NPF6", ref_original="Ag/AgCl (3.5 M NaCl)",
                 conversion="E(SCE) = E(Ag/AgCl) − 0.03 V", doi=R.DOI, source="Roth, Romero, Nicewicz, Synlett 2016 (Fig. 20 / Table S1)")
    # Prier, Rankic, MacMillan 2013, Table 1 (checked): mark matching values as verified, add missing ones
    for name, eso, esr, eox, ered, tau, note in R.PRIER:
        e = by_name.get(key(name))
        if e is None:
            warnings.append(f"Prier row without match: {name}")
            continue
        for q, v in (("e_star_ox", eso), ("e_star_red", esr), ("e_ox", eox), ("e_red", ered)):
            if v is None:
                continue
            same = [m for m in meas if m["_mol"] is e and m["quantity"] == q and abs(m["value"] - v) < 0.006 and m["source"].startswith("RedoxDB")]
            for m in same:   # the compiled value is the Prier value: give it the checked source
                m.update(doi=R.PRIER_DOI, confidence="high", source="Prier, Rankic, MacMillan, Chem. Rev. 2013, Table 1 (checked)",
                         method=("CV, E1/2" if q in ("e_ox", "e_red") else "excited-state potential as reported (ground-state CV + E0,0)"))
            if not same:
                add_meas(e, q, v, value_type="E1/2" if q in ("e_ox", "e_red") else "reported", confidence="high",
                         method="CV, E1/2" if q in ("e_ox", "e_red") else "excited-state potential as reported (ground-state CV + E0,0)",
                         solvent="MeCN", doi=R.PRIER_DOI, source="Prier, Rankic, MacMillan, Chem. Rev. 2013, Table 1 (checked)", notes=note or None)
        if tau and e.get("tau_ns") is None:
            e["tau_ns"] = tau

    # ---- same-source duplicates: first-batch values that were transcribed from Roth 2016 itself
    drop = set()
    for m in meas:
        if not m["source"].startswith("RedoxDB"):
            continue
        e = m["_mol"]
        if (e.get("doi") == R.DOI or e.get("review_doi") == R.DOI):
            twin = [r for r in meas if r is not m and r["source"].startswith("Roth") and r["_mol"] is e and r["quantity"] == m["quantity"] and r["kind"] == "experimental" and abs(r["value"] - m["value"]) <= 0.02]
            if twin:
                drop.add(id(m))
    meas = [m for m in meas if id(m) not in drop]

    # ---- molecule summary values: mean of the experimental measurements. Values with "low" reliability are
    # listed but kept out of the mean whenever at least one checked/medium value exists.
    for m in meas:
        m["in_average"] = False
    for e in merged.values():
        mine = [m for m in meas if m["_mol"] is e]
        for q in ("e_ox", "e_red", "e00", "e_star_ox", "e_star_red"):
            exm = [m for m in mine if m["quantity"] == q and m["kind"] == "experimental"]
            good = [m for m in exm if m["confidence"] in ("high", "medium")] or exm
            for m in good:
                m["in_average"] = True
            ex = [m["value"] for m in good]
            if ex:
                e[q] = round(sum(ex) / len(ex), 3)
                if q in ("e_ox", "e_red"):
                    types = {m["value_type"] for m in mine if m["quantity"] == q and m["kind"] == "experimental"}
                    e[q + "_type"] = types.pop() if len(types) == 1 else None
            elif any(m["quantity"] == q for m in mine):
                calc = [m["value"] for m in mine if m["quantity"] == q]
                e[q] = round(sum(calc) / len(calc), 3)
                if q in ("e_ox", "e_red"):
                    e[q + "_type"] = "calc"
        confs = [m["confidence"] for m in mine if m["kind"] == "experimental" and m["in_average"]]
        if confs:
            e["confidence"] = max(confs, key=lambda c: RANK[c])

    out = []
    for e in sorted(merged.values(), key=lambda x: (x["category"], x["name"].lower())):
        has_pot = any(e[k] is not None for k in POT)
        e["status"] = "approved" if has_pot else "pending"
        e["import_key"] = "lit:" + e["category"][:3] + ":" + key(e["name"])
        out.append(e)
    for i, e in enumerate(out, 1):
        e["id"] = i
    json.dump([{k: v for k, v in e.items() if k != "source_file"} for e in out],
              open(OUT, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    mlist = []
    for i, m in enumerate(meas, 1):
        d = {k: v for k, v in m.items() if k != "_mol"}
        d["molecule_key"] = m["_mol"]["import_key"]
        d["import_key"] = f"{d['molecule_key']}|{d['quantity']}|{d['value']}|{d['value_type']}|{(d['method'] or '')[:24]}|{d['doi'] or ''}"
        d["id"] = i
        mlist.append(d)
    json.dump(mlist, open(os.path.join(ROOT, "data", "measurements.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(f"{len(mlist)} measurements ({sum(m['kind'] == 'computational' for m in mlist)} computational); {created} molecules added from Roth 2016")

    # ---- seed.sql
    def lit(v):
        if v is None:
            return "null"
        if isinstance(v, bool):
            return "true" if v else "false"
        if isinstance(v, (int, float)):
            return repr(v)
        if isinstance(v, list):
            return "array[" + ",".join(lit(x) for x in v) + "]::text[]" if v else "'{}'::text[]"
        return "'" + str(v).replace("'", "''") + "'"
    cols = FIELDS + ["status", "import_key"]
    lines = ["-- Generated by tools/build.py — literature entries. Re-running is safe (import_key).",
             "-- Approved entries are visible to members; entries without any potential start as pending.", ""]
    for e in out:
        lines.append(f"insert into public.molecules ({', '.join(cols)}) values ({', '.join(lit(e[c]) for c in cols)}) on conflict (import_key) do nothing;")
    lines.append("")
    for r in json.load(open(REACTIONS, encoding="utf-8")):
        lines.append(f"insert into public.reactions (id, name, data, status) values ({lit(r['id'])}, {lit(r['name'])}, {lit(json.dumps(r, ensure_ascii=False))}::jsonb, 'approved') on conflict (id) do update set name = excluded.name, data = excluded.data;")
    open(SEED, "w", encoding="utf-8").write("\n".join(lines) + "\n")

    n_app = sum(e["status"] == "approved" for e in out)
    by = lambda c, s: sum(1 for e in out if e["category"] == c and e["status"] == s)
    print(f"{len(out)} molecules: {n_app} approved ({by('photocatalyst','approved')} PC, {by('substrate','approved')} substrates), {len(out) - n_app} pending")
    print("confidence (approved):", {c: sum(1 for e in out if e["status"] == "approved" and e["confidence"] == c) for c in ("high", "medium", "low")})
    if warnings:
        print(f"\n{len(warnings)} warnings:")
        for w in warnings:
            print("  -", w)


if __name__ == "__main__":
    sys.exit(main())
