export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method Not Allowed" });
    }

    // LOG BODY (important for debugging)
    console.log("Webhook hit! Body:", req.body);

    return res.status(200).json({
      message: "Webhook working!",
      received: req.body
    });
  } catch (err) {
    console.error("Webhook error:", err);
    return res.status(500).json({ error: "Server Error" });
  }
}
