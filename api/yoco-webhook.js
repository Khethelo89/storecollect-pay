// /api/yoco-webhook.js
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    console.log("Received payload:", req.body);

    const { line_items, shipping_cost, packaging_cost, customer } = req.body;

    if (!line_items || line_items.length === 0) {
      return res.status(400).json({ error: "Cart is empty" });
    }

    // Calculate total amount in cents
    let subtotal = line_items.reduce((sum, item) => sum + item.unit_price * item.quantity, 0);
    const totalAmount = subtotal + (shipping_cost || 0) + (packaging_cost || 0);

    // Build payload for Yoco Checkout API
    const checkoutPayload = {
      amountInCents: totalAmount,
      currency: "ZAR",
      items: line_items.map(item => ({
        name: item.name,
        quantity: item.quantity,
        priceInCents: item.unit_price
      })),
      customer: {
        firstName: customer.first_name,
        lastName: customer.last_name,
        email: customer.email,
        phone: customer.phone
      },
      redirectUrl: "https://storecollect.net/thank-you.html" // Change if needed
    };

    console.log("Sending to Yoco:", checkoutPayload);

    // Call Yoco Checkout API
    const yocoRes = await fetch("https://api.yoco.com/v1/checkout", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.YOCO_SECRET_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(checkoutPayload)
    });

    const contentType = yocoRes.headers.get("content-type") || "";

    let data;
    if (contentType.includes("application/json")) {
      data = await yocoRes.json();
    } else {
      const text = await yocoRes.text();
      console.error("Yoco returned non-JSON response:", text);
      return res.status(500).json({ error: "Yoco returned invalid response", details: text });
    }

    if (data.id && data.checkoutUrl) {
      console.log("Yoco checkout created successfully:", data.checkoutUrl);
      res.status(200).json({ checkoutUrl: data.checkoutUrl });
    } else {
      console.error("Yoco returned error:", data);
      res.status(400).json({ error: "Failed to create checkout session", details: data });
    }

  } catch (err) {
    console.error("Webhook error:", err);
    res.status(500).json({ error: "Server error", details: err.message });
  }
                          }
