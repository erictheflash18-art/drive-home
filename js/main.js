// Map screen, level switching, level-complete card.

const LEVELS = { boulder: BoulderLevel };

const Game = {
  init() {
    $("title").textContent = LINES.title;
    $("subtitle").textContent = LINES.subtitle;
    $("soundHint").textContent = LINES.soundHint;
    $("mascot").innerHTML = PENGUIN_SVG;
    document.querySelector(".feet-art").innerHTML = FEET_SVG;
    document.querySelector(".dialog-peng").innerHTML = PENGUIN_SVG;
    document.querySelector(".cut-art").innerHTML = SNACK_SVG;
    $("toeBtn").querySelector("span").textContent = LINES.toePrompt;
    $("completeBtn").addEventListener("click", () => this.toMap());
    $("quitBtn").addEventListener("click", () => this.toMap());
    Engine.init();
    this.renderMap();
    setInterval(() => { if ($("map").classList.contains("active")) this.renderMap(); }, 1000);
  },

  show(id) {
    document.querySelectorAll(".screen").forEach((el) => el.classList.toggle("active", el.id === id));
  },

  renderMap() {
    const ol = $("stops");
    ol.innerHTML = "";
    const now = Date.now();
    let countdownShown = false;
    STOPS.forEach((stop, i) => {
      const li = document.createElement("li");
      const done = !!Save.data.levels[stop.id];
      const open = isUnlocked(stop);
      const built = !!LEVELS[stop.id];
      li.className = "stop " + (done ? "done" : open ? "open" : "locked");
      const date = new Date(unlockTime(stop)).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric", timeZone: "America/Denver" });
      let action = "";
      if (open && built) action = `<button class="play" data-id="${stop.id}">${done ? "Replay" : "Drive"}</button>`;
      else if (open) action = `<span class="soon">${LINES.comingSoon}</span>`;
      else {
        let cd = "";
        if (!countdownShown) { cd = `<span class="countdown">${countdown(unlockTime(stop) - now)}</span>`; countdownShown = true; }
        action = `<span class="soon">${LINES.lockedText} ${date}</span>${cd}`;
      }
      li.innerHTML = `
        <div class="pin">${done ? "✓" : i + 1}</div>
        <div class="stop-body">
          <div class="stop-name">${LINES[stop.id].name}</div>
          ${action}
        </div>`;
      ol.appendChild(li);
    });
    ol.querySelectorAll(".play").forEach((b) => b.addEventListener("click", () => this.play(b.dataset.id)));

    $("bday").textContent = birthdayText(now);
    const t = Save.totals();
    $("flowerTotal").textContent = t.flowers;
    $("toeTotal").textContent = t.toes;
    $("bikeTotal").textContent = Save.stat("bikesHit");
    $("carTotal").textContent = Save.stat("carsTotalled");
    $("bracelet").innerHTML = STOPS.map((st) => {
      const has = Save.data.levels[st.id] && Save.data.levels[st.id].charm;
      return `<span class="charm ${has ? "has" : ""}" title="${st.charmName}">${has ? st.charm : ""}</span>`;
    }).join("");
  },

  play(id) {
    Sfx.unlock();
    Voice.preload();
    this.show("game");
    $("complete").classList.remove("show");
    Engine.resize();
    Engine.level = LEVELS[id];
    Engine.level.start();
  },

  showComplete(d) {
    $("completeTitle").textContent = d.title;
    $("cFlowers").textContent = d.flowers;
    $("cToes").textContent = d.toes;
    $("cCharm").textContent = d.charm;
    $("cBikes").textContent = d.bikesHit || 0;
    $("cCars").textContent = d.carsTotalled || 0;
    $("completeNote").textContent = d.note;
    Voice.play(d.note, "interrupt");
    $("complete").classList.add("show");
  },

  toMap() {
    if (Engine.level && Engine.level.stop) Engine.level.stop();
    Voice.stop();
    Engine.level = null;
    $("complete").classList.remove("show");
    this.show("map");
    this.renderMap();
  },
};

// Days until Nov 25 in Mountain time, counted by calendar day
function birthdayText(now) {
  const dayMs = 86400000;
  const days = Math.ceil((BIRTHDAY - now) / dayMs);
  if (now >= BIRTHDAY) return LINES.birthdayToday;
  if (days <= 1) return LINES.birthdayTomorrow;
  return LINES.birthdayCountdown.replace("{n}", days);
}

function countdown(ms) {
  if (ms <= 0) return "";
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  return (d ? d + "d " : "") + `${h}h ${String(m).padStart(2, "0")}m ${String(sec).padStart(2, "0")}s`;
}

Game.init();
