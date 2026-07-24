// Netlify Function: يجلب بيانات تاريخية حقيقية (Time Series) من Twelve Data
// تُستخدم لحساب مؤشرات فنية حقيقية (EMA, RSI, الدعم/المقاومة) بدل بيانات المحاكاة،
// لكن فقط للأصول التي لديها بيانات حية أصلًا (فوركس رئيسية + الذهب).
//
// يستخدم نفس متغير البيئة TWELVEDATA_API_KEY المضبوط مسبقًا لدالة quotes.js.
//
// مثال استدعاء: GET /.netlify/functions/history?symbol=EUR/USD&outputsize=200

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

  const symbol = event.queryStringParameters?.symbol;
  if (!symbol) {
    return { statusCode: 400, body: JSON.stringify({ error: "الرجاء تمرير ?symbol=EUR/USD" }) };
  }
  const outputsize = event.queryStringParameters?.outputsize || "200";

  try {
    const url = `https://api.twelvedata.com/time_series?symbol=${encodeURIComponent(symbol)}&interval=1day&outputsize=${outputsize}&apikey=${apiKey}`;
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
