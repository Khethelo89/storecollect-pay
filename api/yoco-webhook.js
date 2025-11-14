export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    console.log("🔥 Incoming payload:", req.body);

    const secretKey = process.env.YOCO_SECRET_KEY?.trim();
    console.log("🔑 Secret key exists?", !!secretKey);

    if (!secretKey) {
      return res.status(500).json({ error: "NO SECRET KEY FOUND" });
    }

    const yocoRes = await fetch("https://online.yoco.com/v1/checkouts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Auth-Secret-Key": secretKey
      },
      body: JSON.stringify({
        amount: req.body.amountInCents,
        currency: req.body.currency || "ZAR",
        metadata: req.body,
        redirect: {
          success_url: "https://storecollect.net/payment-success",
          cancel_url: "https://storecollect.net/payment-cancelled"
        }
      })
    });

    const data = await yocoRes.json();

    console.log("🔍 Yoco Response:", data);

    if (!yocoRes.ok) {
      return res.status(400).json({
        error: "Yoco error",
        details: data
      });
    }

    if (!data.checkout_url) {
      return res.status(400).json({
        error: "No checkout URL returned",
        details: data
      });
    }

    return res.status(200).json({
      checkoutUrl: data.checkout_url
    });

  } catch (err) {
    console.error("❌ SERVER ERROR:", err);
    return res.status(500).json({
      error: "Server crashed",
      details: err.message
    });
  }
}

