export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const {
      amountInCents,
      currency,
      items,
      firstName,
      lastName,
      email,
      phone,
      address,
      city,
      province,
      zip
    } = req.body;

    const secretKey = process.env.YOCO_SECRET_KEY?.trim();
    if (!secretKey) {
      return res.status(500).json({ error: "Missing YOCO_SECRET_KEY" });
    }

    // 1️⃣ Create a hosted checkout session
    const yocoSessionRes = await fetch("https://online.yoco.com/v1/checkouts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Auth-Secret-Key": secretKey
      },
      body: JSON.stringify({
        amount: amountInCents,
        currency: currency || "ZAR",
        metadata: {
          firstName,
          lastName,
          email,
          phone,
          address,
          city,
          province,
          zip,
          items
        },
        redirect: {
          success_url: "https://storecollect.net/payment-success",
          cancel_url: "https://storecollect.net/payment-cancelled"
        }
      })
    });

    const sessionData = await yocoSessionRes.json();

    if (!yocoSessionRes.ok || !sessionData.checkout_url) {
      return res.status(400).json({
        error: "Failed to create checkout session",
        details: sessionData
      });
    }

    // 2️⃣ Return the checkout URL to the front-end
    return res.status(200).json({
      checkoutUrl: sessionData.checkout_url
    });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
