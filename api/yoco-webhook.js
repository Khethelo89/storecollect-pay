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

    if (!token || !amountInCents || !items?.length) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const secretKey = process.env.YOCO_SECRET_KEY?.trim();
    if (!secretKey) {
      console.error("❌ Missing YOCO_SECRET_KEY in Vercel");
      return res.status(500).json({ error: "Server misconfigured" });
    }

    // --- Charge via Yoco Checkout API ---
    const yocoRes = await fetch("https://online.yoco.com/v1/charges/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Auth-Secret-Key": secretKey,
      },
      body: JSON.stringify({
        token,
        amount: amountInCents,
        currency,
        metadata: {
          firstName,
          lastName,
          email,
          phone,
          address,
          city,
          province,
          zip
        }
      }),
    });

    const yocoData = await yocoRes.json();

    if (!yocoRes.ok || yocoData.status !== "successful") {
      console.error("❌ Yoco payment failed:", yocoData);
      return res.status(400).json({
        error: "Yoco payment failed",
        details: yocoData,
      });
    }

    return res.status(200).json({
      success: true,
      transactionId: yocoData.id,
      message: "Payment successful",
    });

  } catch (err) {
    console.error("Server error:", err);
    return res.status(500).json({ error: "Internal Server Error", details: err.message });
  }
}

    // --- 2️⃣ Build Shopify order ---
    const SHIPPING_COST = 100;
    const lineTotal = items.reduce((sum, i) => sum + Number(i.price) * Number(i.qty), 0);
    const totalAmount = lineTotal + SHIPPING_COST;

    const orderData = {
      order: {
        line_items: items.map(i => ({
          title: i.title,
          variant_id: i.variantId || null, // replace with actual variantId if available
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
        transactions: [{
          kind: "sale",
          status: "success",
          gateway: "Yoco",
          authorization: yocoData.id,
          amount: totalAmount.toFixed(2)
        }]
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
