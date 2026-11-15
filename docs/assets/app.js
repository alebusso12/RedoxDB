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
    db: el => RDBDatabase.render(el, mols),
    map: el => RDBAdvisor.renderMap(el, mols),
    estar: el => RDBEstar.render(el, mols),
    cv: el => RDBCV.render(el),
    advisor: el => RDBAdvisor.render(el, mols, rxns),
    submit: el => RDBSubmit.render(el, mols, ctx)
  };

  function route() {
    const [name, query] = (location.hash.slice(1) || "home").split("?");
    const sec = views[name] ? name : "home";
    document.querySelectorAll("section[data-view]").forEach(s => { s.hidden = s.dataset.view !== sec; });
    document.querySelectorAll("nav.sections a").forEach(a => a.classList.toggle("active", a.dataset.sec === sec));
    // render once; re-render when the address carries parameters (deep links from other tools)
    if (!rendered[sec] || query || sec === "home") {
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
    } catch (e) {
      main.insertAdjacentHTML("afterbegin", `<p class="notice">Could not load the data: ${RDB.esc(e.message)}</p>`);
    }
    window.addEventListener("hashchange", route);
    route();
  });
})();
