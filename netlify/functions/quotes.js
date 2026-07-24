// Netlify Function: يجلب أسعارًا حقيقية من Twelve Data نيابة عن الواجهة الأمامية.
// مفتاح API لا يظهر أبدًا في المتصفح — يُقرأ فقط من متغير بيئة على السيرفر.
//
// اضبط المتغير من لوحة Netlify:
// Site configuration -> Environment variables -> Add variable
//   Key:   TWELVEDATA_API_KEY
//   Value: (مفتاحك من https://twelvedata.com/account/api-keys)
//
// مثال استدعاء من الواجهة الأمامية:
//   GET /.netlify/functions/quotes?symbols=EUR/USD,BTC/USD,XAU/USD

export async function handler(event) {
  if (event.httpMethod !== "GET") {
    return { statusCode: 405, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  const apiKey = process.env.TWELVEDATA_API_KEY;
  if (!apiKey) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "لم يتم ضبط TWELVEDATA_API_KEY في إعدادات Netlify بعد." }),
    };
  }

  const symbols = event.queryStringParameters?.symbols;
  if (!symbols) {
    return { statusCode: 400, body: JSON.stringify({ error: "الرجاء تمرير ?symbols=EUR/USD,BTC/USD" }) };
  }

  try {
    const url = `https://api.twelvedata.com/quote?symbol=${encodeURIComponent(symbols)}&apikey=${apiKey}`;
    const resp = await fetch(url);
    const data = await resp.json();
    return {
      statusCode: 200,
      headers: { "content-type": "application/json", "cache-control": "no-store" },
      body: JSON.stringify(data),
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message || "خطأ غير متوقع" }) };
  }
}
