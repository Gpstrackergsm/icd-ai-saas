const Stripe = require("stripe");
const { metrics: dbMetrics } = require("./db");

const stripeSecret = process.env.STRIPE_SECRET_KEY;
const stripe = stripeSecret ? new Stripe(stripeSecret, { apiVersion: "2024-06-20" }) : null;

const stripeAvailable = Boolean(stripeSecret);

async function stripeSubscriptionStats() {
  if (!stripe) return null;
  let activeSubscribers = 0;
  let mrrCents = 0;

  const iterator = stripe.subscriptions.list({ status: "all", limit: 100, expand: ["data.items.data.price"] });

  for await (const subscription of iterator) {
    const status = subscription.status;
    if (status === "active" || status === "trialing") {
      activeSubscribers += 1;
    }
    const items = subscription.items?.data || [];
    const subscriptionAmount = items.reduce(
      (sum, item) => sum + (item.price?.unit_amount || 0),
      0
    );
    mrrCents += subscriptionAmount;
  }

  return { activeSubscribers, mrrCents };
}

async function loadMetrics() {
  const totalUsers = dbMetrics.totalUsers();
  const totalSearches = dbMetrics.totalSearches();
  const searchesToday = dbMetrics.searchesToday();
  const failedPayments = dbMetrics.failedPayments();
  const recentPayments = dbMetrics.recentPayments();
  const users = dbMetrics.users();

  let activeSubscribers = dbMetrics.activeSubscribers();
  let mrrCents = dbMetrics.mrr();

  if (stripeAvailable) {
    try {
      const stripeStats = await stripeSubscriptionStats();
      if (stripeStats) {
        activeSubscribers = stripeStats.activeSubscribers;
        mrrCents = stripeStats.mrrCents;
      }
    } catch (error) {
      console.error("Failed to fetch Stripe metrics", error.message || error);
    }
  }

  const conversionRatio = totalUsers ? activeSubscribers / totalUsers : 0;

  return {
    activeSubscribers,
    totalUsers,
    totalSearches,
    searchesToday,
    failedPayments,
    mrrCents,
    recentPayments,
    users,
    conversionRatio,
    stripeAvailable,
  };
}

module.exports = { loadMetrics };
