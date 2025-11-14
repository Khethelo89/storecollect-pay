// /api/yoco-webhook.js
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const {
      token,
      amountInCents,
      currency,
      items,
      firstName,
      lastName,
      email,
      phone,
      address,
      city,
      province,
      zip
    } = req.body;

    // Validate required fields
    if (!token || !amountInCents || !items?.length || !province) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    console.log("Sending to Yoco:", { token, amountInCents, currency });

    // --- 1️⃣ Charge with Yoco ---
    const yocoRes = await fetch("https://online.yoco.com/v1/charges/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Auth-Secret-Key": process.env.YOCO_SECRET_KEY
      },
      body: JSON.stringify({
        token,
        amountInCents: Math.round(amountInCents), // make sure in cents
        currency
      })
    });

    const yocoData = await yocoRes.json();

    if (!yocoRes.ok || yocoData.status !== "successful") {
      return res.status(400).json({ error: "Yoco payment failed", details: yocoData });
    }

    // --- 2️⃣ Build Shopify order ---
    const SHIPPING_COST = 100; // Always R100, but display "Free Shipping" on thank-you page
    const orderData = {
      order: {
        line_items: items.map(i => ({
          title: i.title,
          variant_id: i.variantId || undefined,
          quantity: i.qty,
          price: i.price
        })),
        shipping_lines: [{ price: SHIPPING_COST.toFixed(2), title: "Shipping" }],
        customer: {
          first_name: firstName,
          last_name: lastName,
          email,
          phone
        },
        shipping_address: {
          address1: address,
          city,
          province,
          zip,
          country: "South Africa",
          phone
        },
        financial_status: "paid",
        transactions: [
          {
            kind: "sale",
            status: "success",
            gateway: "Yoco",
            authorization: yocoData.id,
            amount: amountInCents / 100
          }
        ]
      }
    };

    // --- 3️⃣ Send order to Shopify ---
    const shopifyResRaw = await fetch(
      "https://b007a7-f0.myshopify.com/admin/api/2025-01/orders.json",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Access-Token": process.env.SHOPIFY_ACCESS_TOKEN
        },
        body: JSON.stringify(orderData)
      }
    );

    const shopifyText = await shopifyResRaw.text();

    try {
      const shopifyRes = JSON.parse(shopifyText);
      if (!shopifyResRaw.ok) {
        return res.status(500).json({ error: "Shopify API failed", details: shopifyRes });
      }
      return res.status(200).json({ success: true, yoco: yocoData, shopify: shopifyRes });
    } catch (err) {
      return res.status(500).json({ error: "Shopify did not return valid JSON", rawResponse: shopifyText });
    }
  } catch (err) {
    console.error("Webhook error:", err);
    return res.status(500).json({ error: err.message });
  }
}
