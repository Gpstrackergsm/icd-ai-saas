const { verifySubscription } = require("../middleware/verifySubscription");
const { loadMetrics } = require("../lib/metrics");

function authorizeAdmin(req) {
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

  return Boolean(username) && username === adminUser && password === adminPass;
}

export default async function handler(req, res) {
  const isAdmin = authorizeAdmin(req);
  if (!isAdmin) {
    const verification = await verifySubscription(req, res);
    if (!verification.allowed) return;
  }

  const metrics = await loadMetrics();

  res.json({
    activeSubscribers: metrics.activeSubscribers,
    searchesToday: metrics.searchesToday,
    failedPayments: metrics.failedPayments,
    mrrCents: metrics.mrrCents,
    recentPayments: metrics.recentPayments,
    users: metrics.users,
    conversionRatio: metrics.conversionRatio,
    totalUsers: metrics.totalUsers,
  });
}
