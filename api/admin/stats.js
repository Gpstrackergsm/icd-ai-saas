const { loadMetrics } = require("../../lib/metrics");

function authorize(req) {
  const adminUser = process.env.ADMIN_USER;
  const adminPass = process.env.ADMIN_PASS;
  const header = req.headers.authorization;

  if (!adminUser || !adminPass || !header || !header.startsWith("Basic ")) {
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

  return Boolean(username) && password === adminPass && username === adminUser;
}

export default async function handler(req, res) {
  if (!authorize(req)) {
    res.setHeader("WWW-Authenticate", 'Basic realm="Admin Area"');
    return res.status(401).json({ error: "Unauthorized" });
  }

  const metrics = await loadMetrics();

  res.json({
    active_subscribers: metrics.activeSubscribers,
    total_users: metrics.totalUsers,
    total_searches: metrics.totalSearches,
    daily_searches: metrics.searchesToday,
    conversion_rate: metrics.conversionRatio,
    recent_payments: metrics.recentPayments,
    failed_payments: metrics.failedPayments,
    mrr_cents: metrics.mrrCents,
  });
}
