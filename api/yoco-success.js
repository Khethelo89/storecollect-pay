// /api/yoco-success.js
// /api/yoco-success.js
module.exports = async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).send("Method Not Allowed");

  // ...rest of your code remains the same
};

  const { checkoutId } = req.query;
  const thankyouUrl = "https://storecollect-pay.vercel.app/thankyou.html";

  // Function to generate 4-character order number
  function generateOrderCode(id) {
    if (!id) return Math.random().toString(36).substring(2, 6).toUpperCase();
    return id.slice(-4).toUpperCase();
  }

  const orderNumber = generateOrderCode(checkoutId);

  try {
    const secretKey = process.env.YOCO_SECRET_KEY?.trim();
    const shopifyAccessToken = process.env.SHOPIFY_ACCESS_TOKEN?.trim();
    const shopifyDomain = "b007a7-f0.myshopify.com"; // replace with your store domain

    if (!secretKey) return res.status(500).send("Yoco secret key missing");
    if (!shopifyAccessToken) return res.status(500).send("Shopify access token missing");

    if (!checkoutId) {
      console.warn("checkoutId missing, redirecting with fallback values.");
      const params = req.query;
      params.orderNumber = orderNumber; // use 4-char code even if fallback
      return res.redirect(`${thankyouUrl}?${new URLSearchParams(params).toString()}`);
    }

    // 1️⃣ Get checkout details from Yoco
    const yoRes = await fetch(`https://payments.yoco.com/api/checkouts/${checkoutId}`, {
      headers: { Authorization: `Bearer ${secretKey}` }
    });

    let yoData = await yoRes.json();

    // 2️⃣ Handle sandbox / missing data
    const isSandbox = !yoData.customer || !yoData.lineItems || yoData.lineItems.length === 0;
    if (isSandbox) {
      yoData = {
        ...yoData,
        customer: {
          name: "Alice Smith",
          email: "alice@example.com",
          phone: "N/A",
          address1: "123 Test Street",
          city: "Johannesburg",
          province: "Gauteng",
          zip: "2000",
          country: "South Africa"
        },
        lineItems: [
          { displayName: "T-shirt", quantity: 2, pricingDetails: [{ price: 5000 }] },
          { displayName: "Cap", quantity: 1, pricingDetails: [{ price: 5000 }] }
        ],
        amount: 15000,          // total in cents
        shippingInCents: 1000   // R10 shipping
      };
    }

    // 3️⃣ Calculate shipping and total
    const shipping = yoData.shippingInCents ? yoData.shippingInCents / 100 : 0;
    const total = ((yoData.amount + (yoData.shippingInCents || 0)) / 100).toFixed(2);

    // 4️⃣ Create Shopify order
    const shopifyOrder = {
      order: {
        email: yoData.customer.email,
        financial_status: "paid",
        total_price: total,
        note: `Order ID: ${orderNumber}`,
        line_items: yoData.lineItems.map(item => ({
          title: item.displayName,
          quantity: item.quantity,
          price: (item.pricingDetails?.[0]?.price / 100) || 0.toFixed(2)
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

    const shopifyData = await shopifyRes.json();
    console.log("Shopify order response:", shopifyData);

    // 5️⃣ Build query string for thankyou page
    const query = new URLSearchParams({
      name: yoData.customer.name,
      email: yoData.customer.email,
      phone: yoData.customer.phone || "",
      address: yoData.customer.address1 || "",
      city: yoData.customer.city || "",
      province: yoData.customer.province || "",
      zip: yoData.customer.zip || "",
      shipping: shipping.toFixed(2),
      total: total,
      orderNumber: orderNumber, // 4-character code
      cart: JSON.stringify(
        yoData.lineItems.map(item => ({
          title: item.displayName,
          qty: item.quantity,
          price: (item.pricingDetails?.[0]?.price / 100) || 0
        }))
      )
    });

    console.log("Redirecting to thankyou page:", `${thankyouUrl}?${query.toString()}`);

    // 6️⃣ Redirect to thankyou page
    return res.redirect(`${thankyouUrl}?${query.toString()}`);
  } catch (err) {
    console.error("Yoco success error:", err);
    return res.redirect(
      `${thankyouUrl}?name=Customer&email=N/A&phone=&address=&city=&province=&zip=&shipping=0&total=0&orderNumber=${orderNumber}&cart=[]`
    );
  }
}

