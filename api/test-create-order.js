export default async function handler(req, res) {
  try {
    const shopifyDomain = process.env.SHOPIFY_DOMAIN?.trim();
    const token = process.env.SHOPIFY_ACCESS_TOKEN?.trim();

    if (!shopifyDomain || !token) {
      return res.status(400).json({ error: "Missing env variables" });
    }

    const response = await fetch(
      `https://${shopifyDomain}/admin/api/2024-10/orders.json`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Access-Token": token,
        },
        body: JSON.stringify({
          order: {
            line_items: [
              {
                title: "TEST NORMAL ORDER - DO NOT SHIP",
                quantity: 1,
                price: "1.00",
              },
            ],
            financial_status: "paid",
            note: "Created from Vercel test API (normal order)",
            customer: {
              first_name: "Test",
              last_name: "Customer",
              email: "test@storecollect.net",
            },
          },
        }),
      }
    );

    const data = await response.json();

    return res.status(response.status).json({
      ok: response.ok,
      status: response.status,
      data,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message || "Server error" });
  }
}
