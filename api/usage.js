const { verifySubscription, extractEmail } = require("../middleware/verifySubscription");
const { db } = require("../lib/db");

export default async function handler(req, res) {
  const verification = await verifySubscription(req, res);
  if (!verification.allowed) return;

  const email = extractEmail(req);
  const usage = db
    .prepare("SELECT COUNT(*) as total FROM usage_logs WHERE user_email = ?")
    .get(email.toLowerCase())?.total || 0;

  res.json({ email, usage });
}
