export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const { token, amountInCents, currency, items, shipping_cost, firstName, lastName, email, phone, address, city, province, zip } = req.body;

    // 1️⃣ Verify & capture payment with Yoco API
    const yocoRes = await fetch("https://online.yoco.com/v1/charges/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Auth-Secret-Key": process.env.YOCO_SECRET_KEY
      },
      body: JSON.stringify({
        token, // from frontend Yoco SDK
        amountInCents, // e.g., 5000 for R50.00
        currency // "ZAR"
      })
    });

    const yocoData = await yocoRes.json();
    if (!yocoRes.ok || yocoData.status !== "successful") {
      return res.status(400).json({ error: "Yoco payment failed", details: yocoData });
    }

    // 2️⃣ Build Shopify order
    const orderData = {
      order: {
        line_items: items.map(i => ({
          title: i.title,
          variant_id: i.variantId,
          quantity: i.quantity,
          price: i.price
        })),
        shipping_lines: [{ price: Number(shipping_cost).toFixed(2), title: "Shipping" }],
        customer: { first_name: firstName, last_name: lastName, email, phone },
        shipping_address: { address1: address, city, province, zip, country: "South Africa", phone },
        financial_status: "paid", // only after Yoco success
        transactions: [{
          kind: "sale",
          status: "success",
          gateway: "Yoco",
          authorization: yocoData.id // Yoco charge ID
        }]
      }
    };

    // 3️⃣ Create Shopify order
    const response = await fetch("https://b007a7-f0.myshopify.com/admin/api/2025-01/orders.json", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": process.env.SHOPIFY_ACCESS_TOKEN
      },
      body: JSON.stringify(orderData)
    });

    const shopifyRes = await response.json();
    if (!response.ok) {
      return res.status(500).json({ error: "Shopify API failed", details: shopifyRes });
    }

    return res.status(200).json({ success: true, yoco: yocoData, shopify: shopifyRes });
  } catch (err) {
    console.error("Webhook error:", err);
    return res.status(500).json({ error: err.message });
  }
}
