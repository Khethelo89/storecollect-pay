// File: api/yoco-webhook.js
export default async function handler(req, res) {
  // Only accept POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed. Use POST.' });
  }

  try {
    const payload = req.body;
    console.log('Yoco webhook received payload:', payload);

    // Validate required fields
    const requiredFields = [
      'product_name', 'product_price', 'product_quantity', 'customer_first_name',
      'customer_last_name', 'customer_email'
    ];
    for (let field of requiredFields) {
      if (!payload[field]) {
        console.error(`Missing required field: ${field}`);
        return res.status(400).json({ error: `Missing required field: ${field}` });
      }
    }

    // Build Shopify order body
    const shopifyOrder = {
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
          address1: payload.customer_address || '',
          city: payload.customer_city || '',
          province: payload.customer_province || '',
          country: payload.customer_country || '',
          zip: payload.customer_zip || ''
        },
        financial_status: payload.financial_status || 'paid'
      }
    };

    // Call Shopify Admin API
    const shopifyResponse = await fetch(
      'https://b007a7-f0.myshopify.com/admin/api/2025-07/orders.json',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': process.env.SHOPIFY_TOKEN
        },
        body: JSON.stringify(shopifyOrder)
      }
    );

    if (!shopifyResponse.ok) {
      const errorText = await shopifyResponse.text();
      console.error('Shopify API error:', errorText);
      return res.status(500).json({ error: 'Failed to create Shopify order', details: errorText });
    }

    const result = await shopifyResponse.json();
    console.log('Shopify order created successfully:', result);
    return res.status(200).json({ success: true, order: result });

  } catch (err) {
    console.error('Error processing Yoco webhook:', err);
    return res.status(500).json({ error: 'Internal Server Error', details: err.message });
  }
          }
