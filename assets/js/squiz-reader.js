/* Squiz Today reader: tap a word or phrase in the Full Transcript to see its
 * Chinese meaning instantly (no network — the data is embedded in the post).
 *
 * Data: <script type="application/json" id="squiz-glossary"> written by
 * squiz_daily_learning.py (build_tap_glossary):
 *   { "w": { word: [ipa, zh, lemma?, lemma_zh?] },
 *     "p": { "phrase key": [display, zh, en] } }
 * The tokenizer below must match _GLOSS_TOKEN_RE / _gloss_key there.
 */
(function () {
  "use strict";

  var dataEl = document.getElementById("squiz-glossary");
  var heading = document.getElementById("full-transcript");
  if (!dataEl || !heading) return;

  var G;
  try {
    G = JSON.parse(dataEl.textContent);
  } catch (e) {
    return;
  }
  var WORDS = G.w || {};
  var PHRASES = G.p || {};
  var TOKEN_RE = /[A-Za-z]+(?:['’][A-Za-z]+)*/g;

  function norm(t) {
    return t.toLowerCase().replace(/’/g, "'");
  }

  // Longest phrases first so "Reserve Bank of Australia" beats "Reserve Bank".
  var phraseList = Object.keys(PHRASES)
    .map(function (k) { return k.split(" "); })
    .sort(function (a, b) { return b.length - a.length; });

  // --- 1. Wrap every word of the transcript paragraphs in a tappable span ---
  // Only <p> between "Full Transcript" and the next <h2>; translations live in
  // <details> and word lists in <ul>, so they are left alone.
  for (var el = heading.nextElementSibling; el && el.tagName !== "H2"; el = el.nextElementSibling) {
    if (el.tagName === "P") wrapWords(el);
  }

  function wrapWords(root) {
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
    var nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(function (node) {
      if (node.parentNode.closest("a")) return;
      var text = node.nodeValue;
      var last = 0;
      var frag = null;
      var m;
      TOKEN_RE.lastIndex = 0;
      while ((m = TOKEN_RE.exec(text))) {
        frag = frag || document.createDocumentFragment();
        if (m.index > last) frag.appendChild(document.createTextNode(text.slice(last, m.index)));
        var s = document.createElement("span");
        s.className = "sq-w";
        s.textContent = m[0];
        frag.appendChild(s);
        last = m.index + m[0].length;
      }
      if (!frag) return;
      if (last < text.length) frag.appendChild(document.createTextNode(text.slice(last)));
      node.parentNode.replaceChild(frag, node);
    });
  }

  // --- 2. Lookup ---
  function findPhrase(span) {
    var toks = Array.prototype.slice.call(span.closest("p").querySelectorAll(".sq-w"));
    var idx = toks.indexOf(span);
    var keys = toks.map(function (t) { return norm(t.textContent); });
    for (var i = 0; i < phraseList.length; i++) {
      var ph = phraseList[i];
      var n = ph.length;
      for (var start = Math.max(0, idx - n + 1); start <= idx && start + n <= keys.length; start++) {
        var ok = true;
        for (var j = 0; j < n; j++) {
          if (keys[start + j] !== ph[j]) { ok = false; break; }
        }
        if (ok) return { key: ph.join(" "), spans: toks.slice(start, start + n) };
      }
    }
    return null;
  }

  function findWord(text) {
    var k = norm(text);
    if (WORDS[k]) return WORDS[k];
    if (/'s$/.test(k) && WORDS[k.slice(0, -2)]) return WORDS[k.slice(0, -2)];
    return null;
  }

  // --- 3. Popup ---
  var pop = document.createElement("div");
  pop.id = "sq-pop";
  pop.setAttribute("role", "dialog");
  pop.hidden = true;
  document.body.appendChild(pop);

  var active = [];
  var activeSpan = null;

  function div(cls, text) {
    var d = document.createElement("div");
    d.className = cls;
    d.textContent = text;
    return d;
  }

  function wordBlock(text) {
    var frag = document.createDocumentFragment();
    var w = findWord(text);
    var head = div("sq-head", text);
    if (w && w[0]) {
      var ipa = document.createElement("span");
      ipa.className = "sq-ipa";
      ipa.textContent = " " + w[0];
      head.appendChild(ipa);
    }
    frag.appendChild(head);
    if (!w) {
      frag.appendChild(div("sq-en", "字典查無此字"));
      return frag;
    }
    frag.appendChild(div("sq-zh", w[1]));
    if (w[2]) frag.appendChild(div("sq-lemma", "原形 " + w[2] + "：" + w[3]));
    return frag;
  }

  function show(span) {
    hide();
    var ph = findPhrase(span);
    if (ph) {
      var p = PHRASES[ph.key];
      pop.appendChild(div("sq-head", p[0]));
      pop.appendChild(div("sq-zh", p[1]));
      if (p[2]) pop.appendChild(div("sq-en", p[2]));
      active = ph.spans;
      // Multi-word phrase: also give the tapped word itself.
      if (ph.spans.length > 1) {
        pop.appendChild(document.createElement("hr"));
        pop.appendChild(wordBlock(span.textContent));
      }
    } else {
      pop.appendChild(wordBlock(span.textContent));
      active = [span];
    }
    active.forEach(function (s) { s.classList.add("sq-on"); });
    activeSpan = span;
    pop.hidden = false;
  }

  function hide() {
    active.forEach(function (s) { s.classList.remove("sq-on"); });
    active = [];
    activeSpan = null;
    pop.hidden = true;
    pop.textContent = "";
  }

  document.addEventListener("click", function (e) {
    var span = e.target.closest && e.target.closest(".sq-w");
    if (span) {
      // Let a drag-selection (copy text) through untouched.
      var sel = window.getSelection && window.getSelection();
      if (sel && !sel.isCollapsed && String(sel).trim().indexOf(" ") !== -1) return;
      if (span === activeSpan) hide();
      else show(span);
      return;
    }
    if (!pop.contains(e.target)) hide();
  });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") hide();
  });
})();
