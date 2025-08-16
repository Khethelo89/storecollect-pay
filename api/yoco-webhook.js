export default async function handler(req, res) {
  console.log("🔔 Incoming Webhook Request");
  console.log("Method:", req.method);
  console.log("Headers:", req.headers);

  if (req.method === "GET") {
    console.log("✅ GET request received");
    return res.status(200).send("Webhook is live! (GET)");
  }

  if (req.method === "POST") {
    try {
      const body = req.body;
      console.log("✅ POST request received");
      console.log("Body:", body);

      return res.status(200).json({ message: "POST received", data: body });
    } catch (err) {
      console.error("❌ Error parsing POST body:", err);
      return res.status(500).send("Error handling POST request");
    }
  }

  res.setHeader("Allow", ["GET", "POST"]);
  res.status(405).end(`Method ${req.method} Not Allowed`);
}
