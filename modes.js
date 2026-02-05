// modes.js (UPDATED) — tri-toggle stays: left=erase JOEL, mid=normal, right=erase CLEMENTINE
(() => {
  console.log("[modes] loaded");

  const toggle = document.getElementById("modeToggle");
  if (!toggle) return;

  // Match names in headings/stage/menu etc (case + possessive variants)
  const CLEM_RE = /CLEMENTINE(?:'S|’S)?|Clementine(?:'s|’s)?|\bCLEM\b|\bClem\b/g;
  const JOEL_RE = /JOEL(?:'S|’S)?|Joel(?:'s|’s)?/g;

  function eraseTargets() {
    const out = [];
    out.push(...document.querySelectorAll(".unit-heading, .unit-stage"));
    const tlScene = document.getElementById("tlScene");
    if (tlScene) out.push(tlScene);
    out.push(...document.querySelectorAll("#tlSceneMenu button"));
    return out;
  }

  function wrapMatchesInTextNode(textNode, re, className) {
    const text = textNode.nodeValue;
    if (!text) return;

    re.lastIndex = 0;
    if (!re.test(text)) return;
    re.lastIndex = 0;

    const frag = document.createDocumentFragment();
    let last = 0;
    let m;

    while ((m = re.exec(text)) !== null) {
      const start = m.index;
      const end = start + m[0].length;

      if (start > last) frag.appendChild(document.createTextNode(text.slice(last, start)));

      const span = document.createElement("span");
      span.className = className; // clem-ghost / joel-ghost
      span.textContent = text.slice(start, end);
      frag.appendChild(span);

      last = end;
    }

    if (last < text.length) frag.appendChild(document.createTextNode(text.slice(last)));

    textNode.parentNode.replaceChild(frag, textNode);
  }

  function processElement(el) {
    if (!el) return;

    // don't touch script/style/inputs
    const tag = el.tagName;
    if (tag === "SCRIPT" || tag === "STYLE" || tag === "INPUT" || tag === "TEXTAREA") return;

    // prevent double-processing for each name separately
    const doneClem = el.dataset.clemProcessed === "1";
    const doneJoel = el.dataset.joelProcessed === "1";
    if (doneClem && doneJoel) return;

    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        if (!node.nodeValue) return NodeFilter.FILTER_REJECT;
        const p = node.parentElement;
        if (p && p.classList) {
          if (p.classList.contains("clem-ghost")) return NodeFilter.FILTER_REJECT;
          if (p.classList.contains("joel-ghost")) return NodeFilter.FILTER_REJECT;
        }
        return NodeFilter.FILTER_ACCEPT;
      }
    });

    const nodes = [];
    let n;
    while ((n = walker.nextNode())) nodes.push(n);

    // Wrap Joel first, then Clem (order not critical, but consistent)
    if (!doneJoel) {
      for (const tn of nodes) wrapMatchesInTextNode(tn, JOEL_RE, "joel-ghost");
      el.dataset.joelProcessed = "1";
    }

    // TreeWalker nodes were replaced; re-collect for Clem pass if needed
    if (!doneClem) {
      const walker2 = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, {
        acceptNode(node) {
          if (!node.nodeValue) return NodeFilter.FILTER_REJECT;
          const p = node.parentElement;
          if (p && p.classList) {
            if (p.classList.contains("clem-ghost")) return NodeFilter.FILTER_REJECT;
            if (p.classList.contains("joel-ghost")) return NodeFilter.FILTER_REJECT;
          }
          return NodeFilter.FILTER_ACCEPT;
        }
      });

      const nodes2 = [];
      let n2;
      while ((n2 = walker2.nextNode())) nodes2.push(n2);

      for (const tn of nodes2) wrapMatchesInTextNode(tn, CLEM_RE, "clem-ghost");
      el.dataset.clemProcessed = "1";
    }
  }

  function ensureWrappedOnce() {
    for (const el of eraseTargets()) processElement(el);
  }

  function applyMode(val) {
    document.body.classList.remove("mode-left", "mode-mid", "mode-right", "erase-clem", "erase-joel");

    if (val === 0) {
      // LEFT = erase JOEL
      ensureWrappedOnce();
      document.body.classList.add("mode-left", "erase-joel");
      return;
    }

    if (val === 2) {
      // RIGHT = erase CLEMENTINE (same as before, just renamed class)
      ensureWrappedOnce();
      document.body.classList.add("mode-right", "erase-clem");
      return;
    }

    // MID = normal
    document.body.classList.add("mode-mid");
  }

  // init
  const initVal = Number(toggle.value);
  applyMode(Number.isFinite(initVal) ? initVal : 1);

  toggle.addEventListener("input", () => {
    applyMode(Number(toggle.value));
  });

  // After cues/scenes load
  document.addEventListener("cues:ready", () => {
    ensureWrappedOnce();
  });

  // If scene menu is built dynamically
  const menu = document.getElementById("tlSceneMenu");
  if (menu) {
    const obs = new MutationObserver(() => ensureWrappedOnce());
    obs.observe(menu, { childList: true, subtree: true });
  }
})();

// fade hero + mode names רק אחרי קצת גלילה
(function () {
  const SCROLL_THRESHOLD = 50; // כמה פיקסלים צריך לגלול לפני שהטקסטים נעלמים

  function onScroll() {
    if (window.scrollY > SCROLL_THRESHOLD) {
      document.body.classList.add("scrolled");
    } else {
      document.body.classList.remove("scrolled");
    }
  }

  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll(); // בדיקה ראשונית
})();

