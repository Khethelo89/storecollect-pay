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
      orderNumber = Math.random().toString(36).substring(2, 6).toUpperCase(),
      cart = "[]",
    } = req.query;

    let parsedCart = [];
    try {
      parsedCart = JSON.parse(decodeURIComponent(cart));
    } catch (e) {
      parsedCart = [];
    }

    const shopifyDomain = "b007a7-f0.myshopify.com";
    const shopifyAccessToken = process.env.SHOPIFY_ACCESS_TOKEN?.trim();

    if (shopifyAccessToken && email !== "N/A" && parsedCart.length > 0) {
      const shopifyOrder = {
        order: {
          email,
          financial_status: "paid",
          currency: "ZAR",
          note: `Order ID: ${orderNumber}`,
          line_items: parsedCart.map((item) => ({
            title: item.title,
            quantity: Number(item.qty || 1),
            price: Number(item.price || 0).toFixed(2),
          })),
          shipping_address: {
            first_name: name.split(" ")[0] || "Customer",
            last_name: name.split(" ").slice(1).join(" ") || "",
            address1: address,
            city,
            province,
            zip,
            country: "South Africa",
            phone,
          },
          shipping_lines: [
            {
              title: "Shipping",
              price: Number(shipping || 0).toFixed(2),
            },
          ],
        },
      };

      const shopifyRes = await fetch(
        `https://${shopifyDomain}/admin/api/2024-10/orders.json`,
        {
          method: "POST",
          headers: {
            "X-Shopify-Access-Token": shopifyAccessToken,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(shopifyOrder),
        }
      );

      const shopifyData = await shopifyRes.json();

      if (!shopifyRes.ok) {
        console.error("❌ Shopify order rejected:", shopifyRes.status, shopifyData);
      } else {
        console.log("✅ Shopify order created:", shopifyData?.order?.id);
      }
    } else {
      console.warn("Skipping Shopify order: missing token/email/cart.");
    }

    const query = new URLSearchParams({
      name,
      email,
      phone,
      address,
      city,
      province,
      zip,
      shipping,
      orderNumber,
      cart: JSON.stringify(parsedCart),
    });

    return res.redirect(`${thankyouUrl}?${query.toString()}`);
  } catch (err) {
    console.error("Yoco success error:", err);
    return res.redirect(
      `${thankyouUrl}?name=Customer&email=N/A&phone=&address=&city=&province=&zip=&shipping=0&orderNumber=N/A&cart=[]`
    );
  }
};
