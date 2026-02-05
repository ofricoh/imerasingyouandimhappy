window.addEventListener("DOMContentLoaded", () => {
  const hero     = document.getElementById("hero");
  const stack    = document.getElementById("memStack");
  const divider  = document.getElementById("memDivider");
  const labelEl  = document.getElementById("memLabel");

  if (!hero || !stack || !divider || !labelEl) {
    console.warn("[heroMemories] missing required elements (#hero/#memStack/#memDivider/#memLabel)");
    return;
  }

  // =========================
  // CONFIG
  // =========================
  const INTRO = [
    { id: 11,  src: "video/11_eternalsunshine.mp4",  label: "[011]" },
    { id: 129, src: "video/129_eternalsunshine.mp4", label: "[129]" },
    { id: 168, src: "video/168_eternalsunshine.mp4", label: "[168]" },
    { id: 65,  src: "video/65_eternalsunshine.mp4",  label: "[065]" },
    { id: 161, src: "video/161_eternalsunshine.mp4", label: "[161]" },
  ];

  // how many pixels to complete one wipe
  const STEP_PX = 900;          // bigger = slower wipe
  const FIRST_START_CUT = 0.50; // first clip starts half visible
  const CLOSE_EXTRA_PX = 160;   // after last wipe, little extra scroll then close
  const DIVIDER_H = 4;          // must match CSS .mem-divider height

  // =========================
  // BUILD STACK
  // =========================
  stack.innerHTML = "";

  const vids = INTRO.map((item, idx) => {
    const v = document.createElement("video");
    v.src = item.src;
    v.muted = true;
    v.playsInline = true;
    v.loop = true;
    v.preload = "metadata";
    v.setAttribute("playsinline", "");
    v.setAttribute("muted", "");

    // top-most is index 0 => highest z
    v.style.zIndex = String(1000 - idx);

    // start fully visible; we will clip via render()
    v.style.clipPath = "inset(0% 0% 0% 0%)";

    stack.appendChild(v);
    return v;
  });

  function playSafe(v) {
    if (!v) return;
    const p = v.play();
    if (p && typeof p.catch === "function") p.catch(() => {});
  }

  // play first two (smooth)
  playSafe(vids[0]);
  playSafe(vids[1]);

  // =========================
  // SCROLL MODEL
  // =========================
  // We want the hero to have enough scroll room so the wipe can happen naturally.
  // We'll extend the hero height by (totalScroll) px via a CSS variable and calc().
  const totalWipePx = (INTRO.length - 1) * STEP_PX + STEP_PX * (1 - FIRST_START_CUT);
  const totalScrollPx = totalWipePx + CLOSE_EXTRA_PX;

  // Apply extra height to hero (natural continuation after intro ends)
  // hero height = 100vh + totalScrollPx
  hero.style.minHeight = `calc(100svh + ${Math.ceil(totalScrollPx)}px)`;

  function heroTopPx() {
    const r = hero.getBoundingClientRect();
    return (window.scrollY || 0) + r.top;
  }

  const clamp01 = (x) => Math.max(0, Math.min(1, x));

  // We treat scroll inside hero as "accumulated wipe pixels"
  // At scrollStart (hero top), acc should represent FIRST_START_CUT.
  // Since cut is bottom-clip, FIRST_START_CUT means: bottom clipped 50% (half visible).
  // In our model, cut = accWithinSegment / STEP.
  // So set initial acc = FIRST_START_CUT * STEP.
  const baseAcc = FIRST_START_CUT * STEP_PX;

  // =========================
  // RENDER
  // =========================
  let lastIndex = -1;
  let done = false;

  function setLabel(i) {
    labelEl.textContent = (INTRO[i] && INTRO[i].label) ? INTRO[i].label : INTRO[INTRO.length - 1].label;
  }

  function setDividerByCut(cut) {
    const h = stack.getBoundingClientRect().height || 1;

    // bottom->top cut: visible area shrinks from bottom upward.
    // divider sits on the cut edge:
    // at cut=0 => edge at bottom (y = h)
    // at cut=1 => edge at top (y = 0)
    const y = h - (cut * h);
    const yClamped = Math.max(0, Math.min(h - DIVIDER_H, y));
    divider.style.transform = `translateY(${yClamped}px)`;
  }

  function render() {
    if (done) return;

    const y = window.scrollY || 0;
    const top = heroTopPx();
    const within = Math.max(0, y - top);

    // If user scrolls past the hero extra scroll area, close intro.
    if (within >= totalScrollPx) {
      document.body.classList.add("intro-done");
      // Hide stack entirely (no black)
      stack.style.visibility = "hidden";
      divider.style.visibility = "hidden";
      done = true;
      return;
    }

    // keep visible while active
    document.body.classList.remove("intro-done");
    stack.style.visibility = "";
    divider.style.visibility = "";

    // wipeAcc is the "progress" in pixels across wipes
    // (starts at baseAcc so first clip is half visible at the very beginning)
    const wipeAcc = baseAcc + within;

    const maxWipe = (INTRO.length - 1) * STEP_PX + STEP_PX; // last segment ends at +STEP
    const accClamped = Math.max(0, Math.min(maxWipe, wipeAcc));

    // determine current top index
    // index i is which clip is currently on top
    // when we finish segment, we move to next clip
    const i = Math.min(INTRO.length - 1, Math.floor(accClamped / STEP_PX));
    const segStart = i * STEP_PX;
    const segT = clamp01((accClamped - segStart) / STEP_PX);

    // Update label + pre-play
    if (i !== lastIndex) {
      lastIndex = i;
      setLabel(i);
      playSafe(vids[i]);
      playSafe(vids[i + 1]);
    }

    // Reset clips:
    // - vids < i : fully clipped away (bottom 100%)
    // - vids > i : fully visible
    // - vids == i : clipped by segT (BOTTOM->TOP)
    vids.forEach((v, idx) => {
      if (idx < i) {
        v.style.clipPath = "inset(0% 0% 100% 0%)"; // bottom clipped 100% => gone
      } else if (idx > i) {
        v.style.clipPath = "inset(0% 0% 0% 0%)";   // fully visible behind
      }
    });

    // Apply cut to current top clip (bottom->top):
    // segT=0 => bottom clip 0% => fully visible
    // segT=1 => bottom clip 100% => invisible
    const bottomPct = segT * 100;
    vids[i].style.clipPath = `inset(0% 0% ${bottomPct}% 0%)`;

    setDividerByCut(segT);

    // Special: if we are already at LAST clip and it's being cut away,
    // we don't want to see anything behind (black/empty). We’ll hide once near end.
    if (i === INTRO.length - 1 && segT > 0.98) {
      // close immediately (still within hero, but feels like "it shuts")
      document.body.classList.add("intro-done");
      stack.style.visibility = "hidden";
      divider.style.visibility = "hidden";
      done = true;
      return;
    }
  }

  // init + listeners
  render();
  window.addEventListener("scroll", render, { passive: true });
  window.addEventListener("resize", render);
});
