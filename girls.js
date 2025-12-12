// girls.js - çoklu kız + kişilik + para isteme sinyali

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

  // role: "friend" | "hardToGet" | "girlfriend" vs.
  function createGirl({ id, name, role, personality }) {
    return {
      id,
      name,
      role: role || "friend",
      personality: personality || "warm", // warm | strict | playful | calculating
      mood: 60,
      affection: 60,
      jealousy: 20,
      neglect: 0,
      memory: [],
      moneyRequests: 0,     // kaç kez para istedi
      pendingRequest: null, // {amount, reason}
      lastIncomingAt: 0
    };
  }

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

  function tonePack(girl) {
    // kişilik bazlı cevap havuzu farkı
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
    };

    const strict = {
      greet: ["Merhaba.", "Selam.", "Nasılsın?"],
      neutral: ["Tamam.", "Peki.", "Anladım."],
      question: ["Açık konuş.", "Detay ver.", "Mantığını söyle."],
      compliment: ["Teşekkür ederim.", "Hm.", "İyisin."],
      apology: ["Not aldım. Tekrar olmasın.", "Tamam.", "Peki."],
      invite: ["Programımı söyle.", "Bakarız.", "Saat kaç?"],
      support: ["Geçer.", "Dinliyorum.", "Ne oldu?"],
      anger: ["Bu üslup olmaz.", "Kes.", "Şu an konuşma."],
      jealousy: ["Saçmalama.", "Net ol.", "Beni karıştırma."],
      money: ["Para isteme konusunu abartma.", "Ne kadar ve neden?", "Bu alışkanlık olmasın."],
    };

    const playful = {
      greet: ["Selammm 😄", "Naber la 😄", "Heyy"],
      neutral: ["Okey.", "Hehe.", "Aynen."],
      question: ["Anlat bakalım.", "Dök içini.", "Hadi detay 😄"],
      compliment: ["Ayy 🫠", "Kes seni 😄", "Tamam tamam 😄"],
      apology: ["Tamam barıştık.", "Affettim.", "Bir daha yapma 😄"],
      invite: ["Çıkalım.", "Kahveeee.", "Olur 😄"],
      support: ["Gel sarılalım.", "Üzülme.", "Anlat."],
      anger: ["Trip atma.", "Sakin.", "Kesin kavga istemiyorum."],
      jealousy: ["Kıskanç mıyız 😄", "Hmm kim o?", "Açıkla bakalım."],
      money: ["Yine mi para 😄", "Kaç para bu sefer?", "Söyle bakayım."],
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
    };

    if (girl.personality === "strict") return strict;
    if (girl.personality === "playful") return playful;
    if (girl.personality === "calculating") return calculating;
    return warm;
  }

  function replyFor(girl, userText) {
    const { intent } = analyzeIntent(userText);
    const pack = tonePack(girl);

    let reply = pack.neutral[Math.floor(Math.random() * pack.neutral.length)];

    if (intent === "greeting") reply = pick(pack.greet);
    if (intent === "question") reply = pick(pack.question);
    if (intent === "compliment") reply = pick(pack.compliment);
    if (intent === "apology") reply = pick(pack.apology);
    if (intent === "invite") reply = pick(pack.invite);
    if (intent === "support") reply = pick(pack.support);
    if (intent === "anger") reply = pick(pack.anger);
    if (intent === "jealousy") reply = pick(pack.jealousy);
    if (intent === "money") reply = pick(pack.money);

    // mood modifikasyonu
    if (girl.mood < 35 && (intent === "neutral" || intent === "question")) {
      reply = pick(["Şu an modum yok.", "Sonra konuşalım.", "Kısayım."]);
    }
    if (girl.mood > 75 && (intent === "greeting" || intent === "compliment")) {
      reply = pick(["İyi ki yazdın.", "Günün güzelleşti.", "Sevindim :)"]);
    }

    return { reply, intent };
  }

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

  // Ada: arada para ister (hardToGet + calculating)
  function maybeRequestMoney(girl, rng = Math.random) {
    if (!girl) return null;
    if (girl.pendingRequest) return null;
    if (girl.id !== "ada") return null;

    // düşük olasılık, gün bazlı hissettirsin
    const p = 0.22; // demo
    if (rng() > p) return null;

    const options = [
      { amount: 150, reason: "Küçük bir işim var, acil halletmem lazım." },
      { amount: 300, reason: "Şu an sıkıştım… sonra geri atarım." },
      { amount: 50,  reason: "Bi şey alacağım da, kısa süreli." },
    ];
    const req = options[Math.floor(rng() * options.length)];
    girl.pendingRequest = req;
    girl.moneyRequests += 1;

    // para isteyince tavır: biraz mesafeli ama net
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
    if (girl.pendingRequest && amount >= girl.pendingRequest.amount) {
      girl.affection = clamp(girl.affection + 6, 0, 100);
      girl.mood = clamp(girl.mood + 6, 0, 100);
      girl.pendingRequest = null;

      girl.memory.push({
        at: Date.now(),
        text: "Tamam… teşekkür ederim. Sonra konuşuruz.",
        from: "her",
        intent: "neutral"
      });
      return { ok: true, effect: "good" };
    }

    // “durduk yere para attın” etkisi
    girl.affection = clamp(girl.affection + 2, 0, 100);
    girl.mood = clamp(girl.mood + 2, 0, 100);
    girl.memory.push({
      at: Date.now(),
      text: "Havale mi yaptın? İlginç… teşekkürler.",
      from: "her",
      intent: "neutral"
    });
    return { ok: true, effect: "neutral" };
  }

  window.Girls = {
    createGirl,
    analyzeIntent,
    replyFor,
    applyMessageImpact,
    maybeRequestMoney,
    onMoneyReceived,
    clamp
  };
})();
