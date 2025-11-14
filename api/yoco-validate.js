export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const secretKey = process.env.YOCO_SECRET_KEY?.trim();

    if (!secretKey) {
      return res.status(500).json({ error: "Missing YOCO_SECRET_KEY in environment variables" });
    }

    console.log("🔑 Secret key loaded (first 4 chars):", secretKey.slice(0, 4));

    // Minimal test: call Yoco API with tiny amount
    const yocoRes = await fetch("https://api.yoco.com/v1/checkouts", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${secretKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        amount: 1, // minimal test amount (1 cent)
        currency: "ZAR",
        redirect: {
          success_url: "https://storecollect.net/payment-success",
          cancel_url: "https://storecollect.net/payment-cancelled"
        }
      })
    });

    const text = await yocoRes.text();
    let data;
    try { data = JSON.parse(text); } catch { data = text; }

    if (yocoRes.status === 401) {
      return res.status(401).json({ error: "Unauthorized — secret key invalid", details: data });
    }

    return res.status(200).json({ message: "Secret key is valid!", details: data });
    
  } catch (err) {
    console.error("❌ SERVER ERROR:", err);
    return res.status(500).json({ error: err.message });
  }
}
