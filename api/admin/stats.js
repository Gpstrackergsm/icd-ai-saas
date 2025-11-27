const { metrics } = require("../../lib/db");

function authorize(req) {
  const provided = req.headers["x-admin-password"] || req.query?.password;
  return process.env.ADMIN_PASSWORD && provided === process.env.ADMIN_PASSWORD;
}

export default function handler(req, res) {
  if (!authorize(req)) {
    res.setHeader("WWW-Authenticate", "Basic realm=admin");
    return res.status(401).json({ error: "Unauthorized" });
  }

  const active_subscribers = metrics.activeSubscribers();
  const total_users = metrics.totalUsers();
  const total_searches = metrics.totalSearches();
  const daily_searches = metrics.dailySearches();
  const trials = metrics.trials();
  const conversion_rate = metrics.conversionRate();
  const recent_payments = metrics.recentPayments();

  res.json({
    active_subscribers,
    total_users,
    total_searches,
    daily_searches,
    trials,
    conversion_rate,
    recent_payments,
  });
}
