// /api/yoco-success.js
export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).send("Method Not Allowed");

  const { checkoutId } = req.query;

  // Base URL of your deployed thank-you page
  const thankyouUrl = "https://storecollect-pay.vercel.app/thankyou.html";

  // If checkoutId is missing, redirect immediately with fallback values
  if (!checkoutId) {
    const fallbackUrl = `${thankyouUrl}?name=Customer&total=0.00&shipping=100&orderNumber=N/A&cart=[]`;
    console.warn("checkoutId missing, redirecting to fallback URL:", fallbackUrl);
    return res.redirect(fallbackUrl);
  }

  try {
    const secretKey = process.env.YOCO_SECRET_KEY?.trim();
    if (!secretKey) return res.status(500).send("Yoco secret key missing");

    // 1️⃣ Fetch checkout details from Yoco
    const yoRes = await fetch(`https://payments.yoco.com/api/checkouts/${checkoutId}`, {
      headers: { "Authorization": `Bearer ${secretKey}` }
    });
    const yoData = await yoRes.json();

    console.log("💡 Yoco checkout data:", JSON.stringify(yoData, null, 2));

    // 2️⃣ Build query parameters safely
    const nameVal = yoData.customer?.name || "Customer";
    const totalVal = yoData.amount ? (yoData.amount / 100).toFixed(2) : "0.00";
    const shippingVal = "100"; // your default shipping cost
    const orderNumVal = checkoutId;
    const cartVal = JSON.stringify(
      (yoData.lineItems || []).map(item => ({
        title: item.displayName || "Item",
        qty: item.quantity || 1,
        price: (item.pricingDetails?.[0]?.price / 100) || 0
      }))
    );

    const query = new URLSearchParams({
      name: nameVal,
      total: totalVal,
      shipping: shippingVal,
      orderNumber: orderNumVal,
      cart: cartVal
    });

    const finalUrl = `${thankyouUrl}?${query.toString()}`;
    console.log("➡ Redirecting to:", finalUrl);

    // 3️⃣ Optional: Post to Shopify (keep your logic)
    const shopifyDomain = "b007a7-f0.myshopify.com";
    const shopifyAccessToken = process.env.SHOPIFY_ACCESS_TOKEN;

    if (yoData.lineItems && yoData.lineItems.length > 0) {
      const shopifyOrder = {
        order: {
          email: yoData.customer?.email || "customer@example.com",
          financial_status: "paid",
          total_price: totalVal,
          line_items: yoData.lineItems.map(item => ({
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

      const shopifyRes = await fetch(`https://${shopifyDomain}/admin/api/2025-10/orders.json`, {
        method: "POST",
        headers: {
          "X-Shopify-Access-Token": shopifyAccessToken,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(shopifyOrder)
      });

      console.log("✅ Shopify order created:", await shopifyRes.json());
    }

    // 4️⃣ Redirect to thank-you page with fully defined URL
    return res.redirect(finalUrl);

  } catch (err) {
    console.error("❌ Yoco success error:", err);
    // Fallback redirect if any error occurs
    const fallbackUrl = `${thankyouUrl}?name=Customer&total=0.00&shipping=100&orderNumber=${checkoutId}&cart=[]`;
    return res.redirect(fallbackUrl);
  }
}
