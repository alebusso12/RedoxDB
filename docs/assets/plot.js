/* RedoxDB — minimal SVG plotting (lines, points, vertical/horizontal markers). */
(function () {
  "use strict";
  const NS = "http://www.w3.org/2000/svg";

  function niceTicks(min, max, n = 6) {
    if (!isFinite(min) || !isFinite(max)) return [];
    if (min === max) { min -= 1; max += 1; }
    const span = max - min;
    const step0 = span / n;
    const mag = Math.pow(10, Math.floor(Math.log10(step0)));
    const norm = step0 / mag;
    const step = (norm < 1.5 ? 1 : norm < 3 ? 2 : norm < 7 ? 5 : 10) * mag;
    const out = [];
    for (let v = Math.ceil(min / step) * step; v <= max + step * 1e-9; v += step) out.push(+v.toPrecision(12));
    return out;
  }
  function el(name, attrs, parent) {
    const e = document.createElementNS(NS, name);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  function fmtTick(v) {
    const a = Math.abs(v);
    if (a !== 0 && (a < 1e-3 || a >= 1e5)) return v.toExponential(1);
    return String(+v.toPrecision(4));
  }

  /* opts: { series:[{x,y,color,label,type:'line'|'points',width,dash}], xLabel, yLabel,
             xRange:[a,b], yRange:[a,b], xReverse, yReverse, vlines:[{x,color,label,dash}],
             hlines:[{y,color,label}], points:[{x,y,color,label,r}], height, legend } */
  function plot(container, opts) {
    container.innerHTML = "";
    const W = Math.max(320, container.clientWidth || 700), H = opts.height || 380;
    const m = { l: 70, r: 20, t: 18, b: 50 };
    const svg = el("svg", { viewBox: `0 0 ${W} ${H}`, class: "plot", role: "img" }, container);
    const xs = [], ys = [];
    (opts.series || []).forEach(s => { s.x.forEach(v => isFinite(v) && xs.push(v)); s.y.forEach(v => isFinite(v) && ys.push(v)); });
    (opts.points || []).forEach(p => { xs.push(p.x); ys.push(p.y); });
    (opts.vlines || []).forEach(v => xs.push(v.x));
    let [x0, x1] = opts.xRange || [Math.min(...xs), Math.max(...xs)];
    let [y0, y1] = opts.yRange || [Math.min(...ys), Math.max(...ys)];
    if (!isFinite(x0)) { x0 = 0; x1 = 1; }
    if (!isFinite(y0)) { y0 = 0; y1 = 1; }
    if (x0 === x1) { x0 -= 1; x1 += 1; }
    if (y0 === y1) { y0 -= 1; y1 += 1; }
    if (!opts.xRange) { const p = (x1 - x0) * 0.04; x0 -= p; x1 += p; }
    if (!opts.yRange) { const p = (y1 - y0) * 0.08; y0 -= p; y1 += p; }
    const pw = W - m.l - m.r, ph = H - m.t - m.b;
    const sx = v => m.l + (opts.xReverse ? (x1 - v) : (v - x0)) / (x1 - x0) * pw;
    const sy = v => m.t + (opts.yReverse ? (v - y0) : (y1 - v)) / (y1 - y0) * ph;

    const g = el("g", { class: "grid" }, svg);
    const ax = el("g", { class: "axis" }, svg);
    niceTicks(x0, x1, Math.max(3, Math.round(pw / 90))).forEach(t => {
      el("line", { x1: sx(t), x2: sx(t), y1: m.t, y2: m.t + ph }, g);
      const tx = el("text", { x: sx(t), y: m.t + ph + 18, "text-anchor": "middle", "font-size": 12 }, ax);
      tx.textContent = fmtTick(t);
    });
    niceTicks(y0, y1, Math.max(3, Math.round(ph / 60))).forEach(t => {
      el("line", { x1: m.l, x2: m.l + pw, y1: sy(t), y2: sy(t) }, g);
      const ty = el("text", { x: m.l - 8, y: sy(t) + 4, "text-anchor": "end", "font-size": 12 }, ax);
      ty.textContent = fmtTick(t);
    });
    el("rect", { x: m.l, y: m.t, width: pw, height: ph, fill: "none", stroke: "currentColor", "stroke-opacity": .35 }, ax);
    const xl = el("text", { x: m.l + pw / 2, y: H - 10, "text-anchor": "middle", "font-size": 13 }, svg);
    xl.textContent = opts.xLabel || "";
    const yl = el("text", { x: 16, y: m.t + ph / 2, "text-anchor": "middle", "font-size": 13, transform: `rotate(-90 16 ${m.t + ph / 2})` }, svg);
    yl.textContent = opts.yLabel || "";

    const clipId = "c" + Math.random().toString(36).slice(2);
    const defs = el("defs", {}, svg);
    const cp = el("clipPath", { id: clipId }, defs);
    el("rect", { x: m.l, y: m.t, width: pw, height: ph }, cp);
    const body = el("g", { "clip-path": `url(#${clipId})` }, svg);

    (opts.series || []).forEach(s => {
      if (s.type === "points") {
        s.x.forEach((xv, i) => el("circle", { cx: sx(xv), cy: sy(s.y[i]), r: s.r || 3, fill: s.color || "var(--accent)" }, body));
        return;
      }
      let d = "", pen = false;
      s.x.forEach((xv, i) => {
        const yv = s.y[i];
        if (!isFinite(xv) || !isFinite(yv)) { pen = false; return; }
        d += (pen ? "L" : "M") + sx(xv).toFixed(1) + " " + sy(yv).toFixed(1);
        pen = true;
      });
      el("path", { d, fill: "none", stroke: s.color || "var(--accent)", "stroke-width": s.width || 1.8, "stroke-dasharray": s.dash || "" }, body);
    });
    (opts.vlines || []).forEach(v => {
      el("line", { x1: sx(v.x), x2: sx(v.x), y1: m.t, y2: m.t + ph, stroke: v.color || "var(--muted)", "stroke-width": 1.4, "stroke-dasharray": v.dash || "5 4" }, body);
      if (v.label) {
        const t = el("text", { x: sx(v.x) + 4, y: m.t + 14 + (v.row || 0) * 14, "font-size": 11, fill: v.color || "var(--muted)" }, body);
        t.textContent = v.label;
        t.style.fill = v.color || "var(--muted)";
      }
    });
    (opts.hlines || []).forEach(h => {
      el("line", { x1: m.l, x2: m.l + pw, y1: sy(h.y), y2: sy(h.y), stroke: h.color || "var(--muted)", "stroke-dasharray": "4 4" }, body);
    });
    (opts.points || []).forEach(p => {
      const c = el("circle", { cx: sx(p.x), cy: sy(p.y), r: p.r || 5, fill: p.color || "var(--accent-2)", stroke: "#fff", "stroke-width": 1.2 }, body);
      if (p.title) { const t = el("title", {}, c); t.textContent = p.title; }
      if (p.label) {
        const t = el("text", { x: sx(p.x) + 7, y: sy(p.y) - 7, "font-size": 11 }, body);
        t.textContent = p.label;
      }
    });
    if (opts.legend !== false) {
      const named = (opts.series || []).filter(s => s.label);
      named.forEach((s, i) => {
        const y = m.t + 14 + i * 16;
        el("line", { x1: m.l + pw - 130, x2: m.l + pw - 110, y1: y - 4, y2: y - 4, stroke: s.color || "var(--accent)", "stroke-width": 2.5 }, svg);
        const t = el("text", { x: m.l + pw - 105, y, "font-size": 11 }, svg);
        t.textContent = s.label;
      });
    }
    svg.__scale = { sx, sy, x0, x1, y0, y1, m, pw, ph };
    return svg;
  }

  function svgString(svg) {
    const clone = svg.cloneNode(true);
    clone.setAttribute("xmlns", NS);
    const cs = getComputedStyle(document.documentElement);
    let s = new XMLSerializer().serializeToString(clone);
    s = s.replace(/var\(--([a-z0-9-]+)\)/g, (_, n) => cs.getPropertyValue("--" + n).trim() || "#000");
    return '<?xml version="1.0" encoding="UTF-8"?>\n' + s.replace("<svg", '<svg style="font-family:sans-serif;background:#fff"');
  }

  window.RDBPlot = { plot, niceTicks, svgString };
})();
