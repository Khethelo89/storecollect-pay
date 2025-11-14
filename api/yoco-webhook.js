// /api/yoco-webhook.js
import fetch from "node-fetch";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    // Load secret key from environment variable
    const secretKey = process.env.YOCO_SECRET_KEY?.trim();
    if (!secretKey) {
      console.error("YOCO_SECRET_KEY is missing in environment variables!");
      return res.status(500).json({ error: "Server misconfigured" });
    }

    const {
      line_items,
      shipping_cost = 0,
      packaging_cost = 0,
      customer
    } = req.body;

    if (!line_items || line_items.length === 0) {
      return res.status(400).json({ error: "Cart is empty" });
    }

    // Calculate total amount in cents
    const itemsTotal = line_items.reduce((sum, item) => sum + item.unit_price * item.quantity, 0);
    const totalAmount = itemsTotal + shipping_cost + packaging_cost;

    // Build Yoco checkout payload
    const payload = {
      amountInCents: totalAmount,
      currency: "ZAR",
      customer: {
        firstName: customer.first_name,
        lastName: customer.last_name,
        email: customer.email,
        phone: customer.phone,
        address: {
          line1: customer.address,
          city: customer.city,
          province: customer.province,
          postalCode: customer.zip
        }
      },
      items: line_items.map(item => ({
        name: item.name,
        quantity: item.quantity,
        unitPriceInCents: item.unit_price
      }))
    };

    // Call Yoco API to create a hosted checkout session
    const response = await fetch("https://api.yoco.com/v1/online-checkouts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${secretKey}`
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (response.ok && data.checkoutUrl) {
      return res.status(200).json({ checkoutUrl: data.checkoutUrl });
    } else {
      console.error("Yoco API error:", data);
      return res.status(500).json({ error: "Yoco checkout creation failed", details: data });
    }

  } catch (err) {
    console.error("Server error:", err);
    res.status(500).json({ error: "Server error", details: err.message });
  }
        }
