 export default async function handler(req, res) {
  // Allow CORS for testing
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const payload = req.body;
    console.log("📦 Webhook payload received:", payload);

    // Build Shopify line items
    const lineItems = (payload.items || []).map(item => {
      if (item.variantId) {
        return {
          variant_id: Number(item.variantId),
          quantity: Number(item.quantity) || 1,
        };
      } else {
        return {
          title: item.title || "Custom Product",
          price: Number(item.price) || 0,
          quantity: Number(item.quantity) || 1,
        };
      }
    });

    // Build Shopify order payload
    const shopifyOrder = {
      order: {
        email: payload.customer_email,
        financial_status: "paid",
        line_items: lineItems,
        shipping_lines: [
          {
            title: `Shipping - ${payload.customer_province}`,
            price: Number(payload.shipping_cost) || 0,
            code: "Shipping",
            source: "StoreCollect",
          }
        ],
        shipping_address: {
          first_name: payload.customer_first_name,
          last_name: payload.customer_last_name,
          address1: payload.customer_address,
          city: payload.customer_city,
          province: payload.customer_province,
          country: payload.customer_country,
          zip: payload.customer_zip
        },
        note: `Yoco Payment ID: ${payload.payment_id}`
      }
    };

    console.log("🛒 Shopify order payload:", JSON.stringify(shopifyOrder, null, 2));

    // Send order to Shopify
    const shopifyResponse = await fetch(
      "https://b007a7-f0.myshopify.com/admin/api/2025-07/orders.json",
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
      console.error("❌ Shopify API error:", errorText);
      return res.status(shopifyResponse.status).json({
        error: "Failed to create Shopify order",
        details: errorText
      });
    }

    const shopifyData = await shopifyResponse.json();
    console.log("✅ Shopify order created successfully:", shopifyData);

    return res.status(200).json({ success: true, order: shopifyData });

  } catch (err) {
    console.error("🔥 Webhook error:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
          }
