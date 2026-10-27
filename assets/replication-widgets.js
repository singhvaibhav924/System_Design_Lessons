/* ==========================================================
   Replication widgets (DDIA Ch. 5)
   <div class="repl-sim"></div>  one leader + two followers: async vs semi-sync writes, lag, leader crash,
                                 failover, and the old leader coming back (fenced or split brain)
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

  document.addEventListener("DOMContentLoaded", function () {
    document.querySelectorAll(".repl-sim").forEach(replSim);
  });
})();
