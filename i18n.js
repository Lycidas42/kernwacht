// Kernwacht – Übersetzung. Deutsch ist die Quellsprache im Code; für Englisch werden Texte
// beim Anzeigen ersetzt: Zahlen werden zu Platzhaltern (#0, #1 …), der Rest wird im Wörterbuch
// (i18n-en.js, window.KW_EN) nachgeschlagen. Neue Texte im DOM übersetzt ein MutationObserver,
// Canvas-Texte laufen über KWI18n.T().
(function (root) {
  'use strict';
  const KEY = 'kernwacht.lang';
  let lang = 'de';
  try { lang = localStorage.getItem(KEY) || 'de'; } catch (e) {}
  const DICT = root.KW_EN || {};
  const miss = root.__kwMiss = new Map();
  const SUF = '(?:K|M|B|T|Qa|Qu|Sx|Sp|Oc|No|Dc|Ud|Dd|Td)';
  const NUM = new RegExp('[+\\-−]?\\d+(?:[.,]\\d+)*(?:e[+\\-]?\\d+)?(?:\\s' + SUF + '(?![\\wÄÖÜäöüß]))?', 'g');
  const LETTER = /[A-Za-zÄÖÜäöüß]/;
  const SEP = /(\s·\s|:\s|,\s|\s–\s|\s\/\s|\s→\s|\. )/;
  const en = () => lang === 'en';
  const numEn = s => s.replace(/(\d),(\d)/g, '$1.$2');

  // Wörterbuch: Schlüssel ohne {n} werden exakt verglichen, Schlüssel mit {0}, {1} … sind Muster;
  // was ein Platzhalter einfängt (Zahl oder Wort), wird selbst wieder übersetzt.
  const esc = s => s.replace(/[.*+?^$()|[\]\\]/g, '\\$&');
  let PAT = null;
  function compile() {
    PAT = [];
    for (const k in DICT) {
      if (!/\{\d+\}/.test(k)) continue;
      const order = []; const src = esc(k).replace(/\\?\{(\d+)\\?\}/g, (_, i) => { order.push(+i); return '([\\s\\S]+?)'; });
      PAT.push({ re: new RegExp('^' + src + '$'), rei: new RegExp('^' + src + '$', 'i'), order, v: DICT[k], lit: k.replace(/\{\d+\}/g, '').length });
    }
    PAT.sort((a, b) => b.lit - a.lit);
  }
  const cache = new Map();
  let depth = 0;
  function look(t) {
    if (DICT[t] != null) return DICT[t];
    const upper = t.length > 1 && t === t.toUpperCase() && /[A-ZÄÖÜ]/.test(t);
    if (upper) for (const k in DICT) if (k.toUpperCase() === t) return DICT[k].toUpperCase();
    if (!PAT) compile();
    if (depth > 3) return null;
    for (const p of PAT) {
      const m = (upper ? p.rei : p.re).exec(t); if (!m) continue;
      const vals = {}; p.order.forEach((i, j) => (vals[i] = m[j + 1]));
      depth++;
      let out;
      try { out = p.v.replace(/\{(\d+)\}/g, (_, i) => vals[i] == null ? '' : tr(vals[i])); } finally { depth--; }
      return upper ? out.toUpperCase() : out;
    }
    return null;
  }
  function tr(s) {
    if (!en() || s == null) return s;
    const str = String(s);
    if (cache.has(str)) return cache.get(str);
    const m = str.match(/^(\s*)([\s\S]*?)(\s*)$/), t = m[2];
    if (!t) return str;
    let r;
    // nur Zahlen/Zeichen: Dezimalkomma → Punkt
    if (!LETTER.test(t.replace(NUM, ''))) r = numEn(t);
    else {
      r = look(t);
      if (r == null) {
        // zusammengesetzte Texte stückweise übersetzen (an Trennern wie " · " oder ": ")
        const parts = t.split(SEP); let hit = false;
        if (parts.length > 1) {
          for (let i = 0; i < parts.length; i += 2) { const p = parts[i]; if (!p || !LETTER.test(p.replace(NUM, ''))) { parts[i] = numEn(p); continue; } const x = look(p.trim()); if (x != null) { parts[i] = p.replace(p.trim(), x); hit = true; } else note(p.trim()); }
          if (hit) r = parts.join('');
        }
        if (r == null) { note(t); r = numEn(t); }
      }
    }
    const out = m[1] + r + m[3];
    if (cache.size > 4000) cache.clear();
    if (!depth) cache.set(str, out);
    return out;
  }
  function note(t) {
    if (!t || !LETTER.test(t.replace(NUM, ''))) return;
    const key = t.replace(NUM, () => '#');
    if (!miss.has(key)) miss.set(key, t);
  }

  // ---------- DOM ----------
  const ATTRS = ['title', 'aria-label', 'placeholder'];
  const done = new WeakMap(); // Textknoten → zuletzt gesetzter (übersetzter) Text
  const SKIP = { SCRIPT: 1, STYLE: 1, TEXTAREA: 1, NOSCRIPT: 1 };
  function doText(n) {
    if (n.parentNode && SKIP[n.parentNode.nodeName]) return;
    if (done.get(n) === n.data) return;
    const r = tr(n.data); done.set(n, r);
    if (r !== n.data) n.data = r;
  }
  function doEl(el) {
    if (el.nodeType !== 1 || SKIP[el.nodeName]) return;
    for (const a of ATTRS) if (el.hasAttribute(a)) { const v = el.getAttribute(a), r = tr(v); if (r !== v) el.setAttribute(a, r); }
    if (el.nodeName === 'INPUT' && (el.type === 'button' || el.type === 'submit')) { const r = tr(el.value); if (r !== el.value) el.value = r; }
  }
  function walk(node) {
    if (node.nodeType === 3) return doText(node);
    if (node.nodeType !== 1 || SKIP[node.nodeName]) return;
    doEl(node);
    const w = document.createTreeWalker(node, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
    let n; while ((n = w.nextNode())) n.nodeType === 3 ? doText(n) : doEl(n);
  }
  function start() {
    if (!en()) return;
    document.documentElement.lang = 'en';
    walk(document.body);
    new MutationObserver(list => {
      for (const m of list) {
        if (m.type === 'characterData') doText(m.target);
        else if (m.type === 'attributes') doEl(m.target);
        else m.addedNodes.forEach(walk);
      }
    }).observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ATTRS });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();

  function setLang(l) { try { localStorage.setItem(KEY, l); } catch (e) {} }
  root.KWI18n = { T: tr, get lang() { return lang; }, setLang, missing: () => [...miss.keys()] };
})(window);
