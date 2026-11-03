/* ==========================================================
   Distributed key-value store walk-through (Xu Ch. 6, DDIA Ch. 5–6)
   <div class="kv-trace"></div>  six servers on a ring, n = 3 replicas per key; put/get with tunable w and r,
                                 a server going down, sloppy quorum + hinted handoff, read repair
   ========================================================== */
(function () {
  var css = "\
.kvw{font-family:var(--sans);font-size:14px;color:var(--ink)}\
.kvw .ctrl{display:flex;flex-wrap:wrap;gap:8px 18px;align-items:center;margin-bottom:10px}\
.kvw .ctrl label{display:flex;gap:7px;align-items:center;color:var(--ink-2)}\
.kvw select{font:inherit;border:1px solid var(--rule);background:var(--surface);color:var(--ink);border-radius:8px;padding:5px 7px}\
.kvw input[type=checkbox]{accent-color:var(--viz-1)}\
.kvw .btns{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px}\
.kvw .btns button{font:inherit;font-size:13.5px;border:1px solid var(--rule);background:var(--surface);color:var(--ink);border-radius:8px;padding:6px 11px;cursor:pointer}\
.kvw .btns button.primary{background:var(--ink);color:var(--bg);border-color:var(--ink)}\
.kvw .btns button:disabled{opacity:.4;cursor:default}\
.kvw .grid{display:grid;grid-template-columns:minmax(220px,300px) 1fr;gap:18px;align-items:start}\
@media (max-width:640px){.kvw .grid{grid-template-columns:1fr}}\
.kvw svg{width:100%;height:auto;display:block}\
.kvw table{width:100%;border-collapse:collapse;font-size:12.5px}\
.kvw th,.kvw td{text-align:left;padding:5px 6px;border-bottom:1px solid var(--rule)}\
.kvw th{font-weight:600;color:var(--ink-3);font-size:11.5px}\
.kvw td{font-family:var(--mono);color:var(--ink-2)}\
.kvw tr.pref td{background:color-mix(in srgb,var(--viz-1) 12%,transparent);color:var(--ink)}\
.kvw tr.down td{color:var(--ink-3);text-decoration:line-through}\
.kvw .pill{font-family:var(--sans);font-size:11px;padding:1px 6px;border-radius:999px;border:1px solid var(--rule);color:var(--ink-3);white-space:nowrap}\
.kvw .verdict{display:flex;gap:10px;align-items:center;margin:12px 0 6px;font-size:14.5px;font-weight:600}\
.kvw .verdict small{display:block;font-size:13px;font-weight:400;color:var(--ink-3)}\
.kvw .badge-ok,.kvw .badge-bad{font-size:12px;font-weight:600;padding:3px 9px;border-radius:999px;white-space:nowrap}\
.kvw .badge-ok{background:var(--green-soft);color:var(--green)}\
.kvw .badge-bad{background:var(--red-soft);color:var(--red)}\
.kvw .log{list-style:none;padding:0;margin:6px 0 0;font-size:13.5px;border-top:1px solid var(--rule)}\
.kvw .log li{padding:6px 0;border-bottom:1px solid var(--rule);margin:0}\
.kvw .log li b{font-family:var(--mono);font-weight:500;font-size:12px;color:var(--ink-3);margin-right:8px}";
  var st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);

  var SERVERS = [{ id: 0, p: 0.03 }, { id: 1, p: 0.19 }, { id: 2, p: 0.36 }, { id: 3, p: 0.52 }, { id: 4, p: 0.70 }, { id: 5, p: 0.86 }];
  var KEYS = { "user:42": 0.31, "cart:7": 0.47, "model:prod": 0.12 };
  var N = 3;

  function kvTrace(root) {
    root.classList.add("kvw");
    root.innerHTML = '<div class="ctrl"><label>Key <select class="k">' + Object.keys(KEYS).map(function (k) { return "<option>" + k + "</option>"; }).join("") + "</select></label>" +
      '<label>w <select class="w"><option>1</option><option selected>2</option><option>3</option></select></label>' +
      '<label>r <select class="r"><option>1</option><option selected>2</option><option>3</option></select></label>' +
      '<label><input type="checkbox" class="sl" checked> sloppy quorum + hinted handoff</label></div>' +
      '<div class="btns"><button class="primary put">put(key, new value)</button><button class="primary get">get(key)</button><button class="dn">Take down s2</button><button class="up">Bring s2 back</button><button class="rs">Reset</button></div>' +
      '<div class="grid"><div class="svg"></div><div><table><thead><tr><th>server</th><th>status</th><th>stores for this key</th></tr></thead><tbody class="rows"></tbody></table></div></div>' +
      '<div class="verdict"></div><ul class="log"></ul>';
    var kSel = root.querySelector(".k"), S;
    function reset() { S = { down: {}, data: {}, hints: {}, ver: {}, log: [], verdict: "" }; SERVERS.forEach(function (s) { S.data[s.id] = {}; S.hints[s.id] = []; }); render(); }
    function prefList(key) {
      var kp = KEYS[key], order = SERVERS.slice().sort(function (a, b) { return ((a.p - kp + 1) % 1) - ((b.p - kp + 1) % 1); });
      return order.map(function (s) { return s.id; });
    }
    function log(m) { S.log.unshift(m); if (S.log.length > 6) S.log.pop(); }
    root.querySelector(".put").addEventListener("click", function () {
      var key = kSel.value, W = +root.querySelector(".w").value, ring = prefList(key), pref = ring.slice(0, N), extra = ring.slice(N);
      var v = (S.ver[key] || 0) + 1; S.ver[key] = v;
      var acks = [], notes = [];
      pref.forEach(function (sid) {
        if (!S.down[sid]) { S.data[sid][key] = v; acks.push("s" + sid); }
        else if (root.querySelector(".sl").checked) {
          var stand = extra.filter(function (x) { return !S.down[x]; }).shift();
          if (stand !== undefined) { extra = extra.filter(function (x) { return x !== stand; }); S.data[stand][key + "→s" + sid] = v; S.hints[stand].push({ key: key, to: sid, v: v }); acks.push("s" + stand + " (hint for s" + sid + ")"); notes.push("s" + sid + " is down, so s" + stand + " stores a copy with a hint");
          }
        } else notes.push("s" + sid + " is down and sloppy quorum is off: no copy for it");
      });
      var ok = acks.length >= W;
      log("put(" + key + ", v" + v + "): the coordinator hashes the key onto the ring. Its <strong>preference list</strong> is the next " + N + " servers clockwise: " + pref.map(function (x) { return "s" + x; }).join(", ") + ". " +
        "Each replica appends to its commit log, then its memtable (the 0007 write path). " + (notes.length ? notes.join("; ") + ". " : "") + "Acks: " + acks.length + " of the w = " + W + " needed.");
      S.verdict = ok ? '<span class="badge-ok">write ok</span><span>' + acks.length + " ack(s) ≥ w = " + W + "<small>Acknowledged by " + acks.join(", ") + ".</small></span>"
        : '<span class="badge-bad">write failed</span><span>' + acks.length + " ack(s) &lt; w = " + W + "<small>The client gets an error, but copies that were written are <em>not</em> rolled back (DDIA p. 182).</small></span>";
      render();
    });
    root.querySelector(".get").addEventListener("click", function () {
      var key = kSel.value, R = +root.querySelector(".r").value, pref = prefList(key).slice(0, N);
      var replies = pref.filter(function (s) { return !S.down[s]; }).map(function (s) { return { s: s, v: S.data[s][key] || 0 }; });
      if (replies.length < R) { log("get(" + key + "): only " + replies.length + " home replica(s) are up, fewer than r = " + R + "."); S.verdict = '<span class="badge-bad">read failed</span><span>Not enough replicas answered<small>Hinted copies on stand-in servers aren\'t asked: a sloppy quorum is not a real quorum.</small></span>'; render(); return; }
      var got = replies.slice(0, R), best = Math.max.apply(null, got.map(function (x) { return x.v; })), latest = S.ver[key] || 0;
      var stale = replies.filter(function (x) { return x.v < best; });
      stale.forEach(function (x) { S.data[x.s][key] = best; });
      log("get(" + key + "): asks the home replicas and waits for r = " + R + ": " + got.map(function (x) { return "s" + x.s + " has " + (x.v ? "v" + x.v : "nothing"); }).join(", ") + ". It returns the newest, " + (best ? "v" + best : "nothing") + "." +
        (stale.length ? " <strong>Read repair</strong>: " + stale.map(function (x) { return "s" + x.s; }).join(", ") + " get the newer value written back." : ""));
      S.verdict = best === latest ? '<span class="badge-ok">fresh read</span><span>Returned ' + (best ? "v" + best : "nothing (never written)") + "<small>The replicas read overlapped the replicas that took the latest write.</small></span>"
        : '<span class="badge-bad">stale read</span><span>Returned v' + best + ", but v" + latest + " exists<small>" + (R + (+root.querySelector(".w").value) > N ? "Even with w + r &gt; n: the newest copy sits on a stand-in server or a replica that wasn't read. Quorums aren't a guarantee once sloppy quorums or failures are involved." : "w + r ≤ n, so the replicas read need not overlap the ones that took the latest write.") + "</small></span>";
      render();
    });
    root.querySelector(".dn").addEventListener("click", function () { S.down[2] = true; log("s2 stops answering. Gossip spreads the news: its heartbeat counter stops increasing (Xu p. 100)."); S.verdict = ""; render(); });
    root.querySelector(".up").addEventListener("click", function () {
      delete S.down[2]; var moved = [];
      SERVERS.forEach(function (s) { S.hints[s.id] = S.hints[s.id].filter(function (h) { if (h.to === 2) { S.data[2][h.key] = Math.max(S.data[2][h.key] || 0, h.v); delete S.data[s.id][h.key + "→s2"]; moved.push("s" + s.id); return false; } return true; }); });
      log("s2 is back. " + (moved.length ? "<strong>Hinted handoff</strong>: " + moved.join(", ") + (moved.length > 1 ? " pass" : " passes") + " the writes held for s2 back to it and drop the stand-in copies." : "No hints were waiting for it. Anything it missed is left to read repair or anti-entropy (Merkle trees)."));
      S.verdict = ""; render();
    });
    root.querySelector(".rs").addEventListener("click", reset);
    kSel.addEventListener("change", function () { S.verdict = ""; render(); });
    function render() {
      var key = kSel.value, pref = prefList(key).slice(0, N), NSs = "http://www.w3.org/2000/svg";
      var svg = document.createElementNS(NSs, "svg"); svg.setAttribute("viewBox", "0 0 300 300"); svg.setAttribute("role", "img"); svg.setAttribute("aria-label", "Ring of six servers with the key and its replicas");
      function el(t, a, txt) { var e = document.createElementNS(NSs, t); for (var x in a) e.setAttribute(x, a[x]); if (txt) e.textContent = txt; svg.appendChild(e); return e; }
      function xy(p, r) { var a = p * 2 * Math.PI - Math.PI / 2; return [150 + r * Math.cos(a), 150 + r * Math.sin(a)]; }
      el("circle", { cx: 150, cy: 150, r: 110, fill: "none", stroke: "var(--rule)", "stroke-width": 2 });
      SERVERS.forEach(function (s) {
        var c = xy(s.p, 110), inPref = pref.indexOf(s.id) >= 0, dn = S.down[s.id], hint = S.hints[s.id].length > 0;
        el("circle", { cx: c[0], cy: c[1], r: 15, fill: "var(--surface)", stroke: dn ? "var(--ink-3)" : inPref ? "var(--viz-1)" : hint ? "var(--viz-2)" : "var(--ink-3)", "stroke-width": inPref || hint ? 3 : 1.5, "stroke-dasharray": dn ? "3 3" : "" });
        el("text", { x: c[0], y: c[1] + 4, "text-anchor": "middle", "font-size": 11, "font-family": "var(--mono)", fill: dn ? "var(--ink-3)" : "var(--ink)" }, "s" + s.id);
      });
      var kp = xy(KEYS[key], 110), kl = xy(KEYS[key], 78);
      el("circle", { cx: kp[0], cy: kp[1], r: 5, fill: "var(--ink)" });
      el("text", { x: kl[0], y: kl[1] + 4, "text-anchor": "middle", "font-size": 11, "font-family": "var(--mono)", fill: "var(--ink)" }, key);
      el("text", { x: 150, y: 146, "text-anchor": "middle", "font-size": 10, fill: "var(--ink-3)", "font-family": "var(--sans)" }, "replicas = next 3");
      el("text", { x: 150, y: 160, "text-anchor": "middle", "font-size": 10, fill: "var(--ink-3)", "font-family": "var(--sans)" }, "servers clockwise");
      var w = root.querySelector(".svg"); w.innerHTML = ""; w.appendChild(svg);
      root.querySelector(".rows").innerHTML = SERVERS.map(function (s) {
        var d = S.data[s.id], items = [];
        if (d[key]) items.push(key + " = v" + d[key]);
        Object.keys(d).forEach(function (k) { if (k.indexOf(key + "→") === 0) items.push('v' + d[k] + ' <span class="pill">hint for ' + k.split("→")[1] + "</span>"); });
        var role = pref.indexOf(s.id) >= 0 ? "replica " + (pref.indexOf(s.id) + 1) : "";
        return '<tr class="' + (S.down[s.id] ? "down" : pref.indexOf(s.id) >= 0 ? "pref" : "") + '"><td>s' + s.id + "</td><td>" + (S.down[s.id] ? "down" : "up") + (role ? " · " + role : "") + "</td><td>" + (items.join(" ") || "–") + "</td></tr>";
      }).join("");
      root.querySelector(".dn").disabled = !!S.down[2]; root.querySelector(".up").disabled = !S.down[2];
      root.querySelector(".verdict").innerHTML = S.verdict;
      root.querySelector(".log").innerHTML = S.log.map(function (m, i) { return "<li><b>" + (S.log.length - i) + "</b>" + m + "</li>"; }).join("");
    }
    reset();
  }

  document.addEventListener("DOMContentLoaded", function () {
    document.querySelectorAll(".kv-trace").forEach(kvTrace);
  });
})();
