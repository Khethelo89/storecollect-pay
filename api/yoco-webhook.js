// /api/yoco-webhook.js
import fetch from "node-fetch";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const {
      items,
      shipping_cost,
      payment_id,
      financial_status,
      firstName,
      lastName,
      email,
      phone,
      address,
      city,
      province,
      zip,
    } = req.body;

    // 🔑 Shopify credentials
    const SHOPIFY_STORE_URL = "b007a7-f0.myshopify.com";
    const SHOPIFY_ADMIN_API = `https://${SHOPIFY_STORE_URL}/admin/api/2025-01/orders.json`;
    const SHOPIFY_ACCESS_TOKEN = process.env.SHOPIFY_ACCESS_TOKEN; // set in Vercel env vars

    // 🛒 Format Shopify line items
    const line_items = items.map((item) => ({
      variant_id: item.variantId,
      quantity: item.quantity,
      price: item.price,
    }));

    // 📦 Create Shopify order payload
    const orderData = {
      order: {
        line_items,
        financial_status, // "paid"
        transactions: [
          {
            kind: "sale",
            status: "success",
            amount: items.reduce(
              (sum, i) => sum + i.price * i.quantity,
              0
            ) + shipping_cost,
            gateway: "Yoco",
            authorization: payment_id,
          },
        ],
        shipping_lines: [
          {
            title: "Standard Shipping",
            price: shipping_cost,
          },
        ],
        customer: {
          first_name: firstName,
          last_name: lastName,
          email,
          phone,
        },
        shipping_address: {
          first_name: firstName,
          last_name: lastName,
          address1: address,
          city,
          province,
          zip,
          country: "South Africa",
          phone,
        },
      },
    };

    // 🚀 Send to Shopify
    const response = await fetch(SHOPIFY_ADMIN_API, {
      method: "POST",
      headers: {
        "X-Shopify-Access-Token": SHOPIFY_ACCESS_TOKEN,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(orderData),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Shopify error:", data);
      return res.status(500).json({ error: "Shopify order creation failed", details: data });
    }

    console.log("✅ Shopify order created:", data);
    res.status(200).json({ success: true, order: data });
  } catch (err) {
    console.error("Webhook error:", err);
    res.status(500).json({ error: "Webhook failed", details: err.message });
  }
}
