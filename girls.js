// girls.js - çoklu kız + kişilik + Ada için durum tabanlı konuşma (para / yumuşama / soğuma)

(function () {
  function clamp(n, min, max) { return Math.max(min, Math.min(max, n)); }

  function normTR(s) {
    return (s || "")
      .toLowerCase()
      .replaceAll("ı","i")
      .replaceAll("ğ","g")
      .replaceAll("ü","u")
      .replaceAll("ş","s")
      .replaceAll("ö","o")
      .replaceAll("ç","c")
      .replace(/[^a-z0-9\s?!.]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function hasAny(text, arr) { return arr.some(w => text.includes(w)); }
  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

  // =========================
  // ADA REPLIK HAVUZLARI
  // =========================
  // Not: Buraya senin 120 örneğin tamamı da eklenebilir.
  // Şimdilik çekirdek havuzlar var.
  const ADA_LINES = {
    needy: [
      "Bugün hiç iyi değilim… biraz destek olsan keşke",
      "Keşke biri beni düşündüğünü gösterse",
      "Bugün her şey üst üste geldi",
      "Bazen küçük şeyler çok şey anlatır",
      "Bir kahve bile alamadım",
      "Yanımda olsan yeterdi ama…",
      "Şu an biri bana sahip çıksa",
      "Bugün moralim sıfır",
      "Bugün her şey çok pahalı",
      "Beni mutlu etmek senin elinde",
      "Bazen destek her şeydir",
      "Küçük bir şey bile yeter"
    ],
    // “Sınırda ama sansürlü” ton
    flirty_suggestive: [
      "Şu an yanımda olsaydın ilginç olurdu",
      "Bazen fazla yakın olmak isterim",
      "Şu an modum biraz tehlikeli",
      "Hayal gücün kuvvetli mi?",
      "Şu an burada olmanı isterdim",
      "Bazen kontrolü bırakmak isterim",
      "Yakınlık bazen pahalıdır",
      "Beni biraz şımart",
      "İstersen daha özel olur",
      "Bu anı satın alabilirsin"
    ],
    paid: [
      "Bunu yaptığın için teşekkür ederim",
      "Gerçekten düşündüğünü hissettirdin",
      "Şu an daha iyiyim",
      "Beni mutlu ettin",
      "Bunu unutmayacağım",
      "İyi ki varsın",
      "Beni özel hissettirdin",
      "Şu an her şey daha güzel",
      "Tamam… teşekkür ederim. Sonra konuşuruz."
    ],
    refused: [
      "Anlıyorum…",
      "Beklediğim bu değildi",
      "Demek öyle",
      "Sen bilirsin",
      "Bunu not ettim",
      "Soğudum biraz",
      "Zaten tahmin etmiştim",
      "Mesaj atma şimdi"
    ],
    money_push: [
      "Ne kadar lazım, net söyle.",
      "Ne için lazım?",
      "Tamam… ama bunu alışkanlık yapma.",
      "Bakarız. Ne kadar?"
    ]
  };

  // =========================
  // KIZ PROFILI
  // =========================
  // role: "friend" | "hardToGet" | "girlfriend" vs.
  function createGirl({ id, name, role, personality }) {
    return {
      id,
      name,
      role: role || "friend",
      personality: personality || "warm", // warm | strict | playful | calculating
      mood: 60,         // 0..100
      affection: 60,    // 0..100
      jealousy: 20,     // 0..100
      neglect: 0,       // gün ihmal sayısı
      memory: [],       // son mesajlar
      moneyRequests: 0, // kaç kez para istedi
      pendingRequest: null, // {amount, reason}
      lastIncomingAt: 0
    };
  }

  // =========================
  // INTENT ANALIZ
  // =========================
  function analyzeIntent(raw) {
    const t = normTR(raw);

    const isQuestion = t.includes("?") || hasAny(t, ["mi ", "misin", "musun", "nasil", "ne ", "neden", "nerde", "kac", "kim"]);
    const hasGreeting = hasAny(t, ["selam", "merhaba", "hey", "naber", "nabersin", "slm"]);
    const hasApology = hasAny(t, ["ozur", "pardon", "kusura", "affet", "yanlis anladim"]);
    const hasCompliment = hasAny(t, ["ozledim", "cok guzelsin", "guzelsin", "tatlisin", "harikasin", "iyiki", "seviyorum"]);
    const hasAnger = hasAny(t, ["sinir", "kizgin", "biktim", "yeter", "sikildim", "umrumda degil"]);
    const hasNegMood = hasAny(t, ["kotu", "berbat", "moralim bozuk", "canim sikkin", "yorgunum", "stres"]);
    const hasInvite = hasAny(t, ["bulusalim", "disari cikalim", "kahve", "sinema", "gez", "yarin", "bugun", "aksam"]);
    const hasJealousyTrigger = hasAny(t, ["kimdi o", "baska kiz", "baska biri", "ex", "eski", "kiz arkadas", "flort"]);
    const moneyTalk = hasAny(t, ["para", "gonder", "havale", "iban", "odunc", "borc", "tl", "₺"]);

    if (hasAnger) return { intent: "anger", score: -2 };
    if (hasJealousyTrigger) return { intent: "jealousy", score: -1 };
    if (hasApology) return { intent: "apology", score: +2 };
    if (hasInvite) return { intent: "invite", score: +2 };
    if (hasCompliment) return { intent: "compliment", score: +2 };
    if (hasNegMood) return { intent: "support", score: +1 };
    if (moneyTalk) return { intent: "money", score: 0 };
    if (isQuestion) return { intent: "question", score: +1 };
    if (hasGreeting) return { intent: "greeting", score: +1 };
    if (t.length <= 4) return { intent: "dry", score: -1 };
    return { intent: "neutral", score: 0 };
  }

  // =========================
  // GENEL TON PAKETI (Ece vb.)
  // =========================
  function tonePack(girl) {
    const warm = {
      greet: ["Selam :) Nasılsın?", "Hey, yazdığına sevindim.", "Merhaba!"],
      neutral: ["Anladım :)", "Tamam.", "Peki."],
      question: ["Detay ver, merak ettim.", "Hımm… neden?", "Sen ne istiyorsun?"],
      compliment: ["Gülümsettin beni.", "Tatlısın ya.", "Ben de seni düşünüyordum."],
      apology: ["Tamam, konuşup düzeltelim.", "Peki, geçti.", "Bir daha olmasın yeter."],
      invite: ["Olur. Ne zaman?", "Kahve iyi olur.", "Tamam :)"],
      support: ["Anlat istersen.", "Üzüldüm… buradayım.", "Ne oldu?"],
      anger: ["Bu ton hoş değil.", "Kırıldım.", "Sakinleşince yaz."],
      jealousy: ["Kıskandırmaya mı çalışıyorsun?", "Net konuş.", "Gerildim."],
      money: ["Şu para konusu… ne kadar lazım?", "Neden lazım?", "Bakarız."],
      dry: ["Ok deyip kaçma :)", "Biraz konuşsana.", "Neyse… anlat bakalım."]
    };

    const playful = {
      greet: ["Selammm 😄", "Naber la 😄", "Heyy"],
      neutral: ["Okey.", "Hehe.", "Aynen."],
      question: ["Anlat bakalım.", "Dök içini.", "Hadi detay 😄"],
      compliment: ["Ayy 🫠", "Kes seni 😄", "Tamam tamam 😄"],
      apology: ["Tamam barıştık.", "Affettim.", "Bir daha yapma 😄"],
      invite: ["Çıkalım.", "Kahveeee.", "Olur 😄"],
      support: ["Gel sarılalım.", "Üzülme.", "Anlat."],
      anger: ["Trip atma.", "Sakin.", "Kavga istemiyorum."],
      jealousy: ["Kıskanç mıyız 😄", "Hmm kim o?", "Açıkla bakalım."],
      money: ["Yine mi para 😄", "Kaç para bu sefer?", "Söyle bakayım."],
      dry: ["He? 😄", "2 kelimeyle mi geçiştiriyorsun?", "Yaz şunu düzgün 😄"]
    };

    const calculating = {
      greet: ["Selam.", "Merhaba.", "Nasılsın?"],
      neutral: ["Anladım.", "Peki.", "Tamam."],
      question: ["Somut konuş.", "Detay ver.", "Neden?"],
      compliment: ["Teşekkürler.", "Güzel.", "Olabilir."],
      apology: ["Tamam. Telafi et.", "Not aldım.", "Peki."],
      invite: ["Planı netleştir.", "Saat/yer?", "Bakarım."],
      support: ["Dinliyorum.", "Çözüm var mı?", "Ne istiyorsun?"],
      anger: ["Bu tonla olmaz.", "Saygı.", "Şu an kapatıyorum."],
      jealousy: ["Net ol.", "O kim?", "Bunu sevmiyorum."],
      money: ["Para? Ne kadar?", "Ne için?", "Son kez olsun."],
      dry: ["Kısa kesme.", "Düzgün yaz.", "Neyin var?"]
    };

    if (girl.personality === "playful") return playful;
    if (girl.personality === "calculating") return calculating;
    return warm;
  }

  function replyFor(girl, userText) {
    const { intent } = analyzeIntent(userText);
    const pack = tonePack(girl);

    let reply = pick(pack.neutral);

    if (intent === "greeting") reply = pick(pack.greet);
    if (intent === "question") reply = pick(pack.question);
    if (intent === "compliment") reply = pick(pack.compliment);
    if (intent === "apology") reply = pick(pack.apology);
    if (intent === "invite") reply = pick(pack.invite);
    if (intent === "support") reply = pick(pack.support);
    if (intent === "anger") reply = pick(pack.anger);
    if (intent === "jealousy") reply = pick(pack.jealousy);
    if (intent === "money") reply = pick(pack.money);
    if (intent === "dry") reply = pick(pack.dry);

    // mood modifikasyonu
    if (girl.mood < 35 && (intent === "neutral" || intent === "question")) {
      reply = pick(["Şu an modum yok.", "Sonra konuşalım.", "Kısayım."]);
    }
    if (girl.mood > 75 && (intent === "greeting" || intent === "compliment")) {
      reply = pick(["İyi ki yazdın.", "Günün güzelleşti.", "Sevindim :)"]);
    }

    return { reply, intent };
  }

  // =========================
  // ADA: DURUM TABANLI CEVAP
  // =========================
  // ctx.moneyState: "no_money"|"low_money"|"paid_recently"|"paid_often"|"refused_payment"
  function adaReplyByState(girl, ctx) {
    const moneyState = ctx?.moneyState || "no_money";
    const intent = ctx?.userIntent || "neutral";

    // Para sonrası / red sonrası doğrudan havuz
    if (moneyState === "paid_recently" || moneyState === "paid_often") {
      return pick(ADA_LINES.paid);
    }
    if (moneyState === "refused_payment") {
      return pick(ADA_LINES.refused);
    }

    // Para konuşuluyorsa
    if (intent === "money") {
      if (!girl.pendingRequest) {
        girl.pendingRequest = { amount: 150, reason: "Küçük bir işim var." };
        girl.moneyRequests += 1;
      }
      return `${pick(ADA_LINES.money_push)} (${girl.pendingRequest.amount}₺)`;
    }

    // İlgi/ima/plan konularında para eksenine çekme davranışı
    const flirtish = (intent === "compliment" || intent === "invite" || intent === "jealousy");
    if (flirtish) {
      if (!girl.pendingRequest) {
        // düşük/az para modundayken daha sık para ister
        const amount = moneyState === "low_money" ? 50 : 150;
        girl.pendingRequest = { amount, reason: "Şu an biraz sıkışığım." };
        girl.moneyRequests += 1;
      }
      // Para yokken “sınırda” ton + yönlendirme
      return `${pick(ADA_LINES.flirty_suggestive)} (${girl.pendingRequest.amount}₺ lazım)`;
    }

    // Default: needy
    if (!girl.pendingRequest && Math.random() < 0.25) {
      girl.pendingRequest = { amount: 150, reason: "Acil küçük bir şey." };
      girl.moneyRequests += 1;
    }
    return pick(ADA_LINES.needy);
  }

  // Ada için context’li reply
  function replyForWithContext(girl, userText, ctx) {
    const userIntent = analyzeIntent(userText).intent;

    if (girl.id === "ada") {
      const reply = adaReplyByState(girl, { ...(ctx || {}), userIntent });
      return { reply, intent: userIntent };
    }
    return replyFor(girl, userText);
  }

  // =========================
  // ETKI UYGULAMA
  // =========================
  function applyMessageImpact(girl, userText) {
    const { score, intent } = analyzeIntent(userText);

    girl.affection = clamp(girl.affection + score, 0, 100);

    if (intent === "anger") girl.mood = clamp(girl.mood - 15, 0, 100);
    if (intent === "compliment") girl.mood = clamp(girl.mood + 8, 0, 100);
    if (intent === "dry") girl.mood = clamp(girl.mood - 5, 0, 100);
    if (intent === "jealousy") girl.jealousy = clamp(girl.jealousy + 8, 0, 100);

    girl.memory.push({ at: Date.now(), text: userText, from: "me", intent });
    if (girl.memory.length > 30) girl.memory.shift();
  }

  // =========================
  // PARA ISTEME EVENTI (opsiyonel)
  // =========================
  function maybeRequestMoney(girl, rng = Math.random) {
    if (!girl) return null;
    if (girl.pendingRequest) return null;
    if (girl.id !== "ada") return null;

    const p = 0.22;
    if (rng() > p) return null;

    const options = [
      { amount: 150, reason: "Küçük bir işim var, acil halletmem lazım." },
      { amount: 300, reason: "Şu an sıkıştım… sonra geri atarım." },
      { amount: 50,  reason: "Bi şey alacağım da, kısa süreli." },
    ];
    const req = options[Math.floor(rng() * options.length)];
    girl.pendingRequest = req;
    girl.moneyRequests += 1;

    girl.memory.push({
      at: Date.now(),
      text: `Ya bi şey isteyeceğim… ${req.amount}₺ gönderebilir misin? ${req.reason}`,
      from: "her",
      intent: "money"
    });
    if (girl.memory.length > 30) girl.memory.shift();

    return req;
  }

  function onMoneyReceived(girl, amount) {
    if (!girl) return { ok: false };

    const amt = Math.floor(Number(amount) || 0);
    if (amt <= 0) return { ok: false };

    if (girl.pendingRequest && amt >= girl.pendingRequest.amount) {
      girl.affection = clamp(girl.affection + 6, 0, 100);
      girl.mood = clamp(girl.mood + 6, 0, 100);
      girl.pendingRequest = null;

      girl.memory.push({
        at: Date.now(),
        text: pick(ADA_LINES.paid),
        from: "her",
        intent: "neutral"
      });
      if (girl.memory.length > 30) girl.memory.shift();

      return { ok: true, effect: "good" };
    }

    // “durduk yere para attın”
    girl.affection = clamp(girl.affection + 2, 0, 100);
    girl.mood = clamp(girl.mood + 2, 0, 100);
    girl.memory.push({
      at: Date.now(),
      text: "Havale mi yaptın? İlginç… teşekkürler.",
      from: "her",
      intent: "neutral"
    });
    if (girl.memory.length > 30) girl.memory.shift();

    return { ok: true, effect: "neutral" };
  }

  window.Girls = {
    createGirl,
    analyzeIntent,
    replyFor,
    replyForWithContext,
    applyMessageImpact,
    maybeRequestMoney,
    onMoneyReceived,
    clamp
  };
})();
