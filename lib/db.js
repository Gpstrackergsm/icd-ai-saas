const path = require("path");
const fs = require("fs");
const Database = require("better-sqlite3");

const dbFile = process.env.DATABASE_URL || path.join(process.cwd(), "data.sqlite");
const dbDir = path.dirname(dbFile);

if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new Database(dbFile);
db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE,
    stripe_customer_id TEXT,
    subscription_status TEXT,
    current_period_end INTEGER,
    created_at INTEGER DEFAULT (strftime('%s','now'))
  );

  CREATE TABLE IF NOT EXISTS subscriptions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT,
    stripe_subscription_id TEXT UNIQUE,
    status TEXT,
    price_id TEXT,
    updated_at INTEGER
  );

  CREATE TABLE IF NOT EXISTS webhook_events (
    event_id TEXT PRIMARY KEY,
    processed_at INTEGER
  );

  CREATE TABLE IF NOT EXISTS visits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    identifier TEXT UNIQUE,
    search_count INTEGER,
    expires_after INTEGER
  );

  CREATE TABLE IF NOT EXISTS usage_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_email TEXT,
    user_id TEXT,
    ip TEXT,
    created_at INTEGER DEFAULT (strftime('%s','now'))
  );

  CREATE TABLE IF NOT EXISTS payments (
    invoice_id TEXT PRIMARY KEY,
    customer_id TEXT,
    amount_paid INTEGER,
    currency TEXT,
    status TEXT,
    paid_at INTEGER
  );
`);

const normalizeStatus = (status) => {
  if (!status) return null;
  const value = status.toString().toLowerCase();
  if (value === "active" || value === "trialing") return "ACTIVE";
  if (value === "past_due" || value === "past-due") return "PAST_DUE";
  if (value === "canceled" || value === "cancelled") return "CANCELED";
  if (value === "unpaid") return "PAST_DUE";
  return value.toUpperCase();
};

const getUserByEmail = (email) => {
  if (!email) return null;
  return db.prepare("SELECT * FROM users WHERE email = ?").get(email.toLowerCase());
};

const upsertUser = ({ id, email, stripeCustomerId, subscriptionStatus, currentPeriodEnd }) => {
  const normalizedEmail = email ? email.toLowerCase() : null;
  const now = Math.floor(Date.now() / 1000);
  const existing = normalizedEmail ? getUserByEmail(normalizedEmail) : null;
  const normalizedStatus = normalizeStatus(subscriptionStatus);
  if (existing) {
    db.prepare(
      `UPDATE users SET stripe_customer_id = COALESCE(?, stripe_customer_id), subscription_status = COALESCE(?, subscription_status), current_period_end = COALESCE(?, current_period_end) WHERE email = ?`
    ).run(stripeCustomerId, normalizedStatus, currentPeriodEnd, normalizedEmail);
    return getUserByEmail(normalizedEmail);
  }
  const userId = id || `user_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  db.prepare(
    `INSERT INTO users (id, email, stripe_customer_id, subscription_status, current_period_end, created_at) VALUES (?, ?, ?, ?, ?, ?)`
  ).run(userId, normalizedEmail, stripeCustomerId || null, normalizedStatus || null, currentPeriodEnd || null, now);
  if (normalizedEmail) {
    return getUserByEmail(normalizedEmail);
  }
  return {
    id: userId,
    email: null,
    stripe_customer_id: stripeCustomerId || null,
    subscription_status: subscriptionStatus || null,
    current_period_end: currentPeriodEnd || null,
    created_at: now,
  };
};

const setSubscriptionStatus = (email, status, currentPeriodEnd) => {
  if (!email) return null;
  upsertUser({ email, subscriptionStatus: normalizeStatus(status), currentPeriodEnd });
};

const recordSubscription = ({ userId, stripeSubscriptionId, status, priceId }) => {
  const existing = db.prepare("SELECT * FROM subscriptions WHERE stripe_subscription_id = ?").get(stripeSubscriptionId);
  const now = Math.floor(Date.now() / 1000);
  const normalizedStatus = normalizeStatus(status);
  if (existing) {
    db.prepare(
      `UPDATE subscriptions SET status = ?, price_id = ?, updated_at = ? WHERE stripe_subscription_id = ?`
    ).run(normalizedStatus, priceId, now, stripeSubscriptionId);
    return;
  }
  db.prepare(
    `INSERT INTO subscriptions (user_id, stripe_subscription_id, status, price_id, updated_at) VALUES (?, ?, ?, ?, ?)`
  ).run(userId, stripeSubscriptionId, normalizedStatus, priceId, now);
};

const recordWebhookEvent = (eventId) => {
  if (!eventId) return false;
  try {
    db.prepare(`INSERT INTO webhook_events (event_id, processed_at) VALUES (?, ? )`).run(
      eventId,
      Math.floor(Date.now() / 1000)
    );
    return true;
  } catch (error) {
    return false;
  }
};

const hasProcessedEvent = (eventId) => {
  if (!eventId) return false;
  return Boolean(db.prepare("SELECT event_id FROM webhook_events WHERE event_id = ?").get(eventId));
};

const recordVisit = (identifier) => {
  if (!identifier) return { search_count: 0, expires_after: null };
  const now = Math.floor(Date.now() / 1000);
  const existing = db.prepare("SELECT * FROM visits WHERE identifier = ?").get(identifier);
  const expiryWindow = now + 24 * 60 * 60; // 24 hours
  if (existing && existing.expires_after > now) {
    const updatedCount = (existing.search_count || 0) + 1;
    db.prepare("UPDATE visits SET search_count = ?, expires_after = ? WHERE identifier = ?").run(
      updatedCount,
      existing.expires_after,
      identifier
    );
    return { search_count: updatedCount, expires_after: existing.expires_after };
  }
  db.prepare(
    `INSERT INTO visits (identifier, search_count, expires_after) VALUES (?, ?, ?)
     ON CONFLICT(identifier) DO UPDATE SET search_count = excluded.search_count, expires_after = excluded.expires_after`
  ).run(identifier, 1, expiryWindow);
  return { search_count: 1, expires_after: expiryWindow };
};

const getVisit = (identifier) => {
  if (!identifier) return null;
  const now = Math.floor(Date.now() / 1000);
  const visit = db.prepare("SELECT * FROM visits WHERE identifier = ?").get(identifier);
  if (visit && visit.expires_after > now) {
    return visit;
  }
  return null;
};

const logUsage = ({ email, userId, ip }) => {
  db.prepare(
    `INSERT INTO usage_logs (user_email, user_id, ip, created_at) VALUES (?, ?, ?, ?)`
  ).run(email || null, userId || null, ip || null, Math.floor(Date.now() / 1000));
};

const recordPayment = ({ invoiceId, customerId, amountPaid, currency, status, paidAt }) => {
  if (!invoiceId) return;
  db.prepare(
    `INSERT INTO payments (invoice_id, customer_id, amount_paid, currency, status, paid_at) VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(invoice_id) DO UPDATE SET amount_paid = excluded.amount_paid, currency = excluded.currency, status = excluded.status, paid_at = excluded.paid_at`
  ).run(invoiceId, customerId || null, amountPaid || 0, currency || "usd", status || null, paidAt || null);
};

const metrics = {
  activeSubscribers() {
    return (
      db.prepare("SELECT COUNT(*) as total FROM users WHERE subscription_status = 'ACTIVE'").get()?.total || 0
    );
  },
  newSubscriptionsToday() {
    const start = Math.floor(new Date(new Date().toISOString().slice(0, 10)).getTime() / 1000);
    return (
      db
        .prepare(
          "SELECT COUNT(*) as total FROM subscriptions WHERE updated_at >= ? AND status = 'ACTIVE'"
        )
        .get(start)?.total || 0
    );
  },
  searchesToday() {
    const start = Math.floor(new Date(new Date().toISOString().slice(0, 10)).getTime() / 1000);
    return db
      .prepare("SELECT COUNT(*) as total FROM usage_logs WHERE created_at >= ?")
      .get(start)?.total || 0;
  },
  failedPayments() {
    return db.prepare("SELECT COUNT(*) as total FROM payments WHERE status = 'failed'").get()?.total || 0;
  },
  mrr() {
    const activePriceIds = db
      .prepare("SELECT price_id, COUNT(*) as total FROM subscriptions WHERE status = 'ACTIVE' GROUP BY price_id")
      .all();
    const priceLookup = { "price_1SYBdVBJD92CE7dk5CUQbatL": 2900 };
    return activePriceIds.reduce((sum, row) => {
      const amount = priceLookup[row.price_id] || 0;
      return sum + amount * row.total;
    }, 0);
  },
  recentPayments(limit = 10) {
    return db
      .prepare("SELECT * FROM payments ORDER BY paid_at DESC LIMIT ?")
      .all(limit)
      .map((row) => ({ ...row, paid_at: row.paid_at ? row.paid_at : null }));
  },
  users() {
    return db
      .prepare(
        "SELECT users.email, users.subscription_status, users.current_period_end, subscriptions.stripe_subscription_id FROM users LEFT JOIN subscriptions ON users.id = subscriptions.user_id"
      )
      .all();
  },
  visitorsCount() {
    return db.prepare("SELECT COUNT(*) as total FROM visits").get()?.total || 0;
  },
};

module.exports = {
  db,
  getUserByEmail,
  upsertUser,
  setSubscriptionStatus,
  recordSubscription,
  recordWebhookEvent,
  hasProcessedEvent,
  recordVisit,
  getVisit,
  logUsage,
  recordPayment,
  metrics,
  normalizeStatus,
};
