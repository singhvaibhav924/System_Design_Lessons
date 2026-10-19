/* ==========================================================
   System Design Course — shared behaviour
   1. Hover terms:  <span class="term" data-tip="...">word</span>
                    add data-later="Phase 3 · Caching" if the topic is taught later
   2. Recall MCQs:  <div class="mcq" data-answer="1"> <p class="q">..</p>
                      <div class="opts"><button>..</button>...</div>
                      <p class="why">..</p></div>
   3. Theme toggle (remembers choice per browser)
   ========================================================== */
(function () {
  // ---------- theme ----------
  try {
    var saved = localStorage.getItem("sd-theme");
    if (saved) document.documentElement.setAttribute("data-theme", saved);
  } catch (e) {}

  document.addEventListener("DOMContentLoaded", function () {
    var btn = document.createElement("button");
    btn.className = "theme-toggle";
    btn.type = "button";
    var label = function () {
      var t = document.documentElement.getAttribute("data-theme");
      var dark = t ? t === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches;
      btn.textContent = dark ? "☀ Light" : "☾ Dark";
      return dark;
    };
    label();
    btn.addEventListener("click", function () {
      var next = label() ? "light" : "dark";
      document.documentElement.setAttribute("data-theme", next);
      try { localStorage.setItem("sd-theme", next); } catch (e) {}
      label();
    });
    document.body.appendChild(btn);

    // ---------- hover terms ----------
    var tip = document.createElement("div");
    tip.className = "tip";
    tip.setAttribute("role", "tooltip");
    document.body.appendChild(tip);

    function show(el) {
      tip.innerHTML = "";
      tip.appendChild(document.createTextNode(el.getAttribute("data-tip") || ""));
      var later = el.getAttribute("data-later");
      if (later) {
        var l = document.createElement("span");
        l.className = "tip-later";
        l.textContent = "⏭ Covered properly later: " + later + ". You're not missing anything yet.";
        tip.appendChild(l);
      }
      var r = el.getBoundingClientRect();
      tip.style.left = "0px"; tip.style.top = "0px";
      tip.classList.add("show");
      var tw = tip.offsetWidth, th = tip.offsetHeight;
      var left = r.left + window.scrollX + r.width / 2 - tw / 2;
      left = Math.max(window.scrollX + 8, Math.min(left, window.scrollX + document.documentElement.clientWidth - tw - 8));
      var top = r.top + window.scrollY - th - 10;
      if (r.top - th - 10 < 0) top = r.bottom + window.scrollY + 10;
      tip.style.left = left + "px";
      tip.style.top = top + "px";
    }
    function hide() { tip.classList.remove("show"); }

    document.querySelectorAll(".term").forEach(function (el) {
      if (el.getAttribute("data-later")) el.classList.add("later");
      el.setAttribute("tabindex", "0");
      el.addEventListener("mouseenter", function () { show(el); });
      el.addEventListener("mouseleave", hide);
      el.addEventListener("focus", function () { show(el); });
      el.addEventListener("blur", hide);
    });
    window.addEventListener("scroll", hide, { passive: true });

    // ---------- recall MCQs ----------
    document.querySelectorAll(".mcq").forEach(function (q) {
      var answer = parseInt(q.getAttribute("data-answer"), 10);
      var buttons = q.querySelectorAll(".opts button");
      buttons.forEach(function (b, i) {
        b.type = "button";
        b.addEventListener("click", function () {
          buttons.forEach(function (x) { x.classList.remove("right", "wrong"); });
          b.classList.add(i === answer ? "right" : "wrong");
          if (i !== answer) buttons[answer].classList.add("right");
          q.classList.add("answered");
        });
      });
    });
  });
})();
