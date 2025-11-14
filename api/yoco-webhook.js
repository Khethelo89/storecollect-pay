// /api/yoco-webhook.js
import fetch from "node-fetch";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const { line_items, shipping_cost, packaging_cost, customer } = req.body;

    // Calculate total amount in cents
    let subtotal = line_items.reduce((sum, item) => sum + item.unit_price * item.quantity, 0);
    const totalAmount = subtotal + shipping_cost + packaging_cost;

    // Build payload for Yoco Checkout API
    const checkoutPayload = {
      amountInCents: totalAmount,
      currency: "ZAR",
      // You can optionally pass metadata or line items
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
      redirectUrl: "https://storecollect.net/thank-you.html" // Redirect after successful payment
    };

    // Call Yoco Checkout API
    const yocoRes = await fetch("https://api.yoco.com/v1/checkout", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.YOCO_SECRET_KEY}`, // Your secret key
        "Content-Type": "application/json"
      },
      body: JSON.stringify(checkoutPayload)
    });

    const data = await yocoRes.json();

    if (data.id && data.checkoutUrl) {
      // Return checkout URL to frontend
      res.status(200).json({ checkoutUrl: data.checkoutUrl });
    } else {
      res.status(400).json({ error: "Failed to create checkout session", details: data });
    }

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}
