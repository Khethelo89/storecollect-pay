export default async function handler(req, res) {
  try {
    const shopifyDomain = process.env.SHOPIFY_DOMAIN?.trim();
    const token = process.env.SHOPIFY_ACCESS_TOKEN?.trim();

    if (!shopifyDomain || !token) {
      return res.status(400).json({
        error: "Missing SHOPIFY_DOMAIN or SHOPIFY_ACCESS_TOKEN",
      });
    }

    const response = await fetch(
      `https://${shopifyDomain}/admin/api/2024-10/shop.json`,
      {
        method: "GET",
        headers: {
          "X-Shopify-Access-Token": token,
        },
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

