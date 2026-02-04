// /api/create-checkout-session.js
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

    const {
      amountInCents,
      currency = "ZAR",
      lineItems,
      customer,
      successUrl,
      cancelUrl,
      metadata // ✅ add this
    } = req.body;

    if (!amountInCents || !lineItems || !Array.isArray(lineItems) || lineItems.length === 0) {
      return res.status(400).json({ error: "Invalid request: missing amount or line items" });
    }

    const formattedLineItems = lineItems.map(item => ({
      displayName: item.name || "Unknown Product",
      quantity: item.quantity || 1,
      pricingDetails: { price: Math.round(item.amountInCents) || 0 }
    }));

    const finalCancelUrl = cancelUrl?.trim() || "https://storecollect-pay.vercel.app/cancel";
    const baseSuccessUrl = successUrl?.trim() || "https://storecollect-pay.vercel.app/api/yoco-success";

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
        successUrl: baseSuccessUrl, // ✅ temporary first
        cancelUrl: finalCancelUrl,
        customer,
        metadata // ✅ store order/cart info here if needed
      })
    });

    const yoData = await yoRes.json();
    console.log("Yoco response:", yoData);

    if (!yoRes.ok || !yoData.redirectUrl) {
      return res.status(400).json({
        error: "Yoco Checkout API Error",
        details: yoData
      });
    }

    // ✅ Now attach checkout session ID to success URL
    const checkoutId = yoData.id;
    const finalSuccessUrlWithId = `${baseSuccessUrl}?checkoutId=${checkoutId}`;

    return res.status(200).json({
      checkoutUrl: yoData.redirectUrl,
      checkoutId,
      successUrl: finalSuccessUrlWithId
    });

  } catch (err) {
    console.error("Checkout session error:", err);
    return res.status(500).json({ error: "Server error" });
  }
}
