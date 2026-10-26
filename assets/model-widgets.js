/* ==========================================================
   Data-model widgets (DDIA Ch. 2, DMLS Ch. 3)
   <div class="model-compare"></div>  the same book data as one denormalized table, normalized tables, and documents;
                                      run an operation and see what each model has to touch
   ========================================================== */
(function () {
  var css = "\
.mw{font-family:var(--sans);font-size:14px;color:var(--ink)}\
.mw .ops{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:14px}\
.mw .ops button{font:inherit;font-size:13.5px;border:1px solid var(--rule);background:var(--surface);color:var(--ink);border-radius:8px;padding:6px 11px;cursor:pointer}\
.mw .ops button.on{background:var(--ink);color:var(--bg);border-color:var(--ink)}\
.mw .panes{display:grid;grid-template-columns:1fr;gap:12px}\
.mw .pane{border:1px solid var(--rule);border-radius:10px;background:var(--surface);padding:10px 12px;min-width:0;overflow-x:auto}\
.mw .pane h4{margin:0 0 2px;font-size:13.5px}\
.mw .pane .sub{font-size:12px;color:var(--ink-3);margin:0 0 8px}\
.mw table{width:100%;border-collapse:collapse;font-size:11.5px;margin-bottom:8px}\
.mw th,.mw td{text-align:left;padding:3px 4px;border-bottom:1px solid var(--rule)}\
.mw th{font-weight:600;color:var(--ink-3);font-size:10.5px}\
.mw td{font-family:var(--mono);color:var(--ink-2);white-space:nowrap}\
.mw .tname{font-size:11px;color:var(--ink-3);margin:4px 0 2px;font-family:var(--mono)}\
.mw tr.hit td,.mw .doc.hit{background:color-mix(in srgb,var(--viz-1) 18%,transparent);color:var(--ink)}\
.mw .doc{font-family:var(--mono);font-size:11px;line-height:1.45;border:1px solid var(--rule);border-radius:8px;padding:6px 8px;margin-bottom:6px;color:var(--ink-2);white-space:pre-wrap;overflow-wrap:anywhere}\
.mw .doc.hit{border-color:var(--viz-1)}\
.mw .cost{border-top:1px solid var(--rule);padding-top:8px;font-size:13px;color:var(--ink-2);min-height:48px}\
.mw .cost b{color:var(--ink)}";
  var st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);

  // adapted from DMLS Tables 3-2 to 3-4 and Examples 3-1 to 3-3
  var BOOKS = [
    { t: "Harry Potter", a: "J.K. Rowling", f: "Paperback", p: 1, price: 20 },
    { t: "Harry Potter", a: "J.K. Rowling", f: "E-book", p: 1, price: 10 },
    { t: "Sherlock Holmes", a: "Conan Doyle", f: "Paperback", p: 2, price: 30 },
    { t: "The Hobbit", a: "J.R.R. Tolkien", f: "Paperback", p: 1, price: 30 },
    { t: "Sherlock Holmes", a: "Conan Doyle", f: "E-book", p: 2, price: 15 }
  ];
  var PUBS = { 1: { n: "Banana Press", c: "UK" }, 2: { n: "Guava Press", c: "US" } };
  var TITLES = ["Harry Potter", "Sherlock Holmes", "The Hobbit"];

  var OPS = [
    { k: "rename", label: "Rename Banana Press → Pineapple Press",
      hit: { flat: function (b) { return b.p === 1; }, normB: function () { return false; }, normP: function (id) { return id === "1"; }, doc: function (t) { return t !== "Sherlock Holmes"; } },
      cost: ["<b>3 rows</b> rewritten. Miss one and the data now disagrees with itself.", "<b>1 row</b> in <code>publisher</code>. Every book points to it by ID, so nothing else changes.", "<b>2 whole documents</b> rewritten, because the publisher name is copied into each."] },
    { k: "load", label: "Show everything about Harry Potter",
      hit: { flat: function (b) { return b.t === "Harry Potter"; }, normB: function (b) { return b.t === "Harry Potter"; }, normP: function (id) { return id === "1"; }, doc: function (t) { return t === "Harry Potter"; } },
      cost: ["<b>2 rows</b> from one table. Easy, because everything was copied in.", "<b>2 rows + a join</b> to <code>publisher</code>. Two places to read.", "<b>1 document</b>, one read. This is the locality advantage."] },
    { k: "cheap", label: "Find every format priced under $25",
      hit: { flat: function (b) { return b.price < 25; }, normB: function (b) { return b.price < 25; }, normP: function () { return false; }, doc: function () { return true; } },
      cost: ["Filter one column (an index on <code>price</code> would make it a lookup).", "Filter one column of <code>book</code>. No join needed.", "<b>Open every document</b> and look inside each <code>sold_as</code> list. DMLS's example of the document model's weak spot."] },
    { k: "field", label: "Start storing an ISBN for new books",
      hit: { flat: function () { return false; }, normB: function () { return false; }, normP: function () { return false; }, doc: function () { return false; } },
      cost: ["<code>ALTER TABLE … ADD COLUMN isbn</code> first (<em>schema-on-write</em>). Old rows get NULL.", "Same: a migration on <code>book</code>, then old rows are NULL.", "Just write new documents with an <code>isbn</code> field (<em>schema-on-read</em>). Every reader must now handle documents without one."] }
  ];

  function modelCompare(root) {
    root.classList.add("mw");
    root.innerHTML = '<div class="ops">' + OPS.map(function (o, i) { return '<button data-i="' + i + '">' + o.label + "</button>"; }).join("") + "</div>" +
      '<div class="panes"><div class="pane p0"></div><div class="pane p1"></div><div class="pane p2"></div></div>';
    var cur = 0;
    root.querySelectorAll(".ops button").forEach(function (b) { b.addEventListener("click", function () { cur = +b.getAttribute("data-i"); draw(); }); });
    function draw() {
      var o = OPS[cur];
      root.querySelectorAll(".ops button").forEach(function (b) { b.classList.toggle("on", +b.getAttribute("data-i") === cur); });
      var renamed = o.k === "rename";
      var pn = function (id) { return id === 1 && renamed ? "Pineapple Press" : PUBS[id].n; };
      // 1. one denormalized table
      var t1 = "<table><thead><tr><th>title</th><th>format</th><th>publisher</th><th>country</th><th>price</th></tr></thead><tbody>" +
        BOOKS.map(function (b) { return '<tr class="' + (o.hit.flat(b) ? "hit" : "") + '"><td>' + b.t + "</td><td>" + b.f + "</td><td>" + pn(b.p) + "</td><td>" + PUBS[b.p].c + "</td><td>$" + b.price + "</td></tr>"; }).join("") + "</tbody></table>";
      root.querySelector(".p0").innerHTML = "<h4>One table (denormalized)</h4><p class=\"sub\">Publisher name and country copied into every row</p>" + t1 + '<div class="cost">' + o.cost[0] + "</div>";
      // 2. normalized
      var t2 = '<div class="tname">book</div><table><thead><tr><th>title</th><th>format</th><th>publisher_id</th><th>price</th></tr></thead><tbody>' +
        BOOKS.map(function (b) { return '<tr class="' + (o.hit.normB(b) ? "hit" : "") + '"><td>' + b.t + "</td><td>" + b.f + "</td><td>" + b.p + "</td><td>$" + b.price + "</td></tr>"; }).join("") + "</tbody></table>" +
        '<div class="tname">publisher</div><table><thead><tr><th>id</th><th>name</th><th>country</th></tr></thead><tbody>' +
        Object.keys(PUBS).map(function (id) { return '<tr class="' + (o.hit.normP(id) ? "hit" : "") + '"><td>' + id + "</td><td>" + pn(+id) + "</td><td>" + PUBS[id].c + "</td></tr>"; }).join("") + "</tbody></table>";
      root.querySelector(".p1").innerHTML = "<h4>Normalized tables (relational)</h4><p class=\"sub\">Publisher stored once, referenced by ID</p>" + t2 + '<div class="cost">' + o.cost[1] + "</div>";
      // 3. documents
      var t3 = TITLES.map(function (t) {
        var bs = BOOKS.filter(function (b) { return b.t === t; }), p = bs[0].p;
        var txt = '{ "title": "' + t + '",\n  "publisher": "' + pn(p) + '", "country": "' + PUBS[p].c + '",\n  "sold_as": [' + bs.map(function (b) { return '{"' + b.f + '": "$' + b.price + '"}'; }).join(", ") + "] }";
        return '<div class="doc' + (o.hit.doc(t) ? " hit" : "") + '">' + txt.replace(/</g, "&lt;") + "</div>";
      }).join("");
      root.querySelector(".p2").innerHTML = "<h4>Documents (JSON)</h4><p class=\"sub\">One self-contained document per book</p>" + t3 + '<div class="cost">' + o.cost[2] + "</div>";
    }
    draw();
  }

  document.addEventListener("DOMContentLoaded", function () {
    document.querySelectorAll(".model-compare").forEach(modelCompare);
  });
})();
