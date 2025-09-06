export default async function handler(req, res){
  if(req.method !== "POST") return res.status(405).json({error:"Method Not Allowed"});

  try {
    const payload = req.body;
    console.log("📦 Webhook payload:", payload);

    const shopifyOrder = {
      order: {
        email: payload.email,
        financial_status: "paid",
        line_items: payload.items.map(item => ({
          variant_id: item.variantId, // send variantId to Shopify
          quantity: item.quantity
        })),
        shipping_lines: [
          { title:"Shipping", price: payload.shipping_cost || 0 }
        ],
        shipping_address: {
          first_name: payload.firstName,
          last_name: payload.lastName,
          address1: payload.address,
          city: payload.city,
          province: payload.province,
          country: "South Africa",
          zip: payload.zip
        }
      }
    };

    const shopifyResponse = await fetch(
      "https://b007a7-f0.myshopify.com/admin/api/2025-07/orders.json",
      {
        method:"POST",
        headers:{
          "Content-Type":"application/json",
          "X-Shopify-Access-Token": process.env.SHOPIFY_TOKEN
        },
        body: JSON.stringify(shopifyOrder)
      }
    );

    if(!shopifyResponse.ok){
      const errorText = await shopifyResponse.text();
      console.error("❌ Shopify error:", errorText);
      return res.status(500).json({error:"Failed to create Shopify order", details:errorText});
    }

    const shopifyData = await shopifyResponse.json();
    console.log("✅ Shopify order created:", shopifyData);
    res.status(200).json({success:true, order:shopifyData});

  } catch(err){
    console.error("🔥 Webhook error:", err);
    res.status(500).json({error:"Internal Server Error"});
  }
                          }
