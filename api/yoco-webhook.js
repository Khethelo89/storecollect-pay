export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const payload = req.body;

    // --- Log payload for debugging (optional in production) ---
    console.log("🔥 Incoming payload:", payload);

    // --- Check secret key ---
    const secretKey = process.env.YOCO_SECRET_KEY?.trim();
    if (!secretKey) {
      console.error("❌ YOCO_SECRET_KEY is missing in environment variables!");
      return res.status(500).json({ error: "Server misconfigured: missing secret key" });
    }

    // --- Calculate total amount in cents ---
    const itemsTotal = payload.line_items.reduce(
      (sum, item) => sum + item.quantity * item.unit_price,
      0
    );
    const shipping = payload.shipping_cost || 0;
    const packaging = payload.packaging_cost || 0;
    const totalAmount = itemsTotal + shipping + packaging;

    // --- Create a Yoco Hosted Checkout Session ---
    const yocoRes = await fetch("https://online.yoco.com/v1/checkouts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Auth-Secret-Key": secretKey
      },
      body: JSON.stringify({
        amount: totalAmount,
        currency: "ZAR",
        metadata: payload, // Include all customer info & items
        redirect: {
          success_url: "https://storecollect.net/payment-success",
          cancel_url: "https://storecollect.net/payment-cancelled"
        }
      })
    });

    const data = await yocoRes.json();

    console.log("🔍 Yoco Response:", data);

    // --- Handle failed checkout creation ---
    if (!yocoRes.ok || !data.checkout_url) {
      console.error("❌ Failed to create Yoco checkout session:", data);
      return res.status(400).json({
        error: "Failed to create checkout session",
        details: data
      });
    }

    // --- Success: return checkout URL to front-end ---
    return res.status(200).json({ checkoutUrl: data.checkout_url });

  } catch (err) {
    console.error("❌ SERVER ERROR:", err);
    return res.status(500).json({
      error: "Internal Server Error",
      details: err.message
    });
  }
}
