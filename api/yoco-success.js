// /api/yoco-success.js
export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).send("Method Not Allowed");

  try {
    const { checkoutId } = req.query;
    if (!checkoutId) return res.status(400).send("Missing checkoutId");

    const secretKey = process.env.YOCO_SECRET_KEY?.trim();
    const yoRes = await fetch(`https://payments.yoco.com/api/checkouts/${checkoutId}`, {
      headers: { "Authorization": `Bearer ${secretKey}` }
    });
    const yoData = await yoRes.json();

    if (!yoRes.ok || yoData.status !== "paid") {
      console.error("Payment not completed:", yoData);
      return res.status(400).send("Payment not completed");
    }

    // Post order to Shopify
    const shopifyWebhookUrl = process.env.SHOPIFY_WEBHOOK_URL;
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

    // Redirect to thank-you page with query params
    const query = new URLSearchParams({
      name: yoData.customer?.name || "Customer",
      total: (yoData.amount / 100).toFixed(2),
      shipping: 100,
      cart: JSON.stringify(
        yoData.lineItems.map(item => ({
          title: item.displayName,
          qty: item.quantity,
          price: item.pricingDetails[0]?.price / 100 || 0
        }))
      )
    });

    res.writeHead(302, { Location: `https://storecollect.net/thank-you?${query.toString()}` });
    res.end();

  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
}

