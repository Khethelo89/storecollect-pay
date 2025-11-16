export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const secretKey = process.env.YOCO_SECRET_KEY?.trim();

    if (!secretKey) {
      console.error("Yoco secret key missing!");
      return res.status(500).json({ error: "Missing Yoco Secret Key" });
    }

    // Customer + cart sent from frontend
    const {
      amountInCents,
      currency,
      lineItems,
      customer,
      successUrl,
      cancelUrl
    } = req.body;

    // Build request to Yoco Checkout API
    const yoRes = await fetch("https://payments.yoco.com/api/checkouts", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${secretKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        amount: amountInCents,
        currency,
        lineItems,
        successUrl,
        cancelUrl,
        customer
      })
    });

    const yoData = await yoRes.json();

    console.log("Yoco response:", yoData);

    if (!yoRes.ok) {
      return res.status(400).json({
        error: "Yoco Checkout API Error",
        details: yoData
      });
    }

    // Return checkout URL to frontend
    return res.status(200).json({
      checkoutUrl: yoData.checkoutUrl
    });

  } catch (err) {
    console.error("Checkout session error:", err);
    return res.status(500).json({ error: "Server error" });
  }
}
