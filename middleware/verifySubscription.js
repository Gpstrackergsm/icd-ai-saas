const { getUserByEmail } = require("../lib/db");

const extractEmail = (req) => {
  const headerEmail = req.headers["x-user-email"] || req.headers["x-user"];
  const queryEmail = req.query?.email;
  const bodyEmail = req.body?.email;
  return (headerEmail || queryEmail || bodyEmail || "").toString().trim().toLowerCase();
};

async function verifySubscription(req, res) {
  const email = extractEmail(req);
  if (!email) {
    res.status(401).json({ error: "Subscription required" });
    return { allowed: false };
  }

  const user = getUserByEmail(email);
  const now = Math.floor(Date.now() / 1000);
  if (user && user.subscription_status === "active" && (!user.current_period_end || user.current_period_end > now)) {
    return { allowed: true, user, email };
  }

  res.status(403).json({ error: "Subscription required" });
  return { allowed: false };
}

module.exports = { verifySubscription, extractEmail };
