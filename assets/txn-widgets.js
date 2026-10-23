/* ==========================================================
   Transaction widgets (DDIA Ch. 7)
   <div class="isolation-sim"></div>  Alice reads her balances while a transfer runs (DDIA Figs. 7-4, 7-6, 7-7),
                                      under read uncommitted / read committed / snapshot isolation, with MVCC row versions
   <div class="writeskew-sim"></div>  two on-call doctors both go off call (DDIA Figs. 7-8, 7-11) under snapshot isolation,
                                      SELECT ... FOR UPDATE, and serializable snapshot isolation
   ========================================================== */
(function () {
  var css = "\
.tw{font-family:var(--sans);font-size:14px;color:var(--ink)}\
.tw .ctrl{display:flex;flex-wrap:wrap;gap:8px 18px;align-items:center;margin-bottom:12px}\
.tw .seg{display:inline-flex;border:1px solid var(--rule);border-radius:8px;overflow:hidden}\
.tw .seg button{font:inherit;font-size:13px;border:0;border-right:1px solid var(--rule);background:var(--surface);color:var(--ink-2);padding:6px 11px;cursor:pointer}\
.tw .seg button:last-child{border-right:0}\
.tw .seg button.on{background:var(--ink);color:var(--bg)}\
.tw .btns{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px}\
.tw .btns button{font:inherit;font-size:13.5px;border:1px solid var(--rule);background:var(--surface);color:var(--ink);border-radius:8px;padding:6px 12px;cursor:pointer}\
.tw .btns button.primary{background:var(--ink);color:var(--bg);border-color:var(--ink)}\
.tw .btns button:disabled{opacity:.4;cursor:default}\
.tw .cols{display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:14px}\
.tw .zone{font-size:11.5px;letter-spacing:.06em;text-transform:uppercase;color:var(--ink-3);margin:0 0 6px}\
.tw table{width:100%;border-collapse:collapse;font-size:12.5px}\
.tw th,.tw td{text-align:left;padding:5px 6px;border-bottom:1px solid var(--rule)}\
.tw th{font-weight:600;color:var(--ink-3);font-size:11.5px}\
.tw td{font-family:var(--mono);color:var(--ink-2)}\
.tw tr.seen td{background:color-mix(in srgb,var(--viz-1) 18%,transparent);color:var(--ink);font-weight:600}\
.tw tr.gone td{color:var(--ink-3);text-decoration:line-through}\
.tw .pill{font-family:var(--sans);font-size:11px;padding:1px 6px;border-radius:999px;border:1px solid var(--rule);color:var(--ink-3);white-space:nowrap}\
.tw .view{border:1px solid var(--rule);border-radius:10px;background:var(--surface);padding:10px 12px}\
.tw .view .row{display:flex;justify-content:space-between;padding:3px 0;font-size:13.5px}\
.tw .view .row b{font-family:var(--mono)}\
.tw .view .tot{border-top:1px solid var(--rule);margin-top:4px;padding-top:6px;font-weight:600}\
.tw .verdict{display:flex;gap:10px;align-items:center;margin:12px 0 8px;font-size:15px;font-weight:600}\
.tw .verdict small{display:block;font-size:13px;font-weight:400;color:var(--ink-3)}\
.tw .badge-ok,.tw .badge-bad{font-size:12px;font-weight:600;padding:3px 9px;border-radius:999px;white-space:nowrap}\
.tw .badge-ok{background:var(--green-soft);color:var(--green)}\
.tw .badge-bad{background:var(--red-soft);color:var(--red)}\
.tw .log{list-style:none;padding:0;margin:8px 0 0;font-size:13.5px;border-top:1px solid var(--rule)}\
.tw .log li{padding:6px 0;border-bottom:1px solid var(--rule);margin:0}\
.tw .log li b{font-family:var(--mono);font-weight:500;font-size:12px;color:var(--ink-3);margin-right:8px}";
  var st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);

  function isolationSim(root) {
    root.classList.add("tw");
    var LEVELS = [["ru", "Read uncommitted"], ["rc", "Read committed"], ["si", "Snapshot isolation"]];
    root.innerHTML = '<div class="ctrl"><span style="color:var(--ink-2)">Alice\'s isolation level</span><span class="seg">' +
      LEVELS.map(function (l) { return '<button data-l="' + l[0] + '">' + l[1] + "</button>"; }).join("") + "</span></div>" +
      '<div class="btns"><button class="primary nx"></button><button class="rs">Reset</button></div>' +
      '<div class="cols"><div><p class="zone">What Alice sees (txn 12)</p><div class="view"></div></div>' +
      '<div><p class="zone">Rows actually stored (MVCC versions)</p><table><thead><tr><th>account</th><th>balance</th><th>created by</th><th>deleted by</th></tr></thead><tbody class="rows"></tbody></table></div></div>' +
      '<div class="verdict"></div><ul class="log"></ul>';
    var level = "rc", S;
    var STEPS = [
      { who: "Alice", t: "Alice starts transaction 12 and reads account 1.", run: function () { S.started = true; S.snap = S.committed.slice(); read(1); } },
      { who: "Transfer", t: "Transaction 13 starts moving $100 from account 2 to account 1: +100 on account 1, −100 on account 2. Not committed yet.", run: function () {
        S.rows.forEach(function (r) { if (r.deleted === null) r.deleted = 13; });
        S.rows.push({ acct: 1, bal: 600, created: 13, deleted: null }, { acct: 2, bal: 400, created: 13, deleted: null }); } },
      { who: "Alice", t: "Alice reads account 2 while the transfer is still running.", run: function () { read(2); } },
      { who: "Transfer", t: "Transaction 13 commits.", run: function () { S.committed.push(13); } },
      { who: "Alice", t: "Alice refreshes account 1, still inside transaction 12.", run: function () { read(1, true); } }
    ];
    function visible(r) {
      if (level === "ru") return true; // newest version wins, committed or not
      var c = level === "si" ? S.snap : S.committed;
      var createdOk = c.indexOf(r.created) >= 0;
      var deletedOk = r.deleted === null || c.indexOf(r.deleted) < 0;
      return createdOk && deletedOk;
    }
    function read(acct, again) {
      var cand = S.rows.filter(function (r) { return r.acct === acct && visible(r); });
      var r = cand[cand.length - 1];
      if (again) { S.first1 = S.seen[1]; S.reread = r.bal; }
      S.seen[acct] = r.bal; S.seenRow[acct] = r;
    }
    function reset() { S = { i: 0, rows: [{ acct: 1, bal: 500, created: 3, deleted: null }, { acct: 2, bal: 500, created: 3, deleted: null }], committed: [3], snap: null, seen: {}, seenRow: {}, reread: null, first1: null, log: [] }; render(); }
    root.querySelector(".nx").addEventListener("click", function () {
      if (S.i >= STEPS.length) return;
      var s = STEPS[S.i]; s.run(); S.i++;
      var msg = s.t;
      if (S.i === 1) msg += " She sees $" + S.seen[1] + ".";
      if (S.i === 3) msg += " She sees $" + S.seen[2] + (S.seen[2] === 400 ? ": the uncommitted −100. A dirty read." : ": the last committed value.");
      if (S.i === 5) msg += " She now sees $" + S.reread + (S.reread === 600 ? ", not the $500 she saw before. A non-repeatable read." : ", the same as before. Her snapshot is frozen at the start of transaction 12.");
      S.log.push(msg); render();
    });
    root.querySelector(".rs").addEventListener("click", reset);
    root.querySelectorAll(".seg button").forEach(function (b) { b.addEventListener("click", function () { level = b.getAttribute("data-l"); reset(); }); });
    function render() {
      root.querySelectorAll(".seg button").forEach(function (b) { b.classList.toggle("on", b.getAttribute("data-l") === level); });
      var nx = root.querySelector(".nx");
      nx.disabled = S.i >= STEPS.length;
      nx.textContent = S.i >= STEPS.length ? "Done. Try another level" : "Next step ▶ (" + (S.i + 1) + "/" + STEPS.length + ", " + STEPS[S.i].who + ")";
      root.querySelector(".rows").innerHTML = S.rows.map(function (r) {
        var seen = S.seenRow[r.acct] === r;
        var dead = r.deleted !== null && S.committed.indexOf(r.deleted) >= 0;
        var tag = function (id) { return id === null ? "–" : id + (S.committed.indexOf(id) >= 0 ? "" : ' <span class="pill">in progress</span>'); };
        return '<tr class="' + (seen ? "seen" : dead ? "gone" : "") + '"><td>' + r.acct + "</td><td>$" + r.bal + "</td><td>" + tag(r.created) + "</td><td>" + tag(r.deleted) + "</td></tr>";
      }).join("");
      var a1 = S.seen[1], a2 = S.seen[2];
      var v = '<div class="row"><span>Account 1</span><b>' + (a1 === undefined ? "–" : (S.reread !== null && S.first1 !== S.reread ? "$" + S.first1 + " → " : "") + "$" + a1) + '</b></div>' +
        '<div class="row"><span>Account 2</span><b>' + (a2 === undefined ? "–" : "$" + a2) + "</b></div>";
      var total = a1 !== undefined && a2 !== undefined ? a1 + a2 : null;
      v += '<div class="row tot"><span>Total Alice believes she has</span><b>' + (total === null ? "–" : "$" + total) + "</b></div>";
      root.querySelector(".view").innerHTML = v;
      var verdict = "";
      if (S.i >= 3) {
        if (S.i < STEPS.length) verdict = total === 1000 ? '<span class="badge-ok">consistent so far</span><span>$1,000 in total<small>Alice has only seen committed data.</small></span>' : '<span class="badge-bad">dirty read</span><span>$' + total + ' in total<small>Alice saw a write that isn\'t committed. If transaction 13 aborts, that $400 never existed.</small></span>';
        else if (level === "si") verdict = '<span class="badge-ok">consistent snapshot</span><span>Every read in transaction 12 shows the database as it was when it started<small>Account 1 is still $500 and the total is still $1,000. She sees the transfer only in her next transaction.</small></span>';
        else if (level === "rc") verdict = '<span class="badge-bad">read skew</span><span>Account 1 read $500, then $600, inside one transaction<small>Each read saw committed data, but from different moments. A report or backup built this way mixes "before" and "after".</small></span>';
        else verdict = '<span class="badge-bad">dirty read + read skew</span><span>She saw uncommitted data and different values for the same row<small>Weakest level: almost nothing is guaranteed.</small></span>';
      }
      root.querySelector(".verdict").innerHTML = verdict;
      root.querySelector(".log").innerHTML = S.log.map(function (m, i) { return "<li><b>" + (i + 1) + "</b>" + m + "</li>"; }).join("");
    }
    reset();
  }


  function writeSkewSim(root) {
    root.classList.add("tw");
    var MODES = [["si", "Snapshot isolation"], ["lock", "SI + SELECT … FOR UPDATE"], ["ssi", "Serializable (SSI)"]];
    root.innerHTML = '<div class="ctrl"><span style="color:var(--ink-2)">Database setting</span><span class="seg">' +
      MODES.map(function (m) { return '<button data-m="' + m[0] + '">' + m[1] + "</button>"; }).join("") + "</span></div>" +
      '<div class="btns"><button class="primary nx"></button><button class="rs">Reset</button></div>' +
      '<div class="cols"><div><p class="zone">Doctors table, shift 1234 (committed state)</p><table><thead><tr><th>doctor</th><th>on_call</th><th>lock / note</th></tr></thead><tbody class="rows"></tbody></table></div>' +
      '<div><p class="zone">Rule the app must keep</p><div class="view"><div class="row"><span>At least one doctor on call</span><b class="cnt"></b></div></div></div></div>' +
      '<div class="verdict"></div><ul class="log"></ul>';
    var mode = "si", S;
    function reset() { S = { i: 0, on: { Alice: true, Bob: true }, pend: {}, lock: null, bobWait: false, bobDone: false, log: [], end: null }; render(); }
    var STEPS = [
      function () { if (mode === "lock") { S.lock = "Alice"; return "Alice's transaction (42) runs <code>SELECT … WHERE on_call FOR UPDATE</code>: 2 doctors on call, and both rows are now locked by Alice."; }
        return "Alice's transaction (42) counts doctors on call: <strong>2</strong>. Safe for her to leave, she thinks."; },
      function () { if (mode === "lock") { S.bobWait = true; return "Bob's transaction (43) runs the same <code>SELECT … FOR UPDATE</code>, hits Alice's locks and <strong>waits</strong>."; }
        return "Bob's transaction (43) counts doctors on call: also <strong>2</strong>. His snapshot doesn't show Alice's plans."; },
      function () { S.pend.Alice = true; return "Alice sets <code>on_call = false</code> on <em>her own</em> row (not committed yet)."; },
      function () { if (mode === "lock") return "Bob is still waiting for Alice's locks, so he does nothing."; S.pend.Bob = true;
        return "Bob sets <code>on_call = false</code> on <em>his own</em> row. A different row from Alice's, so there's no write conflict and no lost update to detect."; },
      function () { S.on.Alice = false; S.pend.Alice = false; S.lock = null;
        if (mode === "lock") { S.bobWait = false; S.bobDone = true; S.end = "ok";
          return "Alice commits and releases the locks. Bob's query finally runs and sees <strong>1</strong> doctor on call, so the app refuses his request. The rule holds."; }
        return "Alice commits. Successfully."; },
      function () {
        if (mode === "lock") return "Nothing left to do: Bob was told to find a replacement.";
        if (mode === "ssi") { S.pend.Bob = false; S.end = "ok";
          return "Bob tries to commit. The database noticed that his count of 2 was read from data Alice has since changed and committed. His decision rested on an outdated premise, so the commit is <strong>aborted</strong> (a serialization failure). If the app retries, Bob's count is 1 and his request is refused."; }
        S.on.Bob = false; S.pend.Bob = false; S.end = "bad";
        return "Bob commits. Successfully. Neither transaction broke any rule the database knows about, yet together they did.";
      }
    ];
    root.querySelector(".nx").addEventListener("click", function () { if (S.i >= STEPS.length) return; S.log.push(STEPS[S.i]()); S.i++; render(); });
    root.querySelector(".rs").addEventListener("click", reset);
    root.querySelectorAll(".seg button").forEach(function (b) { b.addEventListener("click", function () { mode = b.getAttribute("data-m"); reset(); }); });
    function render() {
      root.querySelectorAll(".seg button").forEach(function (b) { b.classList.toggle("on", b.getAttribute("data-m") === mode); });
      var nx = root.querySelector(".nx"); nx.disabled = S.i >= STEPS.length;
      nx.textContent = S.i >= STEPS.length ? "Done. Try another setting" : "Next step ▶ (" + (S.i + 1) + "/" + STEPS.length + ")";
      root.querySelector(".rows").innerHTML = ["Alice", "Bob"].map(function (d) {
        var note = [];
        if (S.lock) note.push("locked by " + S.lock);
        if (S.pend[d]) note.push('<span class="pill">uncommitted: false</span>');
        if (d === "Bob" && S.bobWait) note.push('<span class="pill">Bob waiting</span>');
        return "<tr><td>" + d + "</td><td>" + S.on[d] + "</td><td>" + (note.join(" ") || "–") + "</td></tr>";
      }).join("");
      var n = (S.on.Alice ? 1 : 0) + (S.on.Bob ? 1 : 0);
      root.querySelector(".cnt").textContent = n + " on call";
      var v = "";
      if (S.end === "bad") v = '<span class="badge-bad">write skew</span><span>Nobody is on call<small>Each transaction checked the rule on its snapshot, then changed a different row. Snapshot isolation doesn\'t catch this; PostgreSQL\'s and MySQL\'s "repeatable read" don\'t either.</small></span>';
      else if (S.end === "ok") v = '<span class="badge-ok">rule kept</span><span>One doctor still on call<small>' + (mode === "lock" ? "Pessimistic: Bob waited for Alice. Correct, but you had to know which rows to lock." : "Optimistic: nobody waited; the database aborted the transaction whose premise went stale. The app must retry it.") + "</small></span>";
      root.querySelector(".verdict").innerHTML = v;
      root.querySelector(".log").innerHTML = S.log.map(function (m, i) { return "<li><b>" + (i + 1) + "</b>" + m + "</li>"; }).join("");
    }
    reset();
  }

  document.addEventListener("DOMContentLoaded", function () {
    document.querySelectorAll(".isolation-sim").forEach(isolationSim);
    document.querySelectorAll(".writeskew-sim").forEach(writeSkewSim);
  });
})();
