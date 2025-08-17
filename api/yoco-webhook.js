export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

  try {
    const payload = req.body;
    console.log('Yoco webhook received:', payload);

    const shopifyResponse = await fetch(
      'https://b007a7-f0.myshopify.com/admin/api/2025-07/orders.json',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': process.env.SHOPIFY_TOKEN
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
            shipping_lines: [
              {
                title: "Shipping",
                price: payload.shipping_cost || 0
              }
            ],
            shipping_address: {
              first_name: payload.customer_first_name,
              last_name: payload.customer_last_name,
              address1: payload.customer_address,
              city: payload.customer_city,
              province: payload.customer_province,
              country: payload.customer_country,
              zip: payload.customer_zip
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
