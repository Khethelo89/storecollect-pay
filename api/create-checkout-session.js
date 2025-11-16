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

    // Destructure request body
    const {
      amountInCents,
      currency,
      lineItems,
      customer,
      successUrl,
      cancelUrl
    } = req.body;

    // Format line items for Yoco
    const formattedLineItems = lineItems.map(item => ({
      displayName: item.name,
      quantity: item.quantity,
      pricingDetails: { amountInCents: item.amount}
    }));

    // Call Yoco Checkout API
    const yoRes = await fetch("https://payments.yoco.com/api/checkouts", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${secretKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        amount: amountInCents,
        currency,
        lineItems: formattedLineItems,
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

    return res.status(200).json({
      checkoutUrl: yoData.checkoutUrl
    });

  } catch (err) {
    console.error("Checkout session error:", err);
    return res.status(500).json({ error: "Server error" });
  }
}

