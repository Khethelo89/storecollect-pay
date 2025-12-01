// /api/yoco-success.js
const fetch = globalThis.fetch || require("node-fetch");

module.exports = async function handler(req, res) {
  const thankyouUrl = "https://storecollect-pay.vercel.app/thankyou.html";

  try {
    const {
      name = "Customer",
      email = "N/A",
      phone = "",
      address = "",
      city = "",
      province = "",
      zip = "",
      shipping = "0",
      total = "0",
      orderNumber = Math.random().toString(36).substring(2,6).toUpperCase(),
      cart = "[]"
    } = req.query;

    // Decode cart
    let parsedCart = [];
    try { parsedCart = JSON.parse(decodeURIComponent(cart)); } catch(e){ parsedCart=[]; }

    const shopifyDomain = "b007a7-f0.myshopify.com";
    const shopifyAccessToken = process.env.SHOPIFY_ACCESS_TOKEN?.trim();

    if (shopifyAccessToken && email !== "N/A") {
      const shopifyOrder = {
        order: {
          email: email,
          financial_status: "paid",
          total_price: total,
          note: `Order ID: ${orderNumber}`,
          line_items: parsedCart.map(item => ({
            title: item.title,
            quantity: item.qty || 1,
            price: (item.price || 0).toFixed(2)
          })),
          shipping_address: {
            first_name: name.split(" ")[0],
            last_name: name.split(" ")[1] || "",
            address1: address,
            city: city,
            province: province,
            zip: zip,
            country: "South Africa"
          }
        }
      };

      try {
        const shopifyRes = await fetch(`https://${shopifyDomain}/admin/api/2025-10/orders.json`, {
          method: "POST",
          headers: {
            "X-Shopify-Access-Token": shopifyAccessToken,
            "Content-Type": "application/json"
          },
          body: JSON.stringify(shopifyOrder)
        });

        const shopifyData = await shopifyRes.json();

        // Log Shopify response
        if (shopifyData.errors) {
          console.error("Shopify order rejected:", JSON.stringify(shopifyData.errors, null, 2));
        } else {
          console.log("Shopify order created successfully:", JSON.stringify(shopifyData, null, 2));
        }

      } catch (err) {
        console.error("Shopify fetch failed:", err);
      }
    } else {
      console.warn("Skipping Shopify order: missing access token or email.");
    }

    // Redirect to thank-you page
    const query = new URLSearchParams({
      name, email, phone, address, city, province, zip, shipping, total, orderNumber, cart: JSON.stringify(parsedCart)
    });

    return res.redirect(`${thankyouUrl}?${query.toString()}`);
  } catch (err) {
    console.error("Yoco success error:", err);
    return res.redirect(`${thankyouUrl}?name=Customer&email=N/A&phone=&address=&city=&province=&zip=&shipping=0&total=0&orderNumber=N/A&cart=[]`);
  }
};
