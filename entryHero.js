// entryHero.js — CLICK video to advance
// mid (normal): 3 scenes with objects + "you"
// erase-clem: 3 Joel videos, NO objects, "you" -> "clem"
// erase-joel: 3 Clementine videos, NO objects, "you" -> "joel"

(() => {
  const hero = document.getElementById("hero");
  const frame = hero?.querySelector(".hero-videoFrame");
  const video = document.getElementById("entryVideo");
  const youEl = document.getElementById("youHover");
  const sceneLabelEl = document.getElementById("heroSceneLabel");

  const obj1Wrap = hero?.querySelector(".hero-object");
  const obj2Wrap = hero?.querySelector(".hero-object2");

  const obj1 = {
    normal: document.getElementById("heroObject"),
    hover: document.getElementById("heroObjectHover"),
  };

  const obj2 = {
    normal: document.getElementById("heroObject2"),
    hover: document.getElementById("heroObject2Hover"),
  };

  if (!hero || !frame || !video || !youEl) {
    console.warn("entryHero: missing #hero/.hero-videoFrame/#entryVideo/#youHover");
    return;
  }

  // -----------------------------
  // DATA
  // -----------------------------
  const MID_SCENES = [
    {
      label: "[11]",
      video: "video/11_eternalsunshine.mp4",
      object1: "images/11_object.png",
      object1Empty: "images/11_object_empty.png",
      object2: "images/11_02_object.png",
      object2Empty: "images/11_02_object_empty.png",
      varsNormal: {
        "--obj-x": "1vw",
        "--obj-y": "-2vh",
        "--obj2-x": "30vw",
        "--obj2-y": "65vh",
        "--obj2-rot": "-4deg",
      }
    },
    {
      label: "[65]",
      video: "video/65_eternalsunshine.mp4",
      object1: "images/159_object.png",
      object1Empty: "images/159_object_empty.png",
      object2: "images/159_02_object.png",
      object2Empty: "images/159_02_object_empty.png",
      varsNormal: {
        "--obj2-x": "61.3vw",
        "--obj2-y": "7vh",
        "--obj2-rot": "0deg",
        "--obj-x": "45vw",
        "--obj-y": "45vh",
      }
    },
    {
      label: "[129]",
      video: "video/129_eternalsunshine.mp4",
      object1: "images/129_object.png",
      object1Empty: "images/129_object_empty.png",
      object2: "images/129_02_object.png",
      object2Empty: "images/129_02_object_empty.png",
      varsNormal: {
        "--obj-x": "-2vw",
        "--obj-y": "0.5vh",
        "--obj2-x": "54vw",
        "--obj2-y": "49vh",
        "--obj2-rot": "0deg",
      }
    }
  ];

  // erase-clem => Joel-only videos
  const JOEL_VIDEOS = [
    { label: "[39]", video: "video/39_eternalsunshine.mp4" },
    { label: "[55]", video: "video/55_eternalsunshine.mp4" },
    { label: "[41]", video: "video/41_eternalsunshine.mp4" },
  ];

  // erase-joel => Clementine-only videos
  const CLEM_VIDEOS = [
    { label: "[53]", video: "video/53_eternalsunshine.mp4" },
    { label: "[86]", video: "video/86_eternalsunshine.mp4" },
    { label: "[74]", video: "video/74_eternalsunshine.mp4" },
  ];

  // index per state (so switching modes doesn’t destroy your place)
  const indexByState = {
    mid: 0,
    eraseClem: 0,
    eraseJoel: 0,
  };

  // -----------------------------
  // HELPERS
  // -----------------------------
  function getState() {
    const b = document.body;
    if (b.classList.contains("erase-clem")) return "eraseClem";
    if (b.classList.contains("erase-joel")) return "eraseJoel";
    return "mid";
  }

  function setVideoSrc(src) {
    if (!src) return;
    const source = video.querySelector("source");
    if (source) {
      if (source.getAttribute("src") === src) return;
      source.src = src;
    } else {
      if (video.getAttribute("src") === src) return;
      video.src = src;
    }
    video.load();
    const p = video.play();
    if (p && typeof p.catch === "function") p.catch(() => {});
  }

  function applyVars(vars) {
    // keep it surgical: only remove keys we set
    // simplest: wipe and re-apply vars for MID only
    hero.removeAttribute("style");
    if (!vars) return;
    for (const [k, v] of Object.entries(vars)) {
      hero.style.setProperty(k, String(v));
    }
  }

  function setObjectsVisible(isVisible) {
    // CSS already hides in erase modes, but we also do it inline to be safe
    const d = isVisible ? "" : "none";
    if (obj1Wrap) obj1Wrap.style.display = d;
    if (obj2Wrap) obj2Wrap.style.display = d;
  }

  function setObjectsForScene(scene) {
    if (!scene) return;
    // set sources (normal + empty), hover swap stays CSS-only
    if (obj1.normal) obj1.normal.src = scene.object1;
    if (obj1.hover)  obj1.hover.src  = scene.object1Empty;

    if (obj2.normal) obj2.normal.src = scene.object2;
    if (obj2.hover)  obj2.hover.src  = scene.object2Empty;

    applyVars(scene.varsNormal);
  }

  function setYouWord(word) {
    youEl.textContent = word;
  }

  function setLabel(label) {
    if (sceneLabelEl) sceneLabelEl.textContent = label || "";
  }

  function applyCurrent() {
    const state = getState();

    if (state === "mid") {
      const idx = indexByState.mid % MID_SCENES.length;
      const scene = MID_SCENES[idx];

      setObjectsVisible(true);
      setYouWord("you");
      setLabel(scene.label);

      setObjectsForScene(scene);
      setVideoSrc(scene.video);
      return;
    }

    // erase modes: no objects + no vars touches (leave your hero base layout)
    setObjectsVisible(false);

    if (state === "eraseClem") {
      const idx = indexByState.eraseClem % JOEL_VIDEOS.length;
      const s = JOEL_VIDEOS[idx];
      setYouWord("clem");
      setLabel(s.label);
      setVideoSrc(s.video);
      return;
    }

    if (state === "eraseJoel") {
      const idx = indexByState.eraseJoel % CLEM_VIDEOS.length;
      const s = CLEM_VIDEOS[idx];
      setYouWord("joel");
      setLabel(s.label);
      setVideoSrc(s.video);
      return;
    }
  }

  function advance() {
    const state = getState();
    if (state === "mid") {
      indexByState.mid = (indexByState.mid + 1) % MID_SCENES.length;
    } else if (state === "eraseClem") {
      indexByState.eraseClem = (indexByState.eraseClem + 1) % JOEL_VIDEOS.length;
    } else {
      indexByState.eraseJoel = (indexByState.eraseJoel + 1) % CLEM_VIDEOS.length;
    }
    applyCurrent();
  }

  // -----------------------------
  // EVENTS
  // -----------------------------
  frame.addEventListener("click", (e) => {
    e.preventDefault();
    advance();
  });

  // if mode changes, update immediately
  const modeToggle = document.getElementById("modeToggle");
  if (modeToggle) {
    modeToggle.addEventListener("input", () => requestAnimationFrame(applyCurrent));
    modeToggle.addEventListener("change", () => requestAnimationFrame(applyCurrent));
  }

  // also react if some other script toggles body classes
  // (cheap + safe: check on focus/visibility changes)
  window.addEventListener("focus", () => applyCurrent());
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) applyCurrent();
  });

  // -----------------------------
  // INIT
  // -----------------------------
  applyCurrent();
})();

// siteTitle: click -> back to top
(() => {
  const btn = document.getElementById("siteTitle");
  if (!btn) return;

  btn.addEventListener("click", (e) => {
    e.preventDefault();
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
})();

(() => {
  const btn = document.getElementById("siteTitle");

  // 1) ensure scrolled class exists
  const SCROLL_THRESHOLD = 50;
  function updateScrolled() {
    if (window.scrollY > SCROLL_THRESHOLD) document.body.classList.add("scrolled");
    else document.body.classList.remove("scrolled");
  }
  window.addEventListener("scroll", updateScrolled, { passive: true });
  updateScrolled();

  // 2) click -> top
  if (btn) {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  } else {
    console.warn("[siteTitle] #siteTitle not found");
  }
})();

(() => {
  const btn = document.getElementById("siteTitle");
  if (!btn) return;

  btn.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
})();

(() => {
  const btn = document.getElementById("siteTitle");
  if (!btn) return;

  btn.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  const TH = 50;
  const onScroll = () => {
    document.body.classList.toggle("scrolled", window.scrollY > TH);
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();
})();
