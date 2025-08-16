export default function handler(req, res) {
  // Allow requests from anywhere
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  // Handle preflight OPTIONS request
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method === "POST") {
    console.log("Webhook received:", req.body);
    return res.status(200).json({ success: true, received: req.body });
  }

  return res.status(405).json({ error: "Method not allowed" });
}
