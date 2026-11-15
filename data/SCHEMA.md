# RedoxDB entry schema

Each raw batch file in `data/raw/*.json` is a JSON array of entries. All potentials in **volts vs SCE**.
If the source reports another reference, convert and record the original in `ref_original` / `conversion`.
Conversions used (MeCN unless stated): E(vs SCE) = E(vs Fc+/Fc) + 0.38 ; E(vs SCE) = E(vs Ag/AgCl, sat. KCl) - 0.045 ;
E(vs SCE) = E(vs NHE) - 0.241 ; E(vs SCE) = E(vs SHE) - 0.241. Say which one you applied.

```jsonc
{
  "name": "string, the name chemists use (e.g. 'Ir[dF(CF3)ppy]2(dtbbpy)PF6', '4CzIPN', 'N,N-dimethylaniline')",
  "iupac_name": "string or null",
  "aliases": ["other names / abbreviations"],
  "smiles": "valid SMILES (for metal complexes: dative-free SMILES with the metal and ligands; counter-ion separated by '.'); null only if impossible",
  "cas": "string or null (only if you are confident)",
  "category": "photocatalyst | substrate",          // photocatalyst = reported as PC in literature
  "kind": "organic | organometallic | inorganic",
  "class": "short class label, e.g. 'Ir(III) cyclometalated', 'Ru(II) polypyridyl', 'Cu(I)', 'acridinium', 'cyanoarene (donor-acceptor)', 'xanthene dye', 'phenothiazine', 'dihydrophenazine', 'phenoxazine', 'quinone', 'flavin', 'perylene diimide', 'arene', 'amine', 'carboxylate', 'organotrifluoroborate', 'silicate', 'alkyl halide', 'aryl halide', 'redox-active ester', 'pyridinium (Katritzky)', 'diazonium', 'sulfonium', 'carbonyl', 'alkene', 'enamine', 'thiol/sulfide', 'CF3 source', 'sacrificial donor', 'sacrificial acceptor', ...",
  "functional_groups": ["for substrates: which bond/group is activated, e.g. 'C(sp3)-Br', 'N-O (NHPI ester)', 'alpha-amino C-H'"],

  "E_ox":  number|null,   // ground state, E1/2 (M•+/M) or (M+/M) for cations' parent; irreversible -> Ep,a and set "E_ox_type":"Ep"
  "E_ox_type": "E1/2 | Ep | calc | null",
  "E_red": number|null,   // ground state, E1/2 (M/M•-)
  "E_red_type": "E1/2 | Ep | calc | null",

  "E00": number|null,     // eV, zero-zero excitation energy used for E*
  "excited_state": "S1 | T1 | MLCT (T1) | mixed | null",
  "E_star_ox": number|null,   // E(M•+/M*)  = E_ox - E00   (excited state as REDUCTANT; more negative = stronger)
  "E_star_red": number|null,  // E(M*/M•-)  = E_red + E00  (excited state as OXIDANT; more positive = stronger)
  "tau_ns": number|null,      // excited state lifetime, ns
  "lambda_abs_nm": number|null,
  "lambda_em_nm": number|null,

  "solvent": "MeCN | DMF | DCM | ...",
  "electrolyte": "string or null",
  "ref_original": "SCE | Fc+/Fc | Ag/AgCl | NHE | ...",
  "conversion": "string or null",

  "doi": "primary source DOI for the potentials (DOI only, no URL)",
  "review_doi": "DOI of the compilation/review you took it from, or null",
  "confidence": "high | medium | low",   // high = you verified the number in the source or a major review
  "notes": "short, e.g. 'irreversible', 'value for the radical cation', 'used as oxidative quencher'"
}
```

Reference reviews (good starting points; always prefer the primary DOI when you know it):
- Prier, Rankic, MacMillan, Chem. Rev. 2013, 113, 5322 — 10.1021/cr300503r (Ir/Ru/Cu complexes)
- Romero, Nicewicz, Chem. Rev. 2016, 116, 10075 — 10.1021/acs.chemrev.6b00057 (organic photocatalysts)
- Roth, Romero, Nicewicz, Synlett 2016, 27, 714 — 10.1055/s-0035-1561297 (substrates, ground-state potentials)
- Speckmeier, Fischer, Zeitler, JACS 2018, 140, 15353 — 10.1021/jacs.8b08933 (cyanoarenes)
- Teegardin, Day, Chu, Weaver, Org. Process Res. Dev. 2016, 20, 1156 — 10.1021/acs.oprd.6b00101 (common PCs)
- Joshi-Pangu et al., Synlett / Ir catalysts; Koike & Akita, Inorg. Chem. Front. 2014, 1, 562 — 10.1039/C4QI00053F
