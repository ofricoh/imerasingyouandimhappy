// loadScenes.js — FULL (credits loaded into #credits)

const sceneFiles = ["1","2","3","4","5","6","7","8","9","10","11","12","13","14","15","16","17","18","19","20","21","22","23","24","25","26","27","28","29","30","31","32","33","34","35","36","37","38","39","40","152","153","154","155","156","157","158","159","160","161","162","163","164","165","166","167","168","credits"];

const container = document.getElementById("script");
const creditsEl = document.getElementById("credits");

function getStartForId(id) {
  const list = window.cues;
  if (!Array.isArray(list) || !id) return null;
  const item = list.find(c => c.id === id);
  return item ? item.start : null;
}

function findNextCueAfter(el) {
  let next = el.nextElementSibling;
  while (next) {
    if (next.classList.contains("cue") && next.dataset.id) return next;
    next = next.nextElementSibling;
  }
  return null;
}

function enableClickToJump() {
  const audio = document.getElementById("sceneAudio");
  if (!audio) return;

  const clickable = document.querySelectorAll(".unit-speech, .unit-heading");

  clickable.forEach(el => {
    el.addEventListener("click", async () => {
      document.querySelectorAll(".unit.active, .unit-heading.active")
        .forEach(x => x.classList.remove("active"));

      let targetEl = el;

      if (el.classList.contains("unit-heading")) {
        const firstCue = findNextCueAfter(el);
        if (firstCue) targetEl = firstCue;
      }

      targetEl.classList.add("active");
      targetEl.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });

      const id = targetEl.dataset.id;
      const start = getStartForId(id);
      if (start !== null) audio.currentTime = start;

      try { await audio.play(); }
      catch (err) { console.warn("[audio] play blocked:", err); }
    });
  });
}

function normalizeCreditsMarkup(html) {
  // אם credits.html כבר מגיע עם credits-inner -> תשאיר
  if (html.includes("credits-inner")) return html;

  // אחרת: נעטוף כל שורה ל-.credits-line כדי שה-CSS שלך יתפוס
  const lines = html
    .replace(/\r/g, "")
    .split("\n")
    .map(s => s.trim())
    .filter(Boolean);

  const inner = lines
    .map(line => `<span class="credits-line">${line}</span>`)
    .join("");

  return `<div class="credits-inner">${inner}</div>`;
}

(async function loadAll() {
  if (!container) {
    console.warn("[loadScenes] missing #script");
    return;
  }

  for (const s of sceneFiles) {
    const url = `scenes/${s}.html`;

    try {
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
      const html = await res.text();

      if (s === "credits") {
        if (creditsEl) {
          creditsEl.innerHTML = "";
          creditsEl.insertAdjacentHTML("beforeend", normalizeCreditsMarkup(html));
        } else {
          container.insertAdjacentHTML("beforeend", html);
        }
      } else {
        container.insertAdjacentHTML("beforeend", html);
        container.appendChild(document.createTextNode(" "));
      }

    } catch (e) {
      console.warn("[loadScenes] failed:", url, e);
    }
  }

  enableClickToJump();

  document.dispatchEvent(new CustomEvent("cues:ready"));

  // חשוב: אחרי טעינה מלאה -> לחשב מחדש את lockY של הקרדיטים
  if (typeof window.initCreditsOverlay === "function") {
    window.initCreditsOverlay();
  }

  const first = document.querySelector(".cue[data-id]");
  console.log("[cues] first data-id =", first ? first.dataset.id : "NOT FOUND");
})();
