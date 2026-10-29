/* ==========================================================
   Replication widgets (DDIA Ch. 5)
   <div class="repl-sim"></div>  one leader + two followers: async vs semi-sync writes, lag, leader crash,
                                 failover, and the old leader coming back (fenced or split brain)
   <div class="lag-sim"></div>   the three replication-lag anomalies (DDIA Figs. 5-3, 5-4, 5-5), each with and without its fix
   <div class="quorum-sim"></div> leaderless n / w / r: which replicas got the write, which were read, and the exact chance of a stale read
   ========================================================== */
(function () {
  var css = "\
.rw{font-family:var(--sans);font-size:14px;color:var(--ink)}\
.rw .ctrl{display:flex;flex-wrap:wrap;gap:8px 18px;align-items:center;margin-bottom:12px}\
.rw .seg{display:inline-flex;border:1px solid var(--rule);border-radius:8px;overflow:hidden}\
.rw .seg button{font:inherit;font-size:13px;border:0;border-right:1px solid var(--rule);background:var(--surface);color:var(--ink-2);padding:6px 11px;cursor:pointer}\
.rw .seg button:last-child{border-right:0}\
.rw .seg button.on{background:var(--ink);color:var(--bg)}\
.rw label.chk{display:flex;gap:7px;align-items:center;color:var(--ink-2)}\
.rw input[type=checkbox]{accent-color:var(--viz-1)}\
.rw .btns{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px}\
.rw .btns button{font:inherit;font-size:13.5px;border:1px solid var(--rule);background:var(--surface);color:var(--ink);border-radius:8px;padding:6px 11px;cursor:pointer}\
.rw .btns button.primary{background:var(--ink);color:var(--bg);border-color:var(--ink)}\
.rw .btns button:disabled{opacity:.4;cursor:default}\
.rw .nodes{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:10px}\
.rw .node{border:1px solid var(--rule);border-radius:10px;background:var(--surface);padding:9px 11px;min-height:96px}\
.rw .node.leader{border-color:var(--viz-1);box-shadow:0 0 0 2px color-mix(in srgb,var(--viz-1) 18%,transparent)}\
.rw .node.dead{opacity:.45}\
.rw .node.bad{border-color:var(--red);background:var(--red-soft)}\
.rw .node h4{margin:0 0 6px;font-size:13px;display:flex;justify-content:space-between;gap:8px}\
.rw .role{font-size:11px;font-weight:600;padding:1px 7px;border-radius:999px;border:1px solid var(--rule);color:var(--ink-3)}\
.rw .node.leader .role{color:var(--ink);border-color:var(--viz-1)}\
.rw .chips{display:flex;flex-wrap:wrap;gap:4px}\
.rw .chip{font-family:var(--mono);font-size:11.5px;padding:1px 6px;border-radius:5px;border:1px solid var(--rule);color:var(--ink-2)}\
.rw .chip.lost{text-decoration:line-through;color:var(--red);border-color:var(--red)}\
.rw .chip.x{border-style:dashed}\
.rw .lag{font-size:12px;color:var(--ink-3);margin-top:6px}\
.rw .stats{display:flex;flex-wrap:wrap;gap:6px 22px;margin:12px 0 6px;font-size:13.5px;color:var(--ink-2)}\
.rw .stats b{font-family:var(--mono);color:var(--ink)}\
.rw .log{list-style:none;padding:0;margin:6px 0 0;font-size:13.5px;border-top:1px solid var(--rule)}\
.rw .log li{padding:6px 0;border-bottom:1px solid var(--rule);margin:0}\
.rw .log li b{font-family:var(--mono);font-weight:500;font-size:12px;color:var(--ink-3);margin-right:8px}";
  var st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);


  var css2 = "\
.rw .ring{display:flex;flex-wrap:wrap;gap:8px;margin:8px 0 4px}\
.rw .rep{width:74px;border:1px solid var(--rule);border-radius:10px;background:var(--surface);padding:7px 6px;text-align:center;font-size:12px;color:var(--ink-3)}\
.rw .rep b{display:block;font-family:var(--mono);font-size:15px;color:var(--ink-2)}\
.rw .rep.new b{color:var(--ink)}\
.rw .rep.new{background:color-mix(in srgb,var(--viz-1) 16%,transparent)}\
.rw .rep.read{border-color:var(--viz-1);box-shadow:0 0 0 2px color-mix(in srgb,var(--viz-1) 22%,transparent)}\
.rw .rep.down{opacity:.4;border-style:dashed}\
.rw .ctrl output{font-family:var(--mono);font-size:13px;min-width:22px;display:inline-block;color:var(--ink)}\
.rw input[type=range]{accent-color:var(--viz-1);width:120px}\
.rw .tiles{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;margin-top:10px}\
.rw .tile{border:1px solid var(--rule);border-radius:10px;padding:9px 11px;background:var(--surface)}\
.rw .tile .t{font-size:12px;color:var(--ink-3)}\
.rw .tile .v{font-size:19px;font-weight:600;font-family:var(--mono)}\
.rw .verdict{display:flex;gap:10px;align-items:center;margin:10px 0 2px;font-size:14.5px;font-weight:600}\
.rw .verdict small{display:block;font-size:13px;font-weight:400;color:var(--ink-3)}\
.rw .badge-ok,.rw .badge-bad{font-size:12px;font-weight:600;padding:3px 9px;border-radius:999px;white-space:nowrap}\
.rw .badge-ok{background:var(--green-soft);color:var(--green)}\
.rw .badge-bad{background:var(--red-soft);color:var(--red)}";
  var st2 = document.createElement("style"); st2.textContent = css2; document.head.appendChild(st2);

  function replSim(root) {
    root.classList.add("rw");
    root.innerHTML = '<div class="ctrl"><span style="color:var(--ink-2)">Replication</span><span class="seg"><button data-m="async">Fully asynchronous</button><button data-m="semi">Semi-synchronous (follower 1 sync)</button></span>' +
      '<label class="chk"><input type="checkbox" class="fence" checked> Old leader is fenced on return</label></div>' +
      '<div class="btns"><button class="primary w">Client writes</button><button class="t">Let replication catch up a bit</button><button class="k">Leader crashes → failover</button><button class="b">Old leader comes back</button><button class="rs">Reset</button></div>' +
      '<div class="nodes"></div><div class="stats"></div><ul class="log"></ul>';
    var mode = "async", S;
    function reset() {
      S = { n: 0, nodes: [{ name: "Node A", role: "leader", log: [], up: true }, { name: "Node B", role: "follower 1", log: [], up: true }, { name: "Node C", role: "follower 2", log: [], up: true }],
        acked: [], lost: [], failed: false, back: false, split: false, msgs: [] };
      render();
    }
    function leader() { return S.nodes.filter(function (x) { return x.up && x.role === "leader"; })[0]; }
    function log(m) { S.msgs.unshift(m); if (S.msgs.length > 6) S.msgs.pop(); }
    root.querySelector(".w").addEventListener("click", function () {
      var L = leader(); S.n++; var w = "w" + S.n; L.log.push(w);
      var sync = mode === "semi" && !S.failed ? S.nodes[1] : null;
      if (sync && sync.up) sync.log.push(w);
      S.acked.push(w);
      if (S.split) { S.nodes[0].log.push("w" + S.n + "′"); log("Split brain: a client writes " + w + " to " + L.name + ", while another client writes " + w + "′ to the old leader, which still thinks it's in charge. The two copies now disagree."); }
      else log("Client writes " + w + ". " + (sync ? L.name + " waits for follower 1 to confirm, then acknowledges. It's on two nodes." : L.name + " writes it locally and acknowledges <strong>immediately</strong>. Followers will get it later."));
      render();
    });
    root.querySelector(".t").addEventListener("click", function () {
      var L = leader();
      S.nodes.forEach(function (f, i) {
        if (!f.up || f === L || (S.split && i === 0)) return;
        var target = L.log.filter(function (w) { return f.log.indexOf(w) < 0; });
        var take = i === 2 ? target.slice(0, 1) : target; // follower 2 is the slow one
        f.log = f.log.concat(take);
      });
      log("Time passes. The followers apply more of the leader's log. Follower 2 is on a slower link and catches up only one write at a time.");
      render();
    });
    root.querySelector(".k").addEventListener("click", function () {
      if (S.failed) return;
      var old = S.nodes[0]; old.up = false; S.failed = true;
      var cands = S.nodes.filter(function (x) { return x.up; }).sort(function (a, b) { return b.log.length - a.log.length; });
      var nl = cands[0]; nl.role = "leader"; cands.forEach(function (c, i) { if (i) c.role = "follower"; });
      S.lost = old.log.filter(function (w) { return nl.log.indexOf(w) < 0; });
      cands.slice(1).forEach(function (c) { c.log = c.log.filter(function (w) { return nl.log.indexOf(w) >= 0; }); });
      log("Node A stops answering. After the timeout, the remaining nodes promote the most up-to-date follower, <strong>" + nl.name + "</strong>. " +
        (S.lost.length ? "Writes " + S.lost.join(", ") + " were acknowledged to clients but never reached it: <strong>they are lost</strong>." : "It had every acknowledged write, so nothing is lost."));
      render();
    });
    root.querySelector(".b").addEventListener("click", function () {
      if (!S.failed || S.back) return;
      var old = S.nodes[0]; old.up = true; S.back = true;
      if (root.querySelector(".fence").checked) {
        old.role = "follower"; var L = leader();
        log("Node A restarts and learns there is a newer leader (its term/epoch number is out of date). It becomes a follower and <strong>discards</strong> its unreplicated writes" + (S.lost.length ? " (" + S.lost.join(", ") + ")" : "") + ", then copies " + L.name + "'s log.");
        old.log = L.log.slice();
      } else {
        old.role = "leader (thinks)"; S.split = true;
        log("Node A restarts <strong>still believing it is the leader</strong>. Clients that haven't been redirected keep writing to it. Two leaders now accept writes: <strong>split brain</strong>. Try writing now.");
      }
      render();
    });
    root.querySelector(".rs").addEventListener("click", reset);
    root.querySelectorAll(".seg button").forEach(function (b) { b.addEventListener("click", function () { mode = b.getAttribute("data-m"); reset(); }); });
    root.querySelector(".fence").addEventListener("change", reset);
    function render() {
      root.querySelectorAll(".seg button").forEach(function (b) { b.classList.toggle("on", b.getAttribute("data-m") === mode); });
      var L = leader();
      root.querySelector(".nodes").innerHTML = S.nodes.map(function (x, i) {
        var cls = "node" + (x.up && x.role.indexOf("leader") === 0 ? " leader" : "") + (!x.up ? " dead" : "") + (S.split && i === 0 ? " bad" : "");
        var role = !x.up ? "down" : x.role + (mode === "semi" && i === 1 && !S.failed ? " · sync" : "");
        var chips = x.log.length ? x.log.map(function (w) { return '<span class="chip' + (S.lost.indexOf(w) >= 0 && !x.up ? " lost" : "") + (w.indexOf("′") > 0 ? " x" : "") + '">' + w + "</span>"; }).join("") : '<span class="lag">empty</span>';
        var lag = x.up && L && x !== L && !(S.split && i === 0) ? '<div class="lag">behind the leader by ' + Math.max(0, L.log.length - x.log.length) + " write(s)</div>" : "";
        return '<div class="' + cls + '"><h4>' + x.name + '<span class="role">' + role + '</span></h4><div class="chips">' + chips + "</div>" + lag + "</div>";
      }).join("");
      root.querySelector(".stats").innerHTML = "<span>Acknowledged to clients <b>" + S.acked.length + "</b></span><span>Acknowledged but lost <b>" + S.lost.length + "</b></span>";
      root.querySelector(".k").disabled = S.failed; root.querySelector(".b").disabled = !S.failed || S.back;
      root.querySelector(".log").innerHTML = S.msgs.map(function (m, i) { return "<li><b>" + (S.msgs.length - i) + "</b>" + m + "</li>"; }).join("");
    }
    reset();
  }


  function lagSim(root) {
    root.classList.add("rw");
    var SC = {
      ryw: { t: "Read your own writes", fix: "Read the user's own data from the leader",
        steps: [
          { at: 0, m: "User 1234 posts a comment. The write goes to the <strong>leader</strong>.", w: [["L", "comment by 1234"]] },
          { at: 0.5, m: function (f) { return f ? "Half a second later they reload. Because this is <em>their own</em> data, the read goes to the <strong>leader</strong>: the comment is there." : "Half a second later they reload. The read is sent to <strong>follower 2</strong>, which is 5 s behind: <strong>their comment is missing</strong>. It looks as if the post was lost."; },
            read: function (f) { return f ? "L" : "F2"; }, want: "comment by 1234" },
          { at: 6, m: "After 6 s every follower has caught up. The anomaly was temporary, which is what <em>eventual</em> consistency means." }
        ] },
      mono: { t: "Monotonic reads", fix: "Pin each user to one replica (hash of user ID)",
        steps: [
          { at: 0, m: "User 1234 adds a comment on the leader.", w: [["L", "comment by 1234"]] },
          { at: 1, m: function (f) { return f ? "User 2345 loads the page. hash(2345) picks <strong>follower 1</strong> (0.2 s behind): the comment is visible." : "User 2345 loads the page. A random choice picks <strong>follower 1</strong> (0.2 s behind): the comment is visible."; }, read: function () { return "F1"; }, want: "comment by 1234" },
          { at: 2, m: function (f) { return f ? "User 2345 refreshes. hash(2345) picks <strong>follower 1</strong> again: still visible. Time only moves forward for this user." : "User 2345 refreshes. This time the random choice is <strong>follower 2</strong> (5 s behind): <strong>the comment has vanished</strong>. Time went backwards."; },
            read: function (f) { return f ? "F1" : "F2"; }, want: "comment by 1234" }
        ] },
      prefix: { t: "Consistent prefix reads", fix: "Write causally related messages to the same partition",
        steps: [
          { at: 0, m: function (f) { return "Mr. Poons asks: <em>“How far into the future can you see?”</em> It's stored on " + (f ? "partition 1" : "<strong>partition 1</strong>, whose follower is 5 s behind") + "."; }, w: [["P1", "Q: how far ahead?"]] },
          { at: 1, m: function (f) { return "Mrs. Cake answers: <em>“About ten seconds usually.”</em> " + (f ? "Same conversation, so it goes to <strong>partition 1</strong> too, after the question." : "It lands on <strong>partition 2</strong>, whose follower is only 0.2 s behind."); },
            w: function (f) { return [[f ? "P1" : "P2", "A: about ten seconds"]]; } },
          { at: 2, m: function (f) { return f ? "An observer reads both partitions' followers. Partition 1's follower is behind, so they see <strong>neither message yet</strong>, which is fine. When they appear, the question comes first." : "An observer reads both partitions' followers: they see the <strong>answer but not the question</strong>. Mrs. Cake appears to answer before being asked."; } }
        ] }
    };
    root.innerHTML = '<div class="ctrl"><span class="seg">' + Object.keys(SC).map(function (k) { return '<button data-s="' + k + '">' + SC[k].t + "</button>"; }).join("") + "</span></div>" +
      '<div class="ctrl"><label class="chk"><input type="checkbox" class="fx"> <span class="fxl"></span></label></div>' +
      '<div class="btns"><button class="primary nx"></button><button class="rs">Reset</button></div><div class="nodes"></div><ul class="log"></ul>';
    var cur = "ryw", S;
    function nodesFor(k) {
      if (k === "prefix") return [{ id: "P1", name: "Partition 1 leader", lag: 0 }, { id: "P1f", src: "P1", name: "Partition 1 follower", lag: 5 }, { id: "P2", name: "Partition 2 leader", lag: 0 }, { id: "P2f", src: "P2", name: "Partition 2 follower", lag: 0.2 }];
      return [{ id: "L", name: "Leader", lag: 0 }, { id: "F1", src: "L", name: "Follower 1", lag: 0.2 }, { id: "F2", src: "L", name: "Follower 2", lag: 5 }];
    }
    function reset() { S = { i: 0, t: 0, writes: [], read: null, ok: null, msgs: [] }; root.querySelector(".fxl").textContent = "Fix: " + SC[cur].fix; render(); }
    function has(node, w) { var src = node.src || node.id; return S.writes.some(function (x) { return x.at === src && x.v === w.v && S.t >= x.t + node.lag; }); }
    root.querySelector(".nx").addEventListener("click", function () {
      var sc = SC[cur]; if (S.i >= sc.steps.length) return;
      var f = root.querySelector(".fx").checked, st = sc.steps[S.i]; S.t = st.at; S.read = null;
      var w = typeof st.w === "function" ? st.w(f) : st.w;
      (w || []).forEach(function (p) { S.writes.push({ at: p[0], v: p[1], t: st.at }); });
      if (st.read) { var nid = st.read(f), node = nodesFor(cur).filter(function (n) { return n.id === nid; })[0]; S.read = nid; S.ok = has(node, { v: st.want }); }
      if (cur === "prefix" && S.i === 2) { S.read = f ? "P1f" : "BOTH"; }
      S.msgs.push((typeof st.m === "function" ? st.m(f) : st.m)); S.i++; render();
    });
    root.querySelector(".rs").addEventListener("click", reset);
    root.querySelector(".fx").addEventListener("change", reset);
    root.querySelectorAll(".seg button").forEach(function (b) { b.addEventListener("click", function () { cur = b.getAttribute("data-s"); root.querySelector(".fx").checked = false; reset(); }); });
    function render() {
      root.querySelectorAll(".seg button").forEach(function (b) { b.classList.toggle("on", b.getAttribute("data-s") === cur); });
      var sc = SC[cur], nx = root.querySelector(".nx"); nx.disabled = S.i >= sc.steps.length;
      nx.textContent = S.i >= sc.steps.length ? "Done. Toggle the fix and replay" : "Next ▶ (t = " + sc.steps[S.i].at + " s)";
      root.querySelector(".nodes").innerHTML = nodesFor(cur).map(function (n) {
        var vis = S.writes.filter(function (x) { return x.at === (n.src || n.id) && S.t >= x.t + n.lag; });
        var pend = S.writes.filter(function (x) { return x.at === (n.src || n.id) && S.t < x.t + n.lag; });
        var reading = S.read === n.id || (S.read === "BOTH" && /f$/.test(n.id)) || (S.read === "P1f" && /f$/.test(n.id));
        var chips = vis.map(function (x) { return '<span class="chip">' + x.v + "</span>"; }).join("") + pend.map(function (x) { return '<span class="chip x">' + x.v + " (in transit)</span>"; }).join("");
        return '<div class="node' + (reading ? " leader" : "") + '"><h4>' + n.name + '<span class="role">' + (n.lag ? n.lag + " s behind" : "up to date") + (reading ? " · being read" : "") + '</span></h4><div class="chips">' + (chips || '<span class="lag">nothing yet</span>') + "</div></div>";
      }).join("");
      root.querySelector(".log").innerHTML = S.msgs.map(function (m, i) { return "<li><b>t=" + sc.steps[i].at + "s</b>" + m + "</li>"; }).join("");
    }
    reset();
  }


  function quorumSim(root) {
    root.classList.add("rw");
    root.innerHTML = '<div class="ctrl"><label>n (replicas) <input type="range" class="n" min="3" max="7" value="3"><output class="on"></output></label>' +
      '<label>w (write acks) <input type="range" class="w" min="1" max="3" value="2"><output class="ow"></output></label>' +
      '<label>r (read replies) <input type="range" class="r" min="1" max="3" value="2"><output class="or"></output></label></div>' +
      '<div class="btns"><button class="primary go">Write v2, then read</button></div><div class="ring"></div><div class="verdict"></div><div class="tiles"></div>';
    var n = root.querySelector(".n"), w = root.querySelector(".w"), r = root.querySelector(".r"), last = null;
    function C(a, b) { if (b < 0 || b > a) return 0; var x = 1; for (var i = 1; i <= b; i++) x = x * (a - b + i) / i; return x; }
    function pick(N, k) { var a = []; for (var i = 0; i < N; i++) a.push(i); for (i = N - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a.slice(0, k); }
    function sync() {
      var N = +n.value; w.max = N; r.max = N; if (+w.value > N) w.value = N; if (+r.value > N) r.value = N;
      root.querySelector(".on").textContent = N; root.querySelector(".ow").textContent = w.value; root.querySelector(".or").textContent = r.value;
    }
    function draw() {
      sync(); var N = +n.value, W = +w.value, R = +r.value;
      var got = last && last.N === N && last.W === W && last.R === R ? last : null;
      root.querySelector(".ring").innerHTML = Array.apply(null, Array(N)).map(function (_, i) {
        var nw = got && got.wrote.indexOf(i) >= 0, rd = got && got.read.indexOf(i) >= 0;
        return '<div class="rep' + (nw ? " new" : "") + (rd ? " read" : "") + '">replica ' + (i + 1) + "<b>" + (nw ? "v2" : "v1") + "</b>" + (rd ? "read" : "&nbsp;") + "</div>";
      }).join("");
      var stale = C(N - W, R) / C(N, R), quorum = W + R > N;
      var v = "";
      if (got) {
        var fresh = got.read.some(function (i) { return got.wrote.indexOf(i) >= 0; });
        v = fresh ? '<span class="badge-ok">got v2</span><span>At least one replica read had the new write<small>The client takes the highest version it sees, and can write v2 back to the stale ones (read repair).</small></span>'
          : '<span class="badge-bad">stale read</span><span>None of the replicas read had v2<small>The write succeeded, yet this read returned v1. That can only happen when w + r ≤ n.</small></span>';
      } else v = '<span>' + (quorum ? "w + r = " + (W + R) + " &gt; n = " + N + ": every read set overlaps every write set." : "w + r = " + (W + R) + " ≤ n = " + N + ": a read can miss every replica that got the write.") + "</span>";
      root.querySelector(".verdict").innerHTML = v;
      root.querySelector(".tiles").innerHTML =
        '<div class="tile"><div class="t">Chance a read is stale</div><div class="v">' + (stale === 0 ? "0%" : (stale * 100).toFixed(stale < 0.1 ? 1 : 0) + "%") + "</div></div>" +
        '<div class="tile"><div class="t">Writes survive this many down</div><div class="v">' + (N - W) + "</div></div>" +
        '<div class="tile"><div class="t">Reads survive this many down</div><div class="v">' + (N - R) + "</div></div>";
    }
    root.querySelector(".go").addEventListener("click", function () { sync(); var N = +n.value; last = { N: N, W: +w.value, R: +r.value, wrote: pick(N, +w.value), read: pick(N, +r.value) }; draw(); });
    [n, w, r].forEach(function (e) { e.addEventListener("input", function () { last = null; draw(); }); });
    draw();
  }

  document.addEventListener("DOMContentLoaded", function () {
    document.querySelectorAll(".repl-sim").forEach(replSim);
    document.querySelectorAll(".lag-sim").forEach(lagSim);
    document.querySelectorAll(".quorum-sim").forEach(quorumSim);
  });
})();
