const { subscriptionState, getUserByEmail } = require("../lib/db");

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

  const state = subscriptionState(email);
  const user = getUserByEmail(email);
  const isActive = state.isActive || (user?.subscription_status || "").toUpperCase() === "ACTIVE";

  if (isActive) {
    return { allowed: true, subscription: state.record, email };
  }

  res.status(403).json({ error: "Subscription required" });
  return { allowed: false };
}

module.exports = { verifySubscription, extractEmail };
