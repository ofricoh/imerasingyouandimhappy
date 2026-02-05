// timeline.js — RIGHT timeline (FIGMA UI + keep drag/scroll/cues)
// - Timeline toggles open/close ONLY when clicking #tlMovieTime
// - First click opens + starts audio immediately
// - Second click closes timeline + hides audio button
// - NEW: Round play/pause button appears only when timeline is open
// - Play/Pause icon is SINGLE svg path that swaps
// - Bubble CLOSED shows scene label ([159])
// - Bubble OPEN shows timecode now/end (00:00 / 00:00, based on audio clip)
// - Drag keeps existing behavior: scroll + active cue highlight

window.addEventListener("DOMContentLoaded", () => {
  const audio       = document.getElementById("sceneAudio");
  const timelineEl  = document.getElementById("timeline");
  const tlScrub     = document.getElementById("tlScrub");
  const tlHandle    = document.getElementById("tlHandle");
  const tlPlay      = document.getElementById("tlPlay");      // bubble text
  const tlMovieTime = document.getElementById("tlMovieTime"); // opens timeline
  const tlScene     = document.getElementById("tlScene");

  // NEW: audio play/pause button (single icon)
  const tlAudioBtn  = document.getElementById("tlAudioBtn");
  const tlAudioIcon = document.getElementById("tlAudioIcon");

  const missing = [];
  if (!audio) missing.push("#sceneAudio");
  if (!timelineEl) missing.push("#timeline");
  if (!tlScrub) missing.push("#tlScrub");
  if (!tlHandle) missing.push("#tlHandle");
  if (!tlPlay) missing.push("#tlPlay");
  if (!tlMovieTime) missing.push("#tlMovieTime");
  if (!tlScene) missing.push("#tlScene");
  if (!tlAudioBtn) missing.push("#tlAudioBtn");
  if (!tlAudioIcon) missing.push("#tlAudioIcon");
  if (missing.length) {
    console.warn("[timeline] missing:", missing.join(", "));
    return;
  }

  // -----------------------------
  // helpers: play/pause icon (single path swap)
  // -----------------------------
  const PATH_PLAY  = "M8 5v14l12-7z";
  const PATH_PAUSE = "M6 5h4v14H6zM14 5h4v14h-4z";

  function setAudioIcon(isPlaying) {
    const p = tlAudioIcon.querySelector("path");
    if (!p) return;
    p.setAttribute("d", isPlaying ? PATH_PAUSE : PATH_PLAY);
    tlAudioBtn.setAttribute("aria-label", isPlaying ? "Pause" : "Play");
  }

  // keep icon synced with actual audio state
  setAudioIcon(!audio.paused);
  audio.addEventListener("play",  () => setAudioIcon(true));
  audio.addEventListener("pause", () => setAudioIcon(false));
  audio.addEventListener("ended", () => setAudioIcon(false));

  // -----------------------------
  // Display offset (movie time start) — kept, but bubble now uses clip time
  // -----------------------------
  const USE_DISPLAY_MOVIE_START = true;
  const DISPLAY_MOVIE_START_TC  = "01:39:35";

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  function timecodeToSeconds(tc) {
    const parts = String(tc || "0:0:0").split(":").map(Number);
    if (parts.length === 3) {
      const [h, m, s] = parts;
      return (h || 0) * 3600 + (m || 0) * 60 + (s || 0);
    }
    if (parts.length === 2) {
      const [m, s] = parts;
      return (m || 0) * 60 + (s || 0);
    }
    return Number(parts[0]) || 0;
  }

  const DISPLAY_OFFSET_SEC = USE_DISPLAY_MOVIE_START
    ? timecodeToSeconds(DISPLAY_MOVIE_START_TC)
    : 0;

  function fmtHMS(totalSec) {
    totalSec = Math.max(0, Math.floor(totalSec || 0));
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    return `${m}:${String(s).padStart(2, "0")}`;
  }

  // ✅ NEW: always show 00:00 format for clip time
  function fmtMMSS(totalSec) {
    totalSec = Math.max(0, Math.floor(totalSec || 0));
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }

  function durationReady() {
    return Number.isFinite(audio.duration) && audio.duration > 0;
  }

  let metaPromise = null;
  function ensureMetadata() {
    if (durationReady()) return Promise.resolve(true);
    if (metaPromise) return metaPromise;

    metaPromise = new Promise((resolve) => {
      const done = () => {
        audio.removeEventListener("loadedmetadata", done);
        metaPromise = null;
        resolve(durationReady());
      };
      audio.addEventListener("loadedmetadata", done, { once: true });
      try { audio.load(); } catch (_) {}
    });

    return metaPromise;
  }

  // -----------------------------
  // Timeline open/close (toggle)
  // -----------------------------
  let timelineOpened = false;

  // Top button label
  tlMovieTime.textContent = "timeline";

  // audio button hidden until open
  tlAudioBtn.hidden = true;

  function sceneLabelNow() {
    const txt = (tlScene.textContent || "").trim();
    return txt || "[---]";
  }

  // -----------------------------
  // Bubble states: closed(scene) vs open(timecode)
  // -----------------------------
  let bubbleOpen = false;
  let dragging = false;

  function renderClosedBubble() {
    bubbleOpen = false;
    timelineEl.classList.remove("is-open");
    tlPlay.textContent = sceneLabelNow();
  }

  // ✅ CHANGED: bubble open shows clip time (00:00 / 00:00)
  function renderOpenBubble() {
    bubbleOpen = true;
    timelineEl.classList.add("is-open");

    const t = audio.currentTime || 0;
    const d = audio.duration;

    const now = fmtMMSS(t);
    const end = (Number.isFinite(d) && d > 0) ? fmtMMSS(d) : "00:00";

    tlPlay.textContent = `${now} / ${end}`;
  }

  function openBubble() { renderOpenBubble(); }
  function closeBubbleIfAllowed() {
    if (dragging) return;
    renderClosedBubble();
  }

  function openTimelineAndPlay() {
    if (!timelineOpened) {
      timelineOpened = true;
      timelineEl.removeAttribute("hidden");

      tlAudioBtn.hidden = false;

      // start closed
      renderClosedBubble();

      // initial handle position
      ensureMetadata().then(() => {
        if (durationReady()) {
          setHandleByProgress((audio.currentTime || 0) / audio.duration);
        } else {
          setHandleByProgress(0);
        }
      });
    }

    audio.play().catch(() => {});
  }

  function closeTimeline() {
    if (!timelineOpened) return;

    timelineOpened = false;
    timelineEl.setAttribute("hidden", "");

    tlAudioBtn.hidden = true;

    bubbleOpen = false;
    dragging = false;
    timelineEl.classList.remove("is-open");
  }

  tlMovieTime.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (!timelineOpened) openTimelineAndPlay();
    else closeTimeline();
  });

  // play/pause button
  tlAudioBtn.addEventListener("click", async (e) => {
    e.preventDefault();
    e.stopPropagation();

    try {
      if (audio.paused) {
        await audio.play();
      } else {
        audio.pause();
      }
      setAudioIcon(!audio.paused);
    } catch (_) {}
  });

  // hover opens bubble
  tlScrub.addEventListener("mouseenter", () => {
    if (!timelineOpened) return;
    openBubble();
  });
  tlScrub.addEventListener("mouseleave", () => {
    if (!timelineOpened) return;
    closeBubbleIfAllowed();
  });

  // -----------------------------
  // Track geometry (clamp handle inside)
  // -----------------------------
  function trackMetrics() {
    const r = tlScrub.getBoundingClientRect();
    const h = r.height;

    const handleH = tlHandle.getBoundingClientRect().height || 0;
    const pad = Math.max(0, handleH / 2);

    const top = pad;
    const bottom = Math.max(pad, h - pad);
    const range = Math.max(1, bottom - top);

    return { r, top, range };
  }

  function clientYToProgress(clientY) {
    const { r, top, range } = trackMetrics();
    const y = clientY - r.top;
    const p = (y - top) / range;
    return clamp(p, 0, 1);
  }

  function setHandleByProgress(p) {
    p = clamp(p, 0, 1);
    const { top, range } = trackMetrics();
    const y = top + p * range;
    tlHandle.style.top = `${y}px`;
  }

  // -----------------------------
  // cues highlight (unchanged)
  // -----------------------------
  function getCues() {
    return Array.isArray(window.cues) ? window.cues : [];
  }

  let cueStarts = [];
  let cueCountAtIndexBuild = 0;

  function rebuildCueIndex() {
    const cues = getCues();
    cueStarts = cues.map(c => Number(c.start) || 0);
    cueCountAtIndexBuild = cues.length;
  }

  function ensureCueIndex() {
    const cues = getCues();
    if (!cueStarts.length || cues.length !== cueCountAtIndexBuild) rebuildCueIndex();
  }

  function findCueIndexAtTime(t) {
    ensureCueIndex();
    if (!cueStarts.length) return -1;

    let lo = 0, hi = cueStarts.length - 1, ans = -1;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      if (cueStarts[mid] <= t) { ans = mid; lo = mid + 1; }
      else hi = mid - 1;
    }
    return ans;
  }

  function findCueElement(cueId) {
    if (!cueId) return null;
    return (
      document.getElementById(cueId) ||
      document.querySelector(`[data-id="${cueId}"]`) ||
      document.querySelector(`[data-cue="${cueId}"], [data-cue-id="${cueId}"]`)
    );
  }

  let lastActiveEl = null;
  let lastActiveCueId = null;

  function setActiveByTime(t) {
    const cues = getCues();
    if (!cues.length) return;

    const idx = findCueIndexAtTime(t);
    if (idx < 0) return;

    const cue = cues[idx];
    const id  = cue && cue.id;
    if (!id) return;

    if (id === lastActiveCueId) return;

    const el = findCueElement(id);
    if (!el) return;

    if (lastActiveEl && lastActiveEl !== el) lastActiveEl.classList.remove("active");
    el.classList.add("active");
    lastActiveEl = el;
    lastActiveCueId = id;

    const m = String(id).match(/^sc(\d+)_/);
    if (m) tlScene.textContent = `[${m[1].padStart(3, "0")}]`;

    if (!bubbleOpen && timelineOpened) {
      tlPlay.textContent = sceneLabelNow();
    }
  }

  document.addEventListener("cues:ready", () => {
    rebuildCueIndex();
    setActiveByTime(audio.currentTime || 0);
  });

  // --- auto-scroll to active line (kept)
  let scrollRAF = 0;
  function requestScrollToActive() {
    if (scrollRAF) return;
    scrollRAF = requestAnimationFrame(() => {
      scrollRAF = 0;

      const active = lastActiveEl || document.querySelector(".unit.active");
      if (!active) return;

      active.scrollIntoView({
        behavior: "smooth",
        block: "center",
        inline: "nearest"
      });
    });
  }

  // -----------------------------
  // DRAG (kept)
  // -----------------------------
  let pointerDown = false;
  let wasPlaying = false;
  let currentP = 0;

  function applyAudioAtProgress(p) {
    if (!durationReady()) return;
    const d = audio.duration;
    const t = clamp(p * d, 0, d);
    audio.currentTime = t;

    if (timelineOpened) renderOpenBubble();

    setActiveByTime(t);
    requestScrollToActive();
  }

  function setProgressFromClientY(clientY) {
    const p = clientYToProgress(clientY);
    currentP = p;
    setHandleByProgress(p);
    applyAudioAtProgress(p);
  }

  function onPointerDown(e) {
    if (!timelineOpened) return;
    if (timelineEl.hasAttribute("hidden")) return;

    e.preventDefault();

    pointerDown = true;
    dragging = true;
    document.body.classList.add("tl-dragging");

    renderOpenBubble();

    wasPlaying = !audio.paused;
    if (wasPlaying) audio.pause(); // pauses during drag
    setAudioIcon(false);

    try { tlScrub.setPointerCapture(e.pointerId); } catch (_) {}

    ensureMetadata().then(() => {
      if (pointerDown) applyAudioAtProgress(currentP);
    });

    setProgressFromClientY(e.clientY);
  }

  function onPointerMove(e) {
    if (!pointerDown) return;
    e.preventDefault();
    setProgressFromClientY(e.clientY);
  }

  function onPointerUp() {
    if (!pointerDown) return;
    pointerDown = false;

    dragging = false;
    document.body.classList.remove("tl-dragging");

    const stillHover =
      tlScrub.matches(":hover") ||
      tlHandle.matches(":hover") ||
      timelineEl.matches(":hover");

    if (stillHover) renderOpenBubble();
    else renderClosedBubble();

    if (wasPlaying) {
      audio.play().catch(() => {});
      setAudioIcon(true);
    } else {
      setAudioIcon(!audio.paused);
    }
  }

  tlScrub.addEventListener("pointerdown", onPointerDown, { passive: false });
  tlScrub.addEventListener("pointermove", onPointerMove, { passive: false });
  tlScrub.addEventListener("pointerup", onPointerUp, { passive: false });
  tlScrub.addEventListener("pointercancel", onPointerUp, { passive: false });

  // -----------------------------
  // Audio updates (kept)
  // -----------------------------
  audio.addEventListener("loadedmetadata", () => {
    rebuildCueIndex();
    if (!timelineOpened) return;

    if (durationReady()) {
      currentP = clamp((audio.currentTime || 0) / audio.duration, 0, 1);
      setHandleByProgress(currentP);
      setActiveByTime(audio.currentTime || 0);
    }
  });

  audio.addEventListener("timeupdate", () => {
    // keep active cues lighting even when timeline is closed
    if (pointerDown) return;

    const t = audio.currentTime || 0;

    setActiveByTime(t);

    if (!timelineOpened) return;

    if (durationReady()) {
      currentP = clamp(t / audio.duration, 0, 1);
      setHandleByProgress(currentP);
    }

    if (bubbleOpen) renderOpenBubble();
  });

  // Init: keep hidden until click
});
