const { metrics } = require("../../lib/db");

function authorize(req) {
  const adminPassword = process.env.ADMIN_PASSWORD;
  const header = req.headers.authorization;

  if (!adminPassword || !header || !header.startsWith("Basic ")) {
    return false;
  }

  const base64Credentials = header.slice("Basic ".length).trim();
  const decoded = Buffer.from(base64Credentials, "base64").toString("utf8");
  const separatorIndex = decoded.indexOf(":");

  if (separatorIndex === -1) {
    return false;
  }

  const username = decoded.slice(0, separatorIndex);
  const password = decoded.slice(separatorIndex + 1);

  return Boolean(username) && password === adminPassword;
}

export default function handler(req, res) {
  if (!authorize(req)) {
    res.setHeader("WWW-Authenticate", 'Basic realm="Admin Area"');
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
