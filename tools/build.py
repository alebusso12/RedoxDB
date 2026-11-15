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
    out = []
    for e in sorted(merged.values(), key=lambda x: (x["category"], x["name"].lower())):
        complete(e, warnings)
        has_pot = any(e[k] is not None for k in POT)
        e["status"] = "approved" if has_pot else "pending"
        e["import_key"] = "lit:" + e["category"][:3] + ":" + key(e["name"])
        out.append(e)
    for i, e in enumerate(out, 1):
        e["id"] = i
    json.dump([{k: v for k, v in e.items() if k != "source_file"} for e in out],
              open(OUT, "w", encoding="utf-8"), ensure_ascii=False, indent=1)

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
