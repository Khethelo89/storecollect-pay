export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const shopifyDomain = process.env.SHOPIFY_DOMAIN?.trim();
    const token = process.env.SHOPIFY_ACCESS_TOKEN?.trim();

    if (!shopifyDomain || !token) {
      return res.status(400).json({ error: "Missing env variables" });
    }

    const { customer, items, total, yocoPaymentId } = req.body || {};

    if (!customer?.email || !items?.length) {
      return res.status(400).json({
        error: "Missing customer.email or items[]",
      });
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
            line_items: items.map((p) => ({
              title: p.title,
              quantity: Number(p.quantity || 1),
              price: String(p.price),
            })),

            customer: {
              first_name: customer.first_name || "",
              last_name: customer.last_name || "",
              email: customer.email,
            },

            financial_status: "paid",
            note: `Paid via Yoco. Payment ID: ${yocoPaymentId || "N/A"}`,
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
