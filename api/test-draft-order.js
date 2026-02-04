export default async function handler(req, res) {
  try {
    const shopifyDomain = process.env.SHOPIFY_DOMAIN?.trim();
    const token = process.env.SHOPIFY_ACCESS_TOKEN?.trim();

    const response = await fetch(
      `https://${shopifyDomain}/admin/api/2024-10/draft_orders.json`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Access-Token": token,
        },
        body: JSON.stringify({
          draft_order: {
            line_items: [
              {
                title: "TEST ORDER - DO NOT PAY",
                quantity: 1,
                price: "1.00",
              },
            ],
            note: "Created from Vercel test API",
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
    return res.status(500).json({
      error: err.message || "Server error",
    });
  }
}

