// /api/yoco-success.js
export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).send("Method Not Allowed");

  const { checkoutId } = req.query;
  const thankyouUrl = "https://storecollect-pay.vercel.app/thankyou.html";

  if (!checkoutId) {
    // fallback redirect with URL params
    return res.redirect(
      `${thankyouUrl}?${new URLSearchParams(req.query).toString()}`
    );
  }

  try {
    const secretKey = process.env.YOCO_SECRET_KEY?.trim();
    if (!secretKey) return res.status(500).send("Yoco secret key missing");

    // 1️⃣ Get checkout details from Yoco
    const yoRes = await fetch(`https://payments.yoco.com/api/checkouts/${checkoutId}`, {
      headers: { "Authorization": `Bearer ${secretKey}` }
    });
    let yoData = await yoRes.json();

    // 2️⃣ Provide sandbox data if missing (optional)
    if (!yoData.customer || !yoData.lineItems || yoData.lineItems.length === 0) {
      yoData = {
        customer: { name: "Alice Smith", email: "alice@example.com" },
        lineItems: [
          { displayName: "T-shirt", quantity: 2, pricingDetails: [{ price: 5000 }] },
          { displayName: "Cap", quantity: 1, pricingDetails: [{ price: 5000 }] }
        ],
        amount: 15000,
        shippingInCents: 1000
      };
    }

    const shipping = yoData.shippingInCents ? yoData.shippingInCents / 100 : 100;
    const total = ((yoData.amount + (yoData.shippingInCents || 10000)) / 100).toFixed(2);

    // 3️⃣ Prepare Shopify order
    const shopifyDomain = "b007a7-f0.myshopify.com";
    const shopifyAccessToken = process.env.SHOPIFY_ACCESS_TOKEN;

    const shopifyOrder = {
      order: {
        email: yoData.customer.email,
        financial_status: "paid",       // ✅ Mark order as PAID
        total_price: total,
        name: checkoutId.slice(0, 4),   // ✅ Use first 4 chars of checkoutId as order number
        line_items: yoData.lineItems.map(item => ({
          title: item.displayName,
          quantity: item.quantity,
          price: (item.pricingDetails?.[0]?.price / 100) || 0
        })),
        shipping_address: {
          first_name: yoData.customer.name.split(" ")[0],
          last_name: yoData.customer.name.split(" ")[1] || "",
          address1: yoData.customer.address1 || "123 Test Street",
          city: yoData.customer.city || "Johannesburg",
          province: yoData.customer.province || "Gauteng",
          zip: yoData.customer.zip || "2000",
          country: yoData.customer.country || "South Africa"
        }
      }
    };

    // 4️⃣ Create Shopify order
    const shopifyRes = await fetch(`https://${shopifyDomain}/admin/api/2025-10/products.json`, {
      method: "POST",
      headers: {
        "X-Shopify-Access-Token": shopifyAccessToken,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(shopifyOrder)
    });

    console.log("Shopify response:", await shopifyRes.json());

    // 5️⃣ Redirect to thank-you page with all parameters
    const query = new URLSearchParams({
      name: yoData.customer.name,
      total: total,
      shipping: shipping.toFixed(2),
      orderNumber: checkoutId.slice(0, 4), // 4-character order ID
      cart: JSON.stringify(
        yoData.lineItems.map(item => ({
          title: item.displayName,
          qty: item.quantity,
          price: (item.pricingDetails?.[0]?.price / 100) || 0
        }))
      )
    });

    return res.redirect(`${thankyouUrl}?${query.toString()}`);

  } catch (err) {
    console.error("Yoco success error:", err);
    return res.redirect(
      `${thankyouUrl}?name=Customer&total=0.00&shipping=100&orderNumber=${checkoutId?.slice(0,4) || "N/A"}&cart=[]`
    );
  }
}
