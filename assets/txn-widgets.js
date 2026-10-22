/* ==========================================================
   Transaction widgets (DDIA Ch. 7)
   <div class="isolation-sim"></div>  Alice reads her balances while a transfer runs (DDIA Figs. 7-4, 7-6, 7-7),
                                      under read uncommitted / read committed / snapshot isolation, with MVCC row versions
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

  document.addEventListener("DOMContentLoaded", function () {
    document.querySelectorAll(".isolation-sim").forEach(isolationSim);
  });
})();
