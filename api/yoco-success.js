export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).send("Method Not Allowed");

  try {
    const { checkoutId } = req.query;
    if (!checkoutId) return res.status(400).send("Missing checkoutId");

    const secretKey = process.env.YOCO_SECRET_KEY?.trim();
    if (!secretKey) return res.status(500).send("Yoco secret key missing");

    // 1️⃣ Get checkout details from Yoco
    const yoRes = await fetch(`https://payments.yoco.com/api/checkouts/${checkoutId}`, {
      headers: { "Authorization": `Bearer ${secretKey}` }
    });
    const yoData = await yoRes.json();

    if (!yoRes.ok || yoData.status !== "paid") {
      console.error("Payment not completed:", yoData);
      return res.status(400).send("Payment not completed");
    }

    // 2️⃣ Post to Shopify Orders API
    const shopifyDomain = "b007a7-f0.myshopify.com"; // ✅ your Shopify domain
    const shopifyAccessToken = process.env.SHOPIFY_ACCESS_TOKEN;

    const shopifyOrder = {
      order: {
        email: yoData.customer?.email || "customer@example.com",
        financial_status: "paid",
        total_price: (yoData.amount / 100).toFixed(2),
        line_items: yoData.lineItems.map(item => ({
          title: item.displayName,
          quantity: item.quantity,
          price: (item.pricingDetails[0]?.price / 100 || 0).toFixed(2)
        })),
        shipping_address: {
          first_name: yoData.customer?.name?.split(" ")[0] || "First",
          last_name: yoData.customer?.name?.split(" ")[1] || "Last",
          address1: yoData.customer?.address1 || "Address",
          city: yoData.customer?.city || "City",
          province: yoData.customer?.province || "Province",
          zip: yoData.customer?.zip || "0000",
          country: yoData.customer?.country || "South Africa"
        }
      }
    };

    const shopifyRes = await fetch(`https://${shopifyDomain}/admin/api/2025-10/orders.json`, {
      method: "POST",
      headers: {
        "X-Shopify-Access-Token": shopifyAccessToken,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(shopifyOrder)
    });

    const shopifyData = await shopifyRes.json();
    console.log("Shopify order created:", shopifyData);

    // 3️⃣ Redirect to thank-you page with query params
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
    console.error("Yoco success error:", err);
    res.status(500).send("Server error");
  }
}
