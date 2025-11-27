const { getUserByEmail, normalizeStatus } = require("../lib/db");
const { extractEmail } = require("../middleware/verifySubscription");

const resolveState = (email) => {
  const user = email ? getUserByEmail(email) : null;
  const now = Math.floor(Date.now() / 1000);
  const status = normalizeStatus(user?.subscription_status);
  const active = Boolean(status === "ACTIVE" && (!user?.current_period_end || user.current_period_end > now));
  const state = status || "NONE";
  const allowed = active;
  return { active, status: state, allowed };
};

export default function handler(req, res) {
  const emailFromQuery = extractEmail(req);
  const email =
    emailFromQuery ||
    (req.method === "POST" ? req.body?.email?.toString().toLowerCase() : null);

  if (!email) {
    return res.status(400).json({ active: false, status: "NONE", error: "Email required" });
  }

  const state = resolveState(email);
  res.status(200).json(state);
}
