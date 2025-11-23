// /api/yoco-success.js
export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).send("Method Not Allowed");

  const { checkoutId } = req.query;

  // Your thank-you page URL on Vercel
  const thankyouUrl = "https://storecollect-pay.vercel.app/thankyou.html";

  // If checkoutId is missing, redirect with fallback
  if (!checkoutId) {
    console.warn("checkoutId missing, redirecting to thank-you page anyway.");
    return res.redirect(`${thankyouUrl}?name=Customer&total=0.00&shipping=0&orderNumber=N/A&cart=[]`);
  }

  try {
    const secretKey = process.env.YOCO_SECRET_KEY?.trim();
    if (!secretKey) return res.status(500).send("Yoco secret key missing");

    // 1️⃣ Get checkout details from Yoco
    const yoRes = await fetch(`https://payments.yoco.com/api/checkouts/${checkoutId}`, {
      headers: { "Authorization": `Bearer ${secretKey}` }
    });
    const yoData = await yoRes.json();

    // If payment not completed, redirect with basic info
    if (!yoRes.ok || yoData.status !== "paid") {
      console.error("Payment not completed:", yoData);
      return res.redirect(`${thankyouUrl}?name=${yoData.customer?.name || "Customer"}&total=${(yoData.amount/100 || 0).toFixed(2)}&shipping=100&orderNumber=${checkoutId}&cart=[]`);
    }

    // 2️⃣ Optional: Post to Shopify (keep current logic)
    const shopifyDomain = "b007a7-f0.myshopify.com";
    const shopifyAccessToken = process.env.SHOPIFY_ACCESS_TOKEN;

    const shopifyOrder = {
      order: {
        email: yoData.customer?.email || "customer@example.com",
        financial_status: "paid",
        total_price: (yoData.amount / 100).toFixed(2),
        line_items: (yoData.lineItems || []).map(item => ({
          title: item.displayName || "Item",
          quantity: item.quantity || 1,
          price: (item.pricingDetails?.[0]?.price / 100) || 0
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

    // Send to Shopify
    const shopifyRes = await fetch(`https://${shopifyDomain}/admin/api/2025-10/orders.json`, {
      method: "POST",
      headers: {
        "X-Shopify-Access-Token": shopifyAccessToken,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(shopifyOrder)
    });

    console.log("Shopify order created:", await shopifyRes.json());

    // 3️⃣ Build query parameters for redirect
    const query = new URLSearchParams({
      name: yoData.customer?.name || "Customer",
      total: (yoData.amount / 100).toFixed(2) || "0.00",
      shipping: "100",
      orderNumber: checkoutId || "N/A",
      cart: JSON.stringify(
        (yoData.lineItems || []).map(item => ({
          title: item.displayName || "Item",
          qty: item.quantity || 1,
          price: (item.pricingDetails?.[0]?.price / 100) || 0
        }))
      )
    });

    // Log the final redirect URL for debugging
    console.log("Redirecting to:", `${thankyouUrl}?${query.toString()}`);

    // 4️⃣ Redirect to thank-you page with parameters
    return res.redirect(`${thankyouUrl}?${query.toString()}`);

  } catch (err) {
    console.error("Yoco success error:", err);
    // Fallback redirect in case of any error
    return res.redirect(`${thankyouUrl}?name=Customer&total=0.00&shipping=100&orderNumber=${checkoutId || "N/A"}&cart=[]`);
  }
}
