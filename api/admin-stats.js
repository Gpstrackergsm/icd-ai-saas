import { loadMetrics } from "../lib/metrics";
import { validateAdminAuth } from "../lib/admin-auth";

export default async function handler(req, res) {
  const isAuthorized = validateAdminAuth(req, res);
  if (!isAuthorized) return;

  const metrics = await loadMetrics();

  res.json({
    active_subscribers: metrics.activeSubscribers,
    total_users: metrics.totalUsers,
    total_searches: metrics.totalSearches,
    searches_today: metrics.searchesToday,
    failed_payments: metrics.failedPayments,
    mrr_cents: metrics.mrrCents,
    trials: metrics.trials,
    recent_payments: metrics.recentPayments,
  });
}
