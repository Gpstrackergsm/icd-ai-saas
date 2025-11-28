const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
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

let useJsonStore = process.env.USE_JSON_STORAGE === "true";
let db;

try {
  if (!useJsonStore) {
    db = new Database(dbFile);
    db.pragma("journal_mode = WAL");
  }
} catch (error) {
  console.warn("Falling back to JSON storage", error?.message || error);
  useJsonStore = true;
}

if (!useJsonStore && db) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE,
        plan TEXT,
        stripe_customer_id TEXT,
        subscription_status TEXT,
        current_period_end INTEGER,
        created_at INTEGER DEFAULT (strftime('%s','now')),
        last_payment_date INTEGER
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

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      email TEXT,
      created_at INTEGER,
      expires_at INTEGER
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
}

const ensureColumn = (table, column, definition) => {
  if (!db || useJsonStore) return;
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
ensureColumn("users", "last_payment_date", "INTEGER");
ensureColumn("users", "plan", "TEXT");
ensureColumn("users", "password_hash", "TEXT");

const defaultJsonStore = {
  users: [],
  subscriptions: [],
  webhook_events: [],
  visits: [],
  usage_logs: [],
  payments: [],
  searches: [],
  sessions: [],
};

const jsonStorePath = path.join(process.env.TMPDIR || "/tmp", "icd-saas-store.json");
let jsonStore = { ...defaultJsonStore };

if (useJsonStore) {
  try {
    if (fs.existsSync(jsonStorePath)) {
      jsonStore = { ...defaultJsonStore, ...JSON.parse(fs.readFileSync(jsonStorePath, "utf-8")) };
    } else {
      fs.writeFileSync(jsonStorePath, JSON.stringify(defaultJsonStore, null, 2));
    }
  } catch (error) {
    console.error("Failed to initialize JSON store", error);
    jsonStore = { ...defaultJsonStore };
  }
}

const persistJsonStore = () => {
  if (!useJsonStore) return;
  try {
    fs.writeFileSync(jsonStorePath, JSON.stringify(jsonStore, null, 2));
  } catch (error) {
    console.error("Failed to persist JSON store", error);
  }
};

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
  status = null,
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
    status: normalizeStatus(status) || existing?.status || null,
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
           status = @status,
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
    `INSERT INTO subscriptions (email, stripe_customer_id, stripe_subscription_id, isActive, last_payment_date, created_at, updated_at, status)
     VALUES (@email, @stripeCustomerId, @stripeSubscriptionId, @isActive, @lastPaymentDate, @createdAt, @updatedAt, @status)`
  ).run({ ...payload, updatedAt: now });

  return getSubscriptionByEmail(normalizedEmail) || getSubscriptionByCustomer(payload.stripeCustomerId);
};

const getUserByEmail = (email) => {
  if (!email) return null;
  return db.prepare("SELECT * FROM users WHERE email = ?").get(email.toLowerCase());
};

const upsertUser = ({
  id,
  email,
  stripeCustomerId,
  subscriptionStatus,
  currentPeriodEnd,
  lastPaymentDate,
  plan,
  passwordHash,
}) => {
  const normalizedEmail = email ? email.toLowerCase() : null;
  const now = Math.floor(Date.now() / 1000);
  const existing = normalizedEmail ? getUserByEmail(normalizedEmail) : null;
  const normalizedStatus = normalizeStatus(subscriptionStatus);
  if (existing) {
    db.prepare(
      `UPDATE users SET stripe_customer_id = COALESCE(?, stripe_customer_id), subscription_status = COALESCE(?, subscription_status), current_period_end = COALESCE(?, current_period_end), plan = COALESCE(?, plan), password_hash = COALESCE(?, password_hash) WHERE email = ?`
    ).run(
      stripeCustomerId,
      normalizedStatus,
      currentPeriodEnd,
      plan || existing?.plan,
      passwordHash || existing?.password_hash || null,
      normalizedEmail
    );
    if (lastPaymentDate) {
      db.prepare(`UPDATE users SET last_payment_date = COALESCE(?, last_payment_date) WHERE email = ?`).run(
        lastPaymentDate,
        normalizedEmail
      );
    }
    return getUserByEmail(normalizedEmail);
  }
  const userId = id || `user_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  db.prepare(
    `INSERT INTO users (id, email, stripe_customer_id, subscription_status, current_period_end, created_at, last_payment_date, plan, password_hash) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    userId,
    normalizedEmail,
    stripeCustomerId || null,
    normalizedStatus || null,
    currentPeriodEnd || null,
    now,
    lastPaymentDate || null,
    plan || null,
    passwordHash || null
  );
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
    plan: plan || null,
  };
};

const setSubscriptionStatus = (email, status, currentPeriodEnd, stripeCustomerId, stripeSubscriptionId, lastPaymentDate, plan) => {
  const normalizedStatus = normalizeStatus(status);
  const isActive = normalizedStatus === "ACTIVE";
  if (email) {
    upsertUser({
      email,
      subscriptionStatus: normalizedStatus,
      currentPeriodEnd,
      stripeCustomerId,
      lastPaymentDate,
      plan,
    });
  }
  if (email || stripeCustomerId || stripeSubscriptionId) {
    upsertSubscriptionRecord({
      email,
      stripeCustomerId,
      stripeSubscriptionId,
      isActive,
      lastPaymentDate,
      status: normalizedStatus,
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
    status: normalizedStatus,
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

const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;

const createSession = ({ userId, email, ttlSeconds = SESSION_TTL_SECONDS }) => {
  const id = crypto.randomBytes(32).toString("hex");
  const now = Math.floor(Date.now() / 1000);
  const expiresAt = now + ttlSeconds;

  db
    .prepare(
      `INSERT INTO sessions (id, user_id, email, created_at, expires_at)
       VALUES (@id, @userId, @email, @createdAt, @expiresAt)
       ON CONFLICT(id) DO UPDATE SET user_id = excluded.user_id, email = excluded.email, expires_at = excluded.expires_at`
    )
    .run({ id, userId: userId || null, email: email ? email.toLowerCase() : null, createdAt: now, expiresAt });

  return { id, user_id: userId, email, created_at: now, expires_at: expiresAt };
};

const getSession = (id) => {
  if (!id) return null;
  const session = db.prepare("SELECT * FROM sessions WHERE id = ?").get(id);
  const now = Math.floor(Date.now() / 1000);
  if (!session) return null;
  if (session.expires_at && session.expires_at < now) {
    db.prepare("DELETE FROM sessions WHERE id = ?").run(id);
    return null;
  }
  return session;
};

const deleteSession = (id) => {
  if (!id) return;
  db.prepare("DELETE FROM sessions WHERE id = ?").run(id);
};

const purgeExpiredSessions = () => {
  const now = Math.floor(Date.now() / 1000);
  db.prepare("DELETE FROM sessions WHERE expires_at <= ?").run(now);
};

const sqliteMetrics = {
  activeSubscribers() {
    return db.prepare("SELECT COUNT(*) as total FROM subscriptions WHERE isActive = 1").get()?.total || 0;
  },
  totalUsers() {
    return db.prepare("SELECT COUNT(*) as total FROM users").get()?.total || 0;
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
    return db
      .prepare(
        "SELECT email, stripe_customer_id, subscription_status, created_at, last_payment_date, current_period_end FROM users"
      )
      .all();
  },
};

const jsonHelpers = {
  normalizeEmail(email) {
    return email ? email.toLowerCase() : null;
  },
  findUser(email) {
    if (!email) return null;
    const normalized = this.normalizeEmail(email);
    return jsonStore.users.find((u) => u.email === normalized) || null;
  },
  findSubscriptionByEmail(email) {
    if (!email) return null;
    const normalized = this.normalizeEmail(email);
    return jsonStore.subscriptions.find((s) => s.email === normalized) || null;
  },
  findSubscriptionByCustomer(customerId) {
    if (!customerId) return null;
    return jsonStore.subscriptions.find((s) => s.stripe_customer_id === customerId) || null;
  },
};

const jsonApi = {
  getUserByEmail(email) {
    return jsonHelpers.findUser(email);
  },
  upsertUser({ id, email, stripeCustomerId, subscriptionStatus, currentPeriodEnd, lastPaymentDate, passwordHash, plan }) {
    const normalizedEmail = jsonHelpers.normalizeEmail(email);
    const now = Math.floor(Date.now() / 1000);
    const existing = normalizedEmail ? jsonHelpers.findUser(normalizedEmail) : null;
    const normalizedStatus = normalizeStatus(subscriptionStatus);
    if (existing) {
      Object.assign(existing, {
        stripe_customer_id: stripeCustomerId || existing.stripe_customer_id || null,
        subscription_status: normalizedStatus || existing.subscription_status || null,
        current_period_end: currentPeriodEnd || existing.current_period_end || null,
        last_payment_date: lastPaymentDate || existing.last_payment_date || null,
        password_hash: passwordHash || existing.password_hash || null,
        plan: plan || existing.plan || null,
      });
      persistJsonStore();
      return existing;
    }

    const user = {
      id: id || `user_${Date.now()}_${Math.random().toString(16).slice(2)}`,
      email: normalizedEmail,
      stripe_customer_id: stripeCustomerId || null,
      subscription_status: normalizedStatus || null,
      current_period_end: currentPeriodEnd || null,
      created_at: now,
      last_payment_date: lastPaymentDate || null,
      password_hash: passwordHash || null,
      plan: plan || null,
    };
    jsonStore.users.push(user);
    persistJsonStore();
    return user;
  },
  upsertSubscriptionRecord({ email, stripeCustomerId, stripeSubscriptionId, isActive = false, lastPaymentDate = null, status = null }) {
    const normalizedEmail = jsonHelpers.normalizeEmail(email);
    const now = Math.floor(Date.now() / 1000);
    const existing =
      (normalizedEmail && jsonHelpers.findSubscriptionByEmail(normalizedEmail)) ||
      jsonHelpers.findSubscriptionByCustomer(stripeCustomerId) ||
      (stripeSubscriptionId
        ? jsonStore.subscriptions.find((s) => s.stripe_subscription_id === stripeSubscriptionId)
        : null);

    const payload = {
      email: normalizedEmail,
      stripe_customer_id: stripeCustomerId || existing?.stripe_customer_id || null,
      stripe_subscription_id: stripeSubscriptionId || existing?.stripe_subscription_id || null,
      isActive: isActive ? 1 : 0,
      last_payment_date: lastPaymentDate || existing?.last_payment_date || null,
      created_at: existing?.created_at || now,
      subscription_status: normalizeStatus(status) || (isActive ? "ACTIVE" : existing?.subscription_status) || null,
    };

    if (existing) {
      Object.assign(existing, payload, { updated_at: now });
      persistJsonStore();
      return existing;
    }

    const record = { ...payload, updated_at: now, id: `sub_${Date.now()}_${Math.random().toString(16).slice(2)}` };
    jsonStore.subscriptions.push(record);
    persistJsonStore();
    return record;
  },
  setSubscriptionStatus(email, status, currentPeriodEnd, stripeCustomerId, stripeSubscriptionId, lastPaymentDate) {
    const normalizedStatus = normalizeStatus(status);
    const isActive = normalizedStatus === "ACTIVE";
    if (email) {
      this.upsertUser({
        email,
        stripeCustomerId,
        subscriptionStatus: normalizedStatus,
        currentPeriodEnd,
        lastPaymentDate,
      });
    }
    this.upsertSubscriptionRecord({
      email,
      stripeCustomerId,
      stripeSubscriptionId,
      isActive,
      lastPaymentDate,
    });
    return { status: normalizedStatus, isActive };
  },
  recordSubscription({ userId, email, stripeCustomerId, stripeSubscriptionId, status, priceId, lastPaymentDate }) {
    const normalizedStatus = normalizeStatus(status);
    const isActive = normalizedStatus === "ACTIVE";
    this.upsertSubscriptionRecord({
      email,
      stripeCustomerId,
      stripeSubscriptionId,
      isActive,
      lastPaymentDate,
      status: normalizedStatus,
    });
    jsonStore.subscriptions = jsonStore.subscriptions.map((sub) => {
      if (sub.stripe_subscription_id === stripeSubscriptionId) {
        return {
          ...sub,
          user_id: userId,
          status: normalizedStatus,
          price_id: priceId || sub.price_id || null,
          last_payment_date: lastPaymentDate || sub.last_payment_date || null,
          updated_at: Math.floor(Date.now() / 1000),
        };
      }
      return sub;
    });
    persistJsonStore();
  },
  recordWebhookEvent(eventId) {
    if (!eventId) return false;
    if (jsonStore.webhook_events.find((e) => e.event_id === eventId)) return false;
    jsonStore.webhook_events.push({ event_id: eventId, processed_at: Math.floor(Date.now() / 1000) });
    persistJsonStore();
    return true;
  },
  hasProcessedEvent(eventId) {
    if (!eventId) return false;
    return Boolean(jsonStore.webhook_events.find((e) => e.event_id === eventId));
  },
  getSubscriptionByEmail(email) {
    return jsonHelpers.findSubscriptionByEmail(email);
  },
  getSubscriptionByCustomer(customerId) {
    return jsonHelpers.findSubscriptionByCustomer(customerId);
  },
  recordSearchUsage(identifier) {
    if (!identifier) return { count: 0, last_search_at: null };
    const normalized = identifier.toLowerCase();
    const now = Math.floor(Date.now() / 1000);
    const existing = jsonStore.searches.find((s) => s.email === normalized);
    if (existing) {
      existing.count += 1;
      existing.last_search_at = now;
    } else {
      jsonStore.searches.push({ email: normalized, count: 1, last_search_at: now });
    }
    persistJsonStore();
    return this.getSearchUsage(normalized);
  },
  getSearchUsage(identifier) {
    if (!identifier) return null;
    const normalized = identifier.toLowerCase();
    return jsonStore.searches.find((s) => s.email === normalized) || null;
  },
  subscriptionState(email) {
    const record = email ? this.getSubscriptionByEmail(email) : null;
    return { isActive: Boolean(record?.isActive), record };
  },
  logUsage({ email, userId, ip }) {
    jsonStore.usage_logs.push({
      user_email: email || null,
      user_id: userId || null,
      ip: ip || null,
      created_at: Math.floor(Date.now() / 1000),
    });
    persistJsonStore();
  },
  recordPayment({ invoiceId, customerId, amountPaid, currency, status, paidAt }) {
    if (!invoiceId) return;
    const existing = jsonStore.payments.find((p) => p.invoice_id === invoiceId);
    const payload = {
      invoice_id: invoiceId,
      customer_id: customerId || null,
      amount_paid: amountPaid || 0,
      currency: currency || "usd",
      status: status || null,
      paid_at: paidAt || null,
    };
    if (existing) {
      Object.assign(existing, payload);
    } else {
      jsonStore.payments.push(payload);
    }
    persistJsonStore();
  },
  createSession({ userId, email, ttlSeconds = SESSION_TTL_SECONDS }) {
    const id = crypto.randomBytes(32).toString("hex");
    const now = Math.floor(Date.now() / 1000);
    const expires_at = now + ttlSeconds;
    jsonStore.sessions.push({ id, user_id: userId || null, email: email ? email.toLowerCase() : null, created_at: now, expires_at });
    persistJsonStore();
    return { id, user_id: userId, email, created_at: now, expires_at };
  },
  getSession(id) {
    if (!id) return null;
    const now = Math.floor(Date.now() / 1000);
    const session = jsonStore.sessions.find((s) => s.id === id);
    if (!session) return null;
    if (session.expires_at && session.expires_at < now) {
      this.deleteSession(id);
      return null;
    }
    return session;
  },
  deleteSession(id) {
    if (!id) return;
    jsonStore.sessions = jsonStore.sessions.filter((s) => s.id !== id);
    persistJsonStore();
  },
  purgeExpiredSessions() {
    const now = Math.floor(Date.now() / 1000);
    jsonStore.sessions = jsonStore.sessions.filter((s) => !s.expires_at || s.expires_at >= now);
    persistJsonStore();
  },
};

const jsonMetrics = {
  activeSubscribers() {
    return jsonStore.subscriptions.filter((s) => s.isActive === 1).length;
  },
  totalUsers() {
    return jsonStore.users.length;
  },
  totalSearches() {
    return jsonStore.searches.reduce((sum, s) => sum + (s.count || 0), 0);
  },
  searchesToday() {
    const start = Math.floor(new Date(new Date().toISOString().slice(0, 10)).getTime() / 1000);
    return jsonStore.usage_logs.filter((log) => (log.created_at || 0) >= start).length;
  },
  dailySearches() {
    return this.searchesToday();
  },
  trials() {
    return jsonStore.searches.filter((s) => s.count > 0 && !jsonHelpers.findSubscriptionByEmail(s.email)?.isActive).length;
  },
  conversionRate() {
    const trials = this.trials();
    if (!trials) return 0;
    return this.activeSubscribers() / trials;
  },
  failedPayments() {
    return jsonStore.payments.filter((p) => p.status === "failed").length;
  },
  mrr() {
    const priceLookup = { "price_1SYBdVBJD92CE7dk5CUQbatL": 2900 };
    return jsonStore.subscriptions
      .filter((s) => s.isActive === 1)
      .reduce((sum, sub) => sum + (priceLookup[sub.price_id] || 0), 0);
  },
  recentPayments(limit = 10) {
    return jsonStore.payments
      .slice()
      .sort((a, b) => (b.paid_at || 0) - (a.paid_at || 0))
      .slice(0, limit);
  },
  users() {
    return jsonStore.users.map((u) => ({
      email: u.email,
      stripe_customer_id: u.stripe_customer_id,
      subscription_status: u.subscription_status,
      created_at: u.created_at,
      last_payment_date: u.last_payment_date,
      current_period_end: u.current_period_end,
    }));
  },
};

const metrics = useJsonStore ? jsonMetrics : sqliteMetrics;

module.exports = {
  db: useJsonStore ? null : db,
  getUserByEmail: useJsonStore ? jsonApi.getUserByEmail : getUserByEmail,
  upsertUser: useJsonStore ? jsonApi.upsertUser : upsertUser,
  setSubscriptionStatus: useJsonStore ? jsonApi.setSubscriptionStatus.bind(jsonApi) : setSubscriptionStatus,
  recordSubscription: useJsonStore ? jsonApi.recordSubscription.bind(jsonApi) : recordSubscription,
  recordWebhookEvent: useJsonStore ? jsonApi.recordWebhookEvent.bind(jsonApi) : recordWebhookEvent,
  hasProcessedEvent: useJsonStore ? jsonApi.hasProcessedEvent.bind(jsonApi) : hasProcessedEvent,
  getSubscriptionByEmail: useJsonStore ? jsonApi.getSubscriptionByEmail.bind(jsonApi) : getSubscriptionByEmail,
  getSubscriptionByCustomer: useJsonStore ? jsonApi.getSubscriptionByCustomer.bind(jsonApi) : getSubscriptionByCustomer,
  recordSearchUsage: useJsonStore ? jsonApi.recordSearchUsage.bind(jsonApi) : recordSearchUsage,
  getSearchUsage: useJsonStore ? jsonApi.getSearchUsage.bind(jsonApi) : getSearchUsage,
  subscriptionState: useJsonStore ? jsonApi.subscriptionState.bind(jsonApi) : subscriptionState,
  logUsage: useJsonStore ? jsonApi.logUsage.bind(jsonApi) : logUsage,
  recordPayment: useJsonStore ? jsonApi.recordPayment.bind(jsonApi) : recordPayment,
  createSession: useJsonStore ? jsonApi.createSession.bind(jsonApi) : createSession,
  getSession: useJsonStore ? jsonApi.getSession.bind(jsonApi) : getSession,
  deleteSession: useJsonStore ? jsonApi.deleteSession.bind(jsonApi) : deleteSession,
  purgeExpiredSessions: useJsonStore ? jsonApi.purgeExpiredSessions.bind(jsonApi) : purgeExpiredSessions,
  metrics,
  normalizeStatus,
  upsertSubscriptionRecord: useJsonStore
    ? jsonApi.upsertSubscriptionRecord.bind(jsonApi)
    : upsertSubscriptionRecord,
};
