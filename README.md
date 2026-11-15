# RedoxDB

A private database and toolbox for photoredox catalysis: ground- and excited-state redox potentials of
photocatalysts and substrates, with tools to design and choose catalysts. Inspired by the architecture of
[TrEnDB](https://github.com/nuniwo-source/TrEnDB) (static site + Supabase); all code here is original.

## What is in it

| Section | What it does |
| --- | --- |
| **Database** | Search by name/alias/CAS/class/activated group, filter by type, kind, class, solvent, reliability and potential window; exact, substructure and similarity search on SMILES (OpenChemLib); detail card with structure, all potentials, E0,0, τ, λ, conversion and DOI; CSV export. |
| **Redox map** | Every photocatalyst on one potential axis (E\*ox and E\*red), with a substrate or a potential overlaid. |
| **Learn** | Photoredox 101: mechanism, ground/excited-state potentials, consequences of light, choosing a catalyst, cyclic voltammetry (after Elgrishi et al. 2018, with a finite-difference CV simulator), photophysical measurements, reaction design; quizzes. |
| **Tools** | E\* calculator, CV reader, reference-electrode converter (incl. internal ferrocene), photon energy/flux and diffusion limit, Stern–Volmer fitting, Randles–Ševčík scan-rate analysis. |
| **E\* calculator** | E\*ox = E_ox − E0,0 and E\*red = E_red + E0,0 from data vs any reference; E0,0 from eV, kcal/mol, wavelengths, or the crossing of uploaded absorption/emission spectra; ΔG of photoinduced electron transfer to a quencher (optional Rehm–Weller Coulomb term); nearest catalysts in the database. |
| **CV reader** | Potentiostat exports (CSV/TXT/…; column and unit detection) or an **image** of a CV (axis calibration + automatic colour tracing). Splits cycles, finds peaks with a local baseline, pairs them into couples: E_pa, E_pc, E1/2, ΔEp, i_pc/i_pa, Ep/2 for irreversible waves; reference conversion or internal ferrocene; sends values to the E\* calculator. |
| **Reactivity advisor** | *Catalyst → reactions*: ranks a library of literature reaction types by the thermodynamics of the full cycle (both quenching pathways, catalyst turnover included), and lists database substrates the catalyst can oxidise/reduce. *Reaction → catalysts*: from a library reaction or a custom substrate (+ optional sacrificial partner), ranks all catalysts, with chemoselectivity penalty and visible-light filter. |
| **Submit / corrections** | Members propose new molecules or corrections; curators review them on the admin page (old vs new values side by side). |
| **Admin** | Review queue (bulk approve/reject), entry editor with PubChem name/CAS lookup, member management and activity log (superadmin). |

All potentials are stored **in V vs SCE**. Conventions: E\*ox = E(PC•+/PC\*), E\*red = E(PC\*/PC•−).

## Data

Every molecule has a list of **individual values** (`measurements`: quantity, value, experimental or computational,
method, conditions, source DOI, reliability). The value shown for a molecule is the **mean of its experimental values**
with checked or medium reliability; low-reliability values are listed but not averaged; computed values are averaged
separately. Sources transcribed and checked so far: Roth, Romero, Nicewicz, Synlett 2016 (E_p/2 for ~170 compounds plus
B3LYP and M06-2X values from the SI; `tools/sources_roth2016.py`) and Prier, Rankic, MacMillan, Chem. Rev. 2013, Table 1.
`python3 tools/build.py` also writes `data/measurements.json`. Supabase: run `supabase/migration_002_measurements.sql`
once, then use *Import literature data* on the admin page of a local copy.

`data/raw/*.json` are the literature batches; `python3 tools/build.py` merges them into `data/molecules.json`
and `supabase/seed.sql` (`data/overrides.json` holds curator-checked corrections; `data/reactions.json` is the
advisor's reaction library). Schema of an entry: `data/SCHEMA.md`.

> **Reliability.** The first batch (≈280 molecules) was compiled from review tables and the literature
> without full access to every paper. Each value carries a reliability flag shown on the site:
> **verified** (checked against the source), **medium** (from a review table or well-established value),
> **low** (approximate — verify before use). Entries without any potential are imported as *pending* so curators can complete them.

## Privacy model

- The **repository is private**.
- The **site shows nothing without signing in**: every table has row-level security, the anonymous role has no access,
  and a signed-in account sees data only if its e-mail is listed in `members`.
- Roles: `superadmin` (everything, incl. members), `curator` (review/edit), `viewer` (read, tools, submit).
  The last superadmin cannot be removed. Every change to entries and members is written to the activity log.
- While `docs/assets/config.js` is empty the site runs only as a **local preview** reading `data/*.json`
  (that folder is not part of the published site).

## Setup

### 1. Supabase (database + sign-in) — free plan

1. Create a project at [supabase.com](https://supabase.com).
2. **SQL Editor** → run `supabase/schema.sql`, then `supabase/seed.sql`.
3. Make yourself superadmin (SQL editor, your own e-mail, lower case):
   ```sql
   insert into public.members (email, role, note) values ('you@example.org', 'superadmin', 'owner');
   ```
4. **Authentication → Users → Add user → Create new user**: same e-mail, a password, *Auto Confirm User* ticked.
5. **Authentication → Sign In / Providers**: switch **off** *Allow new users to sign up* (accounts are created only by you).
6. **Project Settings → API**: copy *Project URL* and the *anon/publishable* key into `docs/assets/config.js`.
   Never put the *service role* key anywhere in this repository.

To give someone access: add their e-mail on the **Members** tab of the admin page, then create their login as in step 4.

### 2. Hosting

The site is plain static files in `docs/`. Options:
- **GitHub Pages** (Settings → Pages → branch `main`, folder `/docs`). From a *private* repository this needs GitHub Pro,
  free for students and staff via GitHub Education. The page itself is reachable by URL, but without a member login it shows only the sign-in form.
- Any static host (Cloudflare Pages, Netlify) pointed at `docs/`.

### 3. Local preview

```bash
python3 -m http.server 8765
```
then open <http://localhost:8765/docs/index.html>.

### Keeping the free Supabase project awake

Supabase pauses free projects after a week without requests; visiting the site counts.
