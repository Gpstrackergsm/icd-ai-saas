const { subscriptionState, getUserByEmail, getSession } = require("../lib/db");

const parseCookies = (req) => {
  const header = req.headers?.cookie;
  if (!header) return {};
  return header.split(";").reduce((acc, part) => {
    const [key, ...rest] = part.trim().split("=");
    if (!key) return acc;
    acc[key] = decodeURIComponent(rest.join("="));
    return acc;
  }, {});
};

const extractEmail = (req) => {
  const headerEmail = req.headers["x-user-email"] || req.headers["x-user"];
  const queryEmail = req.query?.email;
  const bodyEmail = req.body?.email;
  return (headerEmail || queryEmail || bodyEmail || "").toString().trim().toLowerCase();
};

async function verifySubscription(req, res) {
  const cookies = parseCookies(req);
  const sessionToken =
    req.headers["x-session-token"]?.toString() || req.headers["authorization"]?.toString().replace("Bearer ", "") || cookies.session_token;
  const email = extractEmail(req);
  const session = sessionToken ? getSession(sessionToken) : null;
  const userEmail = session?.email || email;

  if (!session || !userEmail) {
    res.status(401).json({ error: "Subscription required", redirect: "/#signup" });
    return { allowed: false };
  }

  const state = subscriptionState(userEmail);
  const user = getUserByEmail(userEmail);
  const isActive = state.isActive || (user?.subscription_status || "").toUpperCase() === "ACTIVE";

  if (isActive) {
    return { allowed: true, subscription: state.record, email: userEmail, session };
  }

  res.status(402).json({ error: "Subscription required", redirect: "/#signup" });
  return { allowed: false };
}

module.exports = { verifySubscription, extractEmail };
