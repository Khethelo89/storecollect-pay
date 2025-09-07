export default async function handler(req, res){
  if(req.method !== "POST") return res.status(405).json({error:"Method Not Allowed"});

  try{
    const { items, shipping_cost, payment_id, financial_status, firstName, lastName, email, phone, address, city, province, zip } = req.body;

    const orderData = {
      order:{
        line_items: items.map(i=>({
          title: i.title,
          variant_id: i.variantId,
          quantity: i.quantity,
          price: i.price
        })),
        shipping_lines:[{ price: shipping_cost.toFixed(2), title:"Shipping" }],
        customer:{ first_name:firstName, last_name:lastName, email, phone },
        shipping_address:{ address1:address, city, province, zip, country:"South Africa", phone },
        financial_status:financial_status,
        transactions:[{ kind:"sale", status:"success", gateway:"Yoco", authorization:payment_id }]
      }
    };

    const response = await fetch("https://b007a7-f0.myshopify.com/admin/api/2025-01/orders.json",{
      method:"POST",
      headers:{
        "Content-Type":"application/json",
        "X-Shopify-Access-Token": process.env.SHOPIFY_ACCESS_TOKEN
      },
      body: JSON.stringify(orderData)
    });

    const shopifyRes = await response.json();
    if(!response.ok) return res.status(500).json({error:"Shopify API failed", details:shopifyRes});

    return res.status(200).json({success:true, shopify:shopifyRes});
  }
  catch(err){
    console.error("Webhook error:", err);
    return res.status(500).json({error:err.message});
  }
      }
