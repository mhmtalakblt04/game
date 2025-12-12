// app.js

// ====== STATE ======
const state = {
  day: 1,
  energy: 3,
  morale: 80,           // 0..150
  money: 6250,           // eldeki nakit (oyun parası)
  bankBalance: 6250,     // banka bakiyesi (demo: aynı başlıyor)
  phoneTier: "Premium", // Cheap / Premium / Ultra
  items: { headphones: false, laptop: false },

  girls: {
    ece: Girls.createGirl({ id: "ece", name: "Ece", role: "friend", personality: "playful" }),       // çok samimi arkadaş
    ada: Girls.createGirl({ id: "ada", name: "Ada", role: "hardToGet", personality: "calculating" }) // ağırdan alan + para isteyen
  },

  activeChatId: "ece",
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

function getGirl(id) { return state.girls[id]; }

function updateUI() {
  $("day").textContent = state.day;
  $("energy").textContent = state.energy;
  $("money").textContent = formatMoney(state.money);

  const m = clamp(state.morale, 0, 150);
  $("morale").textContent = m;
  $("moraleBar").style.width = `${(m / 150) * 100}%`;

  $("phoneTierBadge").textContent = state.phoneTier;
  $("bankBalance").textContent = formatMoney(state.bankBalance);
  $("threadsSub").textContent = `${Object.keys(state.girls).length} kişi`;

  // Bank form select
  const sel = $("payToSelect");
  sel.innerHTML = "";
  for (const id of Object.keys(state.girls)) {
    const opt = document.createElement("option");
    opt.value = id;
    opt.textContent = getGirl(id).name;
    sel.appendChild(opt);
  }

  renderThreadList();
  renderChat();
}

function applyPassiveBonuses() {
  if (state.items.headphones) state.morale += 1;
  state.morale = clamp(state.morale, 0, 150);
}

// ====== GAME ACTIONS ======
function spendEnergy(cost = 1) {
  state.energy -= cost;
  if (state.energy <= 0) {
    state.energy = 0;
    endDay();
  }
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
    state.bankBalance += earn; // demo: aynı anda bankaya geçsin
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
      state.bankBalance = Math.max(0, state.bankBalance - stake);
      const winChance = 0.35;
      if (Math.random() < winChance) {
        const payout = 150;
        state.money += payout;
        state.bankBalance += payout;
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

function endDay() {
  // Gün bitince Ada para isteyebilir (event)
  const ada = getGirl("ada");
  const req = Girls.maybeRequestMoney(ada);
  if (req) {
    log("Mesaj geldi", `Ada para istedi: ${formatMoney(req.amount)} • Banka uygulamasından gönderebilirsin.`);
  }

  applyPassiveBonuses();
  state.day += 1;
  state.energy = 3;

  log("Gün bitti", `Yeni gün: ${state.day}`);
  updateUI();
}

// ====== PHONE NAV ======
const phoneModal = $("phoneModal");
const screens = {
  home: $("phoneHome"),
  threads: $("screenThreads"),
  chat: $("screenChat"),
  bank: $("screenBank"),
  shop: $("screenShop"),
  social: $("screenSocial"),
  bets: $("screenBets"),
};

function showScreen(name) {
  Object.values(screens).forEach(s => s.classList.add("hidden"));
  screens[name].classList.remove("hidden");
}

function openPhone() {
  phoneModal.classList.remove("hidden");
  phoneModal.setAttribute("aria-hidden", "false");
  showScreen("home");
}

function closePhone() {
  phoneModal.classList.add("hidden");
  phoneModal.setAttribute("aria-hidden", "true");
}

// ====== CHAT UI ======
function escapeHtml(s) {
  return (s || "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  }[c]));
}

function getLastPreview(girl) {
  const last = girl.memory[girl.memory.length - 1];
  if (!last) return "Henüz mesaj yok.";
  return (last.from === "me" ? "Sen: " : "") + last.text;
}

function relationPill(girl) {
  if (girl.id === "ece") return { text: "Samimi", cls: "good" };
  if (girl.id === "ada") return { text: girl.pendingRequest ? "Para istiyor" : "Mesafeli", cls: girl.pendingRequest ? "risky" : "" };
  return { text: "—", cls: "" };
}

function renderThreadList() {
  const list = $("threadList");
  if (!list) return;
  list.innerHTML = "";

  for (const id of Object.keys(state.girls)) {
    const g = getGirl(id);
    const pill = relationPill(g);

    const item = document.createElement("div");
    item.className = "thread";
    item.dataset.thread = id;
    item.innerHTML = `
      <div class="left">
        <div class="name">${escapeHtml(g.name)}</div>
        <div class="preview">${escapeHtml(getLastPreview(g))}</div>
      </div>
      <div class="pill ${pill.cls}">${escapeHtml(pill.text)}</div>
    `;
    list.appendChild(item);
  }
}

function renderChat() {
  const g = getGirl(state.activeChatId);
  if (!g) return;

  $("chatSub").textContent = g.name;
  $("chatTitle").textContent = "Mesajlar";

  const body = $("chatBody");
  body.innerHTML = "";

  for (const msg of g.memory) {
    const fromMe = msg.from === "me";
    const bubble = document.createElement("div");
    bubble.className = "bubble" + (fromMe ? " me" : "");
    bubble.innerHTML = `<div>${escapeHtml(msg.text)}</div><div class="small">${fromMe ? "Sen" : g.name}</div>`;
    body.appendChild(bubble);
  }
  body.scrollTop = body.scrollHeight;
}

function pushMessage(girlId, from, text, intent = "neutral") {
  const g = getGirl(girlId);
  if (!g) return;

  g.memory.push({ at: Date.now(), from, text, intent });
  if (g.memory.length > 30) g.memory.shift();
}

function autoReply(girlId, userText) {
  const g = getGirl(girlId);
  if (!g) return;

  // Kullanıcının mesajı kızın stats'ını etkiler
  Girls.applyMessageImpact(g, userText);

  // Kız cevap üretir
  const { reply } = Girls.replyFor(g, userText);

  pushMessage(girlId, "her", reply);
  renderThreadList();
  renderChat();

  // Moral etkisi: Ece samimiyse moral daha çok toparlar, Ada daha az
  if (girlId === "ece") state.morale = clamp(state.morale + 2, 0, 150);
  if (girlId === "ada") state.morale = clamp(state.morale + 1, 0, 150);
  updateUI();
}

// ====== BANK ======
function sendMoney(toId, amount) {
  amount = Math.floor(Number(amount));
  if (!amount || amount <= 0) return;

  if (state.bankBalance < amount) {
    log("Banka", "Bakiye yetersiz.");
    return;
  }

  state.bankBalance -= amount;
  state.money = Math.min(state.money, state.bankBalance); // demo: tutarlı dursun
  log("Havale", `${getGirl(toId).name} kişisine ${formatMoney(amount)} gönderildi.`);

  const g = getGirl(toId);
  const res = Girls.onMoneyReceived(g, amount);
  if (res.ok) {
    renderThreadList();
    if (state.activeChatId === toId) renderChat();
  }

  updateUI();
}

// ====== SHOP ======
function buyItem(key, price) {
  price = Number(price);
  if (state.money < price) {
    log("Market", "Paran yetmedi.");
    return updateUI();
  }

  if (key === "headphones") {
    if (state.items.headphones) return log("Market", "Kulaklık zaten var.");
    state.money -= price; state.bankBalance = Math.max(0, state.bankBalance - price);
    state.items.headphones = true;
    state.morale = clamp(state.morale + 6, 0, 150);
    log("Aldın: Kulaklık", "Moral +6 (pasif)");
  }

  if (key === "laptop") {
    if (state.items.laptop) return log("Market", "Laptop zaten var.");
    state.money -= price; state.bankBalance = Math.max(0, state.bankBalance - price);
    state.items.laptop = true;
    log("Aldın: Laptop", "Ders verimi artar");
  }

  if (key === "phoneUpgrade") {
    if (state.phoneTier === "Ultra") return log("Market", "Telefon zaten Ultra.");
    state.money -= price; state.bankBalance = Math.max(0, state.bankBalance - price);
    state.phoneTier = "Ultra";
    log("Telefon yükseltildi", "Ultra aktif");
  }

  updateUI();
}

// ====== EVENTS / BUTTONS ======
document.addEventListener("click", (e) => {
  const card = e.target.closest("[data-action]");
  if (card) doAction(card.dataset.action);

  const openApp = e.target.closest("[data-open]");
  if (openApp) showScreen(openApp.dataset.open);

  const thread = e.target.closest("[data-thread]");
  if (thread) {
    state.activeChatId = thread.dataset.thread;
    showScreen("chat");
    renderChat();
    renderThreadList();
  }

  const buyBtn = e.target.closest("[data-buy]");
  if (buyBtn) buyItem(buyBtn.dataset.buy, buyBtn.dataset.price);

  const chip = e.target.closest("[data-payto]");
  if (chip) sendMoney(chip.dataset.payto, chip.dataset.amount);

  if (e.target.matches("[data-back]")) showScreen("home");
  if (e.target.matches("[data-close]")) closePhone();
});

$("openPhone").addEventListener("click", openPhone);
$("closePhone").addEventListener("click", closePhone);
$("endDay").addEventListener("click", endDay);

$("sendChat").addEventListener("click", () => {
  const input = $("chatInput");
  const text = input.value.trim();
  if (!text) return;
  input.value = "";

  const id = state.activeChatId;
  pushMessage(id, "me", text);

  renderThreadList();
  renderChat();

  const delay = state.phoneTier === "Cheap" ? 1200 : 500;
  setTimeout(() => autoReply(id, text), delay);
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
  state.bankBalance = Math.max(0, state.bankBalance - stake);

  let chance = 0.35;
  if (state.phoneTier === "Premium") chance += 0.02;
  if (state.phoneTier === "Ultra") chance += 0.05;

  if (Math.random() < chance) {
    const payout = 160;
    state.money += payout;
    state.bankBalance += payout;
    state.morale = clamp(state.morale + 8, 0, 150);
    log("Bahis (telefon)", `Tuttu • Net +${formatMoney(payout - stake)} • Moral +8`);
  } else {
    state.morale = clamp(state.morale - 10, 0, 150);
    log("Bahis (telefon)", `Patladı • Net -${formatMoney(stake)} • Moral -10`);
  }
  updateUI();
});

$("sendMoneyBtn").addEventListener("click", () => {
  const toId = $("payToSelect").value;
  const amt = $("payAmount").value;
  sendMoney(toId, amt);
  $("payAmount").value = "";
});

$("nudgeRandom").addEventListener("click", () => {
  // Home’dan “birine yaz” → sohbet listesine at
  showScreen("threads");
});

// init: başlangıç mesajları
pushMessage("ece", "her", "Heey 😄 Liseye başladık… nasıl gidiyor?", "greeting");
pushMessage("ada", "her", "Selam.", "greeting");

log("Başlangıç", "Telefon → Mesajlar → Ece/Ada. Ada bazen para ister. Banka’dan gönderirsin.");
updateUI();
