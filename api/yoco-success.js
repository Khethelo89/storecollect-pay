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

    // ✅ Calculate totals in ZAR (this is what customer paid)
    const subtotalZar = parsedCart.reduce((sum, item) => {
      return sum + Number(item.price || 0) * Number(item.qty || 1);
    }, 0);

    const shippingZar = Number(shipping || 0);
    const totalZar = subtotalZar + shippingZar;

    // Shopify connection
    const shopifyDomain = process.env.SHOPIFY_DOMAIN?.trim() || "b007a7-f0.myshopify.com";
    const shopifyAccessToken = process.env.SHOPIFY_ACCESS_TOKEN?.trim();

    // ✅ Create Shopify order (USD store currency stays unchanged)
    if (shopifyAccessToken && email !== "N/A" && parsedCart.length > 0) {
      const shopifyOrder = {
        order: {
          email,
          financial_status: "paid",

          // ✅ Shopify store is USD, so we keep USD here
          currency: "USD",

          // ✅ Store the REAL ZAR amount in the note
          note: `Order ID: ${orderNumber} | Paid via Yoco (ZAR) | Subtotal: R${subtotalZar.toFixed(
            2
          )} | Shipping: R${shippingZar.toFixed(2)} | Total Paid: R${totalZar.toFixed(2)}`,

          tags: "YOCO,PAID,ZAR",

          line_items: parsedCart.map((item) => ({
            title: item.title,
            quantity: Number(item.qty || 1),
            // ⚠️ This price is ZAR number but Shopify will treat as USD (so don't trust totals)
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
              price: Number(shippingZar || 0).toFixed(2),
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

    // ✅ Send totals to thankyou page so you display it
    const query = new URLSearchParams({
      name,
      email,
      phone,
      address,
      city,
      province,
      zip,
      shipping: String(shippingZar),
      orderNumber,
      cart: JSON.stringify(parsedCart),
      subtotalZar: subtotalZar.toFixed(2),
      totalZar: totalZar.toFixed(2),
    });

    return res.redirect(`${thankyouUrl}?${query.toString()}`);
  } catch (err) {
    console.error("Yoco success error:", err);

    return res.redirect(
      `${thankyouUrl}?name=Customer&email=N/A&phone=&address=&city=&province=&zip=&shipping=0&orderNumber=N/A&cart=[]&subtotalZar=0.00&totalZar=0.00`
    );
  }
};
