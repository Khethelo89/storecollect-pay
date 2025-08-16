export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(200).send("Webhook is live! (GET)");
  }

  const { token, amount, currency, orderId, email, customer } = req.body;

  try {
    // 1️⃣ Charge the customer via Yoco
    const yocoRes = await fetch("https://online.yoco.com/v1/charges/", {
      method: "POST",
      headers: {
        "X-Auth-Secret-Key": process.env.YOCO_SECRET_KEY, // Vercel env
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        token,
        amountInCents: amount,
        currency
      })
    });

    const yocoData = await yocoRes.json();
    console.log("✅ Yoco charge response:", yocoData);

    if (yocoData.status !== "successful") {
      return res.status(400).json({ error: "Payment failed", yocoData });
    }

    // 2️⃣ Create Shopify order
    const shopifyRes = await fetch(
      "https://storecollect-net.myshopify.com/admin/api/2025-07/orders.json",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Access-Token": process.env.SHOPIFY_TOKEN // Vercel env
        },
        body: JSON.stringify({
          order: {
            email: email,
            line_items: [
              {
                title: "StoreCollect Order",
                quantity: 1,
                price: (amount / 100).toFixed(2)
              }
            ],
            shipping_address: customer, // { first_name, last_name, address1, city, province, country, zip }
            financial_status: "paid"
          }
        })
      }
    );

    const shopifyData = await shopifyRes.json();
    console.log("✅ Shopify order response:", shopifyData);

    res.status(200).json({
      message: "Payment successful and Shopify order created",
      yocoData,
      shopifyData
    });

  } catch (err) {
    console.error("❌ Error processing payment:", err);
    res.status(500).json({ error: "Server error", details: err.message });
  }
  }
