/* ==========================================================
   Sharding widgets (DDIA Ch. 6, Xu Ch. 1 & 5)
   <div class="partition-scheme"></div>  sensor writes under key-range, hash, and compound keys:
                                         where today's writes land vs what a range query must touch
   <div class="rehash-sim"></div>        add one node: share of keys that move under hash mod N vs a fixed number of partitions
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
.shw .legend i{display:inline-block;width:11px;height:11px;border-radius:2px;vertical-align:-1px;margin-right:5px}";
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

  document.addEventListener("DOMContentLoaded", function () {
    document.querySelectorAll(".partition-scheme").forEach(partitionScheme);
    document.querySelectorAll(".rehash-sim").forEach(rehashSim);
  });
})();
