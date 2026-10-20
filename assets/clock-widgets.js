/* ==========================================================
   Clock & lease widgets (DDIA Ch. 8)
   <div class="lww-sim"></div>      last-write-wins with clock skew (DDIA Fig. 8-3)
   <div class="fencing-sim"></div>  paused lease holder vs fencing tokens (DDIA Figs. 8-4, 8-5)
   ========================================================== */
(function () {
  var NS = "http://www.w3.org/2000/svg";
  var css = "\
.cw{font-family:var(--sans);font-size:14px;color:var(--ink)}\
.cw svg{width:100%;height:auto;display:block}\
.cw .ctrl{display:flex;flex-wrap:wrap;gap:10px 24px;align-items:center;margin-bottom:12px}\
.cw .ctrl label{display:flex;gap:8px;align-items:center;color:var(--ink-2)}\
.cw .ctrl output{font-family:var(--mono);font-size:13px;min-width:44px;display:inline-block;color:var(--ink)}\
.cw input[type=range]{accent-color:var(--viz-1);width:150px}\
.cw input[type=checkbox]{accent-color:var(--viz-1)}\
.cw .verdict{font-size:20px;font-weight:600;margin:8px 0 2px;display:flex;gap:10px;align-items:center}\
.cw .verdict small{display:block;font-size:13.5px;font-weight:400;color:var(--ink-3)}\
.cw .badge-ok,.cw .badge-bad{font-size:12px;font-weight:600;padding:3px 9px;border-radius:999px;white-space:nowrap}\
.cw .badge-ok{background:var(--green-soft);color:var(--green)}\
.cw .badge-bad{background:var(--red-soft);color:var(--red)}\
.cw .lbl{fill:var(--ink-2);font-size:12px;font-family:var(--sans)}\
.cw .lbl.b{font-weight:600;fill:var(--ink)}\
.cw .axisl{stroke:var(--rule);stroke-width:1.5}\
.cw .lanes{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:8px;margin:6px 0 12px}\
.cw .lane{border:1px solid var(--rule);border-radius:10px;padding:9px 11px;background:var(--surface);min-height:74px;transition:border-color .2s}\
.cw .lane.active{border-color:var(--viz-1);box-shadow:0 0 0 2px color-mix(in srgb,var(--viz-1) 18%,transparent)}\
.cw .lane.bad{border-color:var(--red);background:var(--red-soft)}\
.cw .lane h4{margin:0 0 4px;font-size:13px}\
.cw .lane .st{font-size:12.5px;color:var(--ink-2)}\
.cw .btns{display:flex;gap:8px;margin-bottom:10px;flex-wrap:wrap}\
.cw .btns button{font:inherit;border:1px solid var(--rule);background:var(--surface);color:var(--ink);border-radius:8px;padding:7px 12px;cursor:pointer}\
.cw .btns button.primary{background:var(--ink);color:var(--bg);border-color:var(--ink)}\
.cw .btns button:disabled{opacity:.4;cursor:default}\
.cw .log{list-style:none;padding:0;margin:0;font-size:13.5px;border-top:1px solid var(--rule)}\
.cw .log li{padding:7px 0;border-bottom:1px solid var(--rule);margin:0}\
.cw .log li b{font-family:var(--mono);font-weight:500;font-size:12.5px;color:var(--ink-3);margin-right:8px}";
  var st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);
  function el(tag, attrs, parent) { var e = document.createElementNS(NS, tag); for (var k in attrs) e.setAttribute(k, attrs[k]); if (parent) parent.appendChild(e); return e; }
  function txt(p, x, y, s, a) { var t = el("text", Object.assign({ x: x, y: y }, a || {}), p); t.textContent = s; return t; }

  /* ---------- last-write-wins with clock skew ---------- */
  function lwwSim(root) {
    root.classList.add("cw");
    root.innerHTML = '<div class="ctrl">' +
      '<label>B writes this long after A (real time) <input type="range" class="g" min="1" max="10" value="2"><output class="og"></output></label>' +
      '<label>Node 3\'s clock is behind node 1 by <input type="range" class="k" min="0" max="10" value="3"><output class="ok_"></output></label></div>' +
      '<div class="plot"></div><div class="verdict"></div>';
    var g = root.querySelector(".g"), k = root.querySelector(".k");
    g.addEventListener("input", draw); k.addEventListener("input", draw);
    function draw() {
      var gap = +g.value, skew = +k.value;
      root.querySelector(".og").textContent = gap + " ms"; root.querySelector(".ok_").textContent = skew + " ms";
      var tsA = 42004, tsB = 42004 + gap - skew; // ms
      var W = 640, H = 170, L = 130, R = 20;
      var svg = el("svg", { viewBox: "0 0 " + W + " " + H, role: "img", "aria-label": "Real-time order versus timestamp order of two writes" });
      var x = function (ms) { return L + (W - L - R) * (ms + 12) / 24; }; // window −12…+12 ms around A
      [[40, "What really happened"], [120, "What the timestamps say"]].forEach(function (r) {
        el("line", { class: "axisl", x1: L, x2: W - R, y1: r[0], y2: r[0] }, svg);
        txt(svg, 8, r[0] + 4, r[1], { class: "lbl" });
      });
      function mark(cx, cy, color, label, sub) {
        el("circle", { cx: cx, cy: cy, r: 7, fill: color, stroke: "var(--surface)", "stroke-width": 2 }, svg);
        txt(svg, cx, cy - 14, label, { class: "lbl b", "text-anchor": "middle" });
        txt(svg, cx, cy + 24, sub, { class: "lbl", "text-anchor": "middle" });
      }
      mark(x(0), 40, "var(--viz-1)", "A: x = 1", "node 1");
      mark(x(gap), 40, "var(--viz-2)", "B: x = x + 1", "node 3, " + gap + " ms later");
      mark(x(0), 120, "var(--viz-1)", "A", (tsA / 1000).toFixed(3) + " s");
      mark(x(tsB - tsA), 120, "var(--viz-2)", "B", (tsB / 1000).toFixed(3) + " s");
      var plot = root.querySelector(".plot"); plot.innerHTML = ""; plot.appendChild(svg);
      var v = root.querySelector(".verdict");
      if (tsB > tsA) v.innerHTML = '<span class="badge-ok">correct</span><span>Node 2 keeps x = 2<small>B\'s timestamp is later, so last-write-wins happens to pick the right value.</small></span>';
      else if (tsB === tsA) v.innerHTML = '<span class="badge-bad">coin flip</span><span>Identical timestamps<small>LWW needs a tie-breaker (e.g. a random number), so B\'s write survives only by luck.</small></span>';
      else v.innerHTML = '<span class="badge-bad">data lost</span><span>Node 2 keeps x = 1. B\'s increment silently disappears<small>B really happened later, but its timestamp is ' + (tsA - tsB) + ' ms earlier, so LWW throws it away. No error is reported to anyone.</small></span>';
    }
    draw();
  }

  /* ---------- fencing tokens ---------- */
  function fencingSim(root) {
    root.classList.add("cw");
    root.innerHTML = '<div class="ctrl"><label><input type="checkbox" class="fence"> Storage checks fencing tokens</label></div>' +
      '<div class="btns"><button class="primary nx">Next step ▶</button><button class="rs">Reset</button></div>' +
      '<div class="lanes"></div><ul class="log"></ul>';
    var fence = root.querySelector(".fence"), step = 0;
    var steps = [
      function (s) { s.c1 = "Holds the lease · token 33"; s.lock = "Lease → client 1 (token 33)"; s.act = "c1"; return "Client 1 asks the lock service for a lease on the file and gets it, with token 33."; },
      function (s) { s.c1 = "💤 Paused (long GC)… still believes it holds the lease"; s.act = "c1"; return "Client 1 hits a long stop-the-world garbage-collection pause. It isn't running at all, so it can't notice time passing."; },
      function (s) { s.lock = "Client 1's lease expired"; s.act = "lock"; return "The lease times out. From the lock service's point of view, client 1 is gone."; },
      function (s) { s.c2 = "Holds the lease · token 34"; s.lock = "Lease → client 2 (token 34)"; s.act = "c2"; return "Client 2 asks for the lease and gets it, with token 34. Tokens only ever go up."; },
      function (s) { s.store = "Written by client 2 (token 34)" + (s.f ? " · highest token seen: 34" : ""); s.act = "store"; return "Client 2 writes to the file with token 34. Storage accepts."; },
      function (s) {
        s.c1 = "Wakes up, thinks it still holds the lease"; s.act = "c1";
        if (s.f) { s.store = "Rejected token 33 (already saw 34) ✓ file intact"; s.ok = true; return "Client 1 resumes and writes with its old token 33. Storage has already seen 34, so it rejects the write. The zombie is fenced off."; }
        s.store = "Written by client 2 AND client 1 ✗ corrupted"; s.bad = true; return "Client 1 resumes, still believing it holds the lease, and writes. Storage has no way to tell it's stale, so it accepts. Two writers. The file is corrupted.";
      }
    ];
    var state;
    function reset() { step = 0; state = { c1: "Idle", c2: "Idle", lock: "No lease granted", store: "File: OK", act: "", f: fence.checked }; root.querySelector(".log").innerHTML = ""; render(); }
    function render() {
      var lanes = [["c1", "Client 1", state.c1], ["c2", "Client 2", state.c2], ["lock", "Lock service", state.lock], ["store", "File storage", state.store]];
      root.querySelector(".lanes").innerHTML = lanes.map(function (l) {
        var cls = "lane" + (state.act === l[0] ? " active" : "") + (l[0] === "store" && state.bad ? " bad" : "");
        return '<div class="' + cls + '"><h4>' + l[1] + '</h4><div class="st">' + l[2] + '</div></div>';
      }).join("");
      var nx = root.querySelector(".nx"); nx.disabled = step >= steps.length;
      nx.textContent = step >= steps.length ? "Done. Reset to try again" : "Next step ▶ (" + (step + 1) + "/" + steps.length + ")";
    }
    root.querySelector(".nx").addEventListener("click", function () {
      if (step >= steps.length) return;
      state.f = fence.checked;
      var msg = steps[step](state); step++;
      var li = document.createElement("li"); li.innerHTML = "<b>" + step + "</b>"; li.appendChild(document.createTextNode(msg));
      root.querySelector(".log").appendChild(li); render();
    });
    root.querySelector(".rs").addEventListener("click", reset);
    fence.addEventListener("change", reset);
    reset();
  }

  document.addEventListener("DOMContentLoaded", function () {
    document.querySelectorAll(".lww-sim").forEach(lwwSim);
    document.querySelectorAll(".fencing-sim").forEach(fencingSim);
  });
})();
