/* RedoxDB — "Learn": an introduction to photoredox catalysis for newcomers, with diagrams, two small
   interactive tools and short quizzes. All potentials are in V vs SCE, as in the rest of the site. */
(function () {
  "use strict";
  const { doiLink } = RDB;

  // ------------------------------------------------------------------ diagrams (inline SVG, theme colours)
  const SVG_CYCLES = `
  <svg viewBox="0 0 760 330" class="diagram" role="img" aria-label="Oxidative and reductive quenching cycles">
    <defs><marker id="ar" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="currentColor"/></marker></defs>
    <g font-size="15" text-anchor="middle" fill="currentColor">
      <text x="190" y="22" font-weight="700">Oxidative quenching</text>
      <text x="570" y="22" font-weight="700">Reductive quenching</text>
      <!-- left cycle -->
      <circle cx="190" cy="175" r="95" fill="none" stroke="var(--border)" stroke-width="2"/>
      <g class="node"><rect x="150" y="62" width="80" height="34" rx="8"/><text x="190" y="85">PC</text></g>
      <g class="node star"><rect x="268" y="158" width="80" height="34" rx="8"/><text x="308" y="181">PC*</text></g>
      <g class="node ox"><rect x="150" y="254" width="80" height="34" rx="8"/><text x="190" y="277">PC•+</text></g>
      <path d="M232 92 Q 290 110 300 152" fill="none" stroke="var(--warn)" stroke-width="2.5" marker-end="url(#ar)"/>
      <text x="300" y="112" fill="var(--warn)" style="fill:var(--warn)">hν</text>
      <path d="M300 196 Q 285 245 234 266" fill="none" stroke="currentColor" stroke-width="2" marker-end="url(#ar)"/>
      <text x="330" y="246" font-size="13">A → A•−</text>
      <text x="330" y="262" font-size="11" fill="var(--muted)" style="fill:var(--muted)">PC* gives an e⁻</text>
      <path d="M150 262 Q 92 200 146 96" fill="none" stroke="currentColor" stroke-width="2" marker-end="url(#ar)"/>
      <text x="62" y="176" font-size="13">D → D•+</text>
      <text x="62" y="192" font-size="11" fill="var(--muted)" style="fill:var(--muted)">PC•+ takes an e⁻</text>
      <!-- right cycle -->
      <circle cx="570" cy="175" r="95" fill="none" stroke="var(--border)" stroke-width="2"/>
      <g class="node"><rect x="530" y="62" width="80" height="34" rx="8"/><text x="570" y="85">PC</text></g>
      <g class="node star"><rect x="648" y="158" width="80" height="34" rx="8"/><text x="688" y="181">PC*</text></g>
      <g class="node red"><rect x="530" y="254" width="80" height="34" rx="8"/><text x="570" y="277">PC•−</text></g>
      <path d="M612 92 Q 670 110 680 152" fill="none" stroke="var(--warn)" stroke-width="2.5" marker-end="url(#ar)"/>
      <text x="680" y="112" fill="var(--warn)" style="fill:var(--warn)">hν</text>
      <path d="M680 196 Q 665 245 614 266" fill="none" stroke="currentColor" stroke-width="2" marker-end="url(#ar)"/>
      <text x="712" y="246" font-size="13">D → D•+</text>
      <text x="712" y="262" font-size="11" fill="var(--muted)" style="fill:var(--muted)">PC* takes an e⁻</text>
      <path d="M530 262 Q 472 200 526 96" fill="none" stroke="currentColor" stroke-width="2" marker-end="url(#ar)"/>
      <text x="442" y="176" font-size="13">A → A•−</text>
      <text x="442" y="192" font-size="11" fill="var(--muted)" style="fill:var(--muted)">PC•− gives an e⁻</text>
    </g>
  </svg>`;

  const SVG_ORBITALS = `
  <svg viewBox="0 0 760 290" class="diagram" role="img" aria-label="Frontier orbitals of ground and excited state">
    <g font-size="14" fill="currentColor" text-anchor="middle">
      <text x="130" y="22" font-weight="700">Ground state PC</text>
      <text x="380" y="22" font-weight="700">Excited state PC*</text>
      <text x="630" y="22" font-weight="700">What it means</text>
      <g stroke="currentColor" stroke-width="3">
        <line x1="80" x2="180" y1="80" y2="80"/><line x1="80" x2="180" y1="210" y2="210"/>
        <line x1="330" x2="430" y1="80" y2="80"/><line x1="330" x2="430" y1="210" y2="210"/>
      </g>
      <text x="215" y="85" font-size="12" text-anchor="start">LUMO</text><text x="215" y="215" font-size="12" text-anchor="start">HOMO</text>
      <!-- electrons -->
      <g font-size="22" font-weight="700">
        <text x="118" y="218" fill="var(--accent)" style="fill:var(--accent)">↑</text><text x="142" y="218" fill="var(--accent)" style="fill:var(--accent)">↓</text>
        <text x="380" y="88" fill="var(--accent)" style="fill:var(--accent)">↑</text><text x="380" y="218" fill="var(--accent)" style="fill:var(--accent)">↓</text>
      </g>
      <path d="M250 145 L 300 145" stroke="var(--warn)" stroke-width="3" marker-end="url(#ar2)"/>
      <text x="275" y="135" fill="var(--warn)" style="fill:var(--warn)">hν (E₀,₀)</text>
      <defs><marker id="ar2" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" fill="var(--warn)"/></marker></defs>
      <g text-anchor="start" font-size="13">
        <text x="500" y="78">• The electron now in the LUMO is high</text>
        <text x="500" y="96">  in energy → easy to give away:</text>
        <text x="500" y="114" fill="var(--accent)" style="fill:var(--accent)">  PC* is a stronger REDUCTANT (E*ox).</text>
        <text x="500" y="168">• The hole left in the HOMO is low</text>
        <text x="500" y="186">  in energy → eager to accept an e⁻:</text>
        <text x="500" y="204" fill="var(--accent-2)" style="fill:var(--accent-2)">  PC* is a stronger OXIDANT (E*red).</text>
        <text x="500" y="250" fill="var(--muted)" style="fill:var(--muted)">Both gain by about E₀,₀ (in eV ≡ V).</text>
      </g>
    </g>
  </svg>`;

  const SVG_CV = `
  <svg viewBox="0 0 760 330" class="diagram" role="img" aria-label="Annotated reversible cyclic voltammogram">
    <g fill="currentColor" font-size="13">
      <line x1="60" y1="170" x2="720" y2="170" stroke="var(--muted)" stroke-dasharray="4 4"/>
      <line x1="60" y1="30" x2="60" y2="300" stroke="var(--muted)"/>
      <text x="390" y="320" text-anchor="middle">E (V) →  (scan to positive potential, then back)</text>
      <text x="22" y="170" transform="rotate(-90 22 170)" text-anchor="middle">i (oxidation +)</text>
      <path d="M80 168 C 220 166, 270 150, 320 90 C 345 58, 372 56, 392 84 C 420 120, 470 128, 700 132" fill="none" stroke="var(--accent-2)" stroke-width="3"/>
      <path d="M700 196 C 520 196, 440 200, 410 240 C 390 268, 362 270, 345 246 C 320 210, 240 176, 80 172" fill="none" stroke="var(--accent)" stroke-width="3"/>
      <line x1="372" x2="372" y1="56" y2="170" stroke="var(--accent-2)" stroke-dasharray="3 3"/>
      <line x1="362" x2="362" y1="170" y2="270" stroke="var(--accent)" stroke-dasharray="3 3"/>
      <text x="380" y="50" fill="var(--accent-2)" style="fill:var(--accent-2)">E_pa (anodic peak, M → M•+)</text>
      <text x="200" y="290" fill="var(--accent)" style="fill:var(--accent)">E_pc (cathodic peak, M•+ → M)</text>
      <line x1="367" x2="367" y1="150" y2="190" stroke="var(--ok)" stroke-width="3"/>
      <text x="470" y="160" fill="var(--ok)" style="fill:var(--ok)">E½ = (E_pa + E_pc)/2</text>
      <text x="470" y="178" fill="var(--muted)" style="fill:var(--muted)">ΔE_p ≈ 59 mV / n if reversible</text>
    </g>
  </svg>`;

  // ------------------------------------------------------------------ quizzes
  const QUIZZES = {
    basics: [
      { q: "In an oxidative quenching cycle, what does the excited photocatalyst do first?", o: ["It accepts an electron from a donor", "It gives an electron to an acceptor", "It transfers energy to the substrate", "It absorbs a second photon"], a: 1,
        e: "Oxidative quenching: PC* is oxidised (PC* → PC•+) by giving an electron to an acceptor A. PC•+ is then reduced back by a donor." },
      { q: "Why is a photoredox catalyst called a 'catalyst' even though it changes oxidation state?", o: ["Because light is free", "Because it returns to its starting state at the end of each cycle", "Because it is used in excess", "Because it is not consumed by light"], a: 1,
        e: "After the photochemical step, a second (dark) electron transfer regenerates the ground-state PC, so one molecule can turn over many times." }
    ],
    ground: [
      { q: "Couple A has E = −1.3 V, couple B has E = −0.5 V (vs SCE). Which way do electrons flow spontaneously?", o: ["From the reduced form of A to the oxidised form of B", "From the reduced form of B to the oxidised form of A", "No transfer is possible", "It depends only on concentration"], a: 0,
        e: "Electrons flow 'downhill' from the more negative couple to the more positive one: ΔG = −F[E(B) − E(A)] = −0.8 eV." },
      { q: "A substrate has E_red = −2.2 V. Is it easy or hard to reduce?", o: ["Easy: very negative means very electron-poor", "Hard: you need a reductant whose potential is even more negative than −2.2 V", "Impossible in any solvent", "Easy, because negative potentials are favourable"], a: 1,
        e: "The more negative E_red, the harder the reduction. Only reductants with E below −2.2 V (e.g. strongly reducing excited states) can do it." },
      { q: "You measured E½ = +0.10 V vs Fc⁺/Fc in MeCN. What is it vs SCE?", o: ["−0.28 V", "+0.10 V", "+0.48 V", "+0.34 V"], a: 2,
        e: "In MeCN, Fc⁺/Fc lies at about +0.38 V vs SCE, so E(SCE) = E(Fc) + 0.38 = +0.48 V." }
    ],
    excited: [
      { q: "A catalyst has E_ox = +1.20 V, E_red = −1.40 V and E₀,₀ = 2.50 eV. What are E*ox and E*red?", o: ["E*ox = −1.30 V, E*red = +1.10 V", "E*ox = +3.70 V, E*red = −3.90 V", "E*ox = −1.40 V, E*red = +1.20 V", "E*ox = +1.30 V, E*red = −1.10 V"], a: 0,
        e: "E*ox = E_ox − E₀,₀ = 1.20 − 2.50 = −1.30 V; E*red = E_red + E₀,₀ = −1.40 + 2.50 = +1.10 V." },
      { q: "Why does excitation make a molecule BOTH a better oxidant and a better reductant?", o: ["Because it becomes charged", "Because an electron is promoted to the LUMO (easy to give) and a hole is left in the HOMO (easy to fill)", "Because the solvent reorganises", "Because the temperature rises"], a: 1,
        e: "See the orbital picture: the promoted electron and the hole each store roughly E₀,₀ of extra energy." },
      { q: "Which excited state usually drives bimolecular photoredox steps for Ir(III) and Ru(II) complexes?", o: ["The short-lived singlet S₁ (ps)", "The long-lived triplet (MLCT, µs)", "The ground state", "A vibrationally hot S₂ state"], a: 1,
        e: "Intersystem crossing is fast and the triplet lives ~0.1–2 µs, long enough to meet a quencher present at mM–M concentration." }
    ],
    choose: [
      { q: "You want to OXIDISE an amine with E_ox = +0.80 V. Which excited-state property must the photocatalyst have?", o: ["E*red more positive than +0.80 V", "E*ox more negative than +0.80 V", "E*red more negative than −0.80 V", "E₀,₀ larger than 0.80 eV"], a: 0,
        e: "The excited catalyst acts as an oxidant: it needs E*(PC*/PC•−) > E_ox(substrate); here e.g. Ir[dF(CF₃)ppy]₂(dtbbpy)⁺ (E*red ≈ +1.21 V)." },
      { q: "Your photocatalyst oxidises the substrate in the photochemical step. What must the reduced catalyst PC•− be able to do afterwards?", o: ["Absorb another photon", "Give its electron to something in the mixture (an acceptor) so PC is regenerated", "Nothing, it is consumed", "Oxidise the solvent"], a: 1,
        e: "Turnover: E_red(PC/PC•−) must be negative enough to reduce an intermediate, a co-catalyst (e.g. Ni) or a terminal oxidant." },
      { q: "Two catalysts both oxidise your substrate. One has a 0.3 V margin, the other a 1.5 V margin. Why might you prefer the first?", o: ["It is always faster", "It is less likely to oxidise other functional groups, the product or the solvent", "It absorbs more light", "Margins do not matter"], a: 1,
        e: "A huge driving force reaches groups you did not want to touch; choose 'strong enough', not 'as strong as possible'." }
    ],
    cv: [
      { q: "Why is ferrocene added at the end of a CV experiment?", o: ["To make the solution conductive", "As an internal reference whose E½ is well known, to correct for the drift of pseudo-references", "To remove oxygen", "To increase the current"], a: 1,
        e: "Ag-wire pseudo-references drift; quoting E vs Fc⁺/Fc (then converting to SCE) makes values comparable between labs." },
      { q: "A wave shows an anodic peak but no cathodic peak on the return scan. Which value is the best estimate for photoredox comparisons?", o: ["E½", "E_p/2 of the anodic wave", "The switching potential", "The rest potential"], a: 1,
        e: "Irreversible waves have no E½. E_p/2 (potential at half the peak current) approximates the thermodynamic potential better than E_p." },
      { q: "What is the supporting electrolyte (e.g. 0.1 M Bu₄NPF₆) for?", o: ["It is the analyte", "It carries the current and minimises migration and resistance", "It is the reference", "It quenches excited states"], a: 1,
        e: "Without excess inert electrolyte the solution is too resistive and the analyte moves by migration, distorting the CV." }
    ],
    design: [
      { q: "Which control experiment shows that light is needed throughout the reaction (not only to start a chain)?", o: ["Running without catalyst", "Light on/off cycles while monitoring conversion", "Using a different solvent", "Doubling the substrate"], a: 1,
        e: "If conversion stops when the lamp is off and restarts when it is on, the reaction needs continuous irradiation; a quantum yield ≫ 1 instead indicates a chain." },
      { q: "Why do most photoredox reactions have to be degassed?", o: ["O₂ quenches triplet excited states and traps radicals", "O₂ absorbs visible light", "O₂ is a reductant", "Nitrogen is a co-catalyst"], a: 0,
        e: "Ground-state O₂ is a triplet that quenches long-lived excited states (energy and electron transfer) and reacts quickly with carbon radicals." },
      { q: "A Stern–Volmer plot gives K_SV = 300 M⁻¹ for quencher Q with a catalyst of τ₀ = 1.5 µs. What is k_q?", o: ["2 × 10⁸ M⁻¹ s⁻¹", "4.5 × 10⁻⁴ M⁻¹ s⁻¹", "2 × 10¹¹ M⁻¹ s⁻¹", "300 s⁻¹"], a: 0,
        e: "k_q = K_SV / τ₀ = 300 / 1.5 × 10⁻⁶ s = 2 × 10⁸ M⁻¹ s⁻¹, well below the diffusion limit (~10¹⁰): quenching is real but not every encounter." }
    ]
  };

  function quizHTML(id) {
    return `<div class="quiz" data-quiz="${id}"><h4>Check yourself</h4>${QUIZZES[id].map((q, i) => `
      <div class="q" data-i="${i}"><p class="qtext"><b>${i + 1}.</b> ${q.q}</p>
      <div class="opts">${q.o.map((o, j) => `<button class="opt" type="button" data-j="${j}">${o}</button>`).join("")}</div>
      <p class="explain" hidden></p></div>`).join("")}<p class="score hint"></p></div>`;
  }
  function wireQuizzes(root) {
    root.querySelectorAll(".quiz").forEach(qz => {
      const data = QUIZZES[qz.dataset.quiz];
      const update = () => {
        const done = qz.querySelectorAll(".q.answered").length, ok = qz.querySelectorAll(".q.correct").length;
        qz.querySelector(".score").textContent = done ? `${ok} / ${data.length} correct${done === data.length ? (ok === data.length ? " — well done!" : " — read the explanations and try the section again") : ""}` : "";
      };
      qz.querySelectorAll(".q").forEach(qEl => {
        const q = data[+qEl.dataset.i];
        qEl.querySelectorAll(".opt").forEach(b => b.addEventListener("click", () => {
          if (qEl.classList.contains("answered")) return;
          const j = +b.dataset.j;
          qEl.classList.add("answered", j === q.a ? "correct" : "wrong");
          b.classList.add(j === q.a ? "right" : "chosen-wrong");
          qEl.querySelectorAll(".opt")[q.a].classList.add("right");
          const ex = qEl.querySelector(".explain");
          ex.innerHTML = (j === q.a ? "✔ Correct. " : "✘ Not quite. ") + q.e;
          ex.hidden = false;
          update();
        }));
      });
    });
  }

  // ------------------------------------------------------------------ chapters
  const CHAPTERS = [
    { id: "how", title: "1 · How photoredox catalysis works", html: `
      <p>A <b>photoredox catalyst</b> (PC) is a molecule that absorbs visible light and then moves <b>single electrons</b> to or from organic molecules.
      Removing or adding one electron turns a stable molecule into a <b>radical ion</b>, which usually fragments or reacts to give a neutral <b>radical</b>.
      Radicals react in ways that are hard to reach with classical two-electron chemistry (C–C bond formation at unactivated positions, decarboxylation, dehalogenation, cross-couplings with Ni…), and all of this happens at room temperature.</p>
      <p>Every cycle has two electron-transfer steps:</p>
      <ol>
        <li><b>Photochemical step.</b> PC absorbs a photon and becomes PC*. PC* lives long enough (ns–µs) to meet a substrate and exchange one electron with it. This step is called <i>quenching</i> because the excited state disappears.</li>
        <li><b>Dark step (turnover).</b> The oxidised (PC•+) or reduced (PC•−) catalyst exchanges an electron with a second species and goes back to PC.</li>
      </ol>
      ${SVG_CYCLES}
      <ul>
        <li><b>Oxidative quenching:</b> PC* <i>gives</i> an electron to an acceptor A (PC* → PC•+), then PC•+ takes an electron from a donor D.</li>
        <li><b>Reductive quenching:</b> PC* <i>takes</i> an electron from a donor D (PC* → PC•−), then PC•− gives an electron to an acceptor A.</li>
      </ul>
      <p>If D and A are both parts of the reaction (e.g. a substrate and an intermediate), the reaction is <b>redox-neutral</b>. If one of them is only there to give or take electrons (an amine, a Hantzsch ester, O₂, persulfate), it is a <b>sacrificial</b> reagent and the reaction is net reductive or net oxidative.</p>
      <p class="hint">Not everything that happens under light is photoredox: the excited state can also transfer <i>energy</i> (EnT, triplet sensitisation) instead of an electron. Energy transfer depends on triplet energies, not on redox potentials.</p>
      ${quizHTML("basics")}` },

    { id: "ground", title: "2 · Ground-state redox potentials", html: `
      <p>A redox potential E(Ox/Red) measures how much a couple "wants" electrons. It is always written as a <b>reduction</b>: Ox + e⁻ → Red.</p>
      <ul>
        <li><b>More positive E</b> → the oxidised form is hungry for electrons → <b>strong oxidant</b> (e.g. DDQ, E_red ≈ +0.5 V).</li>
        <li><b>More negative E</b> → the reduced form gives electrons away easily → <b>strong reductant</b> (e.g. Ru(bpy)₃⁺, E ≈ −1.33 V).</li>
      </ul>
      <p>For a molecule M we use two numbers:</p>
      <div class="formula">E_ox = E(M•+/M) — how hard it is to remove an electron (higher = harder to oxidise)<br>E_red = E(M/M•−) — how hard it is to add an electron (more negative = harder to reduce)</div>
      <p><b>Electrons flow from the couple with the more negative potential to the couple with the more positive potential.</b> The free energy of a one-electron transfer from donor D to acceptor A is</p>
      <div class="formula">ΔG_ET = −F [E_red(A) − E_ox(D)]  →  in eV: ΔG = E_ox(D) − E_red(A)</div>
      <p>so a reaction is downhill (ΔG &lt; 0) when E_ox of the donor is <i>below</i> E_red of the acceptor on the potential axis. 1 eV = 23.06 kcal/mol. A margin of ~0.1–0.2 eV is usually enough for fast electron transfer.</p>
      <p><b>Example.</b> Ru(bpy)₃⁺ (E = −1.33 V) and diethyl bromomalonate (E_red = −0.49 V): ΔG = −1.33 − (−0.49) = −0.84 eV, strongly favourable — this is the key step of Stephenson's reductive dehalogenation (${doiLink("10.1021/ja9033582")}).</p>
      <div class="card tool" id="tool-dg"><h4>Try it: will these two molecules exchange an electron?</h4>
        <div class="grid c3">
          <label class="field">E_ox of the donor (V)<input id="dg-d" type="range" min="-3" max="3" step="0.01" value="-1.33"><span class="mono" id="dg-dv"></span></label>
          <label class="field">E_red of the acceptor (V)<input id="dg-a" type="range" min="-3" max="3" step="0.01" value="-0.49"><span class="mono" id="dg-av"></span></label>
          <div id="dg-out" class="result"></div>
        </div>
        <div id="dg-ladder"></div>
        <p class="hint">Start: Ru(bpy)₃⁺ (−1.33 V) reducing diethyl bromomalonate (−0.49 V). Now move the donor to +0.65 V (DIPEA, an amine): in the dark it cannot reduce the bromomalonate — this is exactly why the light-driven catalytic cycle is needed.</p>
      </div>
      <p><b>Reference electrodes.</b> A potential only means something next to its reference. This site uses the saturated calomel electrode (SCE), common in organic photoredox papers. Useful conversions (MeCN): E(SCE) = E(Fc⁺/Fc) + 0.38 V; E(SCE) = E(Ag/AgCl, sat. KCl) − 0.045 V; E(SCE) = E(NHE) − 0.241 V. Always check the solvent: the Fc⁺/Fc offset changes with it.</p>
      ${quizHTML("ground")}` },

    { id: "excited", title: "3 · Excited-state potentials and how to calculate them", html: `
      <p>When PC absorbs light, one electron jumps from the HOMO to the LUMO. The molecule now stores extra energy, the <b>zero–zero excitation energy E₀,₀</b> (energy gap between the lowest vibrational levels of the ground and excited states).</p>
      ${SVG_ORBITALS}
      <p>This energy is available for electron transfer, so the excited state is shifted by E₀,₀ in both directions (Rehm–Weller approximation, neglecting small work and entropy terms):</p>
      <div class="formula">E*ox = E(PC•+/PC*) = E_ox − E₀,₀   (excited state as reductant: more negative = stronger)<br>E*red = E(PC*/PC•−) = E_red + E₀,₀   (excited state as oxidant: more positive = stronger)</div>
      <p><b>Example: fac-Ir(ppy)₃.</b> E_ox = +0.77 V, E_red = −2.19 V, E₀,₀ ≈ 2.5 eV → E*ox ≈ −1.73 V (one of the strongest common excited-state reductants) and E*red ≈ +0.31 V (a weak excited-state oxidant).</p>
      <p><b>Getting E₀,₀.</b></p>
      <ul>
        <li>Best: the crossing point of the normalised absorption and emission spectra (E₀,₀ = 1239.8 / λ_cross nm).</li>
        <li>For phosphorescent complexes: the high-energy edge or the first vibronic band of the emission at 77 K.</li>
        <li>Rough: the room-temperature emission maximum (underestimates E₀,₀ because of the Stokes shift).</li>
      </ul>
      <p><b>Which excited state?</b> Use the E₀,₀ of the state that actually reacts. A bimolecular step needs the excited state to survive until it meets the quencher: with k_q ≈ 10⁹–10¹⁰ M⁻¹ s⁻¹ and [Q] ≈ 0.1 M, the lifetime must be ≳ 1–10 ns. Triplets of Ir/Ru/Cu complexes (µs) and the long-lived (delayed) states of TADF dyes such as 4CzIPN fulfil this; short singlets (≈ ns) only react with quenchers at high concentration or pre-associated.</p>
      <div class="card tool" id="tool-e00"><h4>Try it: light pushes the potentials apart</h4>
        <div class="grid c3">
          <label class="field">E_ox (V)<input id="e0-ox" type="range" min="-0.5" max="2.5" step="0.05" value="1.52"><span class="mono" id="e0-oxv"></span></label>
          <label class="field">E_red (V)<input id="e0-red" type="range" min="-2.8" max="0.5" step="0.05" value="-1.21"><span class="mono" id="e0-redv"></span></label>
          <label class="field">E₀,₀ (eV)<input id="e0-e" type="range" min="1.5" max="3.5" step="0.05" value="2.56"><span class="mono" id="e0-ev"></span></label>
        </div>
        <div id="e0-ladder"></div>
        <p class="hint">Default values: 4CzIPN. Move E₀,₀ and watch E*ox and E*red move apart by exactly the photon energy.</p>
      </div>
      <p class="hint">The site's <a href="#estar">E* calculator</a> does this with your own data, including E₀,₀ from spectra and reference conversion.</p>
      ${quizHTML("excited")}` },

    { id: "light", title: "4 · What light changes: consequences of raising the potentials", html: `
      <p>Ground-state reagents strong enough to reduce an aryl bromide (≈ −2.2 V) or oxidise an unactivated alkene (≈ +2 V) are alkali metals, SmI₂/HMPA or harsh oxidants: they react with almost everything. Light lets a <b>bench-stable</b> molecule become such a strong reagent <b>only for nanoseconds to microseconds</b>, and only where the light is.</p>
      <ul>
        <li><b>New reactivity.</b> Excited states reach ±1.5–2.5 V at room temperature, opening single-electron routes to radicals from carboxylates, halides, amines, alkenes, arenes and more.</li>
        <li><b>Mild overall conditions.</b> Only a small amount of PC* exists at any time, so radical concentrations stay low and selective.</li>
        <li><b>The energy budget is limited.</b> At most E₀,₀ (≈ 2–3 eV for visible light: 2.0 eV = 620 nm, 2.5 eV = 496 nm, 3.0 eV = 413 nm) is converted into redox power; part is lost to intersystem crossing and vibrational relaxation. A redder catalyst has a smaller E₀,₀ and therefore cannot be both a strong oxidant and a strong reductant.</li>
        <li><b>The dark step uses ground-state potentials.</b> After quenching, PC•+ or PC•− are ordinary ground-state species. A catalyst that is a super excited-state reductant (e.g. Ir(ppy)₃, E*ox −1.73 V) gives an Ir(IV) that is only a moderate oxidant (+0.77 V): the turnover step must also be checked.</li>
        <li><b>Too strong is not better.</b> A large excess of driving force can oxidise or reduce the product, the solvent or other functional groups, and can even slow down electron transfer (Marcus inverted region). Fast <b>back-electron transfer</b> inside the solvent cage can waste the absorbed photon: cage escape efficiency matters.</li>
        <li><b>Photostability.</b> Strongly oxidising or reducing excited states, and the radical ions they form, can degrade the catalyst (e.g. acridinium dealkylation, cyanoarene substitution). Catalyst loading and light intensity must be balanced.</li>
      </ul>
      <p class="hint">Rule of thumb: pick the <i>weakest</i> catalyst that still gives ~0.1–0.3 V of driving force for the key step and closes the cycle.</p>` },

    { id: "choose", title: "5 · Choosing the catalyst for a substrate", html: `
      <ol>
        <li><b>Decide the role of the substrate.</b> Must it be oxidised (electron-rich: amines, carboxylates, trifluoroborates, silicates, electron-rich alkenes/arenes) or reduced (electron-poor: alkyl/aryl halides, redox-active esters, pyridinium salts, diazonium salts, enones)?</li>
        <li><b>Find its potential.</b> Look it up in the <a href="#db">database</a> or measure it (chapter 6). For irreversible waves use E_p/2.</li>
        <li><b>Match the excited state.</b>
          <div class="formula">To oxidise S:  E*red(PC*/PC•−)  &gt;  E_ox(S)   (PC* is the oxidant)<br>To reduce S:  E*ox(PC•+/PC*)  &lt;  E_red(S)   (PC* is the reductant)</div>
          Alternatively the ground-state radical ion can do the job: PC•− (formed by reductive quenching with a sacrificial donor) reduces S if E_red(PC) &lt; E_red(S).</li>
        <li><b>Close the cycle.</b> Check the dark step with ground-state potentials: after oxidising S, PC•− must reduce something present (E_red(PC) &lt; E_red of that acceptor); after reducing S, PC•+ must oxidise something present (E_ox(PC) &gt; E_ox of that donor).</li>
        <li><b>Practical filters.</b> Absorption matching your LED (blue 450–465 nm, green 525 nm…), excited-state lifetime, solubility in your solvent, stability, cost (organic dyes vs Ir/Ru).</li>
      </ol>
      <div class="table-wrap"><table><thead><tr><th>Substrate class</th><th>Role</th><th class="num">Typical E (V vs SCE)</th><th>Catalysts often used</th></tr></thead><tbody>
        <tr><td>Silicates, alkyl-DHPs</td><td>oxidised</td><td class="num">+0.4 to +1.0</td><td>4CzIPN, Ru(bpy)₃²⁺, Ir[dF(CF₃)ppy]₂(bpy)⁺</td></tr>
        <tr><td>Tertiary amines</td><td>oxidised</td><td class="num">+0.6 to +1.0</td><td>Ru(bpy)₃²⁺, Ir(ppy)₂(dtbbpy)⁺, eosin Y</td></tr>
        <tr><td>Carboxylates, BF₃K salts</td><td>oxidised</td><td class="num">+0.9 to +1.5</td><td>Ir[dF(CF₃)ppy]₂(dtbbpy)⁺, 4CzIPN, acridinium</td></tr>
        <tr><td>Electron-rich alkenes / arenes</td><td>oxidised</td><td class="num">+1.1 to +2.2</td><td>Mes-Acr⁺ salts, pyrylium, Ru(bpz)₃²⁺</td></tr>
        <tr><td>Diazonium, sulfonium, CF₃SO₂Cl</td><td>reduced</td><td class="num">−0.1 to −0.5</td><td>almost any PC (eosin Y, Ru(bpy)₃²⁺)</td></tr>
        <tr><td>α-Halo carbonyls, Katritzky salts</td><td>reduced</td><td class="num">−0.5 to −1.0</td><td>Ru(bpy)₃⁺ (via reductive quenching), Ir(ppy)₃</td></tr>
        <tr><td>NHPI redox-active esters</td><td>reduced</td><td class="num">−1.2 to −1.4</td><td>Ir(ppy)₃, 4CzIPN•−, 4DPAIPN</td></tr>
        <tr><td>Unactivated alkyl / aryl iodides and bromides</td><td>reduced</td><td class="num">−1.8 to −2.6</td><td>Ir(ppy)₃ (iodides), phenothiazines, dihydrophenazines, ConPET</td></tr>
      </tbody></table></div>
      <p class="hint">Ranges are indicative; check each value in the database. The <a href="#advisor">Reactivity advisor</a> does steps 3–4 automatically for every catalyst.</p>
      ${quizHTML("choose")}` },

    { id: "cv", title: "6 · Measuring a redox potential by cyclic voltammetry", html: `
      <p>In cyclic voltammetry the potential of a working electrode is swept linearly up and back while the current is recorded. When the potential reaches E of the analyte, it is oxidised (or reduced) at the electrode and a current peak appears.</p>
      ${SVG_CV}
      <h4>Set-up</h4>
      <ul>
        <li><b>Three electrodes:</b> working electrode (glassy carbon 3 mm, or Pt disk), counter electrode (Pt wire), reference (Ag/AgCl or SCE with a salt bridge, or an Ag-wire pseudo-reference + ferrocene).</li>
        <li><b>Solvent:</b> dry, HPLC-grade MeCN (or DMF, CH₂Cl₂), ideally the same solvent as the reaction.</li>
        <li><b>Supporting electrolyte:</b> 0.1 M Bu₄NPF₆ (dried); it carries the current.</li>
        <li><b>Analyte:</b> 1–5 mM.</li>
        <li><b>Degas</b> with Ar or N₂ for 5–10 min and keep a blanket over the solution: O₂ is reduced around −0.8 V and hides reductions.</li>
      </ul>
      <h4>Procedure</h4>
      <ol>
        <li>Polish the working electrode (alumina 0.05 µm on a pad), rinse, dry.</li>
        <li>Record a <b>blank</b> (solvent + electrolyte) over the window you need, to know the solvent limits and impurities.</li>
        <li>Add the analyte, start from the rest potential and scan towards the process of interest (positive for oxidation, negative for reduction) at 100 mV/s. Record 2–3 cycles.</li>
        <li>Vary the scan rate (25–1000 mV/s). For a diffusion-controlled process the peak current grows with √v (Randles–Ševčík: i_p = 2.69 × 10⁵ n^3/2 A D^1/2 C v^1/2); a reversible couple keeps ΔE_p and |i_pc/i_pa| ≈ 1.</li>
        <li>Use iR compensation if the potentiostat offers it (important in CH₂Cl₂ or at high currents).</li>
        <li>At the end add <b>ferrocene</b> (≈1 mM) and record again: report potentials vs Fc⁺/Fc and convert (MeCN: +0.38 V to SCE).</li>
      </ol>
      <h4>Reading the CV</h4>
      <ul>
        <li><b>Reversible:</b> E½ = (E_pa + E_pc)/2, ΔE_p ≈ 59/n mV at 25 °C (in practice 60–90 mV), |i_pc/i_pa| ≈ 1. E½ is the thermodynamic potential.</li>
        <li><b>Irreversible</b> (no return peak, typical for substrates that fragment after electron transfer: carboxylates, halides, NHPI esters): report E_p and E_p/2; E_p/2 is the better estimate for photoredox design, but it depends on scan rate and kinetics.</li>
        <li>Always state solvent, electrolyte, electrodes, scan rate and reference.</li>
      </ul>
      <p class="hint">Guides: Elgrishi et al., "A Practical Beginner's Guide to Cyclic Voltammetry", ${doiLink("10.1021/acs.jchemed.7b00361")}; Roth, Romero, Nicewicz on potentials of organic substrates, ${doiLink("10.1055/s-0035-1561297")}. The <a href="#cv">CV reader</a> extracts E_pa, E_pc, E½ and E_p/2 from your file.</p>
      ${quizHTML("cv")}` },

    { id: "photochem", title: "7 · Photophysical and photochemical measurements", html: `
      <p>Redox potentials say what is <i>possible</i>; these measurements show what <i>actually happens</i>.</p>
      <div class="table-wrap"><table><thead><tr><th>Measurement</th><th>What you learn</th><th>How, in short</th></tr></thead><tbody>
        <tr><td><b>UV–vis absorption</b></td><td>Which wavelength excites the PC (and whether substrates, products or EDA complexes absorb too); ε for loading/light-penetration choices.</td><td>Spectra of each component and of the mixture, at reaction concentration in a short-path cell.</td></tr>
        <tr><td><b>Steady-state emission</b> (+ 77 K)</td><td>E₀,₀ (with absorption), nature of the emitting state.</td><td>Fluorimeter, degassed solution; low-temperature glass for phosphorescent complexes.</td></tr>
        <tr><td><b>Excited-state lifetime τ₀</b></td><td>How long PC* lives, i.e. whether bimolecular quenching can compete.</td><td>Time-correlated single photon counting (ns), or laser flash photolysis for µs triplets.</td></tr>
        <tr><td><b>Stern–Volmer quenching</b></td><td>Which component actually reacts with PC*, and how fast (k_q).</td><td>Emission intensity (I₀/I) or lifetime (τ₀/τ) vs [Q]: I₀/I = 1 + K_SV[Q], k_q = K_SV/τ₀. Lifetime plots distinguish dynamic from static quenching. Test every component separately.</td></tr>
        <tr><td><b>Transient absorption</b></td><td>Direct observation of PC*, PC•+/PC•−, radical ions; rates of electron transfer and back-electron transfer, cage escape.</td><td>Laser flash photolysis (ns–µs) or fs/ps pump–probe.</td></tr>
        <tr><td><b>Quantum yield Φ</b></td><td>Molecules of product per photon absorbed. Φ ≫ 1 → radical chain; Φ ≤ 1 is consistent with (not proof of) closed catalytic cycles.</td><td>Chemical actinometry (potassium ferrioxalate) or calibrated photodiode; measure absorbed photons at the reaction wavelength (Cismesia &amp; Yoon, ${doiLink("10.1039/C5SC02185E")}).</td></tr>
        <tr><td><b>Light on/off experiment</b></td><td>Whether light is needed continuously.</td><td>Alternate irradiation and darkness, sample conversion each time.</td></tr>
        <tr><td><b>Radical clocks and traps</b></td><td>Evidence for radical intermediates.</td><td>TEMPO or BHT trapping, cyclopropyl ring-opening, 5-exo cyclisations; EPR with spin traps.</td></tr>
        <tr><td><b>Spectroelectrochemistry</b></td><td>Absorption spectra of PC•+ / PC•− (fingerprints for transient absorption).</td><td>UV–vis during controlled-potential electrolysis.</td></tr>
        <tr><td><b>Photon flux and set-up</b></td><td>Reproducibility.</td><td>Report LED wavelength and power, distance, vessel, temperature (fans!), stirring.</td></tr>
      </tbody></table></div>
      <p class="hint">Overview: Buzzetti, Crisenza, Melchiorre, "Mechanistic studies in photocatalysis", ${doiLink("10.1002/anie.201809984")}.</p>` },

    { id: "design", title: "8 · Designing a photoredox reaction: what goes in the flask", html: `
      <div class="table-wrap"><table><thead><tr><th>Component</th><th>Role</th><th>Typical choice</th></tr></thead><tbody>
        <tr><td><b>Photocatalyst</b></td><td>Absorbs light, performs the photochemical ET</td><td>0.5–2 mol% Ir/Ru complexes, 1–5 mol% organic dyes (4CzIPN, acridinium, eosin Y)</td></tr>
        <tr><td><b>Substrate / radical precursor</b></td><td>Gives the radical after ET: carboxylic acid (+ base), R–BF₃K, silicate, NHPI ester, halide, Katritzky salt…</td><td>0.1–0.5 M, limiting reagent or 1.5 equiv</td></tr>
        <tr><td><b>Radical acceptor / coupling partner</b></td><td>Traps the radical: Michael acceptor, heteroarene (Minisci), alkene, Ni–aryl complex</td><td>1–3 equiv</td></tr>
        <tr><td><b>Sacrificial donor or acceptor</b> (net reductive / oxidative reactions only)</td><td>Supplies or removes electrons to close the cycle</td><td>Donors: Et₃N, DIPEA, Hantzsch ester, ascorbate; acceptors: O₂, persulfate, BrCCl₃</td></tr>
        <tr><td><b>Co-catalyst</b></td><td>Adds a second mode of activation</td><td>Ni (cross-coupling), HAT catalysts (quinuclidine, thiols), Lewis/Brønsted acids, chiral organocatalysts</td></tr>
        <tr><td><b>Base or acid</b></td><td>Deprotonates acids (carboxylates are much easier to oxidise than acids), neutralises HX</td><td>Cs₂CO₃, K₂HPO₄, 2,6-lutidine, collidine</td></tr>
        <tr><td><b>Solvent</b></td><td>Dissolves salts and PC, stabilises radical ions</td><td>Degassed MeCN, DMF, DMSO, DMA; aqueous mixtures for some dyes</td></tr>
        <tr><td><b>Light source</b></td><td>Excites the PC selectively</td><td>LEDs matching the PC absorption (blue 450–465 nm is the default), with a fan to keep ~25 °C</td></tr>
        <tr><td><b>Atmosphere</b></td><td>Removes O₂ (quenches triplets, traps radicals)</td><td>Freeze–pump–thaw or sparging with Ar/N₂; sealed vials</td></tr>
      </tbody></table></div>
      <h4>A design checklist</h4>
      <ol>
        <li>Write the radical you want and the bond that must break or form.</li>
        <li>Pick a precursor whose potential is easy to reach (look it up in the database).</li>
        <li>Choose the PC with the <a href="#advisor">advisor</a>: photochemical step <i>and</i> turnover must be downhill.</li>
        <li>Check that only the PC absorbs at your wavelength (or that an EDA complex is what you want).</li>
        <li>Run controls: no light, no PC, no base/co-catalyst, in air; then mechanistic tests (Stern–Volmer, on/off, quantum yield, radical traps).</li>
      </ol>
      ${quizHTML("design")}` }
  ];

  // ------------------------------------------------------------------ interactive tools
  function ladder(el, marks, range = [-3, 3]) {
    const W = Math.max(320, el.clientWidth || 640), H = 90, l = 20, r = 20;
    const sx = v => l + (v - range[0]) / (range[1] - range[0]) * (W - l - r);
    let s = `<svg viewBox="0 0 ${W} ${H}" class="plot" style="background:transparent;border:0">`;
    s += `<line x1="${l}" x2="${W - r}" y1="50" y2="50" stroke="var(--muted)" stroke-width="2"/>`;
    const step = W < 520 ? 1 : 0.5;
    for (let t = Math.ceil(range[0] / step) * step; t <= range[1] + 1e-9; t += step) {
      s += `<line x1="${sx(t)}" x2="${sx(t)}" y1="45" y2="55" stroke="var(--muted)"/><text x="${sx(t)}" y="72" font-size="11" text-anchor="middle">${t > 0 ? "+" : ""}${t.toFixed(1)}</text>`;
    }
    s += `<text x="${l}" y="88" font-size="11">← stronger reductants</text><text x="${W - r}" y="88" font-size="11" text-anchor="end">stronger oxidants →</text>`;
    marks.forEach((m, i) => {
      const y = i % 2 ? 34 : 18;
      s += `<circle cx="${sx(m.v)}" cy="50" r="6" fill="${m.c}"/><text x="${sx(m.v)}" y="${y}" font-size="12" text-anchor="middle" fill="${m.c}" style="fill:${m.c}">${m.t}</text>`;
    });
    el.innerHTML = s + "</svg>";
  }
  function wireTools(root) {
    const $ = id => root.querySelector("#" + id);
    const dg = () => {
      const d = +$("dg-d").value, a = +$("dg-a").value, g = d - a;
      $("dg-dv").textContent = (d > 0 ? "+" : "") + d.toFixed(2) + " V"; $("dg-av").textContent = (a > 0 ? "+" : "") + a.toFixed(2) + " V";
      const verdict = g < -0.1 ? '<span class="badge ok">downhill: electron transfer is favourable</span>' : g <= 0.1 ? '<span class="badge warn">about thermoneutral</span>' : '<span class="badge bad">uphill: unfavourable</span>';
      $("dg-out").innerHTML = `ΔG = E_ox(D) − E_red(A) = <b>${(g > 0 ? "+" : "") + g.toFixed(2)} eV</b> (${(g * 23.06).toFixed(1)} kcal/mol)<br>${verdict}`;
      ladder($("dg-ladder"), [{ v: d, t: "donor E_ox", c: "var(--accent)" }, { v: a, t: "acceptor E_red", c: "var(--accent-2)" }]);
    };
    ["dg-d", "dg-a"].forEach(id => $(id).addEventListener("input", dg));
    dg();
    const e0 = () => {
      const ox = +$("e0-ox").value, red = +$("e0-red").value, e = +$("e0-e").value;
      $("e0-oxv").textContent = (ox > 0 ? "+" : "") + ox.toFixed(2) + " V"; $("e0-redv").textContent = red.toFixed(2) + " V"; $("e0-ev").textContent = e.toFixed(2) + " eV (" + Math.round(1239.8 / e) + " nm)";
      ladder($("e0-ladder"), [
        { v: ox - e, t: "E*ox " + (ox - e).toFixed(2), c: "var(--accent)" }, { v: red, t: "E_red " + red.toFixed(2), c: "var(--muted)" },
        { v: ox, t: "E_ox " + ox.toFixed(2), c: "var(--muted)" }, { v: red + e, t: "E*red " + (red + e > 0 ? "+" : "") + (red + e).toFixed(2), c: "var(--accent-2)" }
      ], [-3.5, 3.5]);
    };
    ["e0-ox", "e0-red", "e0-e"].forEach(id => $(id).addEventListener("input", e0));
    e0();
  }

  function render(root) {
    root.innerHTML = `
      <div class="learn">
        <aside class="toc card"><h3>Photoredox 101</h3><p class="hint">A short course for newcomers. Each chapter ends with a quiz.</p>
          <ol>${CHAPTERS.map(c => `<li><a href="#learn?ch=${c.id}" data-ch="${c.id}">${c.title.replace(/^\d+ · /, "")}</a></li>`).join("")}</ol></aside>
        <div class="chapters">${CHAPTERS.map(c => `<article class="card chapter" id="ch-${c.id}"><h2>${c.title}</h2>${c.html}</article>`).join("")}</div>
      </div>`;
    root.querySelectorAll(".toc a").forEach(a => a.addEventListener("click", e => {
      e.preventDefault();
      root.querySelector("#ch-" + a.dataset.ch).scrollIntoView({ behavior: "smooth", block: "start" });
    }));
    wireQuizzes(root);
    wireTools(root);
    const ch = new URLSearchParams(location.hash.split("?")[1] || "").get("ch");
    if (ch && root.querySelector("#ch-" + ch)) setTimeout(() => root.querySelector("#ch-" + ch).scrollIntoView(), 50);
  }

  window.RDBLearn = { render, QUIZZES };
})();
