/* ==========================================================
   Performance widgets — response-time distributions & queueing
   <div class="pct-explorer"></div>  100 requests, mean vs percentiles, "hiccup" slider
   <div class="fanout-calc"></div>   tail-latency amplification: 1 - (1-p)^N
   <div class="util-curve"></div>    queueing: wait explodes as utilization -> 100%
   Uses course.css tokens (--viz-1, --viz-2, --ink*, --rule, --surface).
   ========================================================== */
(function () {
  var NS = "http://www.w3.org/2000/svg";
  var css = "\
.pw{font-family:var(--sans);font-size:14px;color:var(--ink)}\
.pw svg{width:100%;height:auto;display:block;overflow:visible}\
.pw .ctrl{display:flex;flex-wrap:wrap;gap:10px 22px;align-items:center;margin-bottom:12px}\
.pw .ctrl label{display:flex;gap:8px;align-items:center;color:var(--ink-2)}\
.pw .ctrl output{font-family:var(--mono);font-size:13px;color:var(--ink);min-width:52px;display:inline-block}\
.pw input[type=range]{accent-color:var(--viz-1);width:170px}\
.pw .seg{display:inline-flex;border:1px solid var(--rule);border-radius:8px;overflow:hidden}\
.pw .seg button{border:0;border-right:1px solid var(--rule);background:var(--bg);color:var(--ink-2);padding:6px 10px;font:inherit;cursor:pointer}\
.pw .seg button:last-child{border-right:0}\
.pw .seg button.on{background:var(--ink);color:var(--bg)}\
.pw .stats{display:flex;flex-wrap:wrap;gap:8px 26px;margin:4px 0 8px}\
.pw .stat .k{font-size:11.5px;letter-spacing:.08em;text-transform:uppercase;color:var(--ink-3);display:block}\
.pw .stat .v{font-family:var(--mono);font-size:18px;color:var(--ink)}\
.pw .hero{font-size:34px;font-weight:600;font-family:var(--sans);line-height:1.1}\
.pw .hero small{display:block;font-size:13.5px;font-weight:400;color:var(--ink-3);margin-top:4px}\
.pw .axis text{fill:var(--ink-3);font-size:11px;font-family:var(--sans)}\
.pw .axis line,.pw .grid line{stroke:var(--rule);stroke-width:1}\
.pw .refl{stroke:var(--ink-2);stroke-width:1.5}\
.pw .refl.mean{stroke-dasharray:5 4}\
.pw .reft{fill:var(--ink-2);font-size:11.5px;font-family:var(--sans);font-weight:600}\
.pw .legend{display:flex;gap:16px;font-size:12.5px;color:var(--ink-2);margin-top:6px;flex-wrap:wrap}\
.pw .sw{display:inline-block;width:10px;height:10px;border-radius:2px;margin-right:6px;vertical-align:-1px}\
.pw .ctip{position:absolute;z-index:60;padding:7px 10px;background:var(--ink);color:var(--bg);border-radius:6px;font-size:12.5px;pointer-events:none;opacity:0;transition:opacity .1s;white-space:nowrap}\
.pw .ctip.show{opacity:1}";
  var st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);

  function el(tag, attrs, parent) {
    var e = document.createElementNS(NS, tag);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  function txt(parent, x, y, s, attrs) {
    var t = el("text", Object.assign({ x: x, y: y }, attrs || {}), parent); t.textContent = s; return t;
  }
  function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function tipFor(root) {
    root.style.position = "relative";
    var t = document.createElement("div"); t.className = "ctip"; root.appendChild(t);
    return {
      show: function (html, evt) {
        t.innerHTML = html; t.classList.add("show");
        var r = root.getBoundingClientRect();
        var x = evt.clientX - r.left + 12, y = evt.clientY - r.top - 34;
        x = Math.min(x, r.width - t.offsetWidth - 4);
        t.style.left = x + "px"; t.style.top = y + "px";
      },
      hide: function () { t.classList.remove("show"); }
    };
  }
  function fmtMs(v) { return v >= 1000 ? (v / 1000).toFixed(2) + " s" : Math.round(v) + " ms"; }

  /* ---------------- 1. percentile explorer ---------------- */
  function pctExplorer(root) {
    root.classList.add("pw");
    var N = 100, rnd = mulberry32(7);
    var base = [], u = [], extra = [];
    for (var i = 0; i < N; i++) {
      var z = Math.sqrt(-2 * Math.log(rnd() + 1e-9)) * Math.cos(2 * Math.PI * rnd());
      base.push(Math.exp(Math.log(110) + 0.33 * z));
      u.push(rnd()); extra.push(500 + rnd() * 1300);
    }
    var state = { rate: 0.04, sorted: false };
    root.innerHTML =
      '<div class="ctrl"><label>Chance a request hits a random hiccup <input type="range" min="0" max="15" step="1" value="4"><output></output></label>' +
      '<span class="seg"><button data-s="0" class="on">Arrival order</button><button data-s="1">Sorted fastest → slowest</button></span></div>' +
      '<div class="stats"></div><div class="plot"></div>' +
      '<div class="legend"><span><span class="sw" style="background:var(--viz-1)"></span>Request at or below p95</span><span><span class="sw" style="background:var(--viz-2)"></span>Slowest 5% (the tail)</span><span>- - - mean &nbsp; ── percentiles</span></div>';
    var tip = tipFor(root);
    var slider = root.querySelector("input"), out = root.querySelector("output");
    slider.addEventListener("input", function () { state.rate = slider.value / 100; draw(); });
    root.querySelectorAll(".seg button").forEach(function (b) {
      b.addEventListener("click", function () {
        state.sorted = b.getAttribute("data-s") === "1";
        root.querySelectorAll(".seg button").forEach(function (x) { x.classList.toggle("on", x === b); });
        draw();
      });
    });
    function pct(sorted, p) { return sorted[Math.max(0, Math.ceil(p / 100 * sorted.length) - 1)]; }
    function draw() {
      out.textContent = Math.round(state.rate * 100) + "%";
      var vals = base.map(function (b, i) { return u[i] < state.rate ? b + extra[i] : b; });
      var sorted = vals.slice().sort(function (a, b) { return a - b; });
      var mean = vals.reduce(function (a, b) { return a + b; }, 0) / N;
      var p50 = pct(sorted, 50), p95 = pct(sorted, 95), p99 = pct(sorted, 99);
      root.querySelector(".stats").innerHTML =
        [["Mean", mean], ["p50 (median)", p50], ["p95", p95], ["p99", p99]].map(function (s) {
          return '<div class="stat"><span class="k">' + s[0] + '</span><span class="v">' + fmtMs(s[1]) + '</span></div>';
        }).join("");
      var shown = state.sorted ? sorted : vals;
      var W = 640, H = 250, L = 44, R = 70, T = 10, B = 26;
      var ymax = Math.max(400, Math.ceil(sorted[N - 1] / 200) * 200);
      var y = function (v) { return T + (H - T - B) * (1 - v / ymax); };
      var bw = (W - L - R) / N;
      var svg = el("svg", { viewBox: "0 0 " + W + " " + H, role: "img", "aria-label": "Response times of 100 requests with mean and percentile lines" });
      var ax = el("g", { class: "axis" }, svg);
      var step = ymax > 1200 ? 500 : 200;
      for (var g = 0; g <= ymax; g += step) {
        el("line", { x1: L, x2: W - R, y1: y(g), y2: y(g) }, ax);
        txt(ax, L - 6, y(g) + 4, g >= 1000 ? (g / 1000) + "s" : g + "", { "text-anchor": "end" });
      }
      txt(ax, L, H - 6, state.sorted ? "requests, sorted fastest → slowest (bar #95 sits on the p95 line)" : "100 requests, in the order they arrived", {});
      shown.forEach(function (v, i) {
        var top = y(v), h = y(0) - top, x = L + i * bw + 1;
        var r = Math.min(2, h / 2, (bw - 2) / 2);
        var d = "M" + x + "," + y(0) + "V" + (top + r) + "q0,-" + r + " " + r + ",-" + r + "H" + (x + bw - 2 - r) + "q" + r + ",0 " + r + "," + r + "V" + y(0) + "Z";
        var p = el("path", { d: d, fill: v > p95 ? "var(--viz-2)" : "var(--viz-1)" }, svg);
        var hit = el("rect", { x: L + i * bw, y: T, width: bw, height: H - T - B, fill: "transparent" }, svg);
        hit.addEventListener("mousemove", function (e) {
          p.setAttribute("opacity", ".75");
          tip.show((state.sorted ? "Rank " + (i + 1) + " of 100" : "Request #" + (i + 1)) + ": <b>" + fmtMs(v) + "</b>" + (v > p95 ? " · in the tail" : ""), e);
        });
        hit.addEventListener("mouseleave", function () { p.removeAttribute("opacity"); tip.hide(); });
      });
      var refs = [["mean", mean, "mean"], ["p50", p50, ""], ["p95", p95, ""], ["p99", p99, ""]];
      var labels = refs.map(function (r) { return { r: r, ly: y(r[1]) }; }).sort(function (a, b) { return b.ly - a.ly; });
      for (var k = 1; k < labels.length; k++) if (labels[k - 1].ly - labels[k].ly < 13) labels[k].ly = labels[k - 1].ly - 13;
      labels.forEach(function (o) {
        el("line", { class: "refl " + o.r[2], x1: L, x2: W - R + 4, y1: y(o.r[1]), y2: y(o.r[1]) }, svg);
        txt(svg, W - R + 8, o.ly + 4, o.r[0] + " " + fmtMs(o.r[1]), { class: "reft" });
      });
      var plot = root.querySelector(".plot"); plot.innerHTML = ""; plot.appendChild(svg);
    }
    draw();
  }

  /* ---------------- 2. fan-out calculator ---------------- */
  function fanoutCalc(root) {
    root.classList.add("pw");
    var s = { n: 10, p: 1 };
    root.innerHTML =
      '<div class="ctrl"><label>Backend calls per user request <input type="range" class="n" min="1" max="200" value="10"><output class="on_"></output></label>' +
      '<label>Chance one call is slow <input type="range" class="p" min="1" max="50" value="10"><output class="op"></output></label></div>' +
      '<div class="hero"></div><div class="plot"></div>';
    var tip = tipFor(root);
    var nIn = root.querySelector(".n"), pIn = root.querySelector(".p");
    nIn.addEventListener("input", function () { s.n = +nIn.value; draw(); });
    pIn.addEventListener("input", function () { s.p = pIn.value / 10; draw(); });
    function P(n, p) { return 1 - Math.pow(1 - p / 100, n); }
    function draw() {
      root.querySelector(".on_").textContent = s.n;
      root.querySelector(".op").textContent = s.p.toFixed(1) + "%";
      var v = P(s.n, s.p) * 100;
      root.querySelector(".hero").innerHTML = v.toFixed(v < 10 ? 1 : 0) + "% of user requests are slow" +
        "<small>Each call is slow only " + s.p.toFixed(1) + "% of the time, but the user waits for the slowest of " + s.n + ". &nbsp;1 − (1 − " + (s.p / 100).toFixed(3) + ")<sup>" + s.n + "</sup></small>";
      var W = 640, H = 200, L = 44, R = 16, T = 14, B = 28;
      var x = function (n) { return L + (W - L - R) * (n - 1) / 199; };
      var y = function (q) { return T + (H - T - B) * (1 - q / 100); };
      var svg = el("svg", { viewBox: "0 0 " + W + " " + H, role: "img", "aria-label": "Share of slow user requests versus number of backend calls" });
      var ax = el("g", { class: "axis" }, svg);
      [0, 25, 50, 75, 100].forEach(function (q) { el("line", { x1: L, x2: W - R, y1: y(q), y2: y(q) }, ax); txt(ax, L - 6, y(q) + 4, q + "%", { "text-anchor": "end" }); });
      [1, 50, 100, 150, 200].forEach(function (n) { txt(ax, x(n), H - 10, n, { "text-anchor": "middle" }); });
      var d = ""; for (var n = 1; n <= 200; n++) d += (n === 1 ? "M" : "L") + x(n).toFixed(1) + "," + y(P(n, s.p) * 100).toFixed(1);
      el("path", { d: d, fill: "none", stroke: "var(--viz-1)", "stroke-width": 2, "stroke-linejoin": "round" }, svg);
      el("circle", { cx: x(s.n), cy: y(v), r: 5, fill: "var(--viz-1)", stroke: "var(--surface)", "stroke-width": 2 }, svg);
      var cross = el("line", { y1: T, y2: H - B, stroke: "var(--ink-3)", "stroke-width": 1, opacity: 0 }, svg);
      var hit = el("rect", { x: L, y: T, width: W - L - R, height: H - T - B, fill: "transparent" }, svg);
      hit.addEventListener("mousemove", function (e) {
        var r = svg.getBoundingClientRect(), sx = (e.clientX - r.left) * W / r.width;
        var n = Math.max(1, Math.min(200, Math.round(1 + (sx - L) / (W - L - R) * 199)));
        cross.setAttribute("x1", x(n)); cross.setAttribute("x2", x(n)); cross.setAttribute("opacity", 1);
        tip.show(n + " calls → <b>" + (P(n, s.p) * 100).toFixed(1) + "%</b> of requests slow", e);
      });
      hit.addEventListener("mouseleave", function () { cross.setAttribute("opacity", 0); tip.hide(); });
      var plot = root.querySelector(".plot"); plot.innerHTML = ""; plot.appendChild(svg);
    }
    draw();
  }

  /* ---------------- 3. utilization curve ---------------- */
  function utilCurve(root) {
    root.classList.add("pw");
    var S = 50, s = { u: 50 };
    root.innerHTML =
      '<div class="ctrl"><label>How busy the server is (utilization) <input type="range" min="0" max="98" value="50"><output></output></label></div>' +
      '<div class="hero"></div><div class="plot"></div>';
    var tip = tipFor(root);
    var inp = root.querySelector("input");
    inp.addEventListener("input", function () { s.u = +inp.value; draw(); });
    function R(u) { return S / (1 - u / 100); }
    function draw() {
      root.querySelector("output").textContent = s.u + "%";
      var r = R(s.u);
      root.querySelector(".hero").innerHTML = "Average response time: " + fmtMs(r) +
        "<small>" + S + " ms of actual work + " + fmtMs(r - S) + " waiting in the queue (" + (r / S).toFixed(1) + "× the work itself)</small>";
      var W = 640, H = 210, L = 50, Rm = 16, T = 14, B = 28, ymax = 1000;
      var x = function (u) { return L + (W - L - Rm) * u / 100; };
      var y = function (v) { return T + (H - T - B) * (1 - Math.min(v, ymax) / ymax); };
      var svg = el("svg", { viewBox: "0 0 " + W + " " + H, role: "img", "aria-label": "Average response time versus server utilization" });
      var ax = el("g", { class: "axis" }, svg);
      [0, 250, 500, 750, 1000].forEach(function (v) { el("line", { x1: L, x2: W - Rm, y1: y(v), y2: y(v) }, ax); txt(ax, L - 6, y(v) + 4, v === 1000 ? "1 s" : v + "", { "text-anchor": "end" }); });
      [0, 25, 50, 75, 100].forEach(function (u) { txt(ax, x(u), H - 10, u + "%", { "text-anchor": "middle" }); });
      var d = ""; for (var u = 0; u <= 95.01; u += 0.5) d += (u === 0 ? "M" : "L") + x(u).toFixed(1) + "," + y(R(u)).toFixed(1);
      el("path", { d: d, fill: "none", stroke: "var(--viz-2)", "stroke-width": 2, "stroke-linejoin": "round" }, svg);
      el("circle", { cx: x(s.u), cy: y(r), r: 5, fill: "var(--viz-2)", stroke: "var(--surface)", "stroke-width": 2 }, svg);
      txt(svg, x(4), y(S) - 8, "work alone = " + S + " ms", { class: "reft" });
      var cross = el("line", { y1: T, y2: H - B, stroke: "var(--ink-3)", "stroke-width": 1, opacity: 0 }, svg);
      var hit = el("rect", { x: L, y: T, width: W - L - Rm, height: H - T - B, fill: "transparent" }, svg);
      hit.addEventListener("mousemove", function (e) {
        var b = svg.getBoundingClientRect(), sx = (e.clientX - b.left) * W / b.width;
        var uu = Math.max(0, Math.min(98, Math.round((sx - L) / (W - L - Rm) * 100)));
        cross.setAttribute("x1", x(uu)); cross.setAttribute("x2", x(uu)); cross.setAttribute("opacity", 1);
        tip.show(uu + "% busy → <b>" + fmtMs(R(uu)) + "</b> average", e);
      });
      hit.addEventListener("mouseleave", function () { cross.setAttribute("opacity", 0); tip.hide(); });
      var plot = root.querySelector(".plot"); plot.innerHTML = ""; plot.appendChild(svg);
    }
    draw();
  }

  document.addEventListener("DOMContentLoaded", function () {
    document.querySelectorAll(".pct-explorer").forEach(pctExplorer);
    document.querySelectorAll(".fanout-calc").forEach(fanoutCalc);
    document.querySelectorAll(".util-curve").forEach(utilCurve);
  });
})();
