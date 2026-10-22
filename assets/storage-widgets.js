/* ==========================================================
   Storage-engine widgets (DDIA Ch. 3)
   <div class="lsm-sim"></div>      write-ahead log + memtable + SSTables, reads, compaction, crash
   <div class="btree-lookup"></div> follow one key from the root page down to a leaf (DDIA Fig. 3-6)
   <div class="btree-calc"></div>   branching factor × levels → capacity (DDIA p. 81)
   <div class="composite-index"></div> column order of a two-column index vs. which entries a query must read
   ========================================================== */
(function () {
  var css = "\
.sw{font-family:var(--sans);font-size:14px;color:var(--ink)}\
.sw .ctrl{display:flex;flex-wrap:wrap;gap:8px 18px;align-items:center;margin-bottom:12px}\
.sw .ctrl label{display:flex;gap:8px;align-items:center;color:var(--ink-2)}\
.sw .ctrl output{font-family:var(--mono);font-size:13px;min-width:44px;display:inline-block;color:var(--ink)}\
.sw input[type=range]{accent-color:var(--viz-1);width:150px}\
.sw select,.sw input[type=number]{font:inherit;border:1px solid var(--rule);background:var(--surface);color:var(--ink);border-radius:8px;padding:6px 8px}\
.sw .btns{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px}\
.sw .btns button{font:inherit;font-size:13.5px;border:1px solid var(--rule);background:var(--surface);color:var(--ink);border-radius:8px;padding:6px 11px;cursor:pointer}\
.sw .btns button.primary{background:var(--ink);color:var(--bg);border-color:var(--ink)}\
.sw .btns button:hover{border-color:var(--ink-3)}\
.sw .zone{font-size:11.5px;letter-spacing:.06em;text-transform:uppercase;color:var(--ink-3);margin:12px 0 6px}\
.sw .row{display:flex;flex-wrap:wrap;gap:8px;align-items:flex-start}\
.sw .box{border:1px solid var(--rule);border-radius:10px;background:var(--surface);padding:8px 10px;min-width:120px;transition:border-color .2s,box-shadow .2s}\
.sw .box h4{margin:0 0 5px;font-size:12.5px;font-weight:600;display:flex;justify-content:space-between;gap:10px}\
.sw .box h4 small{font-weight:400;color:var(--ink-3)}\
.sw .box.hit{border-color:var(--viz-1);box-shadow:0 0 0 2px color-mix(in srgb,var(--viz-1) 20%,transparent)}\
.sw .box.skip{opacity:.45}\
.sw .kv{font-family:var(--mono);font-size:12px;line-height:1.55;color:var(--ink-2);white-space:nowrap}\
.sw .kv.dead{color:var(--ink-3);text-decoration:line-through}\
.sw .kv.me{color:var(--ink);font-weight:600;background:color-mix(in srgb,var(--viz-1) 16%,transparent);border-radius:4px;padding:0 3px;margin:0 -3px}\
.sw .empty{font-size:12.5px;color:var(--ink-3);font-style:italic}\
.sw .stats{display:flex;flex-wrap:wrap;gap:6px 22px;margin:14px 0 8px;font-size:13.5px;color:var(--ink-2)}\
.sw .stats b{font-family:var(--mono);font-weight:600;color:var(--ink)}\
.sw .log{list-style:none;padding:0;margin:0;font-size:13.5px;border-top:1px solid var(--rule)}\
.sw .log li{padding:6px 0;border-bottom:1px solid var(--rule);margin:0}\
.sw .log li b{font-family:var(--mono);font-weight:500;font-size:12px;color:var(--ink-3);margin-right:8px}\
.sw .tree{display:flex;flex-direction:column;gap:14px;margin:6px 0 10px}\
.sw .level{display:flex;gap:6px;align-items:center;flex-wrap:wrap}\
.sw .level .lv{font-size:11.5px;color:var(--ink-3);width:62px;flex:none}\
.sw .page{display:flex;border:1px solid var(--rule);border-radius:8px;background:var(--surface);overflow:hidden;font-family:var(--mono);font-size:12px}\
.sw .page span{padding:5px 7px;border-right:1px solid var(--rule);color:var(--ink-2)}\
.sw .page span:last-child{border-right:0}\
.sw .page.on{border-color:var(--viz-1);box-shadow:0 0 0 2px color-mix(in srgb,var(--viz-1) 20%,transparent)}\
.sw .page span.on{background:color-mix(in srgb,var(--viz-1) 16%,transparent);color:var(--ink);font-weight:600}\
.sw .big{font-size:22px;font-weight:600;margin:4px 0 2px}\
.sw .big small{display:block;font-size:13.5px;font-weight:400;color:var(--ink-3)}\
.sw .tiles{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px}\
.sw .tile{border:1px solid var(--rule);border-radius:10px;padding:10px 12px;background:var(--surface)}\
.sw .tile .t{font-size:12px;color:var(--ink-3)}\
.sw .tile .v{font-size:20px;font-weight:600;font-family:var(--mono)}\
.sw .ix{display:grid;grid-template-columns:repeat(12,minmax(0,1fr));gap:4px;margin:8px 0 6px}\
@media (max-width:600px){.sw .ix{grid-template-columns:repeat(6,minmax(0,1fr))}}\
.sw .ix div{border:1px solid var(--rule);border-radius:6px;background:var(--surface);font-family:var(--mono);font-size:11.5px;text-align:center;padding:4px 0;line-height:1.3;color:var(--ink-3)}\
.sw .ix div.read{border-color:var(--viz-1);color:var(--ink-2);background:color-mix(in srgb,var(--viz-1) 10%,transparent)}\
.sw .ix div.match{background:color-mix(in srgb,var(--viz-1) 30%,transparent);color:var(--ink);font-weight:600}\
.sw .legend{display:flex;gap:16px;flex-wrap:wrap;font-size:12.5px;color:var(--ink-3);margin-bottom:6px}\
.sw .legend i{display:inline-block;width:12px;height:12px;border-radius:3px;border:1px solid var(--rule);vertical-align:-2px;margin-right:5px}";
  var st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);
  function h(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;"); }

  /* ---------- LSM-tree simulator ---------- */
  function lsmSim(root) {
    root.classList.add("sw");
    var KEYS = ["u01", "u02", "u03", "u04", "u05", "u06", "u07", "u08"], LIMIT = 4, TOMB = null;
    root.innerHTML =
      '<div class="ctrl"><label>Key <select class="key">' + KEYS.map(function (k) { return "<option>" + k + "</option>"; }).join("") + '</select></label></div>' +
      '<div class="btns"><button class="primary put">Write (put)</button><button class="del">Delete</button><button class="primary get">Read (get)</button>' +
      '<button class="rnd">+ 5 random writes</button><button class="cmp">Run compaction</button><button class="crash">Crash &amp; restart</button><button class="rs">Reset</button></div>' +
      '<div class="zone">In memory</div><div class="row mem"></div>' +
      '<div class="zone">On disk</div><div class="row disk"></div>' +
      '<div class="stats"></div><ul class="log" aria-live="polite"></ul>';
    var S, keySel = root.querySelector(".key"), n = 0;
    function reset() { S = { wal: [], mem: {}, sst: [], id: 0, user: 0, disk: 0, hit: null, skip: {}, me: null }; n = 0;
      // start with two SSTables and one key in the memtable, so there is something to read
      ["u01", "u02", "u03", "u04", "u03", "u05", "u06", "u02", "u07"].forEach(function (k, i) { write(k, "clicks=" + (10 + i * 7), true); });
      root.querySelector(".log").innerHTML = ""; n = 0; render(); }
    function log(msg) { var li = document.createElement("li"); n++; li.innerHTML = "<b>" + n + "</b>" + msg; var ul = root.querySelector(".log"); ul.insertBefore(li, ul.firstChild); while (ul.children.length > 7) ul.removeChild(ul.lastChild); }
    function clearMarks() { S.hit = null; S.skip = {}; S.me = null; }
    function sorted(obj) { return Object.keys(obj).sort().map(function (k) { return [k, obj[k]]; }); }
    function val(v) { return v === TOMB ? "deleted (tombstone)" : v; }
    function write(k, v, quiet) {
      S.wal.push([k, v]); S.disk++; S.user++; S.mem[k] = v;
      if (!quiet) log((v === TOMB ? "Delete <code>" + k + "</code>: a tombstone is appended to the log and put in the memtable." : "Write <code>" + k + " = " + v + "</code>: appended to the log on disk, then inserted into the memtable."));
      if (Object.keys(S.mem).length >= LIMIT) flush();
    }
    function flush() {
      var e = sorted(S.mem); S.id++;
      S.sst.unshift({ id: S.id, e: e }); S.disk += e.length;
      S.mem = {}; S.wal = [];
      log("Memtable reached " + LIMIT + " keys, so it was written out as <strong>SSTable " + S.id + "</strong> (already sorted, one sequential write). The log is no longer needed and is cleared.");
    }
    function rndVal() { return "clicks=" + (1 + Math.floor(Math.random() * 99)); }
    root.querySelector(".put").addEventListener("click", function () { clearMarks(); var k = keySel.value; write(k, rndVal()); S.me = k; render(); });
    root.querySelector(".del").addEventListener("click", function () { clearMarks(); var k = keySel.value; write(k, TOMB); S.me = k; render(); });
    root.querySelector(".rnd").addEventListener("click", function () {
      clearMarks();
      for (var i = 0; i < 5; i++) { var k = KEYS[Math.floor(Math.random() * KEYS.length)]; write(k, rndVal(), true); }
      log("5 random writes went into the log and the memtable (flushing whenever it filled up)."); render();
    });
    root.querySelector(".get").addEventListener("click", function () {
      clearMarks(); var k = keySel.value; S.me = k; var steps = [], reads = 0;
      if (k in S.mem) { S.hit = "mem"; steps.push("memtable: <strong>found</strong>"); finish(S.mem[k]); return; }
      steps.push("memtable: not there");
      for (var i = 0; i < S.sst.length; i++) {
        var t = S.sst[i], found = null;
        for (var j = 0; j < t.e.length; j++) if (t.e[j][0] === k) found = t.e[j];
        if (!found) { S.skip[t.id] = true; steps.push("SSTable " + t.id + ": Bloom filter says <em>definitely not here</em>, skipped"); continue; }
        reads++; S.hit = t.id; steps.push("SSTable " + t.id + ": Bloom filter says <em>maybe</em>, one disk read, <strong>found</strong>"); finish(found[1]); return;
      }
      finish(undefined);
      function finish(v) {
        var out = v === undefined ? "not found anywhere" : v === TOMB ? "a tombstone, so the key counts as deleted" : "<code>" + v + "</code>";
        log("Read <code>" + k + "</code> → " + out + ". Path: " + steps.join(" → ") + ". Disk reads: <strong>" + reads + "</strong>.");
        render();
      }
    });
    root.querySelector(".cmp").addEventListener("click", function () {
      clearMarks();
      if (S.sst.length < 2) { log("Compaction needs at least two SSTables to merge."); render(); return; }
      var m = {}, before = 0;
      for (var i = S.sst.length - 1; i >= 0; i--) S.sst[i].e.forEach(function (p) { m[p[0]] = p[1]; before++; });
      var e = sorted(m).filter(function (p) { return p[1] !== TOMB; });
      var ids = S.sst.map(function (t) { return t.id; }).reverse().join(" + ");
      S.id++; S.sst = [{ id: S.id, e: e }]; S.disk += e.length;
      log("Compaction merged SSTables " + ids + " (" + before + " records) into <strong>SSTable " + S.id + "</strong> (" + e.length + " records): only the newest value of each key survives, and tombstoned keys are dropped. The merged file is new; the old files are deleted.");
      render();
    });
    root.querySelector(".crash").addEventListener("click", function () {
      clearMarks(); var lost = Object.keys(S.mem).length;
      S.mem = {}; S.wal.forEach(function (p) { S.mem[p[0]] = p[1]; });
      log("Crash! The memtable (" + lost + " keys) was lost with the process memory. On restart, the database replays the " + S.wal.length + " log entries and rebuilds it. Nothing is lost.");
      render();
    });
    root.querySelector(".rs").addEventListener("click", reset);
    function kvs(e, me) {
      if (!e.length) return '<div class="empty">empty</div>';
      return e.map(function (p) { return '<div class="kv' + (p[1] === TOMB ? " dead" : "") + (p[0] === me ? " me" : "") + '">' + h(p[0]) + " = " + h(p[1] === TOMB ? "✝" : p[1]) + "</div>"; }).join("");
    }
    function render() {
      root.querySelector(".mem").innerHTML = '<div class="box' + (S.hit === "mem" ? " hit" : "") + '"><h4>Memtable <small>sorted · flushes at ' + LIMIT + ' keys</small></h4>' + kvs(sorted(S.mem), S.me) + "</div>";
      var walBox = '<div class="box"><h4>Write-ahead log <small>append-only · unsorted</small></h4>' + kvs(S.wal, null) + "</div>";
      root.querySelector(".disk").innerHTML = walBox + S.sst.map(function (t, i) {
        return '<div class="box' + (S.hit === t.id ? " hit" : "") + (S.skip[t.id] ? " skip" : "") + '"><h4>SSTable ' + t.id + " <small>" + (i === 0 ? "newest" : i === S.sst.length - 1 ? "oldest" : "") + "</small></h4>" + kvs(t.e, S.me) + "</div>";
      }).join("");
      var amp = S.user ? (S.disk / S.user).toFixed(1) : "–";
      root.querySelector(".stats").innerHTML = "<span>You wrote <b>" + S.user + "</b> records</span><span>Disk has written <b>" + S.disk + "</b> records</span><span>Write amplification <b>" + amp + "×</b></span><span>SSTables a missing key must rule out <b>" + S.sst.length + "</b></span>";
    }
    reset();
  }

  /* ---------- B-tree lookup ---------- */
  function btreeLookup(root) {
    root.classList.add("sw");
    root.innerHTML = '<div class="ctrl"><label>Look up key <input type="range" class="k" min="0" max="499" value="251"><output class="o"></output></label></div><div class="tree"></div><div class="big"></div>';
    var k = root.querySelector(".k");
    k.addEventListener("input", draw);
    function page(cells, onIdx, on) {
      return '<div class="page' + (on ? " on" : "") + '">' + cells.map(function (c, i) { return '<span class="' + (i === onIdx ? "on" : "") + '">' + c + "</span>"; }).join("") + "</div>";
    }
    function draw() {
      var key = +k.value; root.querySelector(".o").textContent = key;
      var b1 = Math.floor(key / 100), lo1 = b1 * 100, b2 = Math.floor((key - lo1) / 20), lo2 = lo1 + b2 * 20;
      var rootCells = ["ref", "100", "ref", "200", "ref", "300", "ref", "400", "ref"];
      var mid = ["ref"]; for (var i = 1; i < 5; i++) mid.push(lo1 + i * 20, "ref");
      var leaf = []; for (var j = lo2; j < lo2 + 20; j++) leaf.push(j);
      var leafShow = leaf.filter(function (x) { return Math.abs(x - key) <= 3; });
      root.querySelector(".tree").innerHTML =
        '<div class="level"><span class="lv">Root page</span>' + page(rootCells, b1 * 2, true) + "</div>" +
        '<div class="level"><span class="lv">Level 2</span>' + page(mid, b2 * 2, true) + '<span class="empty">covers ' + lo1 + "–" + (lo1 + 99) + "</span></div>" +
        '<div class="level"><span class="lv">Leaf page</span>' + page(["…"].concat(leafShow.map(String)).concat(["…"]), leafShow.indexOf(key) + 1, true) + '<span class="empty">holds keys ' + lo2 + "–" + (lo2 + 19) + " and their values</span></div>";
      root.querySelector(".big").innerHTML = "3 pages read<small>Root says key " + key + " lies in " + lo1 + "–" + (lo1 + 99) + ". The next page narrows it to " + lo2 + "–" + (lo2 + 19) + ". The leaf holds it. Each step is one page (one disk read if the page isn't already cached).</small>";
    }
    draw();
  }

  /* ---------- B-tree capacity ---------- */
  function btreeCalc(root) {
    root.classList.add("sw");
    root.innerHTML = '<div class="ctrl">' +
      '<label>Branching factor <select class="b"><option>10</option><option>100</option><option>250</option><option selected>500</option><option>1000</option></select></label>' +
      '<label>Levels <input type="range" class="l" min="1" max="5" value="4"><output class="ol"></output></label>' +
      '<label>Page size <select class="p"><option value="4" selected>4 KB</option><option value="8">8 KB</option><option value="16">16 KB</option></select></label></div>' +
      '<div class="tiles"></div><p class="empty" style="margin:10px 0 0;font-style:normal">Capacity = branching factor<sup>levels</sup> leaf pages × page size, the same arithmetic as DDIA p. 81. The full-scan time assumes a disk reading 1 GB/s.</p>';
    var b = root.querySelector(".b"), l = root.querySelector(".l"), p = root.querySelector(".p");
    [b, l, p].forEach(function (e) { e.addEventListener("input", draw); });
    function bytes(x) { var u = ["B", "KB", "MB", "GB", "TB", "PB", "EB"], i = 0; while (x >= 1000 && i < u.length - 1) { x /= 1000; i++; } return (x >= 100 ? x.toFixed(0) : x >= 10 ? x.toFixed(1) : x.toFixed(2)).replace(/\.0+$/, "") + " " + u[i]; }
    function dur(s) { if (s < 1) return (s * 1000).toFixed(0) + " ms"; if (s < 120) return s.toFixed(0) + " s"; if (s < 7200) return (s / 60).toFixed(0) + " min"; if (s < 172800) return (s / 3600).toFixed(0) + " h"; if (s < 3.15e7 * 2) return (s / 86400).toFixed(0) + " days"; return (s / 3.15e7).toFixed(0) + " years"; }
    function draw() {
      var B = +b.value, L = +l.value, P = +p.value * 1024; root.querySelector(".ol").textContent = L;
      var cap = Math.pow(B, L) * P;
      root.querySelector(".tiles").innerHTML =
        '<div class="tile"><div class="t">Data it can index</div><div class="v">' + bytes(cap) + "</div></div>" +
        '<div class="tile"><div class="t">Pages read per lookup</div><div class="v">' + L + "</div></div>" +
        '<div class="tile"><div class="t">Scanning the same data instead</div><div class="v">' + dur(cap / 1e9) + "</div></div>";
    }
    draw();
  }


  /* ---------- composite (multi-column) index ---------- */
  function compositeIndex(root) {
    root.classList.add("sw");
    var Q = [
      { t: "WHERE user_id = 3", c: { user_id: ["eq", 3] } },
      { t: "WHERE user_id = 3 AND day BETWEEN 2 AND 4", c: { user_id: ["eq", 3], day: ["rng", 2, 4] } },
      { t: "WHERE day = 5", c: { day: ["eq", 5] } },
      { t: "WHERE day BETWEEN 2 AND 4", c: { day: ["rng", 2, 4] } }
    ];
    root.innerHTML = '<div class="ctrl"><label>Index on <select class="ord"><option value="user_id,day">(user_id, day)</option><option value="day,user_id">(day, user_id)</option></select></label>' +
      '<label>Query <select class="q">' + Q.map(function (q, i) { return '<option value="' + i + '"' + (i === 1 ? " selected" : "") + ">" + q.t + "</option>"; }).join("") + "</select></label></div>" +
      '<div class="legend"><span><i></i>not touched</span><span><i style="border-color:var(--viz-1);background:color-mix(in srgb,var(--viz-1) 10%,transparent)"></i>read, then thrown away</span><span><i style="background:color-mix(in srgb,var(--viz-1) 30%,transparent)"></i>read and matches</span></div>' +
      '<div class="ix"></div><div class="big"></div>';
    var ord = root.querySelector(".ord"), qs = root.querySelector(".q");
    [ord, qs].forEach(function (e) { e.addEventListener("change", draw); });
    var rows = []; for (var u = 1; u <= 4; u++) for (var d = 1; d <= 6; d++) rows.push({ user_id: u, day: d });
    function ok(r, c) { return c[0] === "eq" ? r === c[1] : r >= c[1] && r <= c[2]; }
    function draw() {
      var cols = ord.value.split(","), q = Q[+qs.value].c;
      var e = rows.slice().sort(function (a, b) { return a[cols[0]] - b[cols[0]] || a[cols[1]] - b[cols[1]]; });
      // access predicates: equalities on leading columns, then at most one range; stop at the first column with no condition
      var access = [];
      for (var i = 0; i < cols.length; i++) { var c = q[cols[i]]; if (!c) break; access.push(cols[i]); if (c[0] === "rng") break; }
      var read = e.map(function (r) { return access.every(function (k) { return ok(r[k], q[k]); }); });
      var match = e.map(function (r) { return Object.keys(q).every(function (k) { return ok(r[k], q[k]); }); });
      root.querySelector(".ix").innerHTML = e.map(function (r, i) {
        return '<div class="' + (match[i] ? "read match" : access.length && read[i] ? "read" : !access.length ? "read" : "") + '">' + r[cols[0]] + "·" + r[cols[1]] + "</div>";
      }).join("");
      var nRead = access.length ? read.filter(Boolean).length : e.length, nMatch = match.filter(Boolean).length;
      var msg;
      if (!access.length) msg = "The index is sorted by " + cols[0] + " first, and this query doesn't constrain " + cols[0] + ". Matching entries are scattered, so the whole index (or the table) must be scanned.";
      else if (nRead === nMatch) msg = "Every entry read is a match: the query's conditions mark the start and end of one contiguous slice of the index.";
      else msg = "The index narrows the search using " + access.join(" and ") + " only. Within that slice, " + Object.keys(q).filter(function (k) { return access.indexOf(k) < 0 || q[k][0] === "rng"; }).filter(function (k) { return access.indexOf(k) < 0; }).join(", ") + " is checked entry by entry and most entries are thrown away.";
      root.querySelector(".big").innerHTML = nRead + " of " + e.length + " entries read · " + nMatch + " match<small>" + msg + "</small>";
    }
    draw();
  }

  document.addEventListener("DOMContentLoaded", function () {
    document.querySelectorAll(".lsm-sim").forEach(lsmSim);
    document.querySelectorAll(".btree-lookup").forEach(btreeLookup);
    document.querySelectorAll(".btree-calc").forEach(btreeCalc);
    document.querySelectorAll(".composite-index").forEach(compositeIndex);
  });
})();
