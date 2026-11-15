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
      <text x="480" y="232" fill="var(--ok)" style="fill:var(--ok)">E½ = (E_pa + E_pc)/2</text>
      <text x="480" y="250" fill="var(--muted)" style="fill:var(--muted)">ΔE_p ≈ 57 mV / n if reversible</text>
    </g>
  </svg>`;

  const SVG_CELL = `
  <svg viewBox="0 0 760 300" class="diagram" role="img" aria-label="Three-electrode electrochemical cell">
    <g fill="currentColor" font-size="13">
      <rect x="560" y="20" width="170" height="70" rx="10" fill="var(--surface-2)" stroke="var(--border)"/>
      <text x="645" y="50" text-anchor="middle" font-weight="700">Potentiostat</text>
      <text x="645" y="70" text-anchor="middle" font-size="11" fill="var(--muted)" style="fill:var(--muted)">sets E(WE) vs RE, measures i</text>
      <path d="M210 110 L 210 60 L 560 60" fill="none" stroke="var(--accent-2)" stroke-width="2"/>
      <path d="M300 110 L 300 75 L 560 75" fill="none" stroke="var(--ok)" stroke-width="2"/>
      <path d="M390 110 L 390 88 L 560 88" fill="none" stroke="var(--accent)" stroke-width="2"/>
      <path d="M150 120 L 150 270 Q 150 285 165 285 L 435 285 Q 450 285 450 270 L 450 120" fill="none" stroke="var(--muted)" stroke-width="2.5"/>
      <rect x="152" y="150" width="296" height="133" fill="var(--accent-soft)" opacity=".55"/>
      <text x="300" y="275" text-anchor="middle" font-size="11" fill="var(--muted)" style="fill:var(--muted)">analyte (~1 mM) + 0.1–0.25 M Bu₄NPF₆ in dry, degassed solvent</text>
      <rect x="200" y="110" width="20" height="130" rx="4" fill="var(--surface)" stroke="var(--accent-2)" stroke-width="2"/><rect x="203" y="234" width="14" height="6" fill="#333"/>
      <text x="210" y="105" text-anchor="middle" font-weight="700" fill="var(--accent-2)" style="fill:var(--accent-2)">WE</text>
      <text x="120" y="210" text-anchor="end" font-size="11">glassy carbon / Pt disk,</text><text x="120" y="224" text-anchor="end" font-size="11">polished</text>
      <rect x="290" y="110" width="20" height="120" rx="8" fill="var(--surface)" stroke="var(--ok)" stroke-width="2"/><circle cx="300" cy="228" r="5" fill="var(--ok)"/>
      <text x="300" y="105" text-anchor="middle" font-weight="700" fill="var(--ok)" style="fill:var(--ok)">RE</text>
      <text x="300" y="250" text-anchor="middle" font-size="11">Ag/Ag⁺ or Ag wire behind a frit + internal Fc</text>
      <path d="M390 110 L 390 230" stroke="var(--accent)" stroke-width="3"/><path d="M390 230 q 8 6 0 12 q -8 6 0 12" fill="none" stroke="var(--accent)" stroke-width="3"/>
      <text x="390" y="105" text-anchor="middle" font-weight="700" fill="var(--accent)" style="fill:var(--accent)">CE</text>
      <text x="470" y="215" font-size="11">Pt wire, larger area</text>
      <path d="M440 140 L 500 140" stroke="var(--muted)" stroke-width="2"/><text x="505" y="135" font-size="11">N₂/Ar over the solution</text><text x="505" y="150" font-size="11">(sparge first, then blanket)</text>
    </g>
  </svg>`;

  /* Finite-difference simulation of a reversible one-electron oxidation (Red → Ox + e⁻) under linear
     diffusion with equal diffusion coefficients, so [Ox] + [Red] = C everywhere and the Nernst equation fixes
     the surface concentrations. Returns sampled frames with E, i and the concentration profiles. */
  function simulateCV(v) {
    const F = 96485, R = 8.314, T = 298.15, f = F / (R * T);
    const E0 = 0, E1 = -0.3, E2 = 0.4, D = 2e-5, C = 1e-6, A = 0.0707;
    const tTot = 2 * (E2 - E1) / v;
    const N = 140, L = 6 * Math.sqrt(D * tTot), dx = L / N, lam = 0.45, dt = lam * dx * dx / D;
    const steps = Math.ceil(tTot / dt);
    let ox = new Float64Array(N + 1), nxt = new Float64Array(N + 1);
    const frames = [], every = Math.max(1, Math.floor(steps / 400));
    for (let s = 0; s <= steps; s++) {
      const t = s * dt;
      const E = t <= tTot / 2 ? E1 + v * t : E2 - v * (t - tTot / 2);
      for (let k = 1; k < N; k++) nxt[k] = ox[k] + lam * (ox[k + 1] - 2 * ox[k] + ox[k - 1]);
      nxt[N] = 0;
      const th = Math.exp(f * (E - E0));
      nxt[0] = C * th / (1 + th);
      [ox, nxt] = [nxt, ox];
      const grad = (-3 * ox[0] + 4 * ox[1] - ox[2]) / (2 * dx);
      const i = -F * A * D * grad;  // anodic current positive
      if (s % every === 0 || s === steps) {
        const prof = [];
        for (let k = 0; k <= N * 0.6; k += 2) prof.push([k * dx * 1e4, ox[k] * 1e6, (C - ox[k]) * 1e6]);
        frames.push({ E, i: i * 1e6, prof });
      }
    }
    return frames;
  }

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
      { q: "In the IUPAC convention, which way do positive potentials and oxidation currents point?", o: ["Positive potentials to the right, oxidation currents positive (up)", "Negative potentials to the right, reduction currents positive", "Positive potentials to the left, oxidation currents down", "It is not defined"], a: 0,
        e: "IUPAC: E increases to the right and anodic (oxidation) currents are positive. The older US convention flips both; check the potential axis of any figure." },
      { q: "Why does the current go through a peak and then decrease, even though the potential keeps becoming more favourable?", o: ["The electrode gets passivated", "Near the electrode the analyte is used up and the growing diffusion layer slows down the supply from the bulk", "The scan rate decreases", "The reference electrode drifts"], a: 1,
        e: "Past E°′ the current is limited by diffusion; as the depleted layer grows, mass transport slows and the current decays — hence the duck shape." },
      { q: "A reversible one-electron couple at 25 °C ideally shows ΔE_p of…", o: ["0 mV", "about 57 mV", "about 120 mV", "exactly 59 mV for any n"], a: 1,
        e: "ΔE_p = 2.22 RT/F ≈ 57 mV for n = 1 (≈ 28.5 mV for a concerted two-electron wave). Values of 60–90 mV are common in practice because of ohmic drop." },
      { q: "The return peak is missing at 100 mV/s but appears at 5 V/s. What is going on?", o: ["The electrode is dirty", "The oxidised/reduced species undergoes a chemical reaction (E_rC_i) that fast scans outrun", "Oxygen is present", "The electrolyte is too concentrated"], a: 1,
        e: "An EC mechanism: at fast scan rates the experiment is quicker than the follow-up chemistry, so the product survives to be converted back." },
      { q: "Why should ferrocene be present in every measurement rather than added only at the end?", o: ["It catalyses electron transfer", "Non-aqueous (pseudo-)references drift during the experiment, so each scan needs its own internal reference", "It removes oxygen", "It increases conductivity"], a: 1,
        e: "Reporting vs the internal Fc⁺/Fc couple of the same scan cancels reference drift; use decamethylferrocene if Fc overlaps with your analyte." },
      { q: "Ferrocene in your cell shows ΔE_p = 140 mV. What is the most likely problem?", o: ["Ferrocene decomposed", "Large uncompensated resistance (ohmic drop)", "Too much ferrocene", "Wrong plotting convention"], a: 1,
        e: "Fc⁺/Fc is fast and reversible; a large ΔE_p means i·R_u distortion. Add electrolyte, move the RE closer to the WE, use a smaller electrode or slower scans, or apply iR compensation." },
      { q: "Your substrate shows only an anodic peak (no return wave). Which value do you put in a photoredox design table?", o: ["E½", "E_p/2, stating that the wave is irreversible", "The switching potential", "Nothing can be reported"], a: 1,
        e: "Irreversible waves have no E½; E_p/2 is the usual estimate (with the scan rate stated), as in Roth, Romero & Nicewicz's substrate compilation." }
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

    { id: "cv", title: "6 · Cyclic voltammetry: measuring a redox potential properly", html: `
      <p class="hint">This chapter follows the structure of Elgrishi, Rountree, McCarthy, Rountree, Eisenhart and Dempsey, "A Practical Beginner's Guide to Cyclic Voltammetry", J. Chem. Educ. 2018, 95, 197 (${doiLink("10.1021/acs.jchemed.7b00361")}, open access) — read it, and its training modules in the Supporting Information, before your first measurement. The text below is a summary written for photoredox users.</p>

      <h4>6.1 The electrode is a reagent whose strength you can dial</h4>
      <p>A chemical reductant transfers an electron to a substrate when its HOMO lies above the substrate's LUMO; to change the driving force you must change the reductant. At an electrode the potentiostat sets the energy of the electrons in the metal or carbon: making the electrode potential more negative raises their energy until electron transfer to the analyte becomes favourable (reduction); making it more positive lowers it until the electrode can take an electron from the analyte (oxidation). Cyclic voltammetry (CV) sweeps this "reagent strength" linearly and records the current that flows.</p>

      <h4>6.2 Reading a voltammogram</h4>
      <ul>
        <li><b>x axis:</b> the applied potential E (always quoted <i>vs</i> a reference). <b>y axis:</b> the current i.</li>
        <li><b>Scan direction:</b> an arrow marks the start and direction of the first sweep. The potential goes from the initial potential to the <i>switching potential</i> and back. A sweep towards negative potentials is the cathodic trace (reductions), towards positive potentials the anodic trace (oxidations).</li>
        <li><b>Scan rate v</b> (e.g. 100 mV/s): how fast the potential changes. It must always be reported.</li>
        <li><b>Two plotting conventions exist</b> and papers rarely say which one they use: in the <b>IUPAC</b> convention positive potentials are to the right and oxidation (anodic) currents are positive; in the older <b>US/polarographic</b> convention negative potentials are to the right and reduction currents are positive. Look at the direction of the potential axis to tell them apart. This site (and its CV reader) uses IUPAC.</li>
      </ul>
      ${SVG_CV}

      <h4>6.3 Why the "duck" shape? Nernst equation and diffusion</h4>
      <p>At the electrode surface the ratio of oxidised to reduced form follows the <b>Nernst equation</b>:</p>
      <div class="formula">E = E°′ + (RT/nF) ln([Ox]/[Red])  →  at 25 °C: E = E°′ + (0.0592/n) log([Ox]/[Red])</div>
      <p>E°′ is the <i>formal</i> potential under your conditions (solvent, electrolyte). Take the oxidation of ferrocene (Fc → Fc⁺) scanned positively:</p>
      <ol>
        <li>Far below E°′ nothing happens: the surface contains only Fc.</li>
        <li>Approaching E°′, Nernst requires Fc⁺ at the surface, so Fc is oxidised and current flows. At E = E°′, [Fc⁺] = [Fc] at the surface.</li>
        <li>Beyond E°′ almost all Fc at the surface is converted; the current is now limited by how fast fresh Fc <b>diffuses</b> from the bulk. The depleted zone (the <i>diffusion layer</i>) keeps growing, the supply slows, and the current passes through a maximum — the <b>anodic peak E_pa</b> — and then decays.</li>
        <li>On the reverse sweep the Fc⁺ accumulated near the electrode is reduced back, giving the <b>cathodic peak E_pc</b>.</li>
      </ol>
      <p>The two peaks are separated because the species must diffuse to and from the electrode; their midpoint gives <b>E½ ≈ E°′</b>, the number used in photoredox tables.</p>
      <div class="card tool" id="tool-cvsim"><h4>Try it: a simulated CV with its concentration profiles</h4>
        <p class="hint">Reversible one-electron oxidation of 1 mM Fc-like analyte (E°′ = 0 V, D = 2 × 10⁻⁵ cm² s⁻¹, 3 mm electrode), computed by finite differences with the Nernst equation at the surface. Move the time slider to follow the sweep, and change the scan rate.</p>
        <div class="grid c2">
          <label class="field">Point of the sweep<input id="cs-t" type="range" min="0" max="1000" value="300"></label>
          <label class="field">Scan rate<select id="cs-v"><option value="0.025">25 mV/s</option><option value="0.1" selected>100 mV/s</option><option value="0.4">400 mV/s</option><option value="1">1 V/s</option></select></label>
        </div>
        <div class="grid c2"><div id="cs-cv"></div><div id="cs-prof"></div></div>
        <p class="hint" id="cs-info"></p>
      </div>

      <h4>6.4 Reversibility — two different meanings</h4>
      <ul>
        <li><b>Electrochemical reversibility</b> concerns the electron-transfer <i>kinetics</i> at the electrode. If transfer is fast, Nernst equilibrium is kept at every potential ("Nernstian" behaviour): ΔE_p = E_pa − E_pc ≈ <b>57 mV</b> for n = 1 at 25 °C (2.22 RT/F), and the peak is ~59 mV wide at half height. Slow transfer needs extra overpotential and ΔE_p grows.</li>
        <li><b>Chemical reversibility</b> concerns the <i>stability</i> of the product: if the oxidised or reduced species reacts (fragments, loses a ligand, decarboxylates…), there is nothing left to convert back and the return peak shrinks or disappears (|i_pc/i_pa| &lt; 1).</li>
      </ul>
      <p><b>Scan-rate study.</b> For a freely diffusing species the peak current follows the Randles–Ševčík equation</p>
      <div class="formula">i_p = 0.446 n F A C (n F v D / RT)^½   — i_p grows linearly with √v</div>
      <p>A straight line of i_p vs √v shows the analyte is freely diffusing (and gives D); a linear dependence on v instead points to species adsorbed on the electrode. The capacitive (background) current also grows linearly with v, so very fast scans have larger background.</p>
      <div class="table-wrap"><table><thead><tr><th>What you see</th><th>What it usually means</th></tr></thead><tbody>
        <tr><td>ΔE_p ≈ 57–70 mV, |i_pc/i_pa| ≈ 1, both independent of v</td><td>Reversible one-electron couple: report E½</td></tr>
        <tr><td>ΔE_p grows with v, ratio ≈ 1</td><td>Slow electron transfer (quasi-reversible) or ohmic drop: check with ferrocene in the same cell</td></tr>
        <tr><td>Return peak small at slow scans, recovering at fast scans</td><td>E<sub>r</sub>C<sub>i</sub>: the product reacts on the timescale of the experiment (rate constants can be extracted)</td></tr>
        <tr><td>No return peak at any scan rate</td><td>Fast follow-up chemistry (typical for photoredox substrates): report E_p and E_p/2</td></tr>
        <tr><td>One wave with ΔE_p ≈ 28.5 mV and double current</td><td>Two-electron process (second ET easier than the first); waves separate into two 57 mV couples when their E°′ differ by more than ~0.14 V</td></tr>
        <tr><td>Peaks also present in electrolyte alone</td><td>Impurities, O₂, or adsorbed species: clean, degas, repolish</td></tr>
      </tbody></table></div>

      <h4>6.5 The electrochemical cell</h4>
      ${SVG_CELL}
      <ul>
        <li><b>Working electrode (WE)</b> — where the reaction of interest happens. Glassy carbon (3 mm) or Pt for organic solvents; it must be inert in your potential window and have a clean, well-defined surface. Polish with alumina on a pad, rinse, sonicate in pure water, then "pretreat" by cycling in electrolyte until the background scans overlap. Repolish between analytes. A quick <i>rinse test</i> (move the electrode to fresh electrolyte after a measurement) reveals strong adsorption. Changing the electrode material is a good way to diagnose odd behaviour.</li>
        <li><b>Reference electrode (RE)</b> — a stable potential to measure against; no current flows through it. SCE or Ag/AgCl behind a frit in aqueous work; in organic solvents Ag⁺/Ag (Ag wire in AgNO₃ solution) or a simple Ag-wire <b>pseudo-reference</b>. Non-aqueous references drift, so include an <b>internal standard — ferrocene — in every measurement</b> (not only at the end) and report potentials vs Fc⁺/Fc; use decamethylferrocene if Fc overlaps with or reacts with your compound. Convert to SCE afterwards (MeCN: +0.38 V).</li>
        <li><b>Counter electrode (CE)</b> — closes the circuit; a Pt wire or carbon rod with a larger area than the WE. Whatever is reduced at the WE, something is oxidised at the CE: if its by-products interfere (e.g. THF polymerisation), place it in a fritted compartment.</li>
      </ul>

      <h4>6.6 The electrolyte solution</h4>
      <ul>
        <li><b>Solvent:</b> dissolves the analyte and a lot of electrolyte, is stable over the potential range (its "solvent window"), does not react with the analyte, and can be purified and dried. MeCN (wide window), DMF, CH₂Cl₂ are common; ideally use the reaction solvent.</li>
        <li><b>Supporting electrolyte:</b> soluble, electrochemically inert, purifiable — typically 0.1–0.25 M Bu₄NPF₆ in MeCN (Bu₄NBF₄, Bu₄NClO₄ also used; more coordinating anions interact more with metal complexes). Because it is so concentrated, its purity matters.</li>
        <li><b>Why so much electrolyte?</b> Charge must be balanced by ions moving in solution. A large excess of inert ions keeps the solution conductive and ensures that the analyte reaches the electrode by <b>diffusion only</b>, not by migration in the electric field. Convection is avoided by not stirring (and avoiding vibrations) during the scan. All the textbook equations assume diffusion-only transport.</li>
        <li><b>Analyte:</b> ~1 mM (0.5–5 mM).</li>
      </ul>

      <h4>6.7 Step by step</h4>
      <ol>
        <li>Prepare dry electrolyte solution; polish and pretreat the WE.</li>
        <li><b>Degas</b>: sparge with N₂ or Ar (several minutes), then lift the tubing above the liquid to keep the headspace inert without stirring the solution — or work in a glovebox. Dissolved O₂ gives a reduction wave (O₂/O₂•−, reversible in MeCN) and can destroy the reversibility of reduced analytes by electron transfer to O₂.</li>
        <li>Record a <b>background scan</b> of electrolyte alone: only a small, featureless capacitive current should flow. Peaks here mean impurities or O₂.</li>
        <li>Add analyte (and ferrocene). Read the <b>open circuit potential</b> (OCP, the potential at zero current); start the scan there.</li>
        <li>Set initial, switching and final potentials, scan rate (start at 100 mV/s) and number of cycles; scan first towards the process of interest.</li>
        <li>Repeat at several scan rates (e.g. 25–1000 mV/s) to test reversibility and diffusion.</li>
        <li>Reference all potentials to the internal Fc⁺/Fc couple, then convert to SCE if needed.</li>
      </ol>

      <h4>6.8 Ohmic drop (uncompensated resistance)</h4>
      <p>The solution between WE and RE has a resistance R_u; the potential felt by the analyte differs from the applied one by i·R_u. The tell-tale sign is a larger ΔE_p than expected for a couple known to be reversible (check ferrocene). Reduce it by (1) lowering the current (smaller WE, slower scans), (2) increasing the electrolyte concentration, and (3) bringing the RE tip close to the WE; many potentiostats can measure R_u and compensate it in real time.</p>

      <h4>6.9 For photoredox: what number to take</h4>
      <ul>
        <li><b>Catalysts</b> (Ir, Ru, acridinium, cyanoarenes…) usually give reversible couples: use E½ for E_ox and E_red, then combine with E₀,₀ (chapter 3).</li>
        <li><b>Substrates</b> often fragment after electron transfer (carboxylates lose CO₂, halides lose X⁻, NHPI esters fragment): no return wave. Report E_p and the half-peak potential E_p/2, which better approximates the thermodynamic value; but remember both depend on scan rate and follow-up kinetics (Roth, Romero, Nicewicz, ${doiLink("10.1055/s-0035-1561297")}).</li>
        <li>Measure in the same solvent as the reaction whenever possible, and make sure every potential you compare is on the same reference.</li>
      </ul>

      <h4>6.10 Report and avoid</h4>
      <div class="grid c2">
        <div><b>Always report</b><ul><li>solvent, electrolyte and concentration</li><li>WE material and size, CE, RE (and internal standard)</li><li>scan rate, direction and number of cycles</li><li>reference used for the potentials and any conversion</li><li>plotting convention (IUPAC/US)</li></ul></div>
        <div><b>Common mistakes</b><ul><li>measuring in air (O₂ wave, lost reversibility)</li><li>too little or impure electrolyte (ohmic drop, migration)</li><li>unpolished electrode, adsorption</li><li>adding ferrocene only at the end while the pseudo-reference drifts</li><li>mixing potentials vs Fc, SCE and Ag/AgCl without converting</li><li>reading E_p of an irreversible wave as if it were E½</li></ul></div>
      </div>
      <p class="hint">Upload your own data in the <a href="#cv">CV reader</a>: it splits cycles, finds peaks with a local baseline and returns E_pa, E_pc, E½, ΔE_p, |i_pc/i_pa| and E_p/2, referenced to SCE or to internal ferrocene.</p>
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

    // CV simulator
    let frames = null, peaks = null;
    const run = () => {
      frames = simulateCV(+$("cs-v").value);
      let a = 0, c = 0;
      frames.forEach((fr, k) => { if (fr.i > frames[a].i) a = k; if (fr.i < frames[c].i) c = k; });
      peaks = { a: frames[a], c: frames[c] };
      draw();
    };
    const draw = () => {
      const k = Math.min(frames.length - 1, Math.round(+$("cs-t").value / 1000 * (frames.length - 1)));
      const fr = frames[k];
      const fwd = frames.findIndex((x, j) => j > 0 && x.E < frames[j - 1].E);
      RDBPlot.plot($("cs-cv"), {
        series: [{ x: frames.slice(0, fwd).map(x => x.E), y: frames.slice(0, fwd).map(x => x.i), color: "var(--accent-2)" },
                 { x: frames.slice(fwd - 1).map(x => x.E), y: frames.slice(fwd - 1).map(x => x.i), color: "var(--accent)" }],
        points: [{ x: fr.E, y: fr.i, color: "var(--warn)", r: 6 }],
        vlines: [{ x: 0, label: "E°′", color: "var(--muted)" }],
        xLabel: "E (V vs E°′)", yLabel: "i (µA, oxidation +)", height: 280, legend: false
      });
      RDBPlot.plot($("cs-prof"), {
        series: [{ x: fr.prof.map(p => p[0]), y: fr.prof.map(p => p[2]), color: "var(--ok)", label: "Red (Fc)" },
                 { x: fr.prof.map(p => p[0]), y: fr.prof.map(p => p[1]), color: "var(--accent)", label: "Ox (Fc⁺)" }],
        xLabel: "distance from electrode (µm)", yLabel: "concentration (mM)", yRange: [0, 1.08], height: 280
      });
      const dEp = (peaks.a.E - peaks.c.E) * 1000;
      $("cs-info").innerHTML = `E = ${fr.E >= 0 ? "+" : ""}${fr.E.toFixed(3)} V, i = ${fr.i.toFixed(2)} µA · simulated E_pa = +${(peaks.a.E * 1000).toFixed(0)} mV, E_pc = ${(peaks.c.E * 1000).toFixed(0)} mV → E½ = ${((peaks.a.E + peaks.c.E) / 2 * 1000).toFixed(0)} mV, ΔE_p = ${dEp.toFixed(0)} mV, i_pa = ${peaks.a.i.toFixed(1)} µA. Try 4× the scan rate: i_p doubles (√v).`;
    };
    $("cs-v").addEventListener("input", run);
    $("cs-t").addEventListener("input", draw);
    run();
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
