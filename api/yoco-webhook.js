export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  try {
    const payload = req.body;
    console.log('📦 Yoco webhook received:', payload);

    const { items, shipping_cost, payment_id, financial_status,
            firstName, lastName, email, phone, address, city, province, zip } = payload;

    const shopifyOrder = {
      order: {
        email,
        financial_status: financial_status || 'paid',
        line_items: items.map(item => ({
          title: item.title,
          quantity: item.quantity,
          price: item.price,
          variant_id: item.variantId
        })),
        shipping_lines: [{ title: "Shipping", price: shipping_cost || 0 }],
        shipping_address: { first_name: firstName, last_name: lastName, address1: address,
                            city, province, country: "South Africa", zip },
        tags: `YocoPayment:${payment_id}`
      }
    };

    console.log('🛒 Sending order to Shopify:', shopifyOrder);

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

    if(!shopifyResponse.ok){
      const errorText = await shopifyResponse.text();
      console.error('❌ Shopify error:', errorText);
      return res.status(500).json({ error: 'Failed to create Shopify order', details: errorText });
    }

    const shopifyData = await shopifyResponse.json();
    console.log('✅ Shopify order created:', shopifyData);

    res.status(200).json({ success: true, order: shopifyData });

  } catch(err){
    console.error('🔥 Webhook processing error:', err);
    res.status(500).json({ error: 'Internal Server Error', details: err.message });
  }
}
