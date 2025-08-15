import fetch from 'node-fetch';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

  try {
    const payload = req.body;
    console.log('Yoco webhook received:', payload);

    const shopifyResponse = await fetch(
      'https://your-store.myshopify.com/admin/api/2025-07/orders.json',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': 'your-shopify-access-token'
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
      return res.status(500).send('Failed to create Shopify order');
    }

    res.status(200).send('Webhook processed successfully');
  } catch (err) {
    console.error('Error processing webhook:', err);
    res.status(500).send('Internal Server Error');
  }
}
