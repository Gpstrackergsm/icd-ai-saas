const { verifySubscription, extractEmail } = require("../middleware/verifySubscription");
const { getUserByEmail } = require("../lib/db");

export default async function handler(req, res) {
  const verification = await verifySubscription(req, res);
  if (!verification.allowed) return;

  const email = extractEmail(req);
  const user = getUserByEmail(email);
  res.json({
    email,
    subscription_status: user?.subscription_status || "unknown",
    current_period_end: user?.current_period_end || null,
  });
}
