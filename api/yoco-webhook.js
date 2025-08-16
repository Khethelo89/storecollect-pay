import fetch from 'node-fetch';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  try {
    const payload = req.body;
    console.log('Yoco webhook received:', payload);

    // POST to Shopify
    const shopifyResponse = await fetch(
      `https://${process.env.SHOPIFY_STORE}/admin/api/2025-07/orders.json`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': process.env.SHOPIFY_ACCESS_TOKEN
        },
        body: JSON.stringify({
          order: {
            email: payload.customer_email,
            line_items: [
              {
                title: payload.product_name,
                quantity: payload.product_quantity,
                price: payload.product_price,
                ...(payload.variantId ? { variant_id: payload.variantId } : {})
              }
            ],
            shipping_address: {
              first_name: payload.customer_first_name,
              last_name: payload.customer_last_name,
              address1: payload.address,
              city: payload.city,
              province: payload.province,
              country: payload.country,
              zip: payload.zip
            },
            financial_status: 'paid'
          }
        })
      }
    );

    if (!shopifyResponse.ok) {
      const errorText = await shopifyResponse.text();
      console.error('Shopify error:', errorText);
      return res.status(500).json({ message: 'Failed to create Shopify order', error: errorText });
    }

    res.status(200).json({ message: 'Webhook processed & Shopify order created ✅' });
  } catch (err) {
    console.error('Error processing webhook:', err);
    res.status(500).json({ message: 'Internal Server Error', error: err.message });
  }
}
