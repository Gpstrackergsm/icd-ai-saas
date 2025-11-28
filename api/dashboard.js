const { verifySubscription } = require("../middleware/verifySubscription");
const { loadMetrics } = require("../lib/metrics");
const { decodeBasicAuth, getAdminCredentials } = require("../lib/admin-auth");

function authorizeAdmin(req) {
  const { adminUser, adminPass } = getAdminCredentials();
  if (!adminUser || !adminPass) return false;

  const { authorization = "" } = req.headers || {};
  const { username, password } = decodeBasicAuth(authorization);

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
