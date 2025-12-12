// girls.js
// Kız/NPC diyalog + ilişki mantığı burada.

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

  function createGirl({ id, name }) {
    return {
      id,
      name,
      mood: 60,         // 0..100
      affection: 60,    // 0..100
      jealousy: 35,     // 0..100
      neglect: 0,       // gün ihmal sayısı
      memory: [],       // son mesajlar
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
    const veryShort = t.length <= 4;

    if (hasAnger) return { intent: "anger", score: -2 };
    if (hasJealousyTrigger) return { intent: "jealousy", score: -1 };
    if (hasApology) return { intent: "apology", score: +2 };
    if (hasInvite) return { intent: "invite", score: +2 };
    if (hasCompliment) return { intent: "compliment", score: +2 };
    if (hasNegMood) return { intent: "support", score: +1 };
    if (isQuestion) return { intent: "question", score: +1 };
    if (hasGreeting) return { intent: "greeting", score: +1 };
    if (veryShort) return { intent: "dry", score: -1 };
    return { intent: "neutral", score: 0 };
  }

  function replyFor(girl, userText) {
    const { intent } = analyzeIntent(userText);

    const base = {
      greeting: [
        "Selam :) Günün nasıl gidiyor?",
        "Merhaba. Nasılsın?",
        "Hey, yazdığına sevindim."
      ],
      question: [
        "Olabilir. Detay ver biraz, merak ettim.",
        "Hımm… mantıklı. Ama neden böyle oldu sence?",
        "Anladım. Peki sen ne istiyorsun?"
      ],
      compliment: [
        "Ya :) gülümsettin beni.",
        "Tatlısın… teşekkür ederim.",
        "Ben de seni düşünüyordum."
      ],
      apology: [
        "Tamam… ama tekrar olmasın.",
        "Özürünü kabul ettim. Konuşup düzeltelim.",
        "Peki. Net ol yeter."
      ],
      invite: [
        "Olur. Ne zaman?",
        "Kahve olur. Saat kaç?",
        "Tamam. Planı yap :)"
      ],
      support: [
        "Üzüldüm… anlatmak ister misin?",
        "Gel konuşalım. Ne oldu?",
        "Yanındayım. Ne yapabilirim?"
      ],
      jealousy: [
        "Şu an beni kıskandırmaya mı çalışıyorsun?",
        "Açık konuş: bir şey mi var?",
        "Bunu duyunca gerildim."
      ],
      anger: [
        "Bu ton hoş değil. Sakinleşince yaz.",
        "Kırıldım. Böyle konuşma.",
        "Şu an tartışmak istemiyorum."
      ],
      dry: [
        "‘Ok’ deyip bırakma ya… :)",
        "Biraz daha konuşsana.",
        "Neyse… anlat bakalım."
      ],
      neutral: [
        "Anladım.",
        "Tamam :)",
        "Peki…"
      ]
    };

    const mood = girl.mood;
    let reply = pick(base[intent] || base.neutral);

    if (mood < 35 && (intent === "neutral" || intent === "question")) {
      reply = pick(["Kısayım şu an.", "Sonra konuşalım.", "Şu an modum yok."]);
    }
    if (mood > 75 && (intent === "greeting" || intent === "compliment")) {
      reply = pick(["Ayy :) iyi ki yazdın.", "Ben de tam seni düşünüyordum.", "Günün güzelleşti."]);
    }

    return { reply, intent };
  }

  function applyMessageImpact(girl, userText) {
    const { score, intent } = analyzeIntent(userText);

    girl.affection = clamp(girl.affection + score, 0, 100);

    if (intent === "jealousy") girl.jealousy = clamp(girl.jealousy + 8, 0, 100);
    if (intent === "anger") girl.mood = clamp(girl.mood - 15, 0, 100);
    if (intent === "compliment") girl.mood = clamp(girl.mood + 8, 0, 100);
    if (intent === "dry") girl.mood = clamp(girl.mood - 5, 0, 100);

    girl.memory.push({ at: Date.now(), text: userText, intent });
    if (girl.memory.length > 10) girl.memory.shift();
  }

  window.Girls = { createGirl, replyFor, applyMessageImpact, analyzeIntent };
})();
