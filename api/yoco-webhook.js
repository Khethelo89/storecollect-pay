// Helper: Validate Yoco secret key
function getYocoSecretKey() {
  const key = process.env.YOCO_SECRET_KEY?.trim();

  if (!key) {
    console.error("❌ YOCO_SECRET_KEY is missing in Vercel env variables!");
    throw new Error("Server misconfigured: missing YOCO_SECRET_KEY");
  }

  // Optional sanity check: key should start with sk_live_ or sk_test_
  if (!/^sk_(live|test)_/.test(key)) {
    console.error("❌ YOCO_SECRET_KEY does not look valid:", key.slice(0,8) + "...");
    throw new Error("Invalid YOCO_SECRET_KEY format");
  }

  return key;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const secretKey = getYocoSecretKey(); // ✅ Validate key before use

    const payload = req.body;
    console.log("🔥 Incoming payload:", payload);

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
        metadata: payload, // full payload including customer & line items
        redirect: {
          success_url: "https://storecollect.net/payment-success",
          cancel_url: "https://storecollect.net/payment-cancelled"
        }
      })
    });

    // --- Safely parse Yoco response ---
    const text = await yocoRes.text();
    let data;
    try { 
      data = JSON.parse(text); 
    } catch {
      console.error("❌ Yoco returned non-JSON response:", text);
      return res.status(500).json({
        error: "Yoco did not return JSON",
        details: text
      });
    }

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
