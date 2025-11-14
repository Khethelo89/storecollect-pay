export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const payload = req.body;
    console.log("🔥 Incoming payload:", payload);

    // --- Check secret key ---
    const secretKey = process.env.YOCO_SECRET_KEY?.trim();
    if (!secretKey) {
      console.error("❌ Missing YOCO_SECRET_KEY");
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

    // --- Create Yoco Hosted Checkout Session ---
    const yocoRes = await fetch("https://api.yoco.com/v1/checkouts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${secretKey}`
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

    // --- Handle response safely ---
    const text = await yocoRes.text(); // read as text first
    let data;
    try {
      data = JSON.parse(text); // try to parse JSON
    } catch {
      console.error("❌ Yoco returned non-JSON response:", text);
      return res.status(500).json({
        error: "Yoco did not return JSON",
        details: text
      });
    }

    console.log("🔍 Yoco Response:", data);

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
