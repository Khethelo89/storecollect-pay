export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const payload = req.body;
    console.log("📦 Yoco webhook received:", payload);

    // 1️⃣ Choose line item type
    let lineItem;
    if (payload.variantId) {
      // Real Shopify product
      lineItem = {
        variant_id: Number(payload.variantId),
        quantity: Number(payload.product_quantity) || 1,
      };
    } else {
      // Fallback: custom product (for testing or manual orders)
      lineItem = {
        title: payload.product_name || "Test Product",
        price: Number(payload.product_price) || 199,
        quantity: Number(payload.product_quantity) || 1,
      };
    }

    // 2️⃣ Build Shopify order payload
    const shopifyOrder = {
      order: {
        email: payload.customer_email,
        financial_status: "paid", // mark as paid immediately
        line_items: [lineItem],
        shipping_lines: [
          {
            title: "Shipping",
            price: Number(payload.shipping_cost) || 0,
          },
        ],
        shipping_address: {
          first_name: payload.customer_first_name,
          last_name: payload.customer_last_name,
          address1: payload.customer_address,
          city: payload.customer_city,
          province: payload.customer_province,
          country: payload.customer_country,
          zip: payload.customer_zip,
        },
        note: `Yoco Payment ID: ${payload.payment_id}`,
      },
    };

    // 3️⃣ Send order to Shopify
    const shopifyResponse = await fetch(
      "https://b007a7-f0.myshopify.com/admin/api/2025-07/orders.json",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Access-Token": process.env.SHOPIFY_TOKEN,
        },
        body: JSON.stringify(shopifyOrder),
      }
    );

    if (!shopifyResponse.ok) {
      const errorText = await shopifyResponse.text();
      console.error("❌ Shopify error:", errorText);
      return res
        .status(500)
        .json({ error: "Failed to create Shopify order", details: errorText });
    }

    const shopifyData = await shopifyResponse.json();
    console.log("✅ Shopify order created:", shopifyData);

    return res.status(200).json({ success: true, order: shopifyData });
  } catch (err) {
    console.error("🔥 Error processing webhook:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
}
