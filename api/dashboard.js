const { verifySubscription } = require("../middleware/verifySubscription");
const { metrics } = require("../lib/db");

function authorizeAdmin(req) {
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
