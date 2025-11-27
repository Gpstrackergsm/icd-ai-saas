const path = require("path");
const fs = require("fs");
const Database = require("better-sqlite3");

// Default to a writable location in serverless environments (e.g., Vercel) when
// no explicit DATABASE_URL is provided. The deployment root is read-only, so
// fall back to the platform temp directory which allows runtime writes.
const dbFile =
  process.env.DATABASE_URL ||
  path.join(process.env.TMPDIR || "/tmp", "data.sqlite");
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

  CREATE TABLE IF NOT EXISTS searches (
    email TEXT PRIMARY KEY,
    count INTEGER DEFAULT 0,
    last_search_at INTEGER
  );
`);

const ensureColumn = (table, column, definition) => {
  const columns = db.prepare(`PRAGMA table_info(${table})`).all();
  const exists = columns.some((col) => col.name === column);
  if (!exists) {
    db.prepare(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`).run();
  }
};

ensureColumn("subscriptions", "email", "TEXT");
ensureColumn("subscriptions", "stripe_customer_id", "TEXT");
ensureColumn("subscriptions", "isActive", "INTEGER DEFAULT 0");
ensureColumn("subscriptions", "last_payment_date", "INTEGER");
ensureColumn("subscriptions", "created_at", "INTEGER DEFAULT (strftime('%s','now'))");

const normalizeStatus = (status) => {
  if (!status) return null;
  const value = status.toString().toLowerCase();
  if (value === "active" || value === "trialing") return "ACTIVE";
  if (value === "past_due" || value === "past-due") return "PAST_DUE";
  if (value === "canceled" || value === "cancelled") return "CANCELED";
  if (value === "unpaid") return "PAST_DUE";
  return value.toUpperCase();
};

const getSubscriptionByEmail = (email) => {
  if (!email) return null;
  return db.prepare("SELECT * FROM subscriptions WHERE email = ?").get(email.toLowerCase());
};

const getSubscriptionByCustomer = (customerId) => {
  if (!customerId) return null;
  return db.prepare("SELECT * FROM subscriptions WHERE stripe_customer_id = ?").get(customerId);
};

const upsertSubscriptionRecord = ({
  email,
  stripeCustomerId,
  stripeSubscriptionId,
  isActive = false,
  lastPaymentDate = null,
}) => {
  const normalizedEmail = email ? email.toLowerCase() : null;
  const now = Math.floor(Date.now() / 1000);
  const existing =
    (normalizedEmail && getSubscriptionByEmail(normalizedEmail)) ||
    getSubscriptionByCustomer(stripeCustomerId) ||
    (stripeSubscriptionId
      ? db.prepare("SELECT * FROM subscriptions WHERE stripe_subscription_id = ?").get(stripeSubscriptionId)
      : null);

  const payload = {
    email: normalizedEmail,
    stripeCustomerId: stripeCustomerId || existing?.stripe_customer_id || null,
    stripeSubscriptionId: stripeSubscriptionId || existing?.stripe_subscription_id || null,
    isActive: isActive ? 1 : 0,
    lastPaymentDate: lastPaymentDate || existing?.last_payment_date || null,
    createdAt: existing?.created_at || now,
  };

  if (existing) {
    db.prepare(
      `UPDATE subscriptions
       SET email = COALESCE(@email, email),
           stripe_customer_id = COALESCE(@stripeCustomerId, stripe_customer_id),
           stripe_subscription_id = COALESCE(@stripeSubscriptionId, stripe_subscription_id),
           isActive = @isActive,
           last_payment_date = @lastPaymentDate,
           updated_at = @updatedAt
       WHERE id = @id`
    ).run({
      ...payload,
      id: existing.id,
      updatedAt: now,
    });
    return getSubscriptionByEmail(normalizedEmail) || getSubscriptionByCustomer(payload.stripeCustomerId);
  }

  db.prepare(
    `INSERT INTO subscriptions (email, stripe_customer_id, stripe_subscription_id, isActive, last_payment_date, created_at, updated_at)
     VALUES (@email, @stripeCustomerId, @stripeSubscriptionId, @isActive, @lastPaymentDate, @createdAt, @updatedAt)`
  ).run({ ...payload, updatedAt: now });

  return getSubscriptionByEmail(normalizedEmail) || getSubscriptionByCustomer(payload.stripeCustomerId);
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

const setSubscriptionStatus = (email, status, currentPeriodEnd, stripeCustomerId, stripeSubscriptionId, lastPaymentDate) => {
  const normalizedStatus = normalizeStatus(status);
  const isActive = normalizedStatus === "ACTIVE";
  if (email) {
    upsertUser({ email, subscriptionStatus: normalizedStatus, currentPeriodEnd, stripeCustomerId });
  }
  if (email || stripeCustomerId || stripeSubscriptionId) {
    upsertSubscriptionRecord({
      email,
      stripeCustomerId,
      stripeSubscriptionId,
      isActive,
      lastPaymentDate,
    });
  }
  return { status: normalizedStatus, isActive };
};

const recordSubscription = ({
  userId,
  email,
  stripeCustomerId,
  stripeSubscriptionId,
  status,
  priceId,
  lastPaymentDate,
}) => {
  const now = Math.floor(Date.now() / 1000);
  const normalizedStatus = normalizeStatus(status);
  const isActive = normalizedStatus === "ACTIVE";

  upsertSubscriptionRecord({
    email,
    stripeCustomerId,
    stripeSubscriptionId,
    isActive,
    lastPaymentDate,
  });

  db.prepare(
    `INSERT INTO subscriptions (user_id, email, stripe_customer_id, stripe_subscription_id, status, price_id, isActive, last_payment_date, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(stripe_subscription_id) DO UPDATE SET
        status = excluded.status,
        price_id = excluded.price_id,
        email = COALESCE(excluded.email, subscriptions.email),
        stripe_customer_id = COALESCE(excluded.stripe_customer_id, subscriptions.stripe_customer_id),
        isActive = excluded.isActive,
        last_payment_date = excluded.last_payment_date,
        updated_at = excluded.updated_at`
  ).run(
    userId,
    email || null,
    stripeCustomerId || null,
    stripeSubscriptionId || null,
    normalizedStatus,
    priceId || null,
    isActive ? 1 : 0,
    lastPaymentDate || null,
    now
  );
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

const getSearchUsage = (email) => {
  if (!email) return null;
  return db.prepare("SELECT * FROM searches WHERE email = ?").get(email.toLowerCase());
};

const recordSearchUsage = (email) => {
  if (!email) return { count: 0, last_search_at: null };
  const normalized = email.toLowerCase();
  const now = Math.floor(Date.now() / 1000);
  db.prepare(
    `INSERT INTO searches (email, count, last_search_at) VALUES (?, 1, ?)
     ON CONFLICT(email) DO UPDATE SET count = searches.count + 1, last_search_at = excluded.last_search_at`
  ).run(normalized, now);
  return getSearchUsage(normalized);
};

const subscriptionState = (email) => {
  const record = email ? getSubscriptionByEmail(email) : null;
  return { isActive: Boolean(record?.isActive), record };
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
    return db.prepare("SELECT COUNT(*) as total FROM subscriptions WHERE isActive = 1").get()?.total || 0;
  },
  totalUsers() {
    return (
      db
        .prepare(
          "SELECT COUNT(DISTINCT COALESCE(email, stripe_customer_id, stripe_subscription_id)) as total FROM subscriptions"
        )
        .get()?.total || 0
    );
  },
  totalSearches() {
    return db.prepare("SELECT SUM(count) as total FROM searches").get()?.total || 0;
  },
  searchesToday() {
    const start = Math.floor(new Date(new Date().toISOString().slice(0, 10)).getTime() / 1000);
    return db
      .prepare("SELECT COUNT(*) as total FROM usage_logs WHERE created_at >= ?")
      .get(start)?.total || 0;
  },
  dailySearches() {
    return this.searchesToday();
  },
  trials() {
    return (
      db
        .prepare(
          `SELECT COUNT(*) as total FROM searches s
           LEFT JOIN subscriptions sub ON sub.email = s.email
           WHERE s.count > 0 AND (sub.isActive IS NULL OR sub.isActive = 0)`
        )
        .get()?.total || 0
    );
  },
  conversionRate() {
    const trials = this.trials();
    if (!trials) return 0;
    return this.activeSubscribers() / trials;
  },
  failedPayments() {
    return db.prepare("SELECT COUNT(*) as total FROM payments WHERE status = 'failed'").get()?.total || 0;
  },
  mrr() {
    const activePriceIds = db
      .prepare("SELECT price_id, COUNT(*) as total FROM subscriptions WHERE isActive = 1 GROUP BY price_id")
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
    return db.prepare("SELECT email, stripe_customer_id, stripe_subscription_id, isActive, last_payment_date FROM subscriptions").all();
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
  getSubscriptionByEmail,
  getSubscriptionByCustomer,
  recordSearchUsage,
  getSearchUsage,
  subscriptionState,
  logUsage,
  recordPayment,
  metrics,
  normalizeStatus,
  upsertSubscriptionRecord,
};
