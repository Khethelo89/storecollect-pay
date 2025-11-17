// /api/yoco-success.js
export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).send("Method Not Allowed");
  }

  try {
    const { checkoutId } = req.query;
    if (!checkoutId) {
      return res.status(400).send("Missing checkoutId");
    }

    // 1️⃣ Confirm payment with Yoco
    const secretKey = process.env.YOCO_SECRET_KEY?.trim();
    const yoRes = await fetch(`https://payments.yoco.com/api/checkouts/${checkoutId}`, {
      headers: { "Authorization": `Bearer ${secretKey}` }
    });
    const yoData = await yoRes.json();

    if (!yoRes.ok || yoData.status !== "paid") {
      console.error("Payment not completed:", yoData);
      return res.status(400).send("Payment not completed");
    }

    // 2️⃣ Post order to Shopify
    const shopifyWebhookUrl = process.env.SHOPIFY_WEBHOOK_URL; // set in Vercel env
    await fetch(shopifyWebhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orderId: checkoutId,
        lineItems: yoData.lineItems,
        amount: yoData.amount,
        customer: yoData.customer
      })
    });

    // 3️⃣ Redirect customer to your thank you page
    res.writeHead(302, { Location: "https://storecollect.net/thank-you" });
    res.end();

  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
}
