// app.js

// ====== STATE ======
const state = {
  day: 1,
  energy: 3,
  morale: 80,         // 0..150
  money: 250,
  phoneTier: "Premium", // Cheap / Premium / Ultra
  girlfriend: Girls.createGirl({ id: "zeynep", name: "Zeynep" }),
  items: {
    headphones: false,
    laptop: false,
  }
};

// ====== HELPERS ======
const $ = (id) => document.getElementById(id);

function clamp(n, min, max) { return Math.max(min, Math.min(max, n)); }

function formatMoney(n) {
  return "₺" + Math.round(n).toLocaleString("tr-TR");
}

function log(title, sub) {
  const el = document.createElement("div");
  el.className = "entry";
  el.innerHTML = `<div class="t">${title}</div><div class="s">${sub}</div>`;
  $("log").prepend(el);
}

function updateUI() {
  $("day").textContent = state.day;
  $("energy").textContent = state.energy;
  $("money").textContent = formatMoney(state.money);

  const m = clamp(state.morale, 0, 150);
  $("morale").textContent = m;
  $("moraleBar").style.width = `${(m / 150) * 100}%`;

  $("phoneTierBadge").textContent = state.phoneTier;
  $("affectionText").textContent = `İlgi: ${state.girlfriend.affection}`;
  $("chatSub").textContent = state.girlfriend.name;
}

function applyPassiveBonuses() {
  if (state.items.headphones) state.morale += 1; // her gün +1
  state.morale = clamp(state.morale, 0, 150);
}

// ====== CORE ACTIONS ======
function spendEnergy(cost = 1) {
  state.energy -= cost;
  if (state.energy <= 0) {
    state.energy = 0;
    endDay();
  }
}

function moraleFromRelationshipAtDayEnd() {
  const a = state.girlfriend.affection;

  if (a >= 75) state.morale += 6;
  else if (a >= 55) state.morale += 2;
  else if (a <= 30) state.morale -= 8;

  state.morale = clamp(state.morale, 0, 150);
}

function doAction(type) {
  if (state.energy <= 0) return;

  const moraleMultiplier = clamp(state.morale / 100, 0.4, 1.3);

  if (type === "study") {
    spendEnergy(1);
    const gain = Math.round(4 * moraleMultiplier + (state.items.laptop ? 1 : 0));
    state.morale = clamp(state.morale + 1, 0, 150);
    log("Ders çalıştın", `Verim: +${gain} (moral x${moraleMultiplier.toFixed(2)})`);
  }

  if (type === "sport") {
    spendEnergy(1);
    const gain = Math.round(3 * moraleMultiplier);
    state.morale = clamp(state.morale + 2, 0, 150);
    log("Spor yaptın", `Form: +${gain} • Moral +2`);
  }

  if (type === "work") {
    spendEnergy(1);
    const earn = Math.round(120 * moraleMultiplier);
    state.money += earn;
    state.morale = clamp(state.morale - 1, 0, 150);
    log("Part-time çalıştın", `Kazanç: ${formatMoney(earn)} • Moral -1`);
  }

  if (type === "bet") {
    spendEnergy(1);
    const stake = 50;
    if (state.money < stake) {
      log("Bahis", "Paran yetmedi.");
    } else {
      state.money -= stake;
      const winChance = 0.35;
      if (Math.random() < winChance) {
        const payout = 150;
        state.money += payout;
        state.morale = clamp(state.morale + 8, 0, 150);
        log("Bahis tuttu", `Net: +${formatMoney(payout - stake)} • Moral +8`);
      } else {
        state.morale = clamp(state.morale - 10, 0, 150);
        log("Bahis patladı", `Net: -${formatMoney(stake)} • Moral -10`);
      }
    }
  }

  updateUI();
}

// ====== DAY END ======
function endDay() {
  // İhmal: o gün hiç mesaj atmadıysan affection düşsün
  // Basit kontrol: son 24 saatte "Sen" mesajı yoksa (demo)
  // (Şimdilik: her gün -2)
  state.girlfriend.affection = clamp(state.girlfriend.affection - 2, 0, 100);

  moraleFromRelationshipAtDayEnd();
  applyPassiveBonuses();

  log("Gün bitti", `Yeni gün: ${state.day + 1} • Enerji yenilendi`);
  state.day += 1;
  state.energy = 3;

  updateUI();
}

// ====== PHONE NAV ======
const phoneModal = $("phoneModal");
const screens = {
  home: $("phoneHome"),
  chat: $("screenChat"),
  shop: $("screenShop"),
  social: $("screenSocial"),
  bets: $("screenBets"),
};

function openPhone() {
  phoneModal.classList.remove("hidden");
  phoneModal.setAttribute("aria-hidden", "false");
  showScreen("home");
}

function closePhone() {
  phoneModal.classList.add("hidden");
  phoneModal.setAttribute("aria-hidden", "true");
}

function showScreen(name) {
  Object.values(screens).forEach(s => s.classList.add("hidden"));
  screens[name].classList.remove("hidden");
}

// ====== CHAT ======
function escapeHtml(s) {
  return (s || "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  }[c]));
}

function pushChat(fromMe, text) {
  const bubble = document.createElement("div");
  bubble.className = "bubble" + (fromMe ? " me" : "");
  bubble.innerHTML = `<div>${escapeHtml(text)}</div><div class="small">${fromMe ? "Sen" : state.girlfriend.name}</div>`;
  $("chatBody").appendChild(bubble);
  $("chatBody").scrollTop = $("chatBody").scrollHeight;
}

function girlfriendAutoReply(userText) {
  Girls.applyMessageImpact(state.girlfriend, userText);

  const { reply } = Girls.replyFor(state.girlfriend, userText);
  pushChat(false, reply);

  // Affection → oyuncu morale küçük etki (anlık)
  if (state.girlfriend.affection >= 75) state.morale = clamp(state.morale + 2, 0, 150);
  if (state.girlfriend.affection <= 30) state.morale = clamp(state.morale - 2, 0, 150);

  updateUI();
}

// ====== BUY ======
function buyItem(key, price) {
  if (state.money < price) {
    log("Market", "Paran yetmedi.");
    updateUI();
    return;
  }

  if (key === "headphones") {
    if (state.items.headphones) return log("Market", "Kulaklık zaten var.");
    state.money -= price;
    state.items.headphones = true;
    state.morale = clamp(state.morale + 6, 0, 150);
    log("Aldın: Kulaklık", "Moral +6 (pasif bonus açıldı)");
  }

  if (key === "laptop") {
    if (state.items.laptop) return log("Market", "Laptop zaten var.");
    state.money -= price;
    state.items.laptop = true;
    log("Aldın: Laptop", "Ders verimi artacak (sonra derinleşir)");
  }

  if (key === "phoneUpgrade") {
    if (state.phoneTier === "Ultra") return log("Market", "Telefon zaten Ultra.");
    state.money -= price;
    state.phoneTier = "Ultra";
    log("Telefon yükseltildi", "Ultra özellikler açıldı");
  }

  updateUI();
}

// ====== EVENTS / BUTTONS ======
document.addEventListener("click", (e) => {
  const card = e.target.closest("[data-action]");
  if (card) doAction(card.dataset.action);

  const openApp = e.target.closest("[data-open]");
  if (openApp) showScreen(openApp.dataset.open);

  if (e.target.matches("[data-back]")) showScreen("home");

  const buyBtn = e.target.closest("[data-buy]");
  if (buyBtn) buyItem(buyBtn.dataset.buy, Number(buyBtn.dataset.price));

  if (e.target.matches("[data-close]")) closePhone();
});

$("openPhone").addEventListener("click", openPhone);
$("closePhone").addEventListener("click", closePhone);
$("endDay").addEventListener("click", endDay);

$("textGirlfriend").addEventListener("click", () => {
  state.girlfriend.affection = clamp(state.girlfriend.affection + 3, 0, 100);
  state.morale = clamp(state.morale + 2, 0, 150);
  log("Mesaj attın", `İlgi +3 • Moral +2`);
  updateUI();

  showScreen("chat");

  const starter = "Nasılsın?";
  pushChat(true, starter);

  const delay = state.phoneTier === "Cheap" ? 1200 : 500;
  setTimeout(() => girlfriendAutoReply(starter), delay);
});

$("sendChat").addEventListener("click", () => {
  const input = $("chatInput");
  const text = input.value.trim();
  if (!text) return;
  input.value = "";

  pushChat(true, text);

  // Yazdığın mesajın uzunluğu küçük etki
  const bonus = text.length >= 12 ? 2 : 1;
  state.girlfriend.affection = clamp(state.girlfriend.affection + bonus, 0, 100);
  state.morale = clamp(state.morale + 1, 0, 150);
  updateUI();

  const delay = state.phoneTier === "Cheap" ? 1200 : 500;
  setTimeout(() => girlfriendAutoReply(text), delay);
});

$("scrollSocial").addEventListener("click", () => {
  state.morale = clamp(state.morale + 2, 0, 150);
  log("Sosyal medya", "Moral +2");
  updateUI();
});

$("placeBet").addEventListener("click", () => {
  const stake = 50;
  if (state.money < stake) return log("Bahis", "Paran yetmedi.");

  state.money -= stake;

  let chance = 0.35;
  if (state.phoneTier === "Premium") chance += 0.02;
  if (state.phoneTier === "Ultra") chance += 0.05;

  if (Math.random() < chance) {
    const payout = 160;
    state.money += payout;
    state.morale = clamp(state.morale + 8, 0, 150);
    log("Bahis (telefon)", `Tuttu • Net +${formatMoney(payout - stake)} • Moral +8`);
  } else {
    state.morale = clamp(state.morale - 10, 0, 150);
    log("Bahis (telefon)", `Patladı • Net -${formatMoney(stake)} • Moral -10`);
  }
  updateUI();
});

// init
log("Başlangıç", "Liseye başladın. 3 enerjin var. Telefon açıp mesajlaşabilirsin.");
updateUI();
