const { extractEmail } = require("../middleware/verifySubscription");
const { subscriptionState } = require("../lib/db");

const resolveState = (email) => {
  const state = subscriptionState(email);
  const status = state.isActive ? "ACTIVE" : "INACTIVE";
  return { active: state.isActive, status, allowed: state.isActive };
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
