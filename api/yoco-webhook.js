// api/yoco-webhook.js
import fetch from 'node-fetch';

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  try {
    const payload = req.body;
    console.log('📩 Yoco webhook received:', payload);

    // Get environment variables
    const YOCO_SECRET_KEY = process.env.YOCO_SECRET_KEY;
    const SHOPIFY_TOKEN = process.env.SHOPIFY_TOKEN;
    const SHOPIFY_STORE = 'storecollect-net.myshopify.com'; // your Shopify domain

    // Optional: verify payment with Yoco API
    // For testing, you can skip this step

    // Create Shopify order
    const shopifyResponse = await fetch(`https://${SHOPIFY_STORE}/admin/api/2025-07/orders.json`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': SHOPIFY_TOKEN
      },
      body: JSON.stringify({
        order: {
          email: payload.email,
          line_items: [
            {
              title: payload.product_name,
              quantity: payload.product_quantity,
              price: payload.product_price,
              ...(payload.variantId ? { variant_id: payload.variantId } : {})
            }
          ],
          shipping_address: {
            first_name: payload.customer.first_name,
            last_name: payload.customer.last_name,
            address1: payload.customer.address1,
            city: payload.customer.city,
            province: payload.customer.province,
            country: payload.customer.country,
            zip: payload.customer.zip,
            phone: payload.customer.phone
          },
          financial_status: 'paid'
        }
      })
    });

    if (!shopifyResponse.ok) {
      const errorText = await shopifyResponse.text();
      console.error('❌ Shopify error:', errorText);
      return res.status(500).json({ error: 'Failed to create Shopify order', details: errorText });
    }

    const responseData = await shopifyResponse.json();
    console.log('✅ Shopify order created:', responseData);

    res.status(200).json({ message: 'Webhook processed successfully', shopifyOrder: responseData });

  } catch (err) {
    console.error('❌ Error processing webhook:', err);
    res.status(500).json({ error: 'Internal Server Error', details: err.message });
  }
}

