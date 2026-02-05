// creditsOverlay.js — MANUAL SCROLL (NO AUTO ROLL)
// Fix: robustly detect the real scroll container under the pointer/touch,
// so scrolling UP inside credits works (and only closes when at TOP).

(() => {
  const GATE_ID    = "creditsGate";
  const LAYER_ID   = "creditsLayer";
  const CREDITS_ID = "credits"; // <div id="credits">

  const LIFT_PIXELS = 1600;

  const clamp01 = (x) => Math.max(0, Math.min(1, x));

  let gate, layer, creditsRoot;

  let lockY = 0;
  let maxScrollY = 0;
  let armed = false;
  let progress = 0;

  let rafPending = false;

  // Touch
  let lastTouchY = null;

  function getMaxScrollY() {
    const doc = document.documentElement;
    return Math.max(0, doc.scrollHeight - window.innerHeight);
  }

  function recalcLock() {
    if (!gate) return;

    const rect = gate.getBoundingClientRect();
    const pageY = window.scrollY || window.pageYOffset;
    const gateY = pageY + rect.top;

    maxScrollY = getMaxScrollY();
    lockY = Math.min(gateY, maxScrollY);
  }

  function lockPageAtGate() {
    window.scrollTo(0, lockY);
  }

  function setBodyState() {
    if (progress > 0) document.body.classList.add("credits-open");
    else document.body.classList.remove("credits-open");

    if (progress >= 1) document.body.classList.add("credits-done");
    else document.body.classList.remove("credits-done");
  }

  function render() {
    const translate = (1 - progress) * 100;
    layer.style.transform = `translateY(${translate}%)`;
    setBodyState();
    rafPending = false;
  }

  function requestRender() {
    if (rafPending) return;
    rafPending = true;
    requestAnimationFrame(render);
  }

  function maybeArm() {
    const y = window.scrollY || window.pageYOffset;
    if (y >= lockY - 2) armed = true;
    if (y < lockY - 4 && progress <= 0) armed = false;
  }

  function clampScrollToLock() {
    const y = window.scrollY || window.pageYOffset;
    if (armed && y > lockY) lockPageAtGate();
  }

  function applyDeltaToProgress(deltaY) {
    const dp = deltaY / LIFT_PIXELS;
    progress = clamp01(progress + dp);
    requestRender();
  }

  function isInsideCreditsUI(target) {
    return !!(target && target.closest && target.closest(`#${LAYER_ID}`));
  }

  // ---------
  // SCROLLER DETECTION (ROBUST)
  // ---------

  function canScroll(el) {
    if (!el) return false;
    // must be able to scroll content
    return (el.scrollHeight - el.clientHeight) > 2;
  }

  function isScrollableByCSS(el) {
    if (!el) return false;
    const st = getComputedStyle(el);
    const oy = st.overflowY;
    return (oy === "auto" || oy === "scroll");
  }

  // Find the nearest real scroll container starting from target upwards,
  // limited inside the credits layer.
  function findScrollerFromTarget(target) {
    if (!layer) return null;

    let el = target;

    while (el && el !== document.body) {
      // stop if we climbed outside the overlay
      if (el === layer || (el.id === LAYER_ID)) {
        // layer itself could be the scroller
        if (isScrollableByCSS(el) && canScroll(el)) return el;
        break;
      }

      // if inside overlay, pick first scrollable ancestor
      if (isInsideCreditsUI(el)) {
        if (isScrollableByCSS(el) && canScroll(el)) return el;
      }

      el = el.parentElement;
    }

    // fallback order: creditsRoot if it can scroll, else layer
    if (creditsRoot && isScrollableByCSS(creditsRoot) && canScroll(creditsRoot)) return creditsRoot;
    if (layer && isScrollableByCSS(layer) && canScroll(layer)) return layer;

    // last resort: creditsRoot (even if not scrollable yet)
    return creditsRoot || layer;
  }

  function scrollerAtTop(scroller) {
    if (!scroller) return true;
    return scroller.scrollTop <= 0;
  }

  // Fully open behavior:
  // - allow native scroll inside the real scroller
  // - if user scrolls UP while scroller is already at TOP -> close overlay
  function handleFullyOpenWheel(e) {
    // If the wheel is not inside overlay, keep page locked.
    if (!isInsideCreditsUI(e.target)) {
      e.preventDefault();
      lockPageAtGate();
      return true;
    }

    const dy = e.deltaY;

    // down: allow native scrolling inside overlay
    if (dy > 0) return false;

    // up: allow native scroll if scroller can go up
    const scroller = findScrollerFromTarget(e.target);
    if (!scrollerAtTop(scroller)) return false;

    // at top and scrolling up -> close overlay instead of doing nothing
    e.preventDefault();
    lockPageAtGate();
    applyDeltaToProgress(dy); // negative -> closes
    return true;
  }

  function onScroll() {
    maybeArm();
    clampScrollToLock();
  }

  function onWheel(e) {
    maybeArm();
    if (!armed) return;

    // if fully open, let credits scroll naturally (unless we need to close)
    if (progress >= 1) {
      const intercepted = handleFullyOpenWheel(e);
      if (intercepted && progress <= 0) armed = false;
      return;
    }

    // not fully open yet: capture to lift/lower
    const dy = e.deltaY;

    if (progress > 0 || dy > 0) {
      e.preventDefault();
      lockPageAtGate();
      applyDeltaToProgress(dy);

      // if user scrolls up while closing back to 0, release lock
      if (progress <= 0 && dy < 0) {
        armed = false;
        window.scrollBy(0, dy);
      }
    }
  }

  function onTouchStart(e) {
    if (!e.touches || !e.touches[0]) return;
    lastTouchY = e.touches[0].clientY;
  }

  function onTouchMove(e) {
    maybeArm();
    if (!armed) return;
    if (!e.touches || !e.touches[0]) return;

    const cur = e.touches[0].clientY;
    const dy = (lastTouchY - cur); // positive = swipe up (content goes down)
    lastTouchY = cur;

    if (progress >= 1) {
      // If touch move not inside overlay, keep page locked.
      if (!isInsideCreditsUI(e.target)) {
        e.preventDefault();
        lockPageAtGate();
        return;
      }

      // dy > 0 means user is swiping up (scrolling down) -> allow native scroll
      if (dy > 0) return;

      // dy < 0 means user swiping down (scrolling up)
      const scroller = findScrollerFromTarget(e.target);

      // if not at top, allow native scroll up inside credits
      if (!scrollerAtTop(scroller)) return;

      // at top and swiping down -> close overlay
      e.preventDefault();
      lockPageAtGate();
      applyDeltaToProgress(dy); // negative -> closes
      if (progress <= 0) armed = false;
      return;
    }

    if (progress > 0 || dy > 0) {
      e.preventDefault();
      lockPageAtGate();
      applyDeltaToProgress(dy);

      if (progress <= 0 && dy < 0) {
        armed = false;
        window.scrollBy(0, -dy);
      }
    }
  }

  function onResize() {
    recalcLock();
    clampScrollToLock();
    requestRender();
  }

  window.initCreditsOverlay = function initCreditsOverlay() {
    gate = document.getElementById(GATE_ID);
    layer = document.getElementById(LAYER_ID);
    creditsRoot = document.getElementById(CREDITS_ID);

    if (!gate || !layer || !creditsRoot) {
      console.warn("[creditsOverlay] missing gate/layer/credits", {
        gate: !!gate, layer: !!layer, credits: !!creditsRoot
      });
      return;
    }

    progress = 0;
    armed = false;

    recalcLock();
    requestRender();
  };

  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("wheel", onWheel, { passive: false });
  window.addEventListener("touchstart", onTouchStart, { passive: true });
  window.addEventListener("touchmove", onTouchMove, { passive: false });
  window.addEventListener("resize", onResize);

  window.addEventListener("DOMContentLoaded", () => {
    window.initCreditsOverlay();
  });

  // Keep this hook — after cues/layout is ready, re-lock positions.
  document.addEventListener("cues:ready", () => {
    requestAnimationFrame(() => {
      recalcLock();
      requestRender();
      clampScrollToLock();
    });
  });
})();
