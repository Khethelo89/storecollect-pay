import fetch from "node-fetch";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const payload = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    console.log("📦 Webhook received:", payload);

    // -------------------------------
    // 1️⃣ Verify Yoco payment
    // -------------------------------
    const yocoSecretKey = process.env.YOCO_SECRET_KEY; // sk_test_xxx
    const paymentId = payload.payment_id;

    const yocoResponse = await fetch(`https://online.yoco.com/v1/payments/${paymentId}`, {
      headers: {
        Authorization: `Basic ${Buffer.from(yocoSecretKey + ":").toString("base64")}`,
        "Content-Type": "application/json",
      },
    });

    const yocoData = await yocoResponse.json();
    console.log("💳 Yoco payment status:", yocoData);

    if (!yocoResponse.ok || yocoData.status !== "successful") {
      return res.status(400).json({ error: "Payment not successful", details: yocoData });
    }

    // -------------------------------
    // 2️⃣ Build Shopify order payload
    // -------------------------------
    const shopifyOrder = {
      order: {
        email: payload.customer_email,
        financial_status: "paid",
        line_items: [
          {
            variant_id: Number(payload.variantId),
            quantity: Number(payload.product_quantity) || 1,
          },
        ],
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
      },
    };

    // -------------------------------
    // 3️⃣ Send order to Shopify
    // -------------------------------
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
    console.error("🔥 Webhook error:", err);
    return res.status(500).json({ error: "Internal Server Error", details: err.message });
  }
}
