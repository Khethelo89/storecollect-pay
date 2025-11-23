// /api/yoco-success.js
export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).send("Method Not Allowed");

  const { checkoutId } = req.query;
  const thankyouUrl = "https://storecollect-pay.vercel.app/thankyou.html";

  // ---------------------------
  // 1️⃣ FALLBACK if no checkoutId
  // ---------------------------
  if (!checkoutId) {
    console.warn("checkoutId missing, redirecting with fallback values.");
    const params = req.query;

    return res.redirect(
      thankyouUrl + "?" + new URLSearchParams(params).toString()
    );
  }

  try {
    const secretKey = process.env.YOCO_SECRET_KEY?.trim();
    if (!secretKey) return res.status(500).send("Yoco secret key missing");

    // ---------------------------
    // 2️⃣ Get checkout from Yoco
    // ---------------------------
    const yoRes = await fetch(`https://payments.yoco.com/api/checkouts/${checkoutId}`, {
      headers: { Authorization: `Bearer ${secretKey}` }
    });
    let yoData = await yoRes.json();

    const isSandbox = !yoData.customer || !yoData.lineItems || yoData.lineItems.length === 0;

    if (isSandbox) {
      yoData = {
        ...yoData,
        customer: { name: "Alice Smith", email: "alice@example.com" },
        lineItems: [
          { displayName: "T-shirt", quantity: 2, pricingDetails: [{ price: 5000 }] },
          { displayName: "Cap", quantity: 1, pricingDetails: [{ price: 5000 }] }
        ],
        amount: 15000,          // cents
        shippingInCents: 1000   // R10 shipping
      };
    }

    // ---------------------------
    // 3️⃣ Compute totals
    // ---------------------------
    const shipping = yoData.shippingInCents
      ? yoData.shippingInCents / 100
      : 100;

    const total = ((yoData.amount + (yoData.shippingInCents || 10000)) / 100).toFixed(2);

    // ---------------------------
    // 4️⃣ Build thankyou query
    // ---------------------------
    const query = new URLSearchParams({
      name: yoData.customer.name,
      email: yoData.customer.email || "unknown",
      total: total,
      shipping: shipping.toFixed(2),
      orderNumber: checkoutId,
      cart: JSON.stringify(
        yoData.lineItems.map(item => ({
          title: item.displayName,
          qty: item.quantity,
          price: (item.pricingDetails?.[0]?.price / 100) || 0
        }))
      )
    });

    console.log("Redirecting to:", `${thankyouUrl}?${query.toString()}`);

    // ---------------------------
    // 5️⃣ Redirect to thankyou page
    // ---------------------------
    return res.redirect(`${thankyouUrl}?${query.toString()}`);

  } catch (err) {
    console.error("Yoco success error:", err);

    // ---------------------------
    // 6️⃣ Final fallback redirect
    // ---------------------------
    return res.redirect(
      thankyouUrl +
        `?name=Customer&total=0.00&shipping=100&orderNumber=${checkoutId || "N/A"}&cart=[]`
    );
  }
}
