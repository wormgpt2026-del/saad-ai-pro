// Netlify Function: يجلب أسعار فوركس حقيقية لحظية من Finnhub (forex/rates)
// طلب واحد بيرجع كل أزواج العملات دفعة وحدة، ما يسمح بتحديث سريع (كل 60 ثانية)
// ضمن الباقة المجانية (60 طلب/دقيقة، بدون حد يومي عملي).
//
// اضبط المتغير من لوحة Netlify:
// Site configuration -> Environment variables -> Add variable
//   Key:   FINNHUB_API_KEY
//   Value: (مفتاحك من https://finnhub.io/dashboard)

export async function handler(event) {
  if (event.httpMethod !== "GET") {
    return { statusCode: 405, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  const apiKey = process.env.FINNHUB_API_KEY;
  if (!apiKey) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "لم يتم ضبط FINNHUB_API_KEY في إعدادات Netlify بعد." }),
    };
  }

  try {
    const url = `https://finnhub.io/api/v1/forex/rates?base=USD&token=${apiKey}`;
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
