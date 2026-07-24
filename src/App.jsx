import { useState, useEffect, useMemo, useRef } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine
} from "recharts";
import {
  LayoutDashboard, Search, Newspaper, Star, ClipboardList, BookOpen, FlaskConical,
  Bot, Settings as SettingsIcon, ChevronLeft, ChevronRight, TrendingUp, TrendingDown,
  Minus, Coins, Landmark, Package, Send, Trash2, Plus, AlertTriangle,
  Layers, Calculator, Circle
} from "lucide-react";

/* ============================== الألوان والهوية البصرية ============================== */
const C = {
  bgDeep: "#F3F8FD",
  bgPanel: "#FFFFFF",
  bgPanel2: "#EAF4FC",
  border: "#D4E6F5",
  gold: "#2F8FEF",
  goldBright: "#0B5ED7",
  softWhite: "#16283B",
  dim: "#5D7B98",
  cyan: "#0FA6C9",
  green: "#12A97B",
  red: "#E0424F",
  navy2: "#DCEEFB",
};
const FONT_AR = "'Tajawal','Segoe UI',Tahoma,Arial,sans-serif";
const FONT_MONO = "'JetBrains Mono',ui-monospace,'Courier New',monospace";

/* ============================== أدوات مساعدة ============================== */
function hashStr(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function mulberry32(seed) {
  let a = seed;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function fmtNum(n, d = 2) {
  if (n === undefined || n === null || isNaN(n)) return "—";
  return n.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });
}
function clamp(x, lo, hi) { return Math.max(lo, Math.min(hi, x)); }
function ema(arr, period) {
  const k = 2 / (period + 1);
  let prev = arr.slice(0, period).reduce((a, b) => a + b, 0) / Math.min(period, arr.length);
  const out = [];
  for (let i = 0; i < arr.length; i++) {
    prev = i === 0 ? arr[0] : arr[i] * k + prev * (1 - k);
    out.push(prev);
  }
  return out;
}
function rsi(arr, period = 14) {
  let gains = 0, losses = 0;
  const out = new Array(arr.length).fill(50);
  for (let i = 1; i < arr.length; i++) {
    const diff = arr[i] - arr[i - 1];
    const g = diff > 0 ? diff : 0;
    const l = diff < 0 ? -diff : 0;
    if (i <= period) { gains += g; losses += l; out[i] = 50; }
    else {
      gains = (gains * (period - 1) + g) / period;
      losses = (losses * (period - 1) + l) / period;
      const rs = losses === 0 ? 100 : gains / losses;
      out[i] = 100 - 100 / (1 + rs);
    }
  }
  return out;
}
function stdevReturns(arr, n = 20) {
  const slice = arr.slice(-n);
  const rets = [];
  for (let i = 1; i < slice.length; i++) rets.push((slice[i] - slice[i - 1]) / slice[i - 1]);
  const mean = rets.reduce((a, b) => a + b, 0) / rets.length;
  const variance = rets.reduce((a, b) => a + (b - mean) ** 2, 0) / rets.length;
  return Math.sqrt(variance);
}

/* ============================== الأصول المالية ============================== */
const ASSET_DEFS = [
  { id: "EURUSD", nameAr: "EUR / USD", category: "forex", base: 1.0850, decimals: 4 },
  { id: "GBPUSD", nameAr: "GBP / USD", category: "forex", base: 1.2650, decimals: 4 },
  { id: "USDJPY", nameAr: "USD / JPY", category: "forex", base: 151.20, decimals: 2 },
  { id: "USDCHF", nameAr: "USD / CHF", category: "forex", base: 0.8850, decimals: 4 },
  { id: "AUDUSD", nameAr: "AUD / USD", category: "forex", base: 0.6550, decimals: 4 },
  { id: "USDCAD", nameAr: "USD / CAD", category: "forex", base: 1.3720, decimals: 4 },
  { id: "NZDUSD", nameAr: "NZD / USD", category: "forex", base: 0.6050, decimals: 4 },
  { id: "XAUUSD", nameAr: "Gold (XAU/USD)", category: "metals", base: 3350, decimals: 2 },
  { id: "XAGUSD", nameAr: "Silver (XAG/USD)", category: "metals", base: 38.50, decimals: 2 },
  { id: "BTCUSD", nameAr: "Bitcoin (BTC)", category: "crypto", base: 112000, decimals: 0 },
  { id: "ETHUSD", nameAr: "Ethereum (ETH)", category: "crypto", base: 4200, decimals: 2 },
  { id: "SOLUSD", nameAr: "Solana (SOL)", category: "crypto", base: 210, decimals: 2 },
  { id: "BNBUSD", nameAr: "BNB", category: "crypto", base: 720, decimals: 2 },
  { id: "XRPUSD", nameAr: "XRP", category: "crypto", base: 2.85, decimals: 4 },
  { id: "SPX500", nameAr: "S&P 500", category: "indices", base: 6350, decimals: 1 },
  { id: "NAS100", nameAr: "Nasdaq 100", category: "indices", base: 23400, decimals: 1 },
  { id: "US30", nameAr: "Dow Jones", category: "indices", base: 44800, decimals: 0 },
  { id: "GER40", nameAr: "DAX 40", category: "indices", base: 19200, decimals: 1 },
  { id: "WTI", nameAr: "Crude Oil (WTI)", category: "commodities", base: 71.5, decimals: 2 },
  { id: "NATGAS", nameAr: "Natural Gas", category: "commodities", base: 3.15, decimals: 3 },
];
// خريطة الأصول المستخدمة لحساب مؤشرات فنية حقيقية (EMA/RSI) من بيانات Twelve Data التاريخية.
// هذه منفصلة عن مصدر السعر اللحظي (قد يأتي السعر من مزود أسرع بينما المؤشرات تُحسب من هذه البيانات).
const TD_HISTORY_SYMBOLS = {
  EURUSD: "EUR/USD",
  GBPUSD: "GBP/USD",
  USDJPY: "USD/JPY",
  USDCHF: "USD/CHF",
  AUDUSD: "AUD/USD",
  USDCAD: "USD/CAD",
  NZDUSD: "NZD/USD",
  XAUUSD: "XAU/USD",
};

// أسعار لحظية من Twelve Data: الذهب فقط الآن (الفوركس انتقل إلى Finnhub الأسرع أدناه).
// هذا يوفر معظم حصة الـ 800 credit/يوم لصالح ميزة البيانات التاريخية.
const TD_QUOTE_SYMBOLS = { XAUUSD: "XAU/USD" };
const GOLD_REFRESH_INTERVAL_MS = 600000; // 10 دقائق — آمن جدًا لرمز واحد فقط

// Finnhub: أسعار فوركس لحظية حقيقية عبر طلب واحد يرجع كل الأزواج دفعة واحدة (forex/rates).
// الباقة المجانية 60 طلب/دقيقة بدون حد يومي عملي — تسمح بتحديث كل 60 ثانية فعليًا.
// invert:true يعني السعر = 1 / السعر المرجعي (لأزواج مثل EUR/USD حيث الدولار هو العملة المقابلة).
const FINNHUB_PAIRS = [
  { id: "EURUSD", ccy: "EUR", invert: true },
  { id: "GBPUSD", ccy: "GBP", invert: true },
  { id: "USDJPY", ccy: "JPY", invert: false },
  { id: "USDCHF", ccy: "CHF", invert: false },
  { id: "AUDUSD", ccy: "AUD", invert: true },
  { id: "USDCAD", ccy: "CAD", invert: false },
  { id: "NZDUSD", ccy: "NZD", invert: true },
];
const FOREX_REFRESH_INTERVAL_MS = 60000; // 60 ثانية

// Binance: عملات رقمية عبر API عام مجاني بالكامل بدون أي مفتاح، وبدون حد يومي عملي.
// لهذا الكريبتو يتحدث كل 60 ثانية فعليًا (سرعة أعلى بكثير من الفوركس على الباقة المجانية).
const BINANCE_SYMBOLS = {
  BTCUSD: "BTCUSDT",
  ETHUSD: "ETHUSDT",
  SOLUSD: "SOLUSDT",
  BNBUSD: "BNBUSDT",
  XRPUSD: "XRPUSDT",
};
const CRYPTO_REFRESH_INTERVAL_MS = 60000; // 60 ثانية

// مجموعة كل معرّفات الأصول التي لديها أي مصدر بيانات حي (لتخطي المحاكاة العشوائية عليها)
const LIVE_MANAGED_IDS = new Set([
  ...Object.keys(TD_QUOTE_SYMBOLS),
  ...Object.keys(BINANCE_SYMBOLS),
  ...FINNHUB_PAIRS.map((p) => p.id),
]);

const CATEGORIES = [
  { id: "all", label: "الكل", icon: Layers },
  { id: "forex", label: "الفوركس", icon: Coins },
  { id: "metals", label: "المعادن", icon: Circle },
  { id: "crypto", label: "العملات الرقمية", icon: Coins },
  { id: "indices", label: "المؤشرات", icon: Landmark },
  { id: "commodities", label: "السلع", icon: Package },
];
const TIMEFRAMES = [
  { id: "MN", label: "شهري", corr: 1.0 },
  { id: "W1", label: "أسبوعي", corr: 0.9 },
  { id: "D1", label: "يومي", corr: 0.8 },
  { id: "H4", label: "4 ساعات", corr: 0.65 },
  { id: "H1", label: "ساعة", corr: 0.5 },
  { id: "M15", label: "15 دقيقة", corr: 0.35 },
  { id: "M5", label: "5 دقائق", corr: 0.25 },
  { id: "M1", label: "دقيقة", corr: 0.15 },
];

/* ============================== توليد بيانات محاكاة ============================== */
function generateSeries(base, points, drift, vol, rand) {
  let price = base;
  const arr = [];
  for (let i = 0; i < points; i++) {
    price = price * (1 + drift + (rand() - 0.5) * 2 * vol);
    arr.push(price);
  }
  return arr;
}

function buildModel(def) {
  const rand = mulberry32(hashStr(def.id));
  const trueBias = rand() * 2 - 1; // -1..1 اتجاه أساسي ثابت لكل أصل
  const volPct = 0.004 + rand() * 0.013;
  const series = generateSeries(def.base, 180, trueBias * 0.0015, volPct, rand);
  return { ...def, rand, trueBias, volPct, series };
}

function computeSignal(model) {
  const { series, trueBias, volPct, rand } = model;
  const closes = series;
  const last = closes[closes.length - 1];
  const e20 = ema(closes, 20), e50 = ema(closes, 50), e100 = ema(closes, 100);
  const r14 = rsi(closes, 14);
  const e20L = e20[e20.length - 1], e50L = e50[e50.length - 1], e100L = e100[e100.length - 1];
  const rsiL = r14[r14.length - 1];
  const atr = last * volPct * 1.3;

  // نقاط فرعية (-1..1)
  const htf = clamp(trueBias, -1, 1);
  const structure = clamp(((last - e50L) / e50L) * 18, -1, 1);
  const indicators = clamp(((e20L - e50L) / e50L) * 22 + (rsiL - 50) / 60, -1, 1);
  const priceAction = clamp(trueBias * 0.55 + (rand() - 0.5) * 0.9, -1, 1);
  const smc = clamp(trueBias * 0.5 + (rand() - 0.5) * 1.0, -1, 1);
  const liquiditySweep = rand() > 0.5;
  const newsHighImpactSoon = ["XAUUSD", "EURUSD", "USDJPY", "SPX500", "BTCUSD"].includes(model.id) && rand() > 0.45;
  const newsScore01 = newsHighImpactSoon ? 0.45 : 0.85;
  const volScore01 = clamp(1 - volPct * 45, 0.1, 1);

  const dirRaw = (htf * 0.20 + structure * 0.15 + indicators * 0.15 + priceAction * 0.15 + smc * 0.15) / 0.80;
  const bias = dirRaw > 0.14 ? "BUY" : dirRaw < -0.14 ? "SELL" : "WAIT";

  const confidence = Math.round(
    100 * (
      0.20 * ((htf + 1) / 2) +
      0.15 * ((structure + 1) / 2) +
      0.15 * ((indicators + 1) / 2) +
      0.15 * ((priceAction + 1) / 2) +
      0.15 * ((smc + 1) / 2) +
      0.10 * newsScore01 +
      0.10 * volScore01
    )
  );

  const subScores = [htf, structure, indicators, priceAction, smc];
  const agreeCount = subScores.filter((s) => (bias === "BUY" ? s > 0 : bias === "SELL" ? s < 0 : Math.abs(s) < 0.25)).length;

  // مناطق الدخول ومستويات الصفقة
  let entryLow, entryHigh, sl, tp1, tp2, tp3;
  if (bias === "BUY") {
    entryHigh = last; entryLow = last - atr * 0.35;
    sl = entryLow - atr * 1.0;
    tp1 = last + atr * 1.5; tp2 = last + atr * 2.6; tp3 = last + atr * 4.2;
  } else if (bias === "SELL") {
    entryLow = last; entryHigh = last + atr * 0.35;
    sl = entryHigh + atr * 1.0;
    tp1 = last - atr * 1.5; tp2 = last - atr * 2.6; tp3 = last - atr * 4.2;
  } else {
    entryLow = last - atr * 0.2; entryHigh = last + atr * 0.2;
    sl = null; tp1 = last + atr * 1.5; tp2 = last - atr * 1.5; tp3 = null;
  }
  const entryMid = (entryLow + entryHigh) / 2;
  const rr = sl ? Math.abs((tp2 - entryMid) / (entryMid - sl)) : null;

  const support = last - atr * 1.6;
  const resistance = last + atr * 1.6;

  // جدول الأطر الزمنية
  const tfTable = TIMEFRAMES.map((tf) => {
    const v = trueBias * tf.corr + (rand() - 0.5) * (1 - tf.corr) * 1.6;
    const trend = v > 0.15 ? "صاعد" : v < -0.15 ? "هابط" : "محايد";
    return { ...tf, trend, value: v };
  });

  const trendWord = bias === "BUY" ? "صاعد" : bias === "SELL" ? "هابط" : "متذبذب";
  const reasons = [];
  if (bias !== "WAIT") {
    reasons.push(`بنية السوق العامة على الأطر الكبرى ${trendWord === "صاعد" ? "لا تزال صاعدة" : "تميل إلى الهبوط"}، والسعر يتداول ${last > e50L ? "فوق" : "أسفل"} متوسط EMA50.`);
    reasons.push(`${e20L > e50L ? "تقاطع المتوسطات المتحركة إيجابي (EMA20 أعلى من EMA50)" : "تقاطع المتوسطات المتحركة سلبي (EMA20 أسفل EMA50)"}، وهو ما يدعم الانحياز الحالي.`);
    reasons.push(`مؤشر RSI عند ${fmtNum(rsiL, 1)} ${rsiL > 70 ? "يقترب من تشبع شرائي" : rsiL < 30 ? "يقترب من تشبع بيعي" : "دون مناطق تشبع قوية، ما يترك مجالًا لاستمرار الحركة"}.`);
    if (liquiditySweep) reasons.push(`تم رصد احتمال حدوث Liquidity Sweep حديث ${bias === "BUY" ? "أسفل قاع سابق" : "أعلى قمة سابقة"} على الأطر الأدنى، وهو ما يدعم فرضية عودة السيولة المؤسسية.`);
    reasons.push(`نسبة المخاطرة إلى العائد التقديرية عند الهدف الثاني تبلغ 1:${fmtNum(rr, 1)}، وهي ${rr >= 2 ? "مقبولة إلى جيدة" : "محدودة نسبيًا"}.`);
  } else {
    reasons.push("السوق يتحرك حاليًا داخل نطاق تذبذب دون بنية اتجاه واضحة على أغلب الأطر الزمنية.");
    reasons.push(`مؤشرات EMA20 وEMA50 متقاربة نسبيًا، ما يعكس غياب زخم اتجاهي قوي في الوقت الحالي.`);
    reasons.push("يُفضل انتظار كسر واضح لأحد حدود النطاق مصحوبًا بتأكيد من حركة السعر قبل الدخول.");
  }

  const risks = [];
  if (volPct > 0.011) risks.push("مستوى التقلب الحالي مرتفع نسبيًا مقارنة بالمتوسط، ما يستدعي تصغير حجم المركز.");
  if (newsHighImpactSoon) risks.push("هناك حدث اقتصادي عالي التأثير متوقع خلال الساعات القادمة قد يزيد التقلب بشكل مفاجئ.");
  if (agreeCount < 3) risks.push("عدد التأكيدات بين الأنظمة الفرعية منخفض نسبيًا، ما يجعل الإشارة أقل قوة وتحتاج حذرًا إضافيًا.");
  risks.push("لا يوجد أي ضمان لتحقيق الأهداف المحددة؛ الالتزام بإدارة المخاطر وحجم المركز المناسب أمر أساسي.");

  const invalidation = bias === "BUY"
    ? `إذا أغلق السعر إغلاقًا واضحًا أسفل مستوى ${fmtNum(sl, model.decimals)} فإن التحليل الصاعد يعتبر لاغيًا.`
    : bias === "SELL"
    ? `إذا أغلق السعر إغلاقًا واضحًا أعلى مستوى ${fmtNum(sl, model.decimals)} فإن التحليل الهابط يعتبر لاغيًا.`
    : `إذا خرج السعر بإغلاق واضح خارج نطاق ${fmtNum(support, model.decimals)} - ${fmtNum(resistance, model.decimals)} يصبح سيناريو الانتظار غير صالح.`;

  const scenarios = {
    bullish: {
      conditions: "كسر واضح فوق المقاومة القريبة مع إغلاق شمعة يومية فوقها",
      entry: `إعادة اختبار منطقة ${fmtNum(entryLow, model.decimals)} - ${fmtNum(last, model.decimals)}`,
      confirmation: "حجم تداول متزايد أو تحول في بنية السوق على 1H/4H",
      target: fmtNum(resistance + atr * 1.5, model.decimals),
    },
    bearish: {
      conditions: "كسر واضح أسفل الدعم القريب مع إغلاق شمعة يومية تحته",
      entry: `إعادة اختبار منطقة ${fmtNum(last, model.decimals)} - ${fmtNum(entryHigh, model.decimals)}`,
      confirmation: "ضعف زخم صاعد أو Change of Character على الأطر الأدنى",
      target: fmtNum(support - atr * 1.5, model.decimals),
    },
    neutral: {
      rangeLow: fmtNum(support, model.decimals),
      rangeHigh: fmtNum(resistance, model.decimals),
      waitFor: "كسر مؤكد لأحد حدي النطاق مصحوبًا بحجم وزخم واضحين قبل اتخاذ أي قرار",
    },
  };

  return {
    last, e20L, e50L, e100L, rsiL, atr, bias, confidence, agreeCount, dirRaw,
    entryLow, entryHigh, entryMid, sl, tp1, tp2, tp3, rr, support, resistance,
    tfTable, reasons, risks, invalidation, scenarios, liquiditySweep, newsHighImpactSoon,
  };
}

const STRATEGIES = [
  { id: "trend", name: "تتبع الاتجاه (Trend Following)", when: "عند وجود اتجاه واضح ومستمر على الأطر الزمنية الكبرى مع زخم قوي.", whenNot: "في الأسواق المتذبذبة أو الجانبية بدون اتجاه واضح.", strengths: "تحقق أرباحًا كبيرة عند استمرار الاتجاهات القوية.", weaknesses: "تعطي إشارات دخول متأخرة وقد تتعرض لانعكاسات مفاجئة.", winRate: 0.42, avgRR: 2.6 },
  { id: "breakout", name: "الاختراق (Breakout)", when: "عند اقتراب السعر من مستويات دعم أو مقاومة رئيسية مع تراكم ضغط سعري.", whenNot: "عند ضعف السيولة أو قرب أخبار عالية التأثير قد تسبب اختراقات كاذبة.", strengths: "تدخل مبكرًا في بداية حركات قوية.", weaknesses: "عرضة بشكل كبير للاختراقات الكاذبة (False Breakouts).", winRate: 0.38, avgRR: 2.9 },
  { id: "pullback", name: "الارتداد (Pullback)", when: "ضمن اتجاه قائم عند عودة السعر لاختبار متوسط متحرك أو منطقة طلب/عرض.", whenNot: "عند تغير بنية السوق أو ضعف الاتجاه الأساسي.", strengths: "نسبة مخاطرة إلى عائد ممتازة ونقاط دخول أوضح.", weaknesses: "قد يفوت جزءًا من الحركة الأولية وينتظر تأكيدًا طويلاً.", winRate: 0.51, avgRR: 2.1 },
  { id: "sr", name: "الدعم والمقاومة", when: "عند وصول السعر إلى مستويات تاريخية أو نفسية قوية.", whenNot: "عند اختراق تلك المستويات بزخم قوي مؤكد.", strengths: "مستويات واضحة لوقف الخسارة وجني الأرباح.", weaknesses: "المستويات القديمة قد تفقد فعاليتها مع الوقت.", winRate: 0.47, avgRR: 2.0 },
  { id: "smc", name: "Smart Money Concepts", when: "عند رصد تجمعات سيولة، Order Blocks أو Fair Value Gaps واضحة.", whenNot: "في غياب سيولة واضحة أو بنية سوق مشوشة.", strengths: "يحاكي سلوك اللاعبين المؤسساتيين ويعطي دخولاً دقيقًا.", weaknesses: "يتطلب خبرة عالية في القراءة وقد يعطي إشارات متضاربة للمبتدئين.", winRate: 0.45, avgRR: 3.1 },
  { id: "liqsweep", name: "Liquidity Sweep", when: "بعد كسر وهمي لقاع أو قمة سابقة يتبعه انعكاس سريع.", whenNot: "عند استمرار الاختراق دون علامات انعكاس.", strengths: "دخول قريب جدًا من نقطة الانعكاس الفعلية.", weaknesses: "يحتاج تأكيدًا سريعًا وقد يتشابه مع بداية اختراق حقيقي.", winRate: 0.44, avgRR: 2.7 },
  { id: "emax", name: "EMA Crossover", when: "عند تقاطع المتوسطات المتحركة القصيرة والطويلة في اتجاه واضح.", whenNot: "في الأسواق العرضية حيث تتكرر التقاطعات الكاذبة.", strengths: "سهل الفهم والتطبيق والأتمتة.", weaknesses: "متأخر بطبيعته ويعطي إشارات كاذبة كثيرة في التذبذب.", winRate: 0.40, avgRR: 2.2 },
  { id: "rsi", name: "RSI Reversal", when: "عند دخول المؤشر مناطق تشبع شرائي أو بيعي واضحة مع تباعد (Divergence).", whenNot: "خلال اتجاهات قوية حيث يبقى المؤشر في التشبع لفترة طويلة.", strengths: "يحدد نقاط انعكاس محتملة مبكرًا.", weaknesses: "قد يعطي إشارات مبكرة جدًا ضد اتجاه قوي.", winRate: 0.43, avgRR: 1.9 },
  { id: "macd", name: "MACD Momentum", when: "عند تقاطع خط الإشارة مع تسارع واضح في الزخم.", whenNot: "في الأسواق منخفضة التقلب حيث تتكرر التقاطعات الضعيفة.", strengths: "يجمع بين الاتجاه والزخم في مؤشر واحد.", weaknesses: "يتأخر عن حركة السعر الفعلية.", winRate: 0.41, avgRR: 2.3 },
  { id: "sd", name: "العرض والطلب (Supply & Demand)", when: "عند عودة السعر لأول اختبار لمنطقة عرض أو طلب حديثة وقوية.", whenNot: "عند اختبار المنطقة لأكثر من مرتين دون رد فعل قوي.", strengths: "دخول دقيق بوقف خسارة صغير نسبيًا.", weaknesses: "تحديد حدود المنطقة يحتاج خبرة وقد يختلف من محلل لآخر.", winRate: 0.46, avgRR: 2.8 },
  { id: "mtf", name: "تأكيد متعدد الأطر الزمنية", when: "عند توافق الاتجاه على 3 أطر زمنية مختلفة على الأقل.", whenNot: "عند تضارب واضح بين الأطر الزمنية الكبرى والصغرى.", strengths: "يقلل الإشارات الكاذبة عبر طبقات تأكيد متعددة.", weaknesses: "قد يعطي إشارات متأخرة بسبب انتظار التوافق.", winRate: 0.49, avgRR: 2.4 },
  { id: "ict_core", name: "ICT — بنية السوق والسيولة (Inner Circle Trader)", when: "عند رصد Break of Structure (BOS) أو Change of Character (CHoCH/MSS) مصحوبًا بضربة سيولة واضحة (Liquidity Sweep) فوق Buy Side Liquidity أو تحت Sell Side Liquidity، خصوصًا عند Equal Highs/Equal Lows (فخ سيولة نموذجي).", whenNot: "في غياب أي إشارة سيولة واضحة، أو عندما تكون بنية السوق مشوشة بلا BOS/CHoCH واضح على الإطار المستخدم.", strengths: "يحاكي منطق تحرك المؤسسات (تجميع السيولة قبل الحركة الحقيقية)، ويعطي نقاط انعكاس دقيقة نسبيًا.", weaknesses: "يتطلب خبرة عالية بقراءة الشموع والهيكلة، وقد تتشابه ضربة السيولة الحقيقية مع بداية اختراق فعلي.", winRate: 0.46, avgRR: 3.0 },
  { id: "ict_pd", name: "ICT — مناطق Premium / Discount / Equilibrium", when: "عند تحديد نطاق حركة واضح (Swing High إلى Swing Low) والبحث عن الشراء من منطقة Discount (أسفل 50% من النطاق) أو البيع من منطقة Premium (أعلى 50%)، مع Equilibrium كخط فاصل مرجعي.", whenNot: "عندما لا يوجد نطاق سعري واضح المعالم حديثًا (سوق بلا تذبذب محدد الحدود).", strengths: "يعطي إطارًا منطقيًا لتحديد \"رخص\" أو \"غلاء\" السعر نسبيًا قبل الدخول.", weaknesses: "تحديد بداية ونهاية النطاق يختلف من محلل لآخر، وقد يتغير مع تحديث الهيكلة.", winRate: 0.45, avgRR: 2.5 },
  { id: "ict_fvg_ob", name: "ICT — الفجوات السعرية والـ Order Blocks (FVG/OB)", when: "عند عودة السعر لملء Fair Value Gap (فجوة 3 شمعات) أو اختبار أول Order Block (آخر شمعة معاكسة قبل BOS)، خصوصًا عند تطابقهما في نفس المنطقة.", whenNot: "بعد اختبار المنطقة أكثر من مرتين دون رد فعل قوي، أو إذا تحول الـ Order Block إلى Breaker Block (انعكس دوره من دعم لمقاومة أو العكس) دون توضيح ذلك بالتحليل.", strengths: "دخول دقيق جدًا بوقف خسارة صغير نسبيًا لقربه من نقطة الإبطال الطبيعية.", weaknesses: "تحديد حدود FVG/OB بدقة يحتاج ممارسة، وقد تتعدد المناطق المرشحة على نفس الشارت.", winRate: 0.47, avgRR: 2.9 },
  { id: "ict_time", name: "ICT — نماذج الوقت (Silver Bullet / Power of 3 / Judas Swing)", when: "خلال نافذة Silver Bullet (10-11 صباحًا بتوقيت نيويورك)، أو عند تمييز مراحل Power of 3 (تجميع ثم تلاعب ثم توزيع)، أو عند رصد حركة كاذبة أول الجلسة (Judas Swing) تسبق الاتجاه الحقيقي.", whenNot: "خارج نوافذ الوقت المؤسسية النشطة، أو في الأسواق منخفضة السيولة (عطلات، جلسة آسيوية هادئة).", strengths: "يربط التحليل بتوقيت حقيقي لنشاط المؤسسات، ويقلل التداول العشوائي بلا سياق زمني.", weaknesses: "يفترض تطابق سلوك السوق مع الجلسات الأمريكية، وقد لا يصلح لكل الأصول أو التوقيتات.", winRate: 0.44, avgRR: 2.7 },
  { id: "ict_2022", name: "ICT — نموذج الدخول 2022 (FVG + OB + Liquidity)", when: "عند تتابع الشروط الثلاثة معًا: ضربة سيولة، ثم Order Block مؤكد، ثم Fair Value Gap في اتجاه الحركة الجديدة.", whenNot: "عند توفر شرط أو شرطين فقط من الثلاثة دون اكتمال الصورة الكاملة.", strengths: "تراكم عدة تأكيدات ICT في نموذج واحد يرفع جودة الإشارة.", weaknesses: "نادر الحدوث الكامل، ما يعني فرصًا أقل تكرارًا مقارنة بنماذج أبسط.", winRate: 0.48, avgRR: 3.2 },
  { id: "ict_2023", name: "ICT — نموذج الدخول 2023 (بنية + اندفاع + FVG)", when: "عند تغيّر واضح في بنية السوق (BOS/CHoCH) مصحوب بشمعة اندفاع قوية (Displacement) تترك خلفها Fair Value Gap يُستخدم كنقطة عودة للدخول.", whenNot: "عند غياب شمعة اندفاع واضحة (حركة بطيئة ومتذبذبة دون قوة زخم حقيقية).", strengths: "يعتمد على قوة الزخم الفعلي (Displacement) كتأكيد إضافي بدل الاعتماد على المناطق فقط.", weaknesses: "يحتاج خبرة لتمييز شمعة الاندفاع الحقيقية عن التذبذب العادي.", winRate: 0.47, avgRR: 2.8 },
  { id: "ict_turtle", name: "ICT — Turtle Soup (فخ السيولة والانعكاس)", when: "عند كسر وهمي لقاع أو قمة سابقة (تشبه اختراقًا حقيقيًا) يتبعه رجوع سريع للداخل، ما يشير لفخ سيولة كلاسيكي.", whenNot: "عند استمرار الاختراق دون أي علامة رجوع سريع (يكون اختراقًا حقيقيًا لا فخًا).", strengths: "دخول قريب جدًا من نقطة الانعكاس الفعلية بمخاطرة محدودة.", weaknesses: "يتشابه كثيرًا مع بداية اختراق حقيقي، ويحتاج تأكيدًا سريعًا قبل الدخول.", winRate: 0.45, avgRR: 2.6 },
];

const NEWS_EVENTS = [
  { id: 1, name: "قرار سعر الفائدة - الاحتياطي الفيدرالي (FOMC)", country: "الولايات المتحدة", impact: "HIGH", offsetDays: 2, forecast: "4.00%", previous: "4.25%" },
  { id: 2, name: "مؤشر أسعار المستهلك (CPI)", country: "الولايات المتحدة", impact: "HIGH", offsetDays: -1, forecast: "2.9%", previous: "3.0%", actual: "2.8%" },
  { id: 3, name: "تقرير الوظائف غير الزراعية (NFP)", country: "الولايات المتحدة", impact: "HIGH", offsetDays: 5, forecast: "180K", previous: "165K" },
  { id: 4, name: "الناتج المحلي الإجمالي (GDP)", country: "منطقة اليورو", impact: "MEDIUM", offsetDays: 4, forecast: "0.4%", previous: "0.3%" },
  { id: 5, name: "قرار سعر الفائدة - البنك المركزي الأوروبي (ECB)", country: "منطقة اليورو", impact: "HIGH", offsetDays: 7, forecast: "2.25%", previous: "2.25%" },
  { id: 6, name: "قرار سعر الفائدة - بنك إنجلترا (BOE)", country: "المملكة المتحدة", impact: "MEDIUM", offsetDays: 9, forecast: "4.00%", previous: "4.25%" },
  { id: 7, name: "قرار سعر الفائدة - بنك اليابان (BOJ)", country: "اليابان", impact: "MEDIUM", offsetDays: 11, forecast: "0.75%", previous: "0.50%" },
  { id: 8, name: "مؤشر مديري المشتريات الصناعي (PMI)", country: "الولايات المتحدة", impact: "LOW", offsetDays: 1, forecast: "51.2", previous: "50.8" },
  { id: 9, name: "مخزونات النفط الخام الأسبوعية", country: "الولايات المتحدة", impact: "LOW", offsetDays: 0, forecast: "-1.8M", previous: "-2.3M" },
  { id: 10, name: "مؤشر ثقة المستهلك", country: "الولايات المتحدة", impact: "MEDIUM", offsetDays: 3, forecast: "104.5", previous: "102.1" },
];

/* ============================== تخزين محلي دائم ============================== */
async function loadKey(key, fallback) {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (e) { return fallback; }
}
async function saveKey(key, value) {
  try { window.localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* تجاهل */ }
}

/* ============================== مكونات مساعدة صغيرة ============================== */
function BiasBadge({ bias, size = "sm" }) {
  const map = {
    BUY: { color: C.green, label: "شراء", Icon: TrendingUp },
    SELL: { color: C.red, label: "بيع", Icon: TrendingDown },
    WAIT: { color: C.gold, label: "انتظار", Icon: Minus },
  };
  const m = map[bias] || map.WAIT;
  const pad = size === "lg" ? "px-4 py-1.5 text-sm" : "px-2.5 py-1 text-xs";
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full font-bold ${pad}`}
      style={{ background: `${m.color}1A`, color: m.color, border: `1px solid ${m.color}55` }}>
      <m.Icon size={size === "lg" ? 16 : 13} /> {m.label}
    </span>
  );
}

function ConfidenceGauge({ value, size = 74 }) {
  const r = (size - 10) / 2;
  const circumference = 2 * Math.PI * r;
  const offset = circumference * (1 - value / 100);
  const color = value >= 75 ? C.green : value >= 50 ? C.gold : C.red;
  return (
    <div style={{ width: size, height: size, position: "relative" }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={r} stroke={C.border} strokeWidth="6" fill="none" />
        <circle cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth="6" fill="none"
          strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column" }}>
        <span style={{ fontFamily: FONT_MONO, fontWeight: 700, fontSize: size / 3.4, color: C.softWhite }} dir="ltr">{value}%</span>
      </div>
    </div>
  );
}

function Sparkline({ data, color }) {
  const chartData = data.map((v, i) => ({ i, v }));
  return (
    <ResponsiveContainer width="100%" height={40}>
      <LineChart data={chartData}>
        <Line type="monotone" dataKey="v" stroke={color} strokeWidth={1.6} dot={false} isAnimationActive={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}

function VolBadge({ volPct }) {
  const level = volPct > 0.011 ? "مرتفع" : volPct > 0.007 ? "متوسط" : "منخفض";
  const color = volPct > 0.011 ? C.red : volPct > 0.007 ? C.gold : C.cyan;
  return <span style={{ color }} className="text-xs font-semibold">{level}</span>;
}

function DataSourceBadge({ live }) {
  return (
    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded"
      style={{
        color: live ? C.green : C.dim,
        background: live ? `${C.green}1A` : `${C.dim}14`,
        border: `1px solid ${live ? C.green + "44" : C.border}`,
      }}>
      {live ? "LIVE" : "SIMULATED"}
    </span>
  );
}

function SectionTitle({ icon: Icon, title, subtitle }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <div className="rounded-xl p-2" style={{ background: `${C.gold}14`, border: `1px solid ${C.gold}33` }}>
        <Icon size={18} color={C.gold} />
      </div>
      <div>
        <h2 className="text-lg font-bold" style={{ color: C.softWhite }}>{title}</h2>
        {subtitle && <p className="text-xs" style={{ color: C.dim }}>{subtitle}</p>}
      </div>
    </div>
  );
}

// خريطة رموز TradingView لكل أصل (مطلوبة لتشغيل تشارت TradingView الحقيقي والتفاعلي)
const TV_SYMBOLS = {
  EURUSD: "FX:EURUSD",
  GBPUSD: "FX:GBPUSD",
  USDJPY: "FX:USDJPY",
  USDCHF: "FX:USDCHF",
  AUDUSD: "FX:AUDUSD",
  USDCAD: "FX:USDCAD",
  NZDUSD: "FX:NZDUSD",
  XAUUSD: "OANDA:XAUUSD",
  XAGUSD: "OANDA:XAGUSD",
  BTCUSD: "BINANCE:BTCUSDT",
  ETHUSD: "BINANCE:ETHUSDT",
  SOLUSD: "BINANCE:SOLUSDT",
  BNBUSD: "BINANCE:BNBUSDT",
  XRPUSD: "BINANCE:XRPUSDT",
  SPX500: "FOREXCOM:SPXUSD",
  NAS100: "FOREXCOM:NSXUSD",
  US30: "FOREXCOM:DJI",
  GER40: "FOREXCOM:GRXEUR",
  WTI: "TVC:USOIL",
  NATGAS: "TVC:NATURALGAS",
};

// تشارت TradingView الحقيقي (الودجت المجاني الرسمي embed-widget-advanced-chart)
function TradingViewWidget({ symbol, height = 720 }) {
  const config = {
    symbol: symbol || "FX:EURUSD",
    interval: "60",
    timezone: "Etc/UTC",
    theme: "light",
    style: "1",
    locale: "ar",
    enable_publishing: false,
    backgroundColor: "rgba(255, 255, 255, 1)",
    gridColor: "rgba(212, 230, 245, 0.6)",
    hide_top_toolbar: false,
    hide_legend: false,
    withdateranges: true,
    save_image: false,
    calendar: false,
    support_host: "https://www.tradingview.com",
  };
  const src = `https://www.tradingview-widget.com/embed-widget/advanced-chart/?locale=ar#${encodeURIComponent(JSON.stringify(config))}`;

  return (
    <iframe
      key={symbol}
      src={src}
      title={`tradingview-${symbol}`}
      width="100%"
      height={height}
      frameBorder="0"
      allowTransparency="true"
      scrolling="no"
      style={{ display: "block", border: "none", width: "100%", height: `${height}px` }}
    />
  );
}

function Panel({ children, className = "", style = {} }) {
  return (
    <div className={`rounded-2xl ${className}`}
      style={{ background: `linear-gradient(180deg, ${C.bgPanel}, ${C.bgPanel2})`, border: `1px solid ${C.border}`, backdropFilter: "blur(6px)", ...style }}>
      {children}
    </div>
  );
}

/* ============================== الشريط الجانبي ============================== */
const NAV_ITEMS = [
  { id: "dashboard", label: "لوحة التحكم", icon: LayoutDashboard },
  { id: "scanner", label: "الماسح الذكي", icon: Search },
  { id: "forex", label: "الفوركس", icon: Coins, cat: "forex" },
  { id: "gold", label: "الذهب", icon: Circle, cat: "metals", assetId: "XAUUSD" },
  { id: "crypto", label: "العملات الرقمية", icon: Coins, cat: "crypto" },
  { id: "indices", label: "المؤشرات", icon: Landmark, cat: "indices" },
  { id: "commodities", label: "السلع", icon: Package, cat: "commodities" },
  { id: "news", label: "الأخبار والتقويم", icon: Newspaper },
  { id: "watchlist", label: "قائمة المراقبة", icon: Star },
  { id: "tradeplan", label: "خطة التداول", icon: Calculator },
  { id: "journal", label: "دفتر التداول", icon: ClipboardList },
  { id: "backtest", label: "الاختبار الخلفي", icon: BookOpen },
  { id: "strategies", label: "مختبر الاستراتيجيات", icon: FlaskConical },
  { id: "assistant", label: "مساعد الذكاء الاصطناعي", icon: Bot },
  { id: "settings", label: "الإعدادات", icon: SettingsIcon },
];

function Sidebar({ view, setView, collapsed, setCollapsed, setCategory, setSelectedAssetId }) {
  return (
    <aside className="h-screen sticky top-0 flex flex-col shrink-0 transition-all duration-300"
      style={{ width: collapsed ? 72 : 248, background: C.bgPanel2, borderLeft: `1px solid ${C.border}` }}>
      <div className="flex items-center gap-2 px-4 py-5" style={{ borderBottom: `1px solid ${C.border}` }}>
        <img src="/logo.jpg" alt="SAAD AI Trading"
          className="w-9 h-9 rounded-full object-cover shrink-0"
          style={{ border: `2px solid ${C.gold}` }} />
        {!collapsed && (
          <div className="leading-tight overflow-hidden">
            <div className="font-extrabold text-sm truncate" style={{ color: C.softWhite }}>SAAD AI Trading</div>
            <div className="text-[10px] truncate" style={{ color: C.gold }}>منصة تحليل الأسواق الذكية</div>
          </div>
        )}
      </div>
      <nav className="flex-1 overflow-y-auto py-3 px-2 flex flex-col gap-1">
        {NAV_ITEMS.map((item) => {
          const active = view === item.id || (item.cat && view === "dashboard-cat-" + item.cat);
          return (
            <button key={item.id}
              onClick={() => {
                if (item.assetId) { setSelectedAssetId(item.assetId); setView("asset"); }
                else if (item.cat) { setCategory(item.cat); setView("dashboard"); }
                else { setView(item.id); }
              }}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors"
              style={{
                color: active ? C.gold : C.dim,
                background: active ? `${C.gold}14` : "transparent",
                border: active ? `1px solid ${C.gold}33` : "1px solid transparent",
              }}>
              <item.icon size={17} className="shrink-0" />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </button>
          );
        })}
      </nav>
      <button onClick={() => setCollapsed(!collapsed)} className="flex items-center justify-center gap-2 py-3 text-xs"
        style={{ color: C.dim, borderTop: `1px solid ${C.border}` }}>
        {collapsed ? <ChevronLeft size={16} /> : <><ChevronRight size={16} /> طي القائمة</>}
      </button>
    </aside>
  );
}

/* ============================== الشريط العلوي ============================== */
function TopBar({ overallSentiment }) {
  const [now, setNow] = useState(new Date());
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 1000 * 30); return () => clearInterval(t); }, []);
  return (
    <div className="flex items-center justify-between px-6 py-4 sticky top-0 z-20"
      style={{ background: `${C.bgDeep}E6`, backdropFilter: "blur(8px)", borderBottom: `1px solid ${C.border}` }}>
      <div className="flex items-center gap-3">
        <span className="text-xs px-3 py-1 rounded-full font-bold" style={{ background: `${C.gold}1A`, color: C.gold, border: `1px solid ${C.gold}44` }}>
          HYBRID DATA — بعض الأصول LIVE عبر Twelve Data والباقي محاكاة
        </span>
        <span className="hidden md:flex items-center gap-1.5 text-xs" style={{ color: C.dim }}>
          <TrendingUp size={13} color={overallSentiment >= 50 ? C.green : C.red} />
          معنويات السوق العامة: <b style={{ color: overallSentiment >= 50 ? C.green : C.red }} dir="ltr">{overallSentiment}%</b>
        </span>
      </div>
      <div className="text-xs" style={{ color: C.dim }}>
        {now.toLocaleDateString("ar-EG", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
      </div>
    </div>
  );
}

/* ============================== بطاقة أصل مالي ============================== */
function MarketCard({ model, signal, price, changePct, inWatchlist, onToggleWatch, onOpen, live }) {
  return (
    <Panel className="p-4 cursor-pointer hover:brightness-110 transition" style={{}}>
      <div onClick={onOpen}>
        <div className="flex items-start justify-between mb-2">
          <div>
            <div className="flex items-center gap-1.5">
              <div className="font-bold text-sm" style={{ color: C.softWhite }}>{model.nameAr}</div>
              <DataSourceBadge live={!!live} />
            </div>
            <div className="text-[11px]" style={{ color: C.dim }}>{model.id}</div>
          </div>
          <button onClick={(e) => { e.stopPropagation(); onToggleWatch(); }} className="p-1">
            <Star size={16} fill={inWatchlist ? C.gold : "none"} color={inWatchlist ? C.gold : C.dim} />
          </button>
        </div>
        <div className="flex items-end justify-between mb-2">
          <div>
            <div className="font-extrabold text-lg" style={{ fontFamily: FONT_MONO, color: C.softWhite }} dir="ltr">
              {fmtNum(price, model.decimals)}
            </div>
            <div className="text-xs font-semibold" style={{ color: changePct >= 0 ? C.green : C.red }} dir="ltr">
              {changePct >= 0 ? "+" : ""}{fmtNum(changePct, 2)}%
            </div>
          </div>
          <div className="w-24">
            <Sparkline data={model.series.slice(-30)} color={signal.bias === "BUY" ? C.green : signal.bias === "SELL" ? C.red : C.gold} />
          </div>
        </div>
        <div className="flex items-center justify-between mt-3">
          <BiasBadge bias={signal.bias} />
          <div className="text-left">
            <div className="text-[10px]" style={{ color: C.dim }}>الثقة</div>
            <div className="font-bold text-sm" style={{ fontFamily: FONT_MONO, color: C.goldBright }} dir="ltr">{signal.confidence}%</div>
          </div>
        </div>
        <div className="flex items-center justify-between mt-2 text-[11px]" style={{ color: C.dim }}>
          <span>التقلب: <VolBadge volPct={model.volPct} /></span>
          <span>R:R {signal.rr ? `1:${fmtNum(signal.rr, 1)}` : "—"}</span>
        </div>
      </div>
    </Panel>
  );
}

/* ============================== لوحة التحكم / الأسواق ============================== */
function Dashboard({ models, signals, prices, changes, category, setCategory, watchlist, toggleWatch, openAsset, liveStatus }) {
  const filtered = category === "all" ? models : models.filter((m) => m.category === category);
  return (
    <div>
      <SectionTitle icon={LayoutDashboard} title="نظرة عامة على الأسواق" subtitle="جميع الأصول المدعومة مع إشارة الذكاء الاصطناعي اللحظية (محاكاة)" />
      <div className="flex flex-wrap gap-2 mb-5">
        {CATEGORIES.map((c) => (
          <button key={c.id} onClick={() => setCategory(c.id)}
            className="px-3.5 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5"
            style={{
              background: category === c.id ? C.gold : "transparent",
              color: category === c.id ? "#FFFFFF" : C.dim,
              border: `1px solid ${category === c.id ? C.gold : C.border}`,
            }}>
            <c.icon size={13} /> {c.label}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filtered.map((m) => (
          <MarketCard key={m.id} model={m} signal={signals[m.id]} price={prices[m.id]} changePct={changes[m.id]}
            inWatchlist={watchlist.includes(m.id)} onToggleWatch={() => toggleWatch(m.id)} onOpen={() => openAsset(m.id)} live={liveStatus[m.id]} />
        ))}
      </div>
    </div>
  );
}

/* ============================== جدول الأطر الزمنية ============================== */
function TimeframeLadder({ tfTable }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs" style={{ color: C.softWhite }}>
        <thead>
          <tr style={{ color: C.dim }}>
            <th className="text-right py-2 font-semibold">الإطار الزمني</th>
            <th className="text-right py-2 font-semibold">الاتجاه</th>
            <th className="text-right py-2 font-semibold">القراءة</th>
          </tr>
        </thead>
        <tbody>
          {tfTable.map((tf) => {
            const color = tf.trend === "صاعد" ? C.green : tf.trend === "هابط" ? C.red : C.gold;
            return (
              <tr key={tf.id} style={{ borderTop: `1px solid ${C.border}` }}>
                <td className="py-2 font-semibold">{tf.label}</td>
                <td className="py-2">
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-bold" style={{ background: `${color}1A`, color }}>{tf.trend}</span>
                </td>
                <td className="py-2 w-1/2">
                  <div className="h-1.5 rounded-full" style={{ background: C.border }}>
                    <div className="h-1.5 rounded-full" style={{ width: `${Math.abs(tf.value) * 50 + 10}%`, background: color, marginRight: tf.value < 0 ? 0 : "auto", marginLeft: tf.value >= 0 ? 0 : "auto" }} />
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/* ============================== صفحة تفاصيل الأصل ============================== */
function AssetDetail({ model, signal, price, changePct, inWatchlist, toggleWatch, goToPlan, live }) {
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState(null);
  const [aiError, setAiError] = useState(null);

  async function runFullAI() {
    setAiLoading(true); setAiError(null); setAiResult(null);
    try {
      const mtfLines = signal.tfTable.map((tf) => `  - ${tf.label}: ${tf.trend}`).join("\n");
      const stratLines = STRATEGIES.map((s) =>
        `  - ${s.name}\n    متى تُستخدم: ${s.when}\n    متى لا تُستخدم: ${s.whenNot}\n    نقاط القوة: ${s.strengths}\n    نقاط الضعف: ${s.weaknesses}`
      ).join("\n");

      const userPrompt = `حلل الأصل التالي بشكل كامل باستخدام كل الاستراتيجيات والتحليل الفني المتاح، وأعطني قرارًا نهائيًا صريحًا: BUY أو SELL أو WAIT.

بيانات الأصل: ${model.id} (${model.nameAr})
مصدر السعر: ${live ? "حي فعلي (LIVE عبر Twelve Data)" : "محاكاة (SIMULATED)"}
السعر الحالي: ${fmtNum(price, model.decimals)}
التغير: ${fmtNum(changePct, 2)}%
التقلب اليومي التقديري: ${fmtNum(model.volPct * 100, 2)}%

المؤشرات الفنية:
- EMA20: ${fmtNum(signal.e20L, model.decimals)} | EMA50: ${fmtNum(signal.e50L, model.decimals)} | EMA100: ${fmtNum(signal.e100L, model.decimals)}
- RSI(14): ${fmtNum(signal.rsiL, 1)}
- ATR التقديري: ${fmtNum(signal.atr, model.decimals)}
- الدعم: ${fmtNum(signal.support, model.decimals)} | المقاومة: ${fmtNum(signal.resistance, model.decimals)}

بنية السوق عبر الأطر الزمنية:
${mtfLines}

تحليل النظام الآلي المبدئي (قاعدة بيانات كمّية أولية، يمكنك تأكيده أو تعديله بعد تحليلك):
- الانحياز: ${signal.bias} | الثقة: ${signal.confidence}% | التأكيدات: ${signal.agreeCount}/5
- منطقة الدخول: ${fmtNum(Math.min(signal.entryLow, signal.entryHigh), model.decimals)}-${fmtNum(Math.max(signal.entryLow, signal.entryHigh), model.decimals)}
- SL: ${signal.sl ? fmtNum(signal.sl, model.decimals) : "—"} | TP1/TP2/TP3: ${fmtNum(signal.tp1, model.decimals)}/${signal.tp2 ? fmtNum(signal.tp2, model.decimals) : "—"}/${signal.tp3 ? fmtNum(signal.tp3, model.decimals) : "—"}
- R:R: ${signal.rr ? "1:" + fmtNum(signal.rr, 1) : "—"}
- مستوى إبطال التحليل: ${signal.invalidation}

مكتبة الاستراتيجيات المتاحة في المنصة (قيّم مدى انطباق كل واحدة على الوضع الحالي):
${stratLines}

المطلوب منك بالتنسيق التالي بالضبط:
1) الاستراتيجيات المنطبقة الآن (اذكر كل استراتيجية منطبقة وسبب انطباقها باختصار).
2) التحليل الفني المجمّع (فقرة قصيرة تربط بين المؤشرات وبنية السوق والأطر الزمنية).
3) القرار النهائي: BUY أو SELL أو WAIT + نسبة ثقة تقديرية بالنسبة المئوية.
4) خطة الصفقة المقترحة: منطقة دخول، وقف خسارة، أهداف الربح، ونسبة R:R.
5) المخاطر الرئيسية والسيناريو البديل ومستوى إبطال التحليل.
لا تضمن الربح أبدًا واذكر أن هذا تحليل احتمالي وليس نصيحة مالية شخصية.`;

      const resp = await fetch("/.netlify/functions/ai-assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system: "أنت محلل أسواق مالية خبير بكل الاستراتيجيات الفنية المذكورة أدناه، بما فيها منهجية ICT (Inner Circle Trader) الكاملة: بنية السوق (BOS, CHoCH/MSS)، السيولة (Buy Side/Sell Side Liquidity، Equal Highs/Lows، Liquidity Sweep)، مناطق Premium/Discount/Equilibrium، الفجوات السعرية (Fair Value Gap) وOrder Blocks وBreaker Blocks، نماذج التوقيت (Silver Bullet، Power of 3، Judas Swing)، ونماذج الدخول (2022 Model، 2023 Model، Turtle Soup). استخدم هذه المصطلحات بدقة عند انطباقها على بيانات الأصل المعطاة. أجب بالعربية فقط، بأسلوب محلل محترف منظم بنقاط، والتزم حرفيًا بالتنسيق المطلوب من المستخدم.",
          messages: [{ role: "user", content: userPrompt }],
        }),
      });
      if (!resp.ok) throw new Error("bad response");
      const dataResp = await resp.json();
      const text = (dataResp.content || []).map((b) => b.text || "").join("\n").trim();
      if (!text) throw new Error("empty");
      setAiResult(text);
    } catch (e) {
      setAiError("تعذر الحصول على تحليل الذكاء الاصطناعي حاليًا. تأكد من ضبط OPENROUTER_API_KEY في إعدادات Netlify.");
    } finally {
      setAiLoading(false);
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-xl font-extrabold flex items-center gap-2" style={{ color: C.softWhite }}>{model.nameAr} <span className="text-sm font-normal" style={{ color: C.dim }}>({model.id})</span> <DataSourceBadge live={!!live} /></h1>
            <div className="flex items-center gap-3 mt-1">
              <span className="font-extrabold text-2xl" style={{ fontFamily: FONT_MONO, color: C.softWhite }} dir="ltr">{fmtNum(price, model.decimals)}</span>
              <span className="font-semibold text-sm" style={{ color: changePct >= 0 ? C.green : C.red }} dir="ltr">{changePct >= 0 ? "+" : ""}{fmtNum(changePct, 2)}%</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={toggleWatch} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold"
            style={{ border: `1px solid ${C.border}`, color: inWatchlist ? C.gold : C.dim }}>
            <Star size={14} fill={inWatchlist ? C.gold : "none"} /> {inWatchlist ? "في المراقبة" : "أضف للمراقبة"}
          </button>
          <button onClick={goToPlan} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold"
            style={{ background: C.gold, color: "#FFFFFF" }}>
            <Calculator size={14} /> حاسبة المخاطر
          </button>
        </div>
      </div>

      <Panel className="p-4 mb-5">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold" style={{ color: C.goldBright }}>تشارت TradingView المباشر</span>
          <span className="text-[11px]" style={{ color: C.dim }}>الرمز: <b style={{ color: C.gold }} dir="ltr">{TV_SYMBOLS[model.id] || "غير مدعوم"}</b></span>
        </div>
        {TV_SYMBOLS[model.id] ? (
          <div className="tv-chart-box">
            <TradingViewWidget symbol={TV_SYMBOLS[model.id]} height={720} />
          </div>
        ) : (
          <div className="rounded-xl p-6 text-xs text-center" style={{ background: C.bgDeep, border: `1px solid ${C.border}`, color: C.dim }}>
            هذا الأصل غير مدعوم حاليًا على TradingView ضمن هذه المنصة.
          </div>
        )}
        <p className="text-[11px] mt-2" style={{ color: C.dim }}>
          التشارت مزوّد مباشرة من TradingView (بيانات وأدوات رسم حقيقية). مستويات الدخول ووقف الخسارة والأهداف والدعم/المقاومة المقترحة من الذكاء الاصطناعي موضحة بالتفصيل أسفل هذا القسم.
        </p>
      </Panel>

      <Panel className="p-4 mb-5">
        <SectionTitle icon={Layers} title="التحليل متعدد الأطر الزمنية" subtitle="تقييم الاتجاه على كل إطار زمني ومدى توافقه مع الانحياز العام" />
        <TimeframeLadder tfTable={signal.tfTable} />
      </Panel>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
        <Panel className="p-4">
          <div className="flex items-center justify-between mb-3">
            <SectionTitle icon={Bot} title="تحليل الذكاء الاصطناعي" />
            <ConfidenceGauge value={signal.confidence} size={64} />
          </div>
          <div className="flex items-center flex-wrap gap-3 mb-3">
            <BiasBadge bias={signal.bias} size="lg" />
            <span className="text-xs" style={{ color: C.dim }}>التأكيدات: <b style={{ color: C.softWhite }}>{signal.agreeCount}/5</b></span>
            {signal.indicatorsReal ? (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded" style={{ color: C.green, background: `${C.green}1A`, border: `1px solid ${C.green}44` }}>
                مؤشرات من بيانات حقيقية
              </span>
            ) : (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded" style={{ color: C.dim, background: `${C.dim}14`, border: `1px solid ${C.border}` }}>
                مؤشرات محاكاة
              </span>
            )}
          </div>
          <div className="mb-3">
            <div className="text-xs font-bold mb-1.5" style={{ color: C.goldBright }}>لماذا هذا القرار؟</div>
            <ul className="space-y-1.5 text-xs" style={{ color: C.softWhite }}>
              {signal.reasons.map((r, i) => <li key={i} className="flex gap-2"><span style={{ color: C.gold }}>•</span><span>{r}</span></li>)}
            </ul>
          </div>
          <div className="mb-3">
            <div className="text-xs font-bold mb-1.5" style={{ color: C.red }}>المخاطر المحتملة</div>
            <ul className="space-y-1.5 text-xs" style={{ color: C.softWhite }}>
              {signal.risks.map((r, i) => <li key={i} className="flex gap-2"><AlertTriangle size={13} color={C.red} className="mt-0.5 shrink-0" /><span>{r}</span></li>)}
            </ul>
          </div>
          <div className="rounded-xl p-3 text-xs" style={{ background: `${C.red}0D`, border: `1px solid ${C.red}33`, color: C.softWhite }}>
            <b style={{ color: C.red }}>مستوى إبطال التحليل: </b>{signal.invalidation}
          </div>
        </Panel>

        <Panel className="p-4">
          <SectionTitle icon={Calculator} title="خطة الصفقة المقترحة" />
          <div className="grid grid-cols-2 gap-3 text-xs">
            <PlanStat label="منطقة الدخول" value={`${fmtNum(Math.min(signal.entryLow, signal.entryHigh), model.decimals)} - ${fmtNum(Math.max(signal.entryLow, signal.entryHigh), model.decimals)}`} />
            <PlanStat label="وقف الخسارة" value={signal.sl ? fmtNum(signal.sl, model.decimals) : "—"} color={C.red} />
            <PlanStat label="الهدف الأول" value={fmtNum(signal.tp1, model.decimals)} color={C.green} />
            <PlanStat label="الهدف الثاني" value={signal.tp2 ? fmtNum(signal.tp2, model.decimals) : "—"} color={C.green} />
            <PlanStat label="الهدف الثالث" value={signal.tp3 ? fmtNum(signal.tp3, model.decimals) : "—"} color={C.green} />
            <PlanStat label="نسبة R:R" value={signal.rr ? `1:${fmtNum(signal.rr, 1)}` : "—"} color={C.gold} />
          </div>
          <button onClick={goToPlan} className="w-full mt-4 py-2.5 rounded-xl text-sm font-bold" style={{ background: C.gold, color: "#FFFFFF" }}>
            فتح حاسبة إدارة المخاطر لهذا الأصل
          </button>
        </Panel>
      </div>

      <Panel className="p-4 mb-5">
        <div className="flex items-center justify-between mb-3">
          <SectionTitle icon={Bot} title="التحليل الشامل بالذكاء الاصطناعي" subtitle="يشغّل النموذج كل الاستراتيجيات (11) على بيانات هذا الأصل عبر OpenRouter" />
        </div>
        {!aiResult && !aiLoading && (
          <button onClick={runFullAI} className="w-full py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2"
            style={{ background: `linear-gradient(135deg, ${C.cyan}, ${C.gold})`, color: "#FFFFFF" }}>
            <Bot size={16} /> شغّل تحليل الذكاء الاصطناعي الكامل لهذا الأصل
          </button>
        )}
        {aiLoading && (
          <div className="text-xs flex items-center gap-2" style={{ color: C.dim }}>
            <Bot size={14} className="animate-pulse" /> النموذج يحلل كل الاستراتيجيات والمؤشرات الآن...
          </div>
        )}
        {aiError && (
          <div className="rounded-xl p-3 text-xs mb-2" style={{ background: `${C.red}0D`, border: `1px solid ${C.red}33`, color: C.softWhite }}>
            {aiError}
          </div>
        )}
        {aiResult && (
          <>
            <div className="rounded-xl p-4 text-xs leading-relaxed whitespace-pre-wrap mb-3" style={{ background: C.bgDeep, border: `1px solid ${C.border}`, color: C.softWhite }}>
              {aiResult}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[10px]" style={{ color: C.dim }}>المصدر: OpenRouter — هذا تحليل احتمالي وليس نصيحة مالية شخصية</span>
              <button onClick={runFullAI} className="text-xs font-semibold px-3 py-1.5 rounded-lg" style={{ border: `1px solid ${C.border}`, color: C.gold }}>إعادة التحليل</button>
            </div>
          </>
        )}
      </Panel>

      <Panel className="p-4">
        <SectionTitle icon={Layers} title="السيناريوهات المحتملة" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <ScenarioCard title="السيناريو الصاعد" color={C.green} rows={[["الشروط", signal.scenarios.bullish.conditions], ["منطقة الدخول", signal.scenarios.bullish.entry], ["التأكيد", signal.scenarios.bullish.confirmation], ["الهدف", signal.scenarios.bullish.target]]} />
          <ScenarioCard title="السيناريو الهابط" color={C.red} rows={[["الشروط", signal.scenarios.bearish.conditions], ["منطقة الدخول", signal.scenarios.bearish.entry], ["التأكيد", signal.scenarios.bearish.confirmation], ["الهدف", signal.scenarios.bearish.target]]} />
          <ScenarioCard title="السيناريو المحايد" color={C.gold} rows={[["حدود النطاق", `${signal.scenarios.neutral.rangeLow} - ${signal.scenarios.neutral.rangeHigh}`], ["ماذا ننتظر؟", signal.scenarios.neutral.waitFor]]} />
        </div>
      </Panel>
    </div>
  );
}
function PlanStat({ label, value, color }) {
  return (
    <div className="rounded-xl p-3" style={{ background: C.bgDeep, border: `1px solid ${C.border}` }}>
      <div style={{ color: C.dim }} className="mb-1">{label}</div>
      <div style={{ fontFamily: FONT_MONO, color: color || C.softWhite, fontWeight: 700 }} dir="ltr">{value}</div>
    </div>
  );
}
function ScenarioCard({ title, color, rows }) {
  return (
    <div className="rounded-xl p-4" style={{ background: C.bgDeep, border: `1px solid ${color}44` }}>
      <div className="font-bold text-sm mb-2" style={{ color }}>{title}</div>
      <div className="space-y-2 text-xs">
        {rows.map(([k, v], i) => (
          <div key={i}>
            <div style={{ color: C.dim }}>{k}</div>
            <div style={{ color: C.softWhite }}>{v}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ============================== الماسح الذكي ============================== */
function Scanner({ models, signals, prices, sortBy, setSortBy, filterBias, setFilterBias, openAsset }) {
  let rows = models.map((m) => ({ m, s: signals[m.id], p: prices[m.id] }));
  if (filterBias !== "ALL") rows = rows.filter((r) => r.s.bias === filterBias);
  rows.sort((a, b) => {
    if (sortBy === "confidence") return b.s.confidence - a.s.confidence;
    if (sortBy === "rr") return (b.s.rr || 0) - (a.s.rr || 0);
    if (sortBy === "volatility") return b.m.volPct - a.m.volPct;
    return 0;
  });
  return (
    <div>
      <SectionTitle icon={Search} title="AI MARKET OPPORTUNITIES — الماسح الذكي للفرص" subtitle="ترتيب جميع الأصول وفق قوة إشارة الذكاء الاصطناعي" />
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex gap-2">
          {["ALL", "BUY", "SELL", "WAIT"].map((f) => (
            <button key={f} onClick={() => setFilterBias(f)} className="px-3 py-1.5 rounded-full text-xs font-semibold"
              style={{ background: filterBias === f ? C.gold : "transparent", color: filterBias === f ? "#FFFFFF" : C.dim, border: `1px solid ${filterBias === f ? C.gold : C.border}` }}>
              {f === "ALL" ? "الكل" : f === "BUY" ? "شراء" : f === "SELL" ? "بيع" : "انتظار"}
            </button>
          ))}
        </div>
        <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="text-xs rounded-lg px-3 py-2"
          style={{ background: C.bgPanel2, color: C.softWhite, border: `1px solid ${C.border}` }}>
          <option value="confidence">ترتيب حسب الثقة</option>
          <option value="rr">ترتيب حسب R:R</option>
          <option value="volatility">ترتيب حسب التقلب</option>
        </select>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {rows.map(({ m, s, p }) => (
          <Panel key={m.id} className="p-4 cursor-pointer hover:brightness-110" onClick={() => openAsset(m.id)}>
            <div className="flex items-center justify-between mb-2">
              <div className="font-bold text-sm" style={{ color: C.softWhite }}>{m.nameAr}</div>
              <BiasBadge bias={s.bias} />
            </div>
            <div className="flex items-center justify-between text-xs mb-2">
              <span style={{ fontFamily: FONT_MONO, color: C.softWhite }} dir="ltr">{fmtNum(p, m.decimals)}</span>
              <span style={{ color: C.dim }}>R:R {s.rr ? `1:${fmtNum(s.rr, 1)}` : "—"}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-1.5 rounded-full" style={{ background: C.border }}>
                <div className="h-1.5 rounded-full" style={{ width: `${s.confidence}%`, background: s.confidence >= 75 ? C.green : s.confidence >= 50 ? C.gold : C.red }} />
              </div>
              <span className="text-xs font-bold" style={{ color: C.goldBright, fontFamily: FONT_MONO }} dir="ltr">{s.confidence}%</span>
            </div>
          </Panel>
        ))}
      </div>
    </div>
  );
}

/* ============================== قائمة المراقبة ============================== */
function Watchlist({ models, signals, prices, changes, watchlist, toggleWatch, openAsset, liveStatus }) {
  const items = models.filter((m) => watchlist.includes(m.id));
  return (
    <div>
      <SectionTitle icon={Star} title="قائمة المراقبة الشخصية" subtitle="الأصول التي تتابعها عن قرب" />
      {items.length === 0 ? (
        <Panel className="p-10 text-center">
          <Star size={32} color={C.dim} className="mx-auto mb-3" />
          <p className="text-sm" style={{ color: C.dim }}>قائمة المراقبة فارغة حاليًا. أضف أصولًا من لوحة التحكم أو صفحة الماسح الذكي.</p>
        </Panel>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((m) => (
            <MarketCard key={m.id} model={m} signal={signals[m.id]} price={prices[m.id]} changePct={changes[m.id]}
              inWatchlist={true} onToggleWatch={() => toggleWatch(m.id)} onOpen={() => openAsset(m.id)} live={liveStatus[m.id]} />
          ))}
        </div>
      )}
    </div>
  );
}

/* ============================== خطة التداول وحاسبة المخاطر ============================== */
function TradePlan({ models, signals, prices, selectedAssetId, setSelectedAssetId, settings }) {
  const model = models.find((m) => m.id === selectedAssetId) || models[0];
  const signal = signals[model.id];
  const [account, setAccount] = useState(10000);
  const [riskPct, setRiskPct] = useState(settings.defaultRisk || 1);
  const [entry, setEntry] = useState(signal.entryMid);
  const [sl, setSl] = useState(signal.sl || signal.support);
  const [tp, setTp] = useState(signal.tp2 || signal.tp1);

  useEffect(() => {
    setEntry(signal.entryMid); setSl(signal.sl || signal.support); setTp(signal.tp2 || signal.tp1);
    // eslint-disable-next-line
  }, [selectedAssetId]);

  const riskAmount = account * (riskPct / 100);
  const slDistance = Math.abs(entry - sl);
  const positionSize = slDistance > 0 ? riskAmount / slDistance : 0;
  const potentialProfit = positionSize * Math.abs(tp - entry);
  const rr = slDistance > 0 ? Math.abs(tp - entry) / slDistance : 0;

  return (
    <div>
      <SectionTitle icon={Calculator} title="خطة التداول وحاسبة إدارة المخاطر" subtitle="أدخل بيانات حسابك لحساب حجم الصفقة المناسب" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <Panel className="p-4 lg:col-span-1">
          <div className="text-xs font-bold mb-3" style={{ color: C.goldBright }}>بيانات الصفقة</div>
          <label className="block text-xs mb-1" style={{ color: C.dim }}>الأصل</label>
          <select value={selectedAssetId} onChange={(e) => setSelectedAssetId(e.target.value)} className="w-full mb-3 text-xs rounded-lg px-3 py-2"
            style={{ background: C.bgDeep, color: C.softWhite, border: `1px solid ${C.border}` }}>
            {models.map((m) => <option key={m.id} value={m.id}>{m.nameAr} ({m.id})</option>)}
          </select>
          <NumField label="حجم الحساب ($)" value={account} onChange={setAccount} />
          <NumField label="نسبة المخاطرة (%)" value={riskPct} onChange={setRiskPct} step={0.1} />
          <NumField label="سعر الدخول" value={entry} onChange={setEntry} step={0.0001} />
          <NumField label="وقف الخسارة" value={sl} onChange={setSl} step={0.0001} />
          <NumField label="جني الأرباح" value={tp} onChange={setTp} step={0.0001} />
        </Panel>
        <Panel className="p-5 lg:col-span-2">
          <div className="text-xs font-bold mb-4" style={{ color: C.goldBright }}>نتائج الحساب</div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <PlanStat label="حجم الصفقة المقترح (وحدات)" value={fmtNum(positionSize, 2)} color={C.cyan} />
            <PlanStat label="أقصى خسارة محتملة" value={`$${fmtNum(riskAmount, 2)}`} color={C.red} />
            <PlanStat label="الربح المحتمل عند الهدف" value={`$${fmtNum(potentialProfit, 2)}`} color={C.green} />
            <PlanStat label="نسبة المخاطرة إلى العائد" value={`1:${fmtNum(rr, 2)}`} color={C.gold} />
            <PlanStat label="مسافة وقف الخسارة" value={fmtNum(slDistance, model.decimals)} />
            <PlanStat label="بيانات AI الحالية" value={`${signal.bias} • ${signal.confidence}%`} />
          </div>
          <div className="mt-5 rounded-xl p-3 text-xs" style={{ background: `${C.gold}0D`, border: `1px solid ${C.gold}33`, color: C.softWhite }}>
            هذه الحاسبة لا تأخذ في الاعتبار متطلبات الهامش أو حجم العقد الخاص بالوسيط؛ يرجى التحقق من مواصفات الوسيط الفعلي قبل التنفيذ. لا يوجد ضمان لتحقيق أي ربح.
          </div>
        </Panel>
      </div>
    </div>
  );
}
function NumField({ label, value, onChange, step = 1 }) {
  return (
    <div className="mb-3">
      <label className="block text-xs mb-1" style={{ color: C.dim }}>{label}</label>
      <input type="number" step={step} value={value} onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        dir="ltr" className="w-full text-xs rounded-lg px-3 py-2" style={{ background: C.bgDeep, color: C.softWhite, border: `1px solid ${C.border}`, fontFamily: FONT_MONO }} />
    </div>
  );
}

/* ============================== دفتر التداول ============================== */
function Journal({ models, entries, addEntry, deleteEntry }) {
  const [form, setForm] = useState({ asset: models[0].id, direction: "BUY", entry: "", sl: "", tp: "", r: "", reason: "", psychology: "", mistakes: "", lessons: "" });
  const stats = useMemo(() => {
    if (entries.length === 0) return null;
    const rs = entries.map((e) => parseFloat(e.r) || 0);
    const wins = rs.filter((r) => r > 0);
    const losses = rs.filter((r) => r < 0);
    const winRate = (wins.length / rs.length) * 100;
    const avgR = rs.reduce((a, b) => a + b, 0) / rs.length;
    const profitFactor = losses.length ? Math.abs(wins.reduce((a, b) => a + b, 0) / losses.reduce((a, b) => a + b, 0)) : wins.length ? Infinity : 0;
    return { winRate, avgR, profitFactor, total: rs.length };
  }, [entries]);

  function submit(e) {
    e.preventDefault();
    if (!form.entry || !form.r) return;
    addEntry({ ...form, id: Date.now(), date: new Date().toISOString().slice(0, 10) });
    setForm({ asset: models[0].id, direction: "BUY", entry: "", sl: "", tp: "", r: "", reason: "", psychology: "", mistakes: "", lessons: "" });
  }

  return (
    <div>
      <SectionTitle icon={ClipboardList} title="دفتر التداول الشخصي" subtitle="سجّل صفقاتك وتابع أداءك بمرور الوقت" />
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
          <PlanStat label="عدد الصفقات" value={stats.total} />
          <PlanStat label="نسبة الفوز" value={`${fmtNum(stats.winRate, 1)}%`} color={C.green} />
          <PlanStat label="متوسط R" value={fmtNum(stats.avgR, 2)} color={stats.avgR >= 0 ? C.green : C.red} />
          <PlanStat label="عامل الربح" value={isFinite(stats.profitFactor) ? fmtNum(stats.profitFactor, 2) : "∞"} color={C.gold} />
        </div>
      )}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <Panel className="p-4 lg:col-span-1">
          <div className="text-xs font-bold mb-3" style={{ color: C.goldBright }}>إضافة صفقة جديدة</div>
          <form onSubmit={submit}>
            <label className="block text-xs mb-1" style={{ color: C.dim }}>الأصل</label>
            <select value={form.asset} onChange={(e) => setForm({ ...form, asset: e.target.value })} className="w-full mb-3 text-xs rounded-lg px-3 py-2"
              style={{ background: C.bgDeep, color: C.softWhite, border: `1px solid ${C.border}` }}>
              {models.map((m) => <option key={m.id} value={m.id}>{m.nameAr}</option>)}
            </select>
            <label className="block text-xs mb-1" style={{ color: C.dim }}>الاتجاه</label>
            <select value={form.direction} onChange={(e) => setForm({ ...form, direction: e.target.value })} className="w-full mb-3 text-xs rounded-lg px-3 py-2"
              style={{ background: C.bgDeep, color: C.softWhite, border: `1px solid ${C.border}` }}>
              <option value="BUY">شراء</option><option value="SELL">بيع</option>
            </select>
            <div className="grid grid-cols-3 gap-2 mb-3">
              <TinyField label="دخول" value={form.entry} onChange={(v) => setForm({ ...form, entry: v })} />
              <TinyField label="وقف" value={form.sl} onChange={(v) => setForm({ ...form, sl: v })} />
              <TinyField label="هدف" value={form.tp} onChange={(v) => setForm({ ...form, tp: v })} />
            </div>
            <TinyField label="النتيجة (R)" value={form.r} onChange={(v) => setForm({ ...form, r: v })} full />
            <textarea placeholder="سبب الدخول" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })}
              className="w-full mt-2 text-xs rounded-lg px-3 py-2" rows={2} style={{ background: C.bgDeep, color: C.softWhite, border: `1px solid ${C.border}` }} />
            <textarea placeholder="الحالة النفسية أثناء الصفقة" value={form.psychology} onChange={(e) => setForm({ ...form, psychology: e.target.value })}
              className="w-full mt-2 text-xs rounded-lg px-3 py-2" rows={2} style={{ background: C.bgDeep, color: C.softWhite, border: `1px solid ${C.border}` }} />
            <textarea placeholder="الأخطاء والدروس المستفادة" value={form.lessons} onChange={(e) => setForm({ ...form, lessons: e.target.value })}
              className="w-full mt-2 text-xs rounded-lg px-3 py-2" rows={2} style={{ background: C.bgDeep, color: C.softWhite, border: `1px solid ${C.border}` }} />
            <button type="submit" className="w-full mt-3 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2" style={{ background: C.gold, color: "#FFFFFF" }}>
              <Plus size={15} /> حفظ الصفقة
            </button>
          </form>
        </Panel>
        <Panel className="p-4 lg:col-span-2">
          <div className="text-xs font-bold mb-3" style={{ color: C.goldBright }}>سجل الصفقات</div>
          {entries.length === 0 ? (
            <p className="text-xs" style={{ color: C.dim }}>لا توجد صفقات مسجلة بعد.</p>
          ) : (
            <div className="space-y-2 max-h-[560px] overflow-y-auto">
              {[...entries].reverse().map((e) => (
                <div key={e.id} className="rounded-xl p-3 flex items-center justify-between text-xs" style={{ background: C.bgDeep, border: `1px solid ${C.border}` }}>
                  <div>
                    <div className="font-bold" style={{ color: C.softWhite }}>{models.find((m) => m.id === e.asset)?.nameAr || e.asset} <span style={{ color: C.dim }}>· {e.date}</span></div>
                    <div style={{ color: C.dim }}>{e.direction === "BUY" ? "شراء" : "بيع"} · دخول {e.entry || "—"} · نتيجة <b style={{ color: parseFloat(e.r) >= 0 ? C.green : C.red }}>{e.r}R</b></div>
                  </div>
                  <button onClick={() => deleteEntry(e.id)}><Trash2 size={14} color={C.dim} /></button>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}
function TinyField({ label, value, onChange, full }) {
  return (
    <div className={full ? "col-span-3" : ""}>
      <label className="block text-[10px] mb-1" style={{ color: C.dim }}>{label}</label>
      <input value={value} onChange={(e) => onChange(e.target.value)} dir="ltr" className="w-full text-xs rounded-lg px-2 py-1.5"
        style={{ background: C.bgDeep, color: C.softWhite, border: `1px solid ${C.border}`, fontFamily: FONT_MONO }} />
    </div>
  );
}

/* ============================== الاختبار الخلفي ============================== */
function Backtest({ models }) {
  const [strategyId, setStrategyId] = useState(STRATEGIES[0].id);
  const [assetId, setAssetId] = useState(models[0].id);
  const [result, setResult] = useState(null);

  function run() {
    const strat = STRATEGIES.find((s) => s.id === strategyId);
    const rand = mulberry32(hashStr(strategyId + assetId + Date.now()));
    const n = 50 + Math.floor(rand() * 30);
    let equity = 0, peak = 0, maxDD = 0, curWin = 0, curLoss = 0, maxWin = 0, maxLoss = 0;
    const curve = [{ i: 0, equity: 0 }];
    for (let i = 1; i <= n; i++) {
      const isWin = rand() < strat.winRate;
      const r = isWin ? strat.avgRR * (0.6 + rand() * 0.8) : -1 * (0.6 + rand() * 0.6);
      equity += r;
      peak = Math.max(peak, equity);
      maxDD = Math.max(maxDD, peak - equity);
      if (r > 0) { curWin++; curLoss = 0; maxWin = Math.max(maxWin, curWin); } else { curLoss++; curWin = 0; maxLoss = Math.max(maxLoss, curLoss); }
      curve.push({ i, equity: Number(equity.toFixed(2)) });
    }
    const wins = curve.slice(1).filter((_, idx) => idx >= 0);
    setResult({ curve, n, winRate: strat.winRate * 100, totalR: equity, maxDD, maxWin, maxLoss, avgR: equity / n });
  }

  const strat = STRATEGIES.find((s) => s.id === strategyId);
  return (
    <div>
      <SectionTitle icon={BookOpen} title="الاختبار الخلفي (Backtesting)" subtitle="محاكاة تعليمية لأداء استراتيجية على بيانات افتراضية — ليست بيانات تاريخية حقيقية" />
      <Panel className="p-4 mb-5">
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="block text-xs mb-1" style={{ color: C.dim }}>الاستراتيجية</label>
            <select value={strategyId} onChange={(e) => setStrategyId(e.target.value)} className="text-xs rounded-lg px-3 py-2"
              style={{ background: C.bgDeep, color: C.softWhite, border: `1px solid ${C.border}` }}>
              {STRATEGIES.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs mb-1" style={{ color: C.dim }}>الأصل</label>
            <select value={assetId} onChange={(e) => setAssetId(e.target.value)} className="text-xs rounded-lg px-3 py-2"
              style={{ background: C.bgDeep, color: C.softWhite, border: `1px solid ${C.border}` }}>
              {models.map((m) => <option key={m.id} value={m.id}>{m.nameAr}</option>)}
            </select>
          </div>
          <button onClick={run} className="px-4 py-2 rounded-xl text-sm font-bold" style={{ background: C.gold, color: "#FFFFFF" }}>تشغيل الاختبار</button>
        </div>
      </Panel>
      {result && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
            <PlanStat label="عدد الصفقات" value={result.n} />
            <PlanStat label="نسبة الفوز الافتراضية" value={`${fmtNum(result.winRate, 1)}%`} color={C.green} />
            <PlanStat label="العائد الإجمالي (R)" value={fmtNum(result.totalR, 1)} color={result.totalR >= 0 ? C.green : C.red} />
            <PlanStat label="أقصى تراجع (Drawdown)" value={`${fmtNum(result.maxDD, 1)}R`} color={C.red} />
            <PlanStat label="متوسط R لكل صفقة" value={fmtNum(result.avgR, 2)} />
            <PlanStat label="أطول سلسلة أرباح" value={result.maxWin} color={C.green} />
            <PlanStat label="أطول سلسلة خسائر" value={result.maxLoss} color={C.red} />
            <PlanStat label="نسبة R:R المفترضة" value={`1:${strat.avgRR}`} color={C.gold} />
          </div>
          <Panel className="p-4">
            <div className="text-xs font-bold mb-2" style={{ color: C.goldBright }}>منحنى الأداء التراكمي (Equity Curve)</div>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={result.curve}>
                <CartesianGrid stroke={C.border} strokeDasharray="3 3" />
                <XAxis dataKey="i" tick={{ fill: C.dim, fontSize: 10 }} />
                <YAxis tick={{ fill: C.dim, fontSize: 10 }} />
                <Tooltip contentStyle={{ background: C.bgPanel2, border: `1px solid ${C.border}` }} />
                <ReferenceLine y={0} stroke={C.dim} />
                <Line type="monotone" dataKey="equity" stroke={result.totalR >= 0 ? C.green : C.red} strokeWidth={2} dot={false} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </Panel>
        </>
      )}
    </div>
  );
}

/* ============================== مختبر الاستراتيجيات ============================== */
function StrategyLab() {
  return (
    <div>
      <SectionTitle icon={FlaskConical} title="مختبر الاستراتيجيات" subtitle="استراتيجيات قابلة للتخصيص مع شرح متى تُستخدم ومتى لا" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {STRATEGIES.map((s) => (
          <Panel key={s.id} className="p-4">
            <div className="font-bold text-sm mb-2" style={{ color: C.softWhite }}>{s.name}</div>
            <Row label="متى تُستخدم؟" value={s.when} />
            <Row label="متى لا تُستخدم؟" value={s.whenNot} />
            <Row label="نقاط القوة" value={s.strengths} color={C.green} />
            <Row label="نقاط الضعف" value={s.weaknesses} color={C.red} />
          </Panel>
        ))}
      </div>
    </div>
  );
}
function Row({ label, value, color }) {
  return (
    <div className="mb-2">
      <div className="text-[11px] font-bold" style={{ color: color || C.gold }}>{label}</div>
      <div className="text-xs" style={{ color: C.softWhite }}>{value}</div>
    </div>
  );
}

/* ============================== الأخبار والتقويم الاقتصادي وتحليل المشاعر ============================== */
function NewsPage({ overallSentiment }) {
  const today = new Date();
  return (
    <div>
      <SectionTitle icon={Newspaper} title="الأخبار والتقويم الاقتصادي" subtitle="أحداث اقتصادية نموذجية (محاكاة) مع تفسير الذكاء الاصطناعي" />
      <Panel className="p-4 mb-5">
        <div className="flex items-center justify-between mb-2">
          <div className="text-xs font-bold" style={{ color: C.goldBright }}>معنويات السوق العامة</div>
          <span className="text-[10px]" style={{ color: C.dim }}>Fear & Greed (محاكاة)</span>
        </div>
        <div className="flex items-center gap-4">
          <ConfidenceGauge value={overallSentiment} size={80} />
          <p className="text-xs flex-1" style={{ color: C.softWhite }}>
            المعنويات العامة {overallSentiment >= 55 ? "صاعدة" : overallSentiment <= 45 ? "هابطة" : "محايدة"} عند {overallSentiment}%.
            {overallSentiment >= 70 && " يبدو أن مراكز الشراء أصبحت مزدحمة نسبيًا، ما يزيد احتمال حدوث تصحيح مؤقت."}
            {overallSentiment <= 30 && " يُلاحظ تشاؤم واسع، وهو ما قد يمهد أحيانًا لفرص ارتداد فنية."}
          </p>
        </div>
      </Panel>
      <div className="space-y-3">
        {NEWS_EVENTS.map((n) => {
          const date = new Date(today); date.setDate(date.getDate() + n.offsetDays);
          const impactColor = n.impact === "HIGH" ? C.red : n.impact === "MEDIUM" ? C.gold : C.dim;
          const future = n.offsetDays >= 0;
          return (
            <Panel key={n.id} className="p-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="font-bold text-sm" style={{ color: C.softWhite }}>{n.name}</div>
                <div className="text-[11px]" style={{ color: C.dim }}>{n.country} · {date.toLocaleDateString("ar-EG")}</div>
              </div>
              <div className="flex items-center gap-4 text-[11px]" style={{ color: C.dim }}>
                <span>متوقع: <b style={{ color: C.softWhite }} dir="ltr">{n.forecast}</b></span>
                <span>سابق: <b style={{ color: C.softWhite }} dir="ltr">{n.previous}</b></span>
                <span>فعلي: <b style={{ color: C.softWhite }} dir="ltr">{future ? "—" : n.actual || "—"}</b></span>
              </div>
              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold" style={{ background: `${impactColor}1A`, color: impactColor, border: `1px solid ${impactColor}44` }}>
                {n.impact === "HIGH" ? "تأثير مرتفع" : n.impact === "MEDIUM" ? "تأثير متوسط" : "تأثير منخفض"}
              </span>
            </Panel>
          );
        })}
      </div>
    </div>
  );
}

/* ============================== مساعد الذكاء الاصطناعي ============================== */
const SUGGESTED_PROMPTS = [
  "ماذا يحدث في الذهب؟", "لماذا ينخفض BTC؟", "اعرض أقوى فرصة صعود حاليًا",
  "أي سوق لديه أفضل نسبة مخاطرة إلى عائد؟", "قارن بين الذهب والبيتكوين", "حلل EUR/USD على الأطر الزمنية",
];

function AIAssistant({ models, signals, prices }) {
  const [messages, setMessages] = useState([
    { role: "assistant", content: "أهلًا بك 👋 أنا مساعدك لتحليل الأسواق. اسألني عن أي أصل مدرج في المنصة، وسأشرح لك الانحياز الحالي، درجة الثقة، ونسبة المخاطرة إلى العائد بناءً على بيانات المحاكاة المتاحة." }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" }); }, [messages, loading]);

  const snapshot = useMemo(() => models.map((m) => {
    const s = signals[m.id];
    const emaRel = s.e20L > s.e50L ? "EMA20>EMA50 (زخم إيجابي)" : "EMA20<EMA50 (زخم سلبي)";
    const mtfBullish = s.tfTable.filter((tf) => tf.trend === "صاعد").length;
    const mtfBearish = s.tfTable.filter((tf) => tf.trend === "هابط").length;
    return [
      `### ${m.id} (${m.nameAr})`,
      `السعر: ${fmtNum(prices[m.id], m.decimals)} | التقلب: ${fmtNum(m.volPct * 100, 2)}%`,
      `الانحياز: ${s.bias} | الثقة: ${s.confidence}% | التأكيدات: ${s.agreeCount}/5`,
      `RSI(14): ${fmtNum(s.rsiL, 1)} | ${emaRel}`,
      `المواءمة عبر الأطر الزمنية: ${mtfBullish} صاعد / ${mtfBearish} هابط من أصل ${s.tfTable.length}`,
      `منطقة الدخول: ${fmtNum(Math.min(s.entryLow, s.entryHigh), m.decimals)}-${fmtNum(Math.max(s.entryLow, s.entryHigh), m.decimals)} | SL: ${s.sl ? fmtNum(s.sl, m.decimals) : "—"} | TP1/TP2/TP3: ${fmtNum(s.tp1, m.decimals)}/${s.tp2 ? fmtNum(s.tp2, m.decimals) : "—"}/${s.tp3 ? fmtNum(s.tp3, m.decimals) : "—"} | R:R ${s.rr ? "1:" + fmtNum(s.rr, 1) : "—"}`,
      `الدعم/المقاومة: ${fmtNum(s.support, m.decimals)} / ${fmtNum(s.resistance, m.decimals)}`,
      `أهم سبب: ${s.reasons[0] || "—"}`,
      `أهم خطر: ${s.risks[0] || "—"}`,
      `إبطال التحليل: ${s.invalidation}`,
    ].join("\n");
  }).join("\n\n"), [models, signals, prices]);

  async function send(text) {
    const userMsg = { role: "user", content: text };
    const newHistory = [...messages, userMsg];
    setMessages(newHistory);
    setInput("");
    setLoading(true);
    try {
      const systemPrompt = `أنت محلل أسواق مالية بالذكاء الاصطناعي داخل منصة SAAD AI Trading الشخصية. أجب بالعربية دائمًا، بأسلوب محلل محترف واضح ومباشر.

قواعد صارمة:
- لا تضمن الأرباح أبدًا ولا تستخدم عبارات مثل "مضمون" أو "أكيد".
- اعتمد فقط على بيانات التحليل الفني التالية لكل أصل (بعض الأسعار حية فعلية عبر Twelve Data، والبعض الآخر بيانات محاكاة SIMULATED لأغراض العرض — لا تخترع أرقامًا من عندك):
${snapshot}
- استخدم كل عناصر التحليل الفني المتاحة أعلاه عند الشرح: الانحياز، درجة الثقة وعدد التأكيدات، RSI وعلاقة EMA20/EMA50، مدى التوافق بين الأطر الزمنية، منطقة الدخول ووقف الخسارة والأهداف ونسبة R:R، مستويات الدعم والمقاومة، وأهم سبب وخطر ومستوى إبطال التحليل — لا تكتفِ بذكر BUY/SELL فقط.
- إذا سُئلت عن أصل غير موجود في القائمة أعلاه، وضّح أنه غير مدعوم حاليًا في المنصة.
- اذكر دائمًا أن هذا تحليل احتمالي وليس نصيحة مالية شخصية، بإيجاز دون تكرار مبالغ فيه.
- كن مختصرًا ومنظمًا (نقاط قصيرة عند الحاجة)، وركّز على: ماذا يرى النظام، ولماذا، وما المخاطر والسيناريو البديل.`;

      const resp = await fetch("/.netlify/functions/ai-assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system: systemPrompt,
          messages: newHistory.map((m) => ({ role: m.role, content: m.content })),
        }),
      });
      if (!resp.ok) throw new Error("bad response");
      const data = await resp.json();
      const textOut = (data.content || []).map((b) => b.text || "").join("\n").trim() || "تعذر الحصول على رد واضح من المساعد، حاول إعادة صياغة سؤالك.";
      setMessages((prev) => [...prev, { role: "assistant", content: textOut }]);
    } catch (err) {
      setMessages((prev) => [...prev, { role: "assistant", content: "تعذر الاتصال بالمساعد حاليًا. يرجى المحاولة مرة أخرى بعد قليل." }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-140px)]">
      <SectionTitle icon={Bot} title="مساعد الذكاء الاصطناعي لتحليل الأسواق" />
      <Panel className="flex-1 flex flex-col p-4 overflow-hidden">
        <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-3 pr-1 mb-3">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className="max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed" style={{
                background: m.role === "user" ? `${C.gold}22` : C.bgDeep,
                border: `1px solid ${m.role === "user" ? C.gold + "55" : C.border}`,
                color: C.softWhite,
              }}>
                {m.content}
              </div>
            </div>
          ))}
          {loading && <div className="text-xs" style={{ color: C.dim }}>المساعد يفكر...</div>}
        </div>
        <div className="flex flex-wrap gap-2 mb-3">
          {SUGGESTED_PROMPTS.map((p, i) => (
            <button key={i} onClick={() => setInput(p)} className="text-[11px] px-3 py-1.5 rounded-full"
              style={{ border: `1px solid ${C.border}`, color: C.dim }}>{p}</button>
          ))}
        </div>
        <form onSubmit={(e) => { e.preventDefault(); if (input.trim() && !loading) send(input.trim()); }} className="flex gap-2">
          <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="اكتب سؤالك عن أي سوق..."
            className="flex-1 text-sm rounded-xl px-4 py-2.5" style={{ background: C.bgDeep, color: C.softWhite, border: `1px solid ${C.border}` }} />
          <button type="submit" disabled={loading} className="px-4 py-2.5 rounded-xl" style={{ background: C.gold, color: "#FFFFFF" }}>
            <Send size={16} />
          </button>
        </form>
      </Panel>
    </div>
  );
}

/* ============================== الإعدادات ============================== */
function Settings({ settings, setSettings, resetData }) {
  const [confirmReset, setConfirmReset] = useState(false);
  return (
    <div>
      <SectionTitle icon={SettingsIcon} title="الإعدادات" />
      <Panel className="p-5 mb-5">
        <div className="text-xs font-bold mb-3" style={{ color: C.goldBright }}>التفضيلات الافتراضية</div>
        <label className="block text-xs mb-1" style={{ color: C.dim }}>نسبة المخاطرة الافتراضية لكل صفقة (%)</label>
        <input type="number" step={0.1} value={settings.defaultRisk} onChange={(e) => setSettings({ ...settings, defaultRisk: parseFloat(e.target.value) || 1 })}
          dir="ltr" className="w-48 text-xs rounded-lg px-3 py-2" style={{ background: C.bgDeep, color: C.softWhite, border: `1px solid ${C.border}`, fontFamily: FONT_MONO }} />
      </Panel>
      <Panel className="p-5 mb-5">
        <div className="text-xs font-bold mb-2" style={{ color: C.goldBright }}>حول جودة البيانات</div>
        <p className="text-xs leading-relaxed" style={{ color: C.softWhite }}>
          جميع الأسعار والتحليلات المعروضة في هذه المنصة هي بيانات <b style={{ color: C.gold }}>محاكاة (SIMULATED)</b> تم توليدها لأغراض العرض والتصميم فقط، وليست بيانات سوق حية أو تاريخية حقيقية.
          عند ربط المنصة بمزودي بيانات فعليين، يجب تمييز كل مصدر بوضوح: LIVE / DELAYED / HISTORICAL / SIMULATED.
        </p>
      </Panel>
      <Panel className="p-5 mb-5" style={{ borderColor: `${C.red}44` }}>
        <div className="text-xs font-bold mb-2" style={{ color: C.red }}>إخلاء مسؤولية</div>
        <p className="text-xs leading-relaxed" style={{ color: C.softWhite }}>
          هذه المنصة أداة شخصية لدعم اتخاذ القرار وتعليم التحليل الفني والأساسي، ولا تُعد نصيحة مالية أو استثمارية. جميع الإشارات مبنية على احتمالات وتقديرات، ولا يوجد أي ضمان لتحقيق ربح. التداول ينطوي على مخاطر قد تصل إلى خسارة كامل رأس المال.
        </p>
      </Panel>
      <Panel className="p-5">
        <div className="text-xs font-bold mb-2" style={{ color: C.red }}>إعادة تعيين البيانات</div>
        <p className="text-xs mb-3" style={{ color: C.dim }}>سيؤدي هذا إلى حذف قائمة المراقبة وسجل دفتر التداول المحفوظين محليًا.</p>
        {!confirmReset ? (
          <button onClick={() => setConfirmReset(true)} className="px-4 py-2 rounded-xl text-xs font-bold" style={{ border: `1px solid ${C.red}66`, color: C.red }}>حذف كل البيانات المحفوظة</button>
        ) : (
          <div className="flex gap-2">
            <button onClick={() => { resetData(); setConfirmReset(false); }} className="px-4 py-2 rounded-xl text-xs font-bold" style={{ background: C.red, color: "#fff" }}>تأكيد الحذف نهائيًا</button>
            <button onClick={() => setConfirmReset(false)} className="px-4 py-2 rounded-xl text-xs font-bold" style={{ border: `1px solid ${C.border}`, color: C.dim }}>إلغاء</button>
          </div>
        )}
      </Panel>
    </div>
  );
}

/* ============================== التطبيق الرئيسي ============================== */
export default function App() {
  const models = useMemo(() => ASSET_DEFS.map(buildModel), []);
  const [signals, setSignals] = useState(() => {
    const out = {};
    models.forEach((m) => { out[m.id] = computeSignal(m); });
    return out;
  });

  const [prices, setPrices] = useState(() => {
    const p = {}; models.forEach((m) => { p[m.id] = m.series[m.series.length - 1]; }); return p;
  });
  const pricesRef = useRef({});
  useEffect(() => { pricesRef.current = prices; }, [prices]);
  const [liveChangeOverride, setLiveChangeOverride] = useState({});
  const [liveStatus, setLiveStatus] = useState({});
  const forexBaselineRef = useRef({});
  const historicalClosesRef = useRef({});

  // يعيد حساب المؤشرات والدخول/وقف الخسارة/الأهداف بحيث ترتكز دائمًا على آخر سعر حي فعلي،
  // مع الاستفادة من البيانات التاريخية الحقيقية المخزّنة لحساب EMA/RSI بدقة.
  function recomputeSignalWithLivePrice(id, livePrice) {
    const closes = historicalClosesRef.current[id];
    if (!closes || !livePrice) return;
    const model = models.find((m) => m.id === id);
    if (!model) return;
    const combined = [...closes, livePrice];
    const realModel = { ...model, series: combined, rand: mulberry32(hashStr(model.id)) };
    const newSignal = computeSignal(realModel);
    newSignal.indicatorsReal = true;
    setSignals((prev) => ({ ...prev, [id]: newSignal }));
  }

  // محاكاة تحرك الأسعار للأصول التي لا تملك بيانات حية
  useEffect(() => {
    const tick = setInterval(() => {
      setPrices((prev) => {
        const next = { ...prev };
        models.forEach((m) => {
          if (LIVE_MANAGED_IDS.has(m.id)) return; // الأصول الحية تُحدَّث من مصادرها الفعلية فقط
          const jitter = (Math.random() - 0.5) * 2 * m.volPct * 0.5;
          next[m.id] = next[m.id] * (1 + jitter);
        });
        return next;
      });
    }, 3000);
    return () => clearInterval(tick);
  }, [models]);

  // جلب بيانات حية فعلية من Twelve Data عبر Netlify Function (المفتاح لا يظهر في المتصفح إطلاقًا)
  useEffect(() => {
    let cancelled = false;

    // عند التحميل: استرجع آخر أسعار حية معروفة من التخزين المحلي فورًا (تجربة أفضل ريثما يصل رد جديد)
    (async () => {
      const cached = await loadKey("live-quotes-cache", null);
      if (cached && cached.prices) {
        setPrices((prev) => ({ ...prev, ...cached.prices }));
        setLiveChangeOverride((prev) => ({ ...prev, ...(cached.changes || {}) }));
        setLiveStatus((prev) => ({ ...prev, ...(cached.status || {}) }));
      }
    })();

    async function fetchLive() {
      try {
        const symbols = Object.values(TD_QUOTE_SYMBOLS).join(",");
        const res = await fetch(`/.netlify/functions/quotes?symbols=${encodeURIComponent(symbols)}`);
        if (!res.ok) { console.warn("Twelve Data function error:", res.status); return; }
        const data = await res.json();
        if (cancelled) return;
        if (data && data.code) { console.warn("Twelve Data API error:", data.code, data.message); }
        const nextPrices = {};
        const nextChanges = {};
        const nextStatus = {};
        Object.entries(TD_QUOTE_SYMBOLS).forEach(([id, sym]) => {
          const q = data[sym];
          if (q && q.close && !q.code) {
            nextPrices[id] = parseFloat(q.close);
            if (q.percent_change !== undefined) nextChanges[id] = parseFloat(q.percent_change);
            nextStatus[id] = true;
          } else if (q && q.code) {
            console.warn(`Twelve Data error for ${sym}:`, q.code, q.message);
            // لا نُنزّل الحالة إلى SIMULATED بسبب فشل عابر (تجاوز الحد بالدقيقة) — نُبقي آخر قيمة حية معروفة
          }
        });
        if (Object.keys(nextPrices).length) {
          setPrices((prev) => ({ ...prev, ...nextPrices }));
          setLiveChangeOverride((prev) => {
            const merged = { ...prev, ...nextChanges };
            setLiveStatus((prevStatus) => {
              const mergedStatus = { ...prevStatus, ...nextStatus };
              saveKey("live-quotes-cache", { prices: nextPrices, changes: merged, status: mergedStatus });
              return mergedStatus;
            });
            return merged;
          });
          Object.entries(nextPrices).forEach(([id, p]) => recomputeSignalWithLivePrice(id, p));
        }
      } catch (e) {
        console.warn("Twelve Data fetch failed:", e.message);
      }
    }
    fetchLive();
    const t = setInterval(fetchLive, GOLD_REFRESH_INTERVAL_MS);
    return () => { cancelled = true; clearInterval(t); };
  }, []);

  // تحديث المؤشرات الفنية (EMA/RSI/الدعم والمقاومة) ببيانات تاريخية حقيقية بدل المحاكاة،
  // لكن فقط للأصول التي لديها بيانات حية أصلًا (فوركس رئيسية + الذهب عبر Twelve Data).
  // التحديث مرة كل ~20 ساعة لكل رمز (مخزّن محليًا)، بفاصل 15 ثانية بين كل رمز وآخر لتفادي تجاوز حد الدقيقة.
  useEffect(() => {
    let cancelled = false;
    const HISTORY_TTL_MS = 20 * 60 * 60 * 1000;

    function applyRealHistory(id, closes) {
      const model = models.find((m) => m.id === id);
      if (!model || closes.length < 30) return;
      historicalClosesRef.current[id] = closes;
      const currentLivePrice = pricesRef.current[id];
      const combined = currentLivePrice ? [...closes, currentLivePrice] : closes;
      const realModel = { ...model, series: combined, rand: mulberry32(hashStr(model.id)) };
      const newSignal = computeSignal(realModel);
      newSignal.indicatorsReal = true;
      setSignals((prev) => ({ ...prev, [id]: newSignal }));
    }

    async function loadHistoryFor(id, sym, delayMs) {
      await new Promise((r) => setTimeout(r, delayMs));
      if (cancelled) return;
      const cacheKey = `history-${id}`;
      const cached = await loadKey(cacheKey, null);
      const now = Date.now();
      if (cached && cached.ts && now - cached.ts < HISTORY_TTL_MS && Array.isArray(cached.closes)) {
        applyRealHistory(id, cached.closes);
        return;
      }
      try {
        const res = await fetch(`/.netlify/functions/history?symbol=${encodeURIComponent(sym)}&outputsize=150`);
        if (!res.ok) { console.warn("history function error:", res.status); return; }
        const data = await res.json();
        if (cancelled) return;
        if (data && Array.isArray(data.values)) {
          const closes = data.values.map((v) => parseFloat(v.close)).reverse();
          if (closes.length >= 30) {
            await saveKey(cacheKey, { ts: now, closes });
            applyRealHistory(id, closes);
          }
        } else {
          console.warn("Twelve Data history error for", sym, data);
        }
      } catch (e) {
        console.warn("History fetch failed for", sym, e.message);
      }
    }

    Object.entries(TD_HISTORY_SYMBOLS).forEach(([id, sym], idx) => {
      loadHistoryFor(id, sym, idx * 15000);
    });

    return () => { cancelled = true; };
  }, [models]);

  // جلب أسعار العملات الرقمية مباشرة من Binance (API عام مجاني، بدون مفتاح، بدون حد يومي عملي)
  useEffect(() => {
    let cancelled = false;
    async function fetchCrypto() {
      try {
        const symbolsParam = encodeURIComponent(JSON.stringify(Object.values(BINANCE_SYMBOLS)));
        const res = await fetch(`https://api.binance.com/api/v3/ticker/24hr?symbols=${symbolsParam}`);
        if (!res.ok) { console.warn("Binance API error:", res.status); return; }
        const arr = await res.json();
        if (cancelled || !Array.isArray(arr)) return;
        const bySymbol = {};
        arr.forEach((t) => { bySymbol[t.symbol] = t; });
        const nextPrices = {};
        const nextChanges = {};
        const nextStatus = {};
        Object.entries(BINANCE_SYMBOLS).forEach(([id, sym]) => {
          const t = bySymbol[sym];
          if (t && t.lastPrice) {
            nextPrices[id] = parseFloat(t.lastPrice);
            nextChanges[id] = parseFloat(t.priceChangePercent);
            nextStatus[id] = true;
          }
        });
        if (Object.keys(nextPrices).length) {
          setPrices((prev) => ({ ...prev, ...nextPrices }));
          setLiveChangeOverride((prev) => ({ ...prev, ...nextChanges }));
          setLiveStatus((prev) => ({ ...prev, ...nextStatus }));
        }
      } catch (e) {
        console.warn("Binance fetch failed:", e.message);
      }
    }
    fetchCrypto();
    const t = setInterval(fetchCrypto, CRYPTO_REFRESH_INTERVAL_MS);
    return () => { cancelled = true; clearInterval(t); };
  }, []);

  // جلب أسعار الفوركس الحقيقية كل 60 ثانية عبر Finnhub (طلب واحد يرجع كل الأزواج)
  useEffect(() => {
    let cancelled = false;
    async function fetchForex() {
      try {
        const res = await fetch("/.netlify/functions/forex-rates");
        if (!res.ok) { console.warn("Finnhub function error:", res.status); return; }
        const data = await res.json();
        if (cancelled) return;
        const rates = data.quote || data.rates || null;
        if (!rates) { console.warn("Finnhub forex/rates: unexpected response", data); return; }
        const nextPrices = {};
        const nextStatus = {};
        FINNHUB_PAIRS.forEach(({ id, ccy, invert }) => {
          const r = rates[ccy];
          if (r) {
            const price = invert ? 1 / r : r;
            nextPrices[id] = price;
            nextStatus[id] = true;
            if (forexBaselineRef.current[id] === undefined) forexBaselineRef.current[id] = price;
          }
        });
        if (Object.keys(nextPrices).length) {
          setPrices((prev) => ({ ...prev, ...nextPrices }));
          setLiveStatus((prev) => ({ ...prev, ...nextStatus }));
          setLiveChangeOverride((prev) => {
            const next = { ...prev };
            Object.entries(nextPrices).forEach(([id, price]) => {
              const base = forexBaselineRef.current[id];
              if (base) next[id] = ((price - base) / base) * 100;
            });
            return next;
          });
          Object.entries(nextPrices).forEach(([id, p]) => recomputeSignalWithLivePrice(id, p));
        }
      } catch (e) {
        console.warn("Finnhub fetch failed:", e.message);
      }
    }
    fetchForex();
    const t2 = setInterval(fetchForex, FOREX_REFRESH_INTERVAL_MS);
    return () => { cancelled = true; clearInterval(t2); };
  }, []);

  const changes = useMemo(() => {
    const out = {};
    models.forEach((m) => {
      if (liveStatus[m.id] && liveChangeOverride[m.id] !== undefined) {
        out[m.id] = liveChangeOverride[m.id];
      } else {
        const prevClose = m.series[m.series.length - 2];
        out[m.id] = ((prices[m.id] - prevClose) / prevClose) * 100;
      }
    });
    return out;
  }, [models, prices, liveStatus, liveChangeOverride]);

  const overallSentiment = useMemo(() => {
    const avg = models.reduce((a, m) => a + signals[m.id].dirRaw, 0) / models.length;
    return Math.round(clamp(50 + avg * 45, 5, 95));
  }, [models, signals]);

  const [view, setView] = useState("dashboard");
  const [selectedAssetId, setSelectedAssetId] = useState("XAUUSD");
  const [category, setCategory] = useState("all");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [scannerSort, setScannerSort] = useState("confidence");
  const [scannerFilter, setScannerFilter] = useState("ALL");

  const [watchlist, setWatchlist] = useState([]);
  const [journalEntries, setJournalEntries] = useState([]);
  const [settings, setSettings] = useState({ defaultRisk: 1 });
  const loadedRef = useRef(false);

  useEffect(() => {
    (async () => {
      const wl = await loadKey("watchlist", ["XAUUSD", "BTCUSD"]);
      const je = await loadKey("journal-entries", []);
      const st = await loadKey("settings", { defaultRisk: 1 });
      setWatchlist(wl); setJournalEntries(je); setSettings(st);
      loadedRef.current = true;
    })();
  }, []);
  useEffect(() => { if (loadedRef.current) saveKey("watchlist", watchlist); }, [watchlist]);
  useEffect(() => { if (loadedRef.current) saveKey("journal-entries", journalEntries); }, [journalEntries]);
  useEffect(() => { if (loadedRef.current) saveKey("settings", settings); }, [settings]);

  function toggleWatch(id) {
    setWatchlist((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  }
  function openAsset(id) { setSelectedAssetId(id); setView("asset"); }
  function addJournalEntry(e) { setJournalEntries((prev) => [...prev, e]); }
  function deleteJournalEntry(id) { setJournalEntries((prev) => prev.filter((e) => e.id !== id)); }
  function resetData() { setWatchlist([]); setJournalEntries([]); }

  const selectedModel = models.find((m) => m.id === selectedAssetId) || models[0];

  return (
    <div dir="rtl" style={{ fontFamily: FONT_AR, background: C.bgDeep, minHeight: "100vh" }} className="flex">
      <Sidebar view={view} setView={setView} collapsed={sidebarCollapsed} setCollapsed={setSidebarCollapsed}
        setCategory={setCategory} setSelectedAssetId={setSelectedAssetId} />
      <div className="flex-1 min-w-0">
        <TopBar overallSentiment={overallSentiment} />
        <main className="p-6">
          {view === "dashboard" && (
            <Dashboard models={models} signals={signals} prices={prices} changes={changes} category={category} setCategory={setCategory}
              watchlist={watchlist} toggleWatch={toggleWatch} openAsset={openAsset} liveStatus={liveStatus} />
          )}
          {view === "asset" && (
            <AssetDetail model={selectedModel} signal={signals[selectedModel.id]} price={prices[selectedModel.id]} changePct={changes[selectedModel.id]}
              inWatchlist={watchlist.includes(selectedModel.id)} toggleWatch={() => toggleWatch(selectedModel.id)}
              goToPlan={() => setView("tradeplan")} live={liveStatus[selectedModel.id]} />
          )}
          {view === "scanner" && (
            <Scanner models={models} signals={signals} prices={prices} sortBy={scannerSort} setSortBy={setScannerSort}
              filterBias={scannerFilter} setFilterBias={setScannerFilter} openAsset={openAsset} />
          )}
          {view === "watchlist" && (
            <Watchlist models={models} signals={signals} prices={prices} changes={changes} watchlist={watchlist} toggleWatch={toggleWatch} openAsset={openAsset} liveStatus={liveStatus} />
          )}
          {view === "tradeplan" && (
            <TradePlan models={models} signals={signals} prices={prices} selectedAssetId={selectedAssetId} setSelectedAssetId={setSelectedAssetId} settings={settings} />
          )}
          {view === "journal" && (
            <Journal models={models} entries={journalEntries} addEntry={addJournalEntry} deleteEntry={deleteJournalEntry} />
          )}
          {view === "backtest" && <Backtest models={models} />}
          {view === "strategies" && <StrategyLab />}
          {view === "news" && <NewsPage overallSentiment={overallSentiment} />}
          {view === "assistant" && <AIAssistant models={models} signals={signals} prices={prices} />}
          {view === "settings" && <Settings settings={settings} setSettings={setSettings} resetData={resetData} />}
        </main>
      </div>
    </div>
  );
}
