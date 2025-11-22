// /api/yoco-success.js
export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).send("Method Not Allowed");

  const { checkoutId } = req.query;

  // Fallback if checkoutId is missing (manual testing or Yoco issue)
  if (!checkoutId) {
    console.warn("checkoutId missing, redirecting anyway.");
    return res.redirect("https://Khethelo89.github.io/storecollect-pay/thankyou.html");
  }

  try {
    const secretKey = process.env.YOCO_SECRET_KEY?.trim();
    if (!secretKey) return res.status(500).send("Yoco secret key missing");

    // 1️⃣ Get checkout details from Yoco
    const yoRes = await fetch(`https://payments.yoco.com/api/checkouts/${checkoutId}`, {
      headers: { "Authorization": `Bearer ${secretKey}` }
    });
    const yoData = await yoRes.json();

    if (!yoRes.ok || yoData.status !== "paid") {
      console.error("Payment not completed:", yoData);
      return res.redirect("https://Khethelo89.github.io/storecollect-pay/thankyou.html");
    }

    // 2️⃣ Optionally create Shopify order (keep your current code)
    const shopifyDomain = "b007a7-f0.myshopify.com";
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

    console.log("Shopify order created:", await shopifyRes.json());

    // 3️⃣ Redirect to thank-you page with cart info
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

    return res.redirect(`https://Khethelo89.github.io/storecollect-pay/thankyou.html?${query.toString()}`);

  } catch (err) {
    console.error("Yoco success error:", err);
    return res.redirect("https://Khethelo89.github.io/storecollect-pay/thankyou.html");
  }
}

