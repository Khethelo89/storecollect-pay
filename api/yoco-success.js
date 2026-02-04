// /api/yoco-success.js
const fetch = globalThis.fetch || require("node-fetch");

module.exports = async function handler(req, res) {
  const thankyouUrl = "https://storecollect-pay.vercel.app/thankyou.html";

  try {
    const {
      checkoutId = "", // ✅ IMPORTANT
      name = "Customer",
      email = "N/A",
      phone = "",
      address = "",
      city = "",
      province = "",
      zip = "",
      shipping = "0",
      orderNumber = Math.random().toString(36).substring(2, 8).toUpperCase(),
      cart = "[]",
    } = req.query;

    // Decode cart
    let parsedCart = [];
    try {
      parsedCart = JSON.parse(decodeURIComponent(cart));
    } catch (e) {
      parsedCart = [];
    }

    const shopifyDomain = "b007a7-f0.myshopify.com";
    const shopifyAccessToken = process.env.SHOPIFY_ACCESS_TOKEN?.trim();

    const yocoSecretKey = process.env.YOCO_SECRET_KEY?.trim();

    // ✅ STEP 1: Verify Yoco Checkout payment
    let paymentConfirmed = false;

    if (checkoutId && yocoSecretKey) {
      try {
        const yocoRes = await fetch(`https://payments.yoco.com/api/checkouts/${checkoutId}`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${yocoSecretKey}`,
            "Content-Type": "application/json",
          },
        });

        const yocoData = await yocoRes.json();
        console.log("✅ Yoco checkout verify:", yocoData);

        // ✅ Adjust this based on Yoco response structure
        // Common checks: status, paid, paymentStatus etc.
        const status = (yocoData.status || "").toLowerCase();

        if (yocoRes.ok && (status === "paid" || status === "successful" || status === "succeeded")) {
          paymentConfirmed = true;
        }
      } catch (err) {
        console.error("❌ Yoco verification failed:", err);
      }
    } else {
      console.warn("⚠️ Missing checkoutId or YOCO_SECRET_KEY — cannot verify payment");
    }

    // ✅ STEP 2: Create Shopify order ONLY if payment is confirmed
    if (paymentConfirmed && shopifyAccessToken && email !== "N/A" && parsedCart.length > 0) {
      const shopifyOrder = {
        order: {
          email,
          financial_status: "paid",
          currency: "ZAR",
          note: `Order ID: ${orderNumber} | Yoco Checkout: ${checkoutId}`,
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

      try {
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
      } catch (err) {
        console.error("❌ Shopify fetch failed:", err);
      }
    } else {
      console.warn("Skipping Shopify order (not confirmed / missing data).", {
        paymentConfirmed,
        hasToken: !!shopifyAccessToken,
        email,
        cartCount: parsedCart.length,
      });
    }

    // ✅ Redirect to thank-you page
    const query = new URLSearchParams({
      checkoutId,
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
      paymentConfirmed: paymentConfirmed ? "yes" : "no",
    });

    return res.redirect(`${thankyouUrl}?${query.toString()}`);
  } catch (err) {
    console.error("Yoco success error:", err);
    return res.redirect(
      `${thankyouUrl}?name=Customer&email=N/A&phone=&address=&city=&province=&zip=&shipping=0&orderNumber=N/A&cart=[]&paymentConfirmed=no`
    );
  }
};
