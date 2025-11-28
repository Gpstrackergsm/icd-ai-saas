const { loadMetrics } = require("../../lib/metrics");
const { validateAdminAuth } = require("../../lib/admin-auth");

export default async function handler(req, res) {
  const isAuthorized = validateAdminAuth(req, res);
  if (!isAuthorized) return;

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
