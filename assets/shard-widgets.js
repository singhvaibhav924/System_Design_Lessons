/* ==========================================================
   Sharding widgets (DDIA Ch. 6, Xu Ch. 1 & 5)
   <div class="partition-scheme"></div>  sensor writes under key-range, hash, and compound keys:
                                         where today's writes land vs what a range query must touch
   <div class="rehash-sim"></div>        add one node: share of keys that move under hash mod N vs a fixed number of partitions
   <div class="ring-sim"></div>          consistent-hash ring with virtual nodes: add/remove servers, see moved keys and load balance (Xu Ch. 5)
   ========================================================== */
(function () {
  var css = "\
.shw{font-family:var(--sans);font-size:14px;color:var(--ink)}\
.shw .seg{display:inline-flex;border:1px solid var(--rule);border-radius:8px;overflow:hidden;flex-wrap:wrap}\
.shw .seg button{font:inherit;font-size:13px;border:0;border-right:1px solid var(--rule);background:var(--surface);color:var(--ink-2);padding:6px 11px;cursor:pointer}\
.shw .seg button:last-child{border-right:0}\
.shw .seg button.on{background:var(--ink);color:var(--bg)}\
.shw .ctrl{display:flex;flex-wrap:wrap;gap:8px 18px;align-items:center;margin-bottom:12px}\
.shw .ctrl label{display:flex;gap:8px;align-items:center;color:var(--ink-2)}\
.shw .ctrl output{font-family:var(--mono);font-size:13px;min-width:22px;display:inline-block;color:var(--ink)}\
.shw input[type=range]{accent-color:var(--viz-1);width:140px}\
.shw .zone{font-size:11.5px;letter-spacing:.06em;text-transform:uppercase;color:var(--ink-3);margin:12px 0 6px}\
.shw .bars{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;align-items:end;height:120px;border-bottom:1px solid var(--rule)}\
.shw .bar{display:flex;flex-direction:column;justify-content:flex-end;height:100%}\
.shw .bar .f{background:var(--viz-1);border-radius:4px 4px 0 0;min-height:2px}\
.shw .bar .n{font-family:var(--mono);font-size:12px;color:var(--ink);text-align:center;margin-bottom:3px}\
.shw .labs{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;font-size:12px;color:var(--ink-3);text-align:center;margin-top:4px}\
.shw .note{font-size:13.5px;color:var(--ink-2);margin:10px 0 0}\
.shw .note b{color:var(--ink)}\
.shw .tiles{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:10px;margin-top:6px}\
.shw .tile{border:1px solid var(--rule);border-radius:10px;padding:10px 12px;background:var(--surface)}\
.shw .tile .t{font-size:12.5px;color:var(--ink-3)}\
.shw .tile .v{font-size:22px;font-weight:600;font-family:var(--mono)}\
.shw .dots{display:grid;grid-template-columns:repeat(50,1fr);gap:2px;margin:6px 0 2px}\
.shw .dots i{display:block;aspect-ratio:1;border-radius:2px;background:var(--rule)}\
.shw .dots i.m{background:var(--viz-2)}\
.shw .legend{display:flex;gap:16px;font-size:12.5px;color:var(--ink-3)}\
.shw .legend i{display:inline-block;width:11px;height:11px;border-radius:2px;vertical-align:-1px;margin-right:5px}\
.shw .ringwrap{display:grid;grid-template-columns:minmax(220px,320px) 1fr;gap:18px;align-items:start}\
@media (max-width:640px){.shw .ringwrap{grid-template-columns:1fr}}\
.shw svg{width:100%;height:auto;display:block}\
.shw .btns{display:flex;gap:8px;flex-wrap:wrap}\
.shw .btns button{font:inherit;font-size:13.5px;border:1px solid var(--rule);background:var(--surface);color:var(--ink);border-radius:8px;padding:6px 11px;cursor:pointer}\
.shw .btns button.primary{background:var(--ink);color:var(--bg);border-color:var(--ink)}\
.shw .btns button:disabled{opacity:.4;cursor:default}\
.shw .hb{display:grid;grid-template-columns:44px 1fr 52px;gap:8px;align-items:center;margin:4px 0;font-size:12.5px}\
.shw .hb .lb{color:var(--ink-2);font-family:var(--mono)}\
.shw .hb .tr{height:12px;background:var(--surface-2);border-radius:3px;position:relative}\
.shw .hb .fl{position:absolute;left:0;top:0;bottom:0;background:var(--viz-1);border-radius:3px}\
.shw .hb .fair{position:absolute;top:-3px;bottom:-3px;width:2px;background:var(--ink-3)}\
.shw .hb .vl{font-family:var(--mono);color:var(--ink)}";
  var st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);

  function fnv(s) {
    var h = 2166136261; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    h ^= h >>> 16; h = Math.imul(h, 0x85ebca6b); h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35); h ^= h >>> 16; // final mix so low bits are well spread
    return h >>> 0;
  }

  /* ---------- key-range vs hash vs compound ---------- */
  function partitionScheme(root) {
    root.classList.add("shw");
    var SCH = [
      ["range", "Key range on timestamp"],
      ["hash", "Hash of timestamp"],
      ["compound", "Key range on (sensor, timestamp)"]
    ];
    root.innerHTML = '<div class="ctrl"><span style="color:var(--ink-2)">Partition key</span><span class="seg">' +
      SCH.map(function (s) { return '<button data-k="' + s[0] + '">' + s[1] + "</button>"; }).join("") + "</span></div>" +
      '<div class="zone">Where the last minute of writes from 20 sensors lands</div><div class="bars"></div><div class="labs"></div>' +
      '<p class="note"></p>';
    var cur = "range";
    root.querySelectorAll(".seg button").forEach(function (b) { b.addEventListener("click", function () { cur = b.getAttribute("data-k"); draw(); }); });
    function draw() {
      root.querySelectorAll(".seg button").forEach(function (b) { b.classList.toggle("on", b.getAttribute("data-k") === cur); });
      var counts = [0, 0, 0, 0], labs;
      // 20 sensors × 10 readings each in the current minute; data spans Jan–Dec, today is in Q4
      for (var s = 0; s < 20; s++) for (var j = 0; j < 10; j++) {
        var ts = "2026-11-02T10:31:" + (j * 6 < 10 ? "0" : "") + (j * 6), p;
        if (cur === "range") p = 3;                                  // partitions = quarters of the year; all "now" writes are in Q4
        else if (cur === "hash") p = fnv("s" + s + ts) % 4;
        else p = Math.floor(s / 5);                                  // sensors 00–04, 05–09, 10–14, 15–19
        counts[p]++;
      }
      labs = cur === "range" ? ["Jan–Mar", "Apr–Jun", "Jul–Sep", "Oct–Dec"] : cur === "hash" ? ["hash 0–¼", "hash ¼–½", "hash ½–¾", "hash ¾–1"] : ["sensors 00–04", "05–09", "10–14", "15–19"];
      var max = Math.max.apply(null, counts);
      root.querySelector(".bars").innerHTML = counts.map(function (c) { return '<div class="bar"><span class="n">' + c + '</span><span class="f" style="height:' + (c / max * 92) + '%"></span></div>'; }).join("");
      root.querySelector(".labs").innerHTML = labs.map(function (l) { return "<span>" + l + "</span>"; }).join("");
      var note = {
        range: "<b>Hot spot:</b> every new reading has today's timestamp, so all 200 writes hit the Oct–Dec partition while three sit idle. Upside: \"all readings for March\" reads <b>one partition</b>, in order.",
        hash: "<b>Even writes:</b> hashing scatters neighbouring timestamps across all partitions. Downside: \"all readings for March\" must ask <b>every partition</b> (scatter/gather), because nearby keys are no longer stored together.",
        compound: "<b>Even writes</b> (as long as many sensors are active), and \"sensor 7 in March\" is still <b>one partition, one range scan</b>. The cost: \"all sensors in March\" becomes one range query per sensor. Cassandra's compound primary key works this way: hash the first part, sort by the rest."
      }[cur];
      root.querySelector(".note").innerHTML = note;
    }
    draw();
  }

  /* ---------- hash mod N vs fixed partitions ---------- */
  function rehashSim(root) {
    root.classList.add("shw");
    root.innerHTML = '<div class="ctrl"><label>Grow the cluster from <input type="range" class="n" min="2" max="12" value="4"><output class="o"></output></label><span class="o2" style="color:var(--ink-2)"></span></div>' +
      '<div class="tiles"><div class="tile"><div class="t">Keys that move with <b>hash(key) mod N</b></div><div class="v a"></div><div class="dots da"></div></div>' +
      '<div class="tile"><div class="t">Keys that move with <b>256 fixed partitions</b>, whole partitions reassigned</div><div class="v b"></div><div class="dots db"></div></div></div>' +
      '<div class="legend" style="margin-top:8px"><span><i style="background:var(--viz-2)"></i>key must move to another node</span><span><i style="background:var(--rule)"></i>stays put</span></div>' +
      '<p class="note"></p>';
    var n = root.querySelector(".n"), K = 10000, P = 256;
    n.addEventListener("input", draw);
    function draw() {
      var N = +n.value; root.querySelector(".o").textContent = N; root.querySelector(".o2").textContent = "to " + (N + 1) + " nodes";
      var movedMod = 0, movedFix = 0, dotsA = "", dotsB = "";
      // fixed partitions: start round-robin over N nodes; the new node takes floor(P/(N+1)) partitions, taken evenly from the others
      var owner = []; for (var p = 0; p < P; p++) owner.push(p % N);
      var take = Math.floor(P / (N + 1)), per = {}, stolen = {}, i = 0;
      for (var k = 0; k < N; k++) per[k] = 0;
      for (p = P - 1; p >= 0 && i < take; p--) { if (per[owner[p]] < Math.ceil(take / N)) { stolen[p] = 1; per[owner[p]]++; i++; } }
      for (k = 0; k < K; k++) {
        var h = fnv("key" + k);
        var mv = (h % N) !== (h % (N + 1));
        var fx = !!stolen[h % P];
        if (mv) movedMod++; if (fx) movedFix++;
        if (k < 300) { dotsA += '<i class="' + (mv ? "m" : "") + '"></i>'; dotsB += '<i class="' + (fx ? "m" : "") + '"></i>'; }
      }
      root.querySelector(".a").textContent = (movedMod / K * 100).toFixed(0) + "%";
      root.querySelector(".b").textContent = (movedFix / K * 100).toFixed(0) + "%";
      root.querySelector(".da").innerHTML = dotsA; root.querySelector(".db").innerHTML = dotsB;
      root.querySelector(".note").innerHTML = "Measured on 10,000 keys (300 shown). With <code>mod N</code>, about <b>N/(N+1)</b> of all keys change node, so almost the whole dataset is reshuffled. " +
        "With fixed partitions only the partitions handed to the new node move, about <b>1/(N+1)</b>, which is the minimum needed for it to take a fair share.";
    }
    draw();
  }


  /* ---------- consistent-hash ring ---------- */
  function ringSim(root) {
    root.classList.add("shw");
    var NS = "http://www.w3.org/2000/svg", KEYS = 3000, SHOW = 140, VOPTS = [1, 3, 10, 50, 200];
    root.innerHTML = '<div class="ctrl"><label>Virtual nodes per server <select class="v">' + VOPTS.map(function (v) { return "<option" + (v === 1 ? " selected" : "") + ">" + v + "</option>"; }).join("") +
      '</select></label></div><div class="btns" style="margin-bottom:12px"><button class="primary add">Add a server</button><button class="rm">Remove server s1</button><button class="rs">Reset</button></div>' +
      '<div class="ringwrap"><div class="svg"></div><div><div class="zone" style="margin-top:0">Share of keys per server <span style="text-transform:none;letter-spacing:0">(line = fair share)</span></div><div class="loads"></div>' +
      '<div class="tiles" style="margin-top:12px"><div class="tile"><div class="t">Spread of load (std dev ÷ mean)</div><div class="v sd"></div></div><div class="tile"><div class="t">Keys moved by the last change</div><div class="v mv"></div></div></div></div></div>' +
      '<div class="legend" style="margin-top:10px"><span><i style="background:var(--ink-3)"></i>key</span><span><i style="background:var(--viz-2)"></i>key that moved</span><span><i style="background:var(--viz-1)"></i>newest server\'s points</span></div><p class="note"></p>';
    var vSel = root.querySelector(".v"), S;
    function u(str) { return fnv(str) / 4294967296; }
    var keyPos = []; for (var k = 0; k < KEYS; k++) keyPos.push(u("key-" + k));
    function reset() { S = { servers: [0, 1, 2, 3], next: 4, prev: null, moved: null, newest: null, msg: "Four servers. Each key belongs to the first server point found going clockwise from the key." }; draw(); }
    function points() {
      var V = +vSel.value, pts = [];
      S.servers.forEach(function (sv) { for (var v = 0; v < V; v++) pts.push({ p: u("s" + sv + "#" + v), s: sv }); });
      return pts.sort(function (a, b) { return a.p - b.p; });
    }
    function owners(pts) {
      return keyPos.map(function (kp) { var lo = 0, hi = pts.length; while (lo < hi) { var m = (lo + hi) >> 1; if (pts[m].p < kp) lo = m + 1; else hi = m; } return pts[lo % pts.length].s; });
    }
    function change(fn) { var before = owners(points()); fn(); var after = owners(points()); var m = 0; for (var i = 0; i < KEYS; i++) if (before[i] !== after[i]) m++; S.moved = after.map(function (o, i) { return o !== before[i]; }); S.movedN = m; draw(); }
    root.querySelector(".add").addEventListener("click", function () {
      change(function () { var id = S.next++; S.servers.push(id); S.newest = id; S.msg = "Added s" + id + ". Only keys that now land on s" + id + "'s points moved; every other key kept its server. With hash mod N, about " + Math.round(S.servers.length - 1) + "/" + S.servers.length + " of all keys would have moved."; });
    });
    root.querySelector(".rm").addEventListener("click", function () {
      if (S.servers.indexOf(1) < 0) return;
      change(function () { S.servers = S.servers.filter(function (x) { return x !== 1; }); S.newest = null; S.msg = "Removed s1. Only s1's keys moved, each to the next server clockwise. " + (+vSel.value === 1 ? "With one point per server, <b>all</b> of them land on a single neighbour, which suddenly has double the load." : "With many virtual nodes, s1's keys are spread across all the remaining servers."); });
    });
    root.querySelector(".rs").addEventListener("click", reset);
    vSel.addEventListener("change", function () { S.moved = null; S.movedN = null; S.msg = "Each server now has " + vSel.value + " point" + (vSel.value === "1" ? "" : "s") + " on the ring. More points → each server owns many small arcs → loads even out."; draw(); });
    function draw() {
      var pts = points(), own = owners(pts), counts = {};
      S.servers.forEach(function (sv) { counts[sv] = 0; }); own.forEach(function (o) { counts[o]++; });
      var mean = KEYS / S.servers.length, sd = Math.sqrt(S.servers.reduce(function (a, sv) { return a + Math.pow(counts[sv] - mean, 2); }, 0) / S.servers.length);
      // ring
      var svg = document.createElementNS(NS, "svg"); svg.setAttribute("viewBox", "0 0 300 300"); svg.setAttribute("role", "img"); svg.setAttribute("aria-label", "Hash ring with servers and keys");
      function el(t, a) { var e = document.createElementNS(NS, t); for (var x in a) e.setAttribute(x, a[x]); svg.appendChild(e); return e; }
      el("circle", { cx: 150, cy: 150, r: 118, fill: "none", stroke: "var(--rule)", "stroke-width": 2 });
      function xy(p, r) { var a = p * 2 * Math.PI - Math.PI / 2; return [150 + r * Math.cos(a), 150 + r * Math.sin(a)]; }
      pts.forEach(function (q) { var a = xy(q.p, 110), b = xy(q.p, 132); el("line", { x1: a[0], y1: a[1], x2: b[0], y2: b[1], stroke: q.s === S.newest ? "var(--viz-1)" : "var(--ink-2)", "stroke-width": pts.length > 200 ? 1 : 2 }); });
      if (+vSel.value <= 3) pts.forEach(function (q) { var c = xy(q.p, 145); var t = el("text", { x: c[0], y: c[1] + 4, "text-anchor": "middle", "font-size": 10, fill: "var(--ink-2)", "font-family": "var(--mono)" }); t.textContent = "s" + q.s; });
      for (var i = 0; i < SHOW; i++) { var c = xy(keyPos[i], 98); el("circle", { cx: c[0], cy: c[1], r: S.moved && S.moved[i] ? 3.4 : 2.4, fill: S.moved && S.moved[i] ? "var(--viz-2)" : "var(--ink-3)" }); }
      var t0 = el("text", { x: 150, y: 146, "text-anchor": "middle", "font-size": 10, fill: "var(--ink-3)", "font-family": "var(--sans)" }); t0.textContent = "hash space 0 … 2³²";
      var t1 = el("text", { x: 150, y: 160, "text-anchor": "middle", "font-size": 10, fill: "var(--ink-3)", "font-family": "var(--sans)" }); t1.textContent = "wraps at the top, clockwise";
      var w = root.querySelector(".svg"); w.innerHTML = ""; w.appendChild(svg);
      var mx = Math.max.apply(null, S.servers.map(function (sv) { return counts[sv]; }));
      var scale = Math.max(mx, mean * 1.5);
      root.querySelector(".loads").innerHTML = S.servers.map(function (sv) {
        return '<div class="hb"><span class="lb">s' + sv + '</span><span class="tr"><span class="fl" style="width:' + (counts[sv] / scale * 100) + '%"></span><span class="fair" style="left:' + (mean / scale * 100) + '%"></span></span><span class="vl">' + (counts[sv] / KEYS * 100).toFixed(0) + "%</span></div>";
      }).join("");
      root.querySelector(".sd").textContent = (sd / mean * 100).toFixed(0) + "%";
      root.querySelector(".mv").textContent = S.movedN == null ? "–" : (S.movedN / KEYS * 100).toFixed(0) + "%";
      root.querySelector(".rm").disabled = S.servers.indexOf(1) < 0;
      root.querySelector(".note").innerHTML = S.msg;
    }
    reset();
  }

  document.addEventListener("DOMContentLoaded", function () {
    document.querySelectorAll(".partition-scheme").forEach(partitionScheme);
    document.querySelectorAll(".rehash-sim").forEach(rehashSim);
    document.querySelectorAll(".ring-sim").forEach(ringSim);
  });
})();
