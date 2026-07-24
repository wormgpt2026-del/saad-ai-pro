# SAAD AI Trading

منصة شخصية لتحليل الأسواق المالية بالذكاء الاصطناعي (بيانات محاكاة SIMULATED للعرض)، مبنية بـ React + Vite + Tailwind، وجاهزة للنشر على Netlify.

## التشغيل محليًا

```bash
npm install
npm run dev
```

## النشر على Netlify

### الطريقة الأولى: عن طريق ربط مستودع Git (موصى بها)
1. ارفع هذا المجلد إلى مستودع على GitHub / GitLab / Bitbucket.
2. من لوحة Netlify: **Add new site → Import an existing project**.
3. اختر المستودع. الإعدادات التالية تُضبط تلقائيًا من ملف `netlify.toml`:
   - **Build command:** `npm run build`
   - **Publish directory:** `dist`
   - **Functions directory:** `netlify/functions`
4. اضغط **Deploy**.

### الطريقة الثانية: رفع مباشر (Drag & Drop)
1. شغّل محليًا: `npm install` ثم `npm run build` — سينشئ مجلد `dist`.
2. اذهب إلى https://app.netlify.com → **Add new site → Deploy manually**.
3. اسحب مجلد `dist` وأفلته. (ملاحظة: هذه الطريقة لا تفعّل مجلد `netlify/functions` تلقائيًا؛ الطريقة الأولى عبر Git هي الأنسب لتفعيل مساعد الذكاء الاصطناعي).

## تفعيل مساعد الذكاء الاصطناعي عبر OpenRouter

مساعد الدردشة في صفحة "مساعد الذكاء الاصطناعي" يمر عبر Netlify Function آمنة (`netlify/functions/ai-assistant.js`) تتصل بـ [OpenRouter](https://openrouter.ai) — حتى لا يظهر مفتاح API في المتصفح أبدًا. لتفعيله:

1. من لوحة تحكم الموقع في Netlify: **Site configuration → Environment variables**.
2. أضف متغيرًا باسم `OPENROUTER_API_KEY` وقيمته مفتاحك من https://openrouter.ai/keys.
3. (اختياري) أضف متغيرًا باسم `OPENROUTER_MODEL` لتحديد نموذج معيّن، مثل `anthropic/claude-3.5-sonnet` أو `openai/gpt-4o-mini` (الافتراضي) أو `meta-llama/llama-3.1-70b-instruct`. راجع https://openrouter.ai/models للأسعار والقدرات.
4. أعد نشر الموقع (Redeploy) بعد إضافة المتغيرات.

المساعد يستخدم في تحليله **كل عناصر التحليل الفني** المحسوبة فعليًا لكل أصل (الانحياز، الثقة، RSI، علاقة EMA20/EMA50، التوافق بين الأطر الزمنية، مناطق الدخول/SL/TP، الدعم والمقاومة، ومستوى إبطال التحليل) — وليس فقط إشارة BUY/SELL.

بدون ضبط المفتاح، بقية المنصة تعمل بشكل طبيعي كاملًا، وسيظهر فقط للمساعد رسالة "تعذر الاتصال بالمساعد حاليًا".

## تفعيل الأسعار الحية عبر Twelve Data

المنصة تدعم الآن أسعارًا حقيقية (LIVE) لأزواج الفوركس الرئيسية + الذهب/الفضة + BTC/ETH عبر [Twelve Data](https://twelvedata.com)، من خلال Netlify Function آمنة (`netlify/functions/quotes.js`) — المفتاح لا يصل للمتصفح إطلاقًا.

1. من لوحة تحكم الموقع في Netlify: **Site configuration → Environment variables**.
2. أضف متغيرًا باسم `TWELVEDATA_API_KEY` وقيمته مفتاحك من https://twelvedata.com/account/api-keys.
3. أعد نشر الموقع (Redeploy) بعد إضافة المتغير.
4. بعد النشر، ستظهر شارة **LIVE** خضراء بجانب الأصول المدعومة، و**SIMULATED** لبقية الأصول.

### ملاحظات مهمة حول حدود الباقة المجانية
- الباقة المجانية من Twelve Data محدودة بعدد طلبات في الدقيقة وفي اليوم.
- التطبيق يجلب الأسعار كل 90 ثانية بشكل افتراضي (`LIVE_REFRESH_INTERVAL_MS` في `src/App.jsx`) لتقليل الاستهلاك.
- إذا وصلت لحد الباقة، ستستمر تلك الأصول بعرض آخر سعر حي معروف دون تعطل التطبيق.
- لإضافة أصول حية أخرى (مؤشرات، سلع، عملات رقمية إضافية)، أضفها إلى `LIVE_SYMBOLS` في `src/App.jsx` بصيغة رمز Twelve Data الصحيح، مع مراعاة أن بعض المؤشرات والسلع تحتاج باقة مدفوعة.
- ننصح بعدم مشاركة مفتاح API في أي محادثة أو كود عام؛ إن شاركته سابقًا فمن الأفضل توليد مفتاح جديد من حسابك.



## ملاحظة مهمة

بعد ضبط `TWELVEDATA_API_KEY`، تصبح أسعار الفوركس الرئيسية والذهب/الفضة والـ BTC/ETH **حقيقية ومباشرة**. باقي الأصول (المؤشرات، السلع الأخرى، بقية العملات الرقمية) تبقى **بيانات محاكاة (SIMULATED)** لأغراض العرض. لتفعيلها كبيانات حية أيضًا يلزم مزود بيانات إضافي (مثل Finnhub للمؤشرات) بنفس أسلوب `quotes.js` — بحيث تبقى مفاتيح API دائمًا على الخادم فقط. جميع الإشارات والتحليلات الفنية (AI Bias, Confidence, Entry/SL/TP) تبقى تحليلًا احتماليًا وليست نصيحة مالية، بغض النظر عن مصدر السعر.

