export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const payload = req.body;
    console.log("📦 Yoco webhook received:", payload);

    // Build Shopify order
    const shopifyOrder = {
      order: {
        email: payload.email,
        financial_status: "paid",
        line_items: payload.items.map(item => ({
          title: item.title,
          quantity: item.quantity,
          price: item.price,
          // Use a variantId if you have one
          // variant_id: item.variantId || undefined
        })),
        shipping_lines: [
          {
            title: "Shipping",
            price: payload.shipping_cost || 0
          }
        ],
        shipping_address: {
          first_name: payload.firstName,
          last_name: payload.lastName,
          address1: payload.address,
          city: payload.city,
          province: payload.province,
          country: "South Africa",
          zip: payload.zip
        }
      }
    };

    // Send order to Shopify
    const shopifyResponse = await fetch(
      "https://<YOUR_SHOPIFY_STORE>.myshopify.com/admin/api/2025-07/orders.json",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Access-Token": process.env.SHOPIFY_TOKEN
        },
        body: JSON.stringify(shopifyOrder)
      }
    );

    if (!shopifyResponse.ok) {
      const errorText = await shopifyResponse.text();
      console.error("❌ Shopify error:", errorText);
      return res.status(500).json({ error: "Failed to create Shopify order", details: errorText });
    }

    const shopifyData = await shopifyResponse.json();
    console.log("✅ Shopify order created:", shopifyData);

    res.status(200).json({ success: true, order: shopifyData });

  } catch (err) {
    console.error("🔥 Error processing webhook:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
}
