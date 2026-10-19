/* ==========================================================
   Availability widgets
   <div class="nines-calc"></div>      availability % -> allowed downtime / failed requests
   <div class="composite-calc"></div>  chain of services x replicas -> overall availability
   Year = 365 days, month = 30 days (same convention as the Google SRE book).
   ========================================================== */
(function () {
  var css = "\
.aw{font-family:var(--sans);font-size:14px;color:var(--ink)}\
.aw .ctrl{display:flex;flex-wrap:wrap;gap:10px 22px;align-items:center;margin-bottom:14px}\
.aw .ctrl label{display:flex;gap:8px;align-items:center;color:var(--ink-2)}\
.aw .chips{display:flex;flex-wrap:wrap;gap:6px}\
.aw .chips button{font:inherit;font-family:var(--mono);font-size:13px;border:1px solid var(--rule);background:var(--bg);color:var(--ink-2);border-radius:999px;padding:5px 11px;cursor:pointer}\
.aw .chips button.on{background:var(--ink);color:var(--bg);border-color:var(--ink)}\
.aw select,.aw input[type=number]{font:inherit;font-family:var(--mono);font-size:13px;padding:5px 8px;border:1px solid var(--rule);border-radius:6px;background:var(--bg);color:var(--ink)}\
.aw input[type=checkbox]{accent-color:var(--viz-1)}\
.aw .tiles{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:10px;margin-bottom:10px}\
.aw .tile{border:1px solid var(--rule);border-radius:10px;padding:10px 12px;background:var(--bg)}\
.aw .tile .k{font-size:11.5px;letter-spacing:.08em;text-transform:uppercase;color:var(--ink-3);display:block;margin-bottom:2px}\
.aw .tile .v{font-family:var(--mono);font-size:19px}\
.aw .note{font-size:13.5px;color:var(--ink-2)}\
.aw .chain{display:flex;flex-wrap:wrap;align-items:center;gap:6px;margin:6px 0 14px}\
.aw .tier{display:flex;flex-direction:column;gap:4px;align-items:center}\
.aw .box{border:1.5px solid var(--viz-1);border-radius:7px;padding:4px 8px;font-size:12px;font-family:var(--mono);background:var(--surface);min-width:62px;text-align:center}\
.aw .tier .tlab{font-size:11px;color:var(--ink-3)}\
.aw .arrow{color:var(--ink-3);font-size:16px}\
.aw .hero{font-size:30px;font-weight:600;line-height:1.15}\
.aw .hero small{display:block;font-size:13.5px;font-weight:400;color:var(--ink-3);margin-top:4px}";
  var st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);

  function fmtDur(sec) {
    if (sec >= 86400 * 2) return (sec / 86400).toFixed(2) + " days";
    if (sec >= 3600) return (sec / 3600).toFixed(2) + " hours";
    if (sec >= 60) return (sec / 60).toFixed(sec >= 600 ? 1 : 2) + " min";
    if (sec >= 1) return sec.toFixed(1) + " s";
    return Math.round(sec * 1000) + " ms";
  }
  function fmtPct(a) {
    var p = a * 100;
    if (p >= 99.99999) return "≈ 100%";
    var s = p.toFixed(6).replace(/0+$/, "").replace(/\.$/, "");
    // keep 2 significant digits after the leading nines
    var m = s.match(/^(\d+)\.(9*)(\d{0,2})/);
    return (m ? m[1] + "." + m[2] + m[3] : s).replace(/\.$/, "") + "%";
  }
  var YEAR = 365 * 86400, MONTH = 30 * 86400, WEEK = 7 * 86400, DAY = 86400;

  /* ---------- nines calculator ---------- */
  function ninesCalc(root) {
    root.classList.add("aw");
    var presets = [99, 99.5, 99.9, 99.95, 99.99, 99.999, 99.9999];
    root.innerHTML = '<div class="ctrl"><span class="chips"></span><label>or type: <input type="number" step="0.001" min="50" max="99.99999" value="99.9" style="width:110px"> %</label></div>' +
      '<div class="tiles"></div><p class="note"></p>';
    var chips = root.querySelector(".chips"), inp = root.querySelector("input");
    presets.forEach(function (p) {
      var b = document.createElement("button"); b.type = "button"; b.textContent = p + "%";
      b.addEventListener("click", function () { inp.value = p; draw(); });
      chips.appendChild(b);
    });
    inp.addEventListener("input", draw);
    function draw() {
      var a = Math.min(99.99999, Math.max(50, parseFloat(inp.value) || 99.9));
      chips.querySelectorAll("button").forEach(function (b) { b.classList.toggle("on", parseFloat(b.textContent) === a); });
      var down = 1 - a / 100;
      root.querySelector(".tiles").innerHTML = [["Per year", YEAR], ["Per month", MONTH], ["Per week", WEEK], ["Per day", DAY]].map(function (t) {
        return '<div class="tile"><span class="k">Down ' + t[0].toLowerCase() + '</span><span class="v">' + fmtDur(down * t[1]) + '</span></div>';
      }).join("");
      var failed = Math.round(down * 10000000);
      root.querySelector(".note").innerHTML = "Same target counted by requests instead of time: at 10 million requests a month, " +
        a + "% allows <b>" + failed.toLocaleString() + "</b> failed requests that month.";
    }
    draw();
  }

  /* ---------- composite (series / parallel) calculator ---------- */
  function compositeCalc(root) {
    root.classList.add("aw");
    root.innerHTML = '<div class="ctrl">' +
      '<label>Services in the chain <select class="n">' + [1, 2, 3, 4, 5, 6, 8, 10].map(function (n) { return "<option" + (n === 4 ? " selected" : "") + ">" + n + "</option>"; }).join("") + '</select></label>' +
      '<label>Each copy is up <select class="a">' + ["99", "99.5", "99.9", "99.95", "99.99"].map(function (n) { return "<option" + (n === "99.9" ? " selected" : "") + ">" + n + "</option>"; }).join("") + '</select> %</label>' +
      '<label>Copies of each service <select class="k"><option>1</option><option selected>2</option><option>3</option></select></label>' +
      '<label><input type="checkbox" class="ind" checked> Copies fail independently</label></div>' +
      '<div class="chain"></div><div class="hero"></div>';
    root.querySelectorAll("select,input").forEach(function (e) { e.addEventListener("change", draw); });
    function draw() {
      var n = +root.querySelector(".n").value, a = parseFloat(root.querySelector(".a").value) / 100,
          k = +root.querySelector(".k").value, ind = root.querySelector(".ind").checked;
      var tier = ind ? 1 - Math.pow(1 - a, k) : a;      // correlated: copies all fail together
      var total = Math.pow(tier, n);
      var chain = root.querySelector(".chain"); chain.innerHTML = "";
      var names = ["Gateway", "API", "Auth", "Features", "Model", "DB", "Cache", "Search", "Billing", "Queue"];
      for (var i = 0; i < n; i++) {
        if (i) { var ar = document.createElement("span"); ar.className = "arrow"; ar.textContent = "→"; chain.appendChild(ar); }
        var t = document.createElement("div"); t.className = "tier";
        for (var j = 0; j < k; j++) { var b = document.createElement("div"); b.className = "box"; b.textContent = names[i] + (k > 1 ? " " + (j + 1) : ""); t.appendChild(b); }
        var l = document.createElement("span"); l.className = "tlab"; l.textContent = fmtPct(tier); t.appendChild(l);
        chain.appendChild(t);
      }
      var how = (k > 1 ? (ind ? "Each service = 1 − (1 − " + root.querySelector(".a").value + "%)" + "<sup>" + k + "</sup> = " + fmtPct(tier) + " because any copy can serve. "
                              : "Copies fail together (same bug, same rack), so extra copies add nothing. ") : "") +
                "Whole chain = " + fmtPct(tier) + "<sup>" + n + "</sup> because every service must work.";
      root.querySelector(".hero").innerHTML = "Whole system: " + fmtPct(total) +
        "<small>≈ " + fmtDur((1 - total) * YEAR) + " of downtime per year. " + how + "</small>";
    }
    draw();
  }

  document.addEventListener("DOMContentLoaded", function () {
    document.querySelectorAll(".nines-calc").forEach(ninesCalc);
    document.querySelectorAll(".composite-calc").forEach(compositeCalc);
  });
})();
