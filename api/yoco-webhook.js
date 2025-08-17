import fetch from 'node-fetch';
import emailjs from 'emailjs-com';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

  try {
    const payload = req.body;
    console.log('Yoco webhook received:', payload);

    const SHOPIFY_STORE = 'b007a7-f0.myshopify.com';
    const SHOPIFY_TOKEN = process.env.SHOPIFY_TOKEN;

    const EMAILJS_SERVICE_ID = process.env.EMAILJS_SERVICE_ID;
    const EMAILJS_PUBLIC_KEY = process.env.EMAILJS_PUBLIC_KEY;
    const EMAILJS_TEMPLATE_IDS = {
      Shoes: process.env.EMAILJS_TEMPLATE_SHOES,
      Clothing: process.env.EMAILJS_TEMPLATE_CLOTHING,
      Accessories: process.env.EMAILJS_TEMPLATE_ACCESSORIES,
      Default: process.env.EMAILJS_TEMPLATE_DEFAULT
    };

    const selectedTemplateID = EMAILJS_TEMPLATE_IDS[payload.collection] || EMAILJS_TEMPLATE_IDS.Default;

    const shippingCost = parseFloat(payload.shipping_cost || 0);

    const shopifyLineItems = [
      {
        title: payload.product_name,
        quantity: payload.product_quantity,
        price: payload.product_price,
        ...(payload.variantId ? { variant_id: payload.variantId } : {})
      }
    ];

    if (shippingCost > 0) {
      shopifyLineItems.push({
        title: 'Shipping (Hidden from Customer)',
        quantity: 1,
        price: shippingCost.toFixed(2)
      });
    }

    const shopifyResponse = await fetch(
      `https://${SHOPIFY_STORE}/admin/api/2025-07/orders.json`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': SHOPIFY_TOKEN
        },
        body: JSON.stringify({
          order: {
            email: payload.customer_email,
            line_items: shopifyLineItems,
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

    emailjs.init(EMAILJS_PUBLIC_KEY);
    await emailjs.send(
      EMAILJS_SERVICE_ID,
      selectedTemplateID,
      payload
    );

    res.status(200).send('Webhook processed successfully');
  } catch (err) {
    console.error('Error processing webhook:', err);
    res.status(500).send('Internal Server Error');
  }
      }
