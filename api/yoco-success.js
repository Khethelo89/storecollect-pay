// /api/yoco-success.js
export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).send("Method Not Allowed");

  const { checkoutId } = req.query;
  const thankyouUrl = "https://storecollect-pay.vercel.app/thankyou.html";

  if (!checkoutId) {
    console.warn("checkoutId missing, redirecting with fallback values.");
    return res.redirect(
      `${thankyouUrl}?name=Customer&total=0.00&shipping=100&orderNumber=N/A&cart=[]`
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

    // 2️⃣ Determine if sandbox / missing data
    const isSandbox = !yoData.customer || !yoData.lineItems || yoData.lineItems.length === 0;

    if (isSandbox) {
      // Provide dummy data for sandbox testing
      yoData = {
        ...yoData,
        customer: { name: "Alice Smith", email: "alice@example.com" },
        lineItems: [
          { displayName: "T-shirt", quantity: 2, pricingDetails: [{ price: 5000 }] },
          { displayName: "Cap", quantity: 1, pricingDetails: [{ price: 5000 }] }
        ],
        amount: 15000,          // total in cents
        shippingInCents: 1000   // R10 shipping
      };
    }

    // 3️⃣ Calculate shipping and total
    const shipping = yoData.shippingInCents ? yoData.shippingInCents / 100 : 100;
    const total = ((yoData.amount + (yoData.shippingInCents || 10000)) / 100).toFixed(2);

    // 4️⃣ Create Shopify order
    const shopifyDomain = "b007a7-f0.myshopify.com";
    const shopifyAccessToken = process.env.SHOPIFY_ACCESS_TOKEN;

    const shopifyOrder = {
      order: {
        email: yoData.customer.email,
        financial_status: "paid",
        total_price: total,
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

    const shopifyRes = await fetch(`https://${shopifyDomain}/admin/api/2025-10/orders.json`, {
      method: "POST",
      headers: {
        "X-Shopify-Access-Token": shopifyAccessToken,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(shopifyOrder)
    });

    console.log("Shopify response:", await shopifyRes.json());

    // 5️⃣ Build query string for thankyou page
    const query = new URLSearchParams({
      name: yoData.customer.name,
      total: total,
      shipping: shipping.toFixed(2),
      orderNumber: checkoutId,
      cart: JSON.stringify(
        yoData.lineItems.map(item => ({
          title: item.displayName,
          qty: item.quantity,
          price: (item.pricingDetails?.[0]?.price / 100) || 0
        }))
      )
    });

    console.log("Redirecting to:", `${thankyouUrl}?${query.toString()}`);

    // 6️⃣ Redirect to thankyou page
    return res.redirect(`${thankyouUrl}?${query.toString()}`);

  } catch (err) {
    console.error("Yoco success error:", err);
    return res.redirect(
      `${thankyouUrl}?name=Customer&total=0.00&shipping=100&orderNumber=${checkoutId || "N/A"}&cart=[]`
    );
  }
}

