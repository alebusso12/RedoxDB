/* RedoxDB — main page: sign-in gate, data loading, section routing. */
(function () {
  "use strict";
  RDB.initTheme();
  let mols = [], rxns = [], ctx = null;
  const rendered = {};

  const views = {
    home: () => {
      const pc = mols.filter(m => m.category === "photocatalyst"), sub = mols.filter(m => m.category === "substrate");
      const kpi = (lab, v) => `<div class="kpi"><div class="lab">${lab}</div><div class="val">${v}</div></div>`;
      document.getElementById("home-stats").innerHTML =
        kpi("Molecules", mols.length) + kpi("Photocatalysts", pc.length) + kpi("Substrates / reagents", sub.length) +
        kpi("With excited-state data", mols.filter(m => m.e_star_ox != null || m.e_star_red != null).length) +
        kpi("Verified values", mols.filter(m => m.confidence === "high").length) + kpi("Reaction types", rxns.length);
    },
    learn: el => RDBLearn.render(el),
    db: el => RDBDatabase.render(el, mols),
    map: el => RDBAdvisor.renderMap(el, mols),
    estar: el => { RDBEstar.render(el, mols); el.insertAdjacentHTML("afterbegin", RDBTools.subnav("estar")); },
    cv: el => { RDBCV.render(el); el.insertAdjacentHTML("afterbegin", RDBTools.subnav("cv")); },
    ref: el => RDBTools.renderRef(el),
    units: el => RDBTools.renderUnits(el),
    sv: el => RDBTools.renderSV(el),
    rs: el => RDBTools.renderRS(el),
    advisor: el => RDBAdvisor.render(el, mols, rxns),
    submit: el => RDBSubmit.render(el, mols, ctx)
  };

  function route() {
    const [name, query] = (location.hash.slice(1) || "home").split("?");
    const sec = views[name] ? name : "home";
    document.querySelectorAll("section[data-view]").forEach(s => { s.hidden = s.dataset.view !== sec; });
    const TOOL_SECS = ["estar", "cv", "ref", "units", "sv", "rs"];
    document.querySelectorAll("nav.sections a").forEach(a => a.classList.toggle("active", a.dataset.sec === sec || (a.dataset.sec === "tools" && TOOL_SECS.includes(sec))));
    // render once; re-render when the address carries parameters (deep links from other tools)
    if (!rendered[sec] || (query && sec !== "learn") || sec === "home") {
      views[sec](document.getElementById("sec-" + sec));
      rendered[sec] = true;
    }
  }

  RDB.gate(async c => {
    ctx = c;
    if (c.role === "superadmin" || c.role === "curator") document.getElementById("go-admin").hidden = false;
    const main = document.getElementById("app-body");
    try {
      [mols, rxns] = await Promise.all([RDB.loadMolecules(), RDB.loadReactions()]);
      await RDB.attachMeasurements(mols);
    } catch (e) {
      main.insertAdjacentHTML("afterbegin", `<p class="notice">Could not load the data: ${RDB.esc(e.message)}</p>`);
    }
    window.addEventListener("hashchange", route);
    route();
  });
})();
