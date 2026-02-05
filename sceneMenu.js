// sceneMenu.js — topbar scene dropdown (click to open/close, click item to jump+play)

window.addEventListener("DOMContentLoaded", () => {
    const audio       = document.getElementById("sceneAudio");
    const tlScene     = document.getElementById("tlScene");
    const tlSceneMenu = document.getElementById("tlSceneMenu");
  
    if (!tlScene || !tlSceneMenu) {
      console.warn("[sceneMenu] missing #tlScene / #tlSceneMenu");
      return;
    }
  
    const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  
    function getSceneNumbersFromDOM() {
      const els = Array.from(document.querySelectorAll(".scene[id^='sc']"));
      const nums = [];
      for (const el of els) {
        const m = String(el.id).match(/^sc(\d+)/);
        if (m) nums.push(Number(m[1]));
      }
      return Array.from(new Set(nums)).sort((a, b) => a - b);
    }
  
    function getCues() {
      return Array.isArray(window.cues) ? window.cues : [];
    }
  
    let cuesReadyPromise = null;
    function waitForCuesReady() {
      if (getCues().length) return Promise.resolve(true);
      if (cuesReadyPromise) return cuesReadyPromise;
  
      cuesReadyPromise = new Promise((resolve) => {
        const done = () => {
          document.removeEventListener("cues:ready", done);
          cuesReadyPromise = null;
          resolve(true);
        };
        document.addEventListener("cues:ready", done, { once: true });
      });
  
      return cuesReadyPromise;
    }
  
    function findFirstCueStartForScene(sceneNum) {
      const cues = getCues();
      if (!cues.length) return null;
  
      const prefix = `sc${sceneNum}_`;
      for (const c of cues) {
        if (c && c.id && String(c.id).startsWith(prefix)) return Number(c.start) || 0;
      }
      return null;
    }
  
    function scrollToScene(sceneNum) {
      const el = document.getElementById(`sc${sceneNum}`);
      if (!el) return;
  
      const rect = el.getBoundingClientRect();
      const targetY = window.scrollY + rect.top - (window.innerHeight * 0.20);
  
      const maxScroll = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
      const y = clamp(targetY, 0, maxScroll);
  
      window.scrollTo({ top: y, behavior: "auto" });
    }
  
    async function jumpToSceneAndPlay(sceneNum) {
      scrollToScene(sceneNum);
  
      if (!audio) return;
  
      if (!getCues().length) await waitForCuesReady();
  
      const t = findFirstCueStartForScene(sceneNum);
      if (typeof t === "number") {
        audio.currentTime = t;
      }
  
      // ✅ דרישה 2: תמיד להתחיל לנגן בלחיצה על סצנה מהרשימה
      audio.play().catch(() => {});
    }
  
    function buildMenu() {
      const scenes = getSceneNumbersFromDOM();
      tlSceneMenu.innerHTML = "";
  
      for (const n of scenes) {
        const b = document.createElement("button");
        b.type = "button";
        b.textContent = `[${String(n).padStart(3, "0")}]`;
  
        b.addEventListener("click", async (e) => {
          e.preventDefault();
          e.stopPropagation();
          await jumpToSceneAndPlay(n);
          closeMenu();
        });
  
        tlSceneMenu.appendChild(b);
      }
    }
  
    function openMenu() {
      buildMenu();
      tlSceneMenu.hidden = false;
      tlScene.setAttribute("aria-expanded", "true");
    }
  
    function closeMenu() {
      tlSceneMenu.hidden = true;
      tlScene.setAttribute("aria-expanded", "false");
    }
  
    function toggleMenu() {
      if (tlSceneMenu.hidden) openMenu();
      else closeMenu();
    }
  
    // קליק על הכפתור העליון פותח/סוגר
    tlScene.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      toggleMenu();
    });
  
    // close on outside click
    document.addEventListener("click", (e) => {
      if (tlSceneMenu.hidden) return;
      if (e.target.closest("#tlSceneMenu")) return;
      if (e.target.closest("#tlScene")) return;
      closeMenu();
    });
  
    // close on ESC
    document.addEventListener("keydown", (e) => {
      if (e.key !== "Escape") return;
      if (tlSceneMenu.hidden) return;
      closeMenu();
    });
  
    document.addEventListener("scenes:ready", () => {
      if (!tlSceneMenu.hidden) buildMenu();
    });
  });
  