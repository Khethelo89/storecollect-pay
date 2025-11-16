// /api/yoco-checkout.js
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const { amountInCents, currency = "ZAR", items, name, email } = req.body;

    if (!amountInCents || !items?.length) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const secretKey = process.env.YOCO_SECRET_KEY?.trim();
    if (!secretKey) return res.status(500).json({ error: "Server misconfiguration" });

    const response = await fetch("https://payments.yoco.com/api/checkouts", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${secretKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        amount: amountInCents,
        currency,
        metadata: { items, customer_name: name, customer_email: email },
        success_url: `https://storecollect.net/thankyou.html?name=${encodeURIComponent(name)}&total=${(amountInCents/100).toFixed(2)}`,
        cancel_url: "https://storecollect.net/cancel.html"
      })
    });

    const data = await response.json();
    if (!response.ok) return res.status(response.status).json(data);

    return res.status(200).json({ checkoutUrl: data.redirect_url, checkoutId: data.id });

  } catch (err) {
    console.error("Error creating checkout:", err);
    return res.status(500).json({ error: err.message });
  }
}
