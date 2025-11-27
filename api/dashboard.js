const { verifySubscription } = require("../middleware/verifySubscription");
const { metrics } = require("../lib/db");

function authorizeAdmin(req) {
  const provided = req.headers["x-admin-password"] || req.query?.password;
  return (process.env.ADMIN_PASSWORD && provided === process.env.ADMIN_PASSWORD);
}

export default async function handler(req, res) {
  const isAdmin = authorizeAdmin(req);
  if (!isAdmin) {
    const verification = await verifySubscription(req, res);
    if (!verification.allowed) return;
  }

  const activeSubscribers = metrics.activeSubscribers();
  const newSubscriptionsToday = metrics.newSubscriptionsToday();
  const searchesToday = metrics.searchesToday();
  const failedPayments = metrics.failedPayments();
  const mrrCents = metrics.mrr();
  const recentPayments = metrics.recentPayments();
  const users = metrics.users();
  const visitors = metrics.visitorsCount();
  const conversionRatio = visitors ? activeSubscribers / visitors : 0;

  res.json({
    activeSubscribers,
    newSubscriptionsToday,
    searchesToday,
    failedPayments,
    mrrCents,
    recentPayments,
    users,
    conversionRatio,
  });
}
