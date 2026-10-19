/* ==========================================================
   Session simulator — stateful vs stateless web tier
   Usage: <div class="sim-session"></div> + <script src="sim-session.js">
   Optional attributes: data-mode="memory|shared"  data-sticky="true"
   Shows: a load balancer spreading users across servers, where the
   login session lives, and what happens when servers crash / are added.
   ========================================================== */
(function () {
  var css = "\
.sim{font-family:var(--sans);font-size:14px;color:var(--ink)}\
.sim .row{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-bottom:12px}\
.sim .lbl{font-size:12px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:var(--ink-3);margin-right:4px}\
.sim .seg{display:inline-flex;border:1px solid var(--rule);border-radius:8px;overflow:hidden}\
.sim .seg button{border:0;border-right:1px solid var(--rule);background:var(--bg);color:var(--ink-2);padding:7px 11px;font:inherit;cursor:pointer}\
.sim .seg button:last-child{border-right:0}\
.sim .seg button.on{background:var(--accent);color:#fff}\
.sim label.chk{display:inline-flex;gap:6px;align-items:center;cursor:pointer;color:var(--ink-2)}\
.sim label.chk.off{opacity:.4;pointer-events:none}\
.sim .users button,.sim .act{font:inherit;border:1px solid var(--rule);background:var(--surface);color:var(--ink);border-radius:8px;padding:7px 11px;cursor:pointer}\
.sim .users button:hover,.sim .act:hover{border-color:var(--accent)}\
.sim .lb{text-align:center;padding:6px;border:1px dashed var(--ink-3);border-radius:8px;color:var(--ink-2);margin:4px 0 12px}\
.sim .servers{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:8px;margin-bottom:10px}\
.sim .srv{border:1px solid var(--rule);border-radius:10px;padding:9px;background:var(--surface);transition:border-color .2s,background .2s}\
.sim .srv.down{background:var(--red-soft);border-color:var(--red)}\
.sim .srv.hit{border-color:var(--accent);box-shadow:0 0 0 2px var(--accent-soft)}\
.sim .srv h4{margin:0 0 4px;font-size:14px;display:flex;justify-content:space-between;align-items:center}\
.sim .srv .mem{font-size:12px;color:var(--ink-3);min-height:34px}\
.sim .srv .mem b{color:var(--ink-2);font-weight:600}\
.sim .srv button{white-space:nowrap;font:inherit;font-size:11.5px;border:1px solid var(--rule);background:var(--bg);color:var(--ink-2);border-radius:6px;padding:2px 7px;cursor:pointer}\
.sim .store{border:1px solid var(--blue);background:var(--blue-soft);border-radius:10px;padding:9px 12px;font-size:13px;margin-bottom:10px}\
.sim .store.hidden{display:none}\
.sim .stats{font-size:13px;color:var(--ink-3);margin-bottom:6px}\
.sim .stats b{color:var(--ink)}\
.sim .log{list-style:none;padding:0;margin:0;font-size:13.5px;max-height:190px;overflow:auto;border-top:1px solid var(--rule)}\
.sim .log li{padding:6px 0;border-bottom:1px solid var(--rule);margin:0}\
.sim .log .ok{color:var(--green);font-weight:600}\
.sim .log .bad{color:var(--red);font-weight:600}";
  var st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);

  var USERS = ["Asha", "Bilal", "Chen"];

  function init(root) {
    var s = {
      mode: root.getAttribute("data-mode") || "memory",
      sticky: root.getAttribute("data-sticky") === "true",
      servers: [], rr: 0, home: {}, req: 0, lost: 0, log: []
    };
    function reset() {
      s.servers = [1, 2, 3].map(function (n) { return { id: n, up: true, sessions: {} }; });
      USERS.forEach(function (u, i) { s.servers[i].sessions[u] = true; s.home[u] = i + 1; });
      s.rr = 0; s.req = 0; s.lost = 0; s.log = [];
    }
    reset();

    root.className += " sim";
    root.innerHTML =
      '<div class="row"><span class="lbl">Session lives in</span>' +
      '<span class="seg"><button data-m="memory">Each server\'s memory</button><button data-m="shared">Shared store</button></span>' +
      '<label class="chk"><input type="checkbox" class="sticky"> Sticky sessions</label></div>' +
      '<div class="row users"><span class="lbl">Send a request as</span></div>' +
      '<div class="lb">⇅ Load balancer — spreads requests across servers that are up</div>' +
      '<div class="servers"></div>' +
      '<div class="store">🗄 Shared session store (e.g. Redis or a database) — holds the session for: <b>' + USERS.join(", ") + '</b></div>' +
      '<div class="row"><button class="act add">+ Add a server</button><button class="act rst">Reset</button></div>' +
      '<div class="stats"></div><ul class="log"></ul>';

    var usersRow = root.querySelector(".users");
    USERS.forEach(function (u) {
      var b = document.createElement("button"); b.textContent = u; b.type = "button";
      b.addEventListener("click", function () { request(u); });
      usersRow.appendChild(b);
    });
    root.querySelectorAll(".seg button").forEach(function (b) {
      b.type = "button";
      b.addEventListener("click", function () { s.mode = b.getAttribute("data-m"); reset(); render(); });
    });
    var stickyBox = root.querySelector(".sticky");
    stickyBox.checked = s.sticky;
    stickyBox.addEventListener("change", function () { s.sticky = stickyBox.checked; reset(); render(); });
    root.querySelector(".add").addEventListener("click", function () {
      if (s.servers.length >= 6) return;
      var id = s.servers.length + 1;
      s.servers.push({ id: id, up: true, sessions: {} });
      push("info", "Server " + id + " added. " + (s.mode === "shared"
        ? "It can serve anyone straight away — it reads sessions from the shared store."
        : "It starts with an empty memory — it knows nobody."));
      render();
    });
    root.querySelector(".rst").addEventListener("click", function () { reset(); render(); });

    function alive() { return s.servers.filter(function (x) { return x.up; }); }
    function pick(u) {
      var up = alive(); if (!up.length) return null;
      if (s.mode === "memory" && s.sticky) {
        var h = s.servers[s.home[u] - 1];
        if (h && h.up) return h;
      }
      var srv = up[s.rr % up.length]; s.rr++; return srv;
    }
    function push(kind, text) { s.log.unshift({ kind: kind, text: text }); s.log = s.log.slice(0, 30); }

    var lastHit = null;
    function request(u) {
      s.req++;
      var srv = pick(u);
      if (!srv) { s.lost++; push("bad", u + " → no server is up. Site is down."); lastHit = null; render(); return; }
      lastHit = srv.id;
      if (s.mode === "shared") {
        push("ok", u + " → Server " + srv.id + ": fetched " + u + "'s session from the shared store. Logged in.");
      } else if (srv.sessions[u]) {
        push("ok", u + " → Server " + srv.id + ": has " + u + "'s session in memory. Logged in.");
      } else {
        s.lost++;
        var why = s.sticky ? " (" + u + "'s usual server is down, so the load balancer had to send them elsewhere)" : "";
        push("bad", u + " → Server " + srv.id + ": has never seen " + u + ". Logged out!" + why + " They log in again here.");
        // the re-login creates a fresh session on this server, and the old one is gone
        s.servers.forEach(function (x) { delete x.sessions[u]; });
        srv.sessions[u] = true; s.home[u] = srv.id;
      }
      render();
    }

    function render() {
      root.querySelectorAll(".seg button").forEach(function (b) { b.classList.toggle("on", b.getAttribute("data-m") === s.mode); });
      root.querySelector(".chk").classList.toggle("off", s.mode !== "memory");
      root.querySelector(".store").classList.toggle("hidden", s.mode !== "shared");
      var box = root.querySelector(".servers"); box.innerHTML = "";
      s.servers.forEach(function (x) {
        var d = document.createElement("div");
        d.className = "srv" + (x.up ? "" : " down") + (lastHit === x.id ? " hit" : "");
        var mem = s.mode === "shared" ? "No user data kept here" :
          (Object.keys(x.sessions).length ? "Remembers: <b>" + Object.keys(x.sessions).join(", ") + "</b>" : "Remembers: nobody");
        if (!x.up) mem = s.mode === "shared" ? "Crashed — nothing lost" : "Crashed — its memory is gone";
        d.innerHTML = "<h4>Server " + x.id + "</h4><div class='mem'>" + mem + "</div>";
        var b = document.createElement("button"); b.type = "button";
        b.textContent = x.up ? "💥 Crash it" : "↻ Restart";
        b.addEventListener("click", function () {
          x.up = !x.up;
          if (!x.up) {
            var had = Object.keys(x.sessions);
            x.sessions = {};
            push("info", "Server " + x.id + " crashed." + (s.mode === "memory" && had.length ? " Sessions lost: " + had.join(", ") + "." : ""));
          } else push("info", "Server " + x.id + " restarted" + (s.mode === "memory" ? " with an empty memory." : "."));
          lastHit = null; render();
        });
        d.querySelector("h4").appendChild(b);
        box.appendChild(d);
      });
      root.querySelector(".stats").innerHTML = "Requests: <b>" + s.req + "</b> · Users unexpectedly logged out: <b>" + s.lost + "</b>";
      var log = root.querySelector(".log"); log.innerHTML = "";
      if (!s.log.length) { var e = document.createElement("li"); e.textContent = "Click a user's name to send a request."; e.style.color = "var(--ink-3)"; log.appendChild(e); }
      s.log.forEach(function (l) {
        var li = document.createElement("li");
        var tag = l.kind === "ok" ? "<span class='ok'>✓</span> " : l.kind === "bad" ? "<span class='bad'>✗</span> " : "• ";
        li.innerHTML = tag; li.appendChild(document.createTextNode(l.text)); log.appendChild(li);
      });
    }
    render();
  }

  document.addEventListener("DOMContentLoaded", function () {
    document.querySelectorAll(".sim-session").forEach(init);
  });
})();
