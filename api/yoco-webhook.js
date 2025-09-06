export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    // Ensure request body is parsed
    const payload = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    console.log("📦 Yoco webhook received:", payload);

    // Build Shopify order payload (variantId based)
    const shopifyOrder = {
      order: {
        email: payload.customer_email,
        financial_status: "paid",
        line_items: [
          {
            variant_id: parseInt(payload.variantId, 10),
            quantity: parseInt(payload.product_quantity, 10) || 1,
          },
        ],
        shipping_lines: [
          {
            title: "Shipping",
            price: payload.shipping_cost || 0,
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
      },
    };

    // Send order to Shopify
    const shopifyResponse = await fetch(
      "https://b007a7-f0.myshopify.com/admin/api/2025-04/orders.json",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Access-Token": process.env.SHOPIFY_TOKEN,
        },
        body: JSON.stringify(shopifyOrder),
      }
    );

    const responseText = await shopifyResponse.text();

    if (!shopifyResponse.ok) {
      console.error("❌ Shopify error:", responseText);
      return res
        .status(shopifyResponse.status)
        .json({ error: "Shopify order failed", details: responseText });
    }

    const shopifyData = JSON.parse(responseText);
    console.log("✅ Shopify order created:", shopifyData);

    return res.status(200).json({ success: true, order: shopifyData });
  } catch (err) {
    console.error("🔥 Error processing webhook:", err);
    return res.status(500).json({ error: "Internal Server Error", details: err.message });
  }
      }
