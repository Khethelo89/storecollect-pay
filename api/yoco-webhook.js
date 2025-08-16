// api/yoco-webhook.js
import fetch from 'node-fetch';

export default async function handler(req, res) {
  // Allow cross-origin requests from browser
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight request
  if (req.method === 'OPTIONS') return res.status(200).end();

  // Only allow POST requests
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  try {
    const payload = req.body;
    console.log('📩 Yoco webhook received:', payload);

    const YOCO_SECRET_KEY = process.env.YOCO_SECRET_KEY;
    const SHOPIFY_TOKEN = process.env.SHOPIFY_TOKEN;
    const SHOPIFY_STORE = 'storecollect-net.myshopify.com'; // your Shopify domain

    // Optional: verify payment with Yoco API using YOCO_SECRET_KEY
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
            address1: payload.customer_address,
            city: payload.customer_city,
            province: payload.customer_province,
            country: payload.customer_country,
            zip: payload.customer_zip,
            phone: payload.customer_phone
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

    const shopifyData = await shopifyResponse.json();
    console.log('✅ Shopify order created:', shopifyData);

    res.status(200).json({ message: 'Webhook processed successfully', shopifyOrder: shopifyData });

  } catch (err) {
    console.error('❌ Error processing webhook:', err);
    res.status(500).json({ error: 'Internal Server Error', details: err.message });
  }
}

