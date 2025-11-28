import fs from "fs";
import path from "path";
import crypto from "crypto";
import Stripe from "stripe";
import getRawBody from "raw-body";
import nodemailer from "nodemailer";
import { searchIcd } from "../icd-search";
import bcrypt from "../lib/bcryptjs.js";
import { verifySubscription, extractEmail as extractEmailMiddleware } from "../middleware/verifySubscription";
import {
  db,
  getUserByEmail,
  createSession,
  getSession,
  deleteSession,
  hasProcessedEvent,
  logUsage,
  normalizeStatus,
  recordPayment,
  recordSubscription,
  recordWebhookEvent,
  setSubscriptionStatus,
  subscriptionState,
  upsertUser,
} from "../lib/db";
import { loadMetrics } from "../lib/metrics";
import { decodeBasicAuth, getAdminCredentials, validateAdminAuth } from "../lib/admin-auth";

export const config = {
  api: {
    bodyParser: false,
  },
};

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2024-06-20",
});

const PRICE_ID = "price_1SYBdVBJD92CE7dk5CUQbatL";
const appBaseUrl = process.env.BASE_URL || process.env.APP_URL || "http://localhost:3000";

const rateLimitWindowMs = 60 * 1000;
const maxRequestsPerWindow = 30;
const rateLimiters = new Map();

const primaryDbPath = path.join(process.cwd(), "users.json");
const fallbackDbPath = path.join("/tmp", "users.json");
let memoryUsers = {};

const determineDbPath = () => {
  if (fs.existsSync(primaryDbPath)) return primaryDbPath;
  if (fs.existsSync(fallbackDbPath)) return fallbackDbPath;

  try {
    fs.mkdirSync(path.dirname(primaryDbPath), { recursive: true });
    fs.accessSync(path.dirname(primaryDbPath), fs.constants.W_OK);
    return primaryDbPath;
  } catch (primaryError) {
    try {
      fs.mkdirSync(path.dirname(fallbackDbPath), { recursive: true });
      fs.accessSync(path.dirname(fallbackDbPath), fs.constants.W_OK);
      return fallbackDbPath;
    } catch (fallbackError) {
      console.error("Unable to resolve writable path for users.json", {
        primaryError,
        fallbackError,
      });
      return primaryDbPath;
    }
  }
};

let dbPath = determineDbPath();

const loadUsers = () => {
  dbPath = determineDbPath();
  if (!fs.existsSync(dbPath)) return { ...memoryUsers };
  try {
    const data = JSON.parse(fs.readFileSync(dbPath, "utf8"));
    memoryUsers = { ...data };
    return data;
  } catch (err) {
    console.error("Failed to parse users database", err);
    return { ...memoryUsers };
  }
};

const saveUsers = (users) => {
  memoryUsers = { ...users };
  const targetPaths = [dbPath, dbPath === fallbackDbPath ? primaryDbPath : fallbackDbPath];

  for (const targetPath of targetPaths) {
    if (!targetPath) continue;
    try {
      fs.mkdirSync(path.dirname(targetPath), { recursive: true });
      fs.writeFileSync(targetPath, JSON.stringify(users, null, 2));
      dbPath = targetPath;
      return;
    } catch (err) {
      console.error(`Failed to persist users.json at ${targetPath}`, err);
    }
  }
};

const getIp = (req) =>
  req.headers["x-forwarded-for"]?.toString().split(",")[0].trim() ||
  req.connection?.remoteAddress ||
  "unknown";

const parseCookies = (req) => {
  const header = req.headers?.cookie;
  if (!header) return {};
  return header.split(";").reduce((acc, part) => {
    const [key, ...rest] = part.trim().split("=");
    if (!key) return acc;
    acc[key] = decodeURIComponent(rest.join("="));
    return acc;
  }, {});
};

const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;

const setSessionCookie = (res, token, ttlSeconds = SESSION_TTL_SECONDS) => {
  const cookie = [`session_token=${encodeURIComponent(token)}`, `Max-Age=${ttlSeconds}`, "Path=/", "HttpOnly", "SameSite=Lax"];
  res.setHeader("Set-Cookie", cookie.join("; "));
};

const resolveSubscriptionState = (email) => {
  const state = subscriptionState(email);
  const status = state.record?.isActive ? "ACTIVE" : "INACTIVE";
  return { active: state.isActive, status, record: state.record };
};

const checkRateLimit = (identifier) => {
  const now = Date.now();
  const entry = rateLimiters.get(identifier) || { count: 0, start: now };
  if (now - entry.start > rateLimitWindowMs) {
    rateLimiters.set(identifier, { count: 1, start: now });
    return true;
  }
  if (entry.count >= maxRequestsPerWindow) {
    return false;
  }
  entry.count += 1;
  rateLimiters.set(identifier, entry);
  return true;
};

const subscriptionStatusFromStripe = (subscription) => {
  if (!subscription) return null;
  if (subscription.status === "canceled") return "CANCELED";
  if (subscription.status === "past_due" || subscription.status === "unpaid") return "PAST_DUE";
  if (subscription.status === "incomplete" || subscription.status === "incomplete_expired") return "PAST_DUE";
  return normalizeStatus(subscription.status);
};

const bufferReadable = async (readable) => {
  return await getRawBody(readable);
};

let cachedMailer = null;
const getMailer = () => {
  if (cachedMailer) return cachedMailer;

  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM } = process.env;
  if (!SMTP_HOST || !SMTP_PORT || !SMTP_FROM) {
    console.warn("SMTP not configured; unable to send transactional emails");
    return null;
  }

  cachedMailer = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT),
    secure: Number(SMTP_PORT) === 465,
    auth: SMTP_USER ? { user: SMTP_USER, pass: SMTP_PASS } : undefined,
  });

  return cachedMailer;
};

const sendEmail = async ({ to, subject, text }) => {
  try {
    const transporter = getMailer();
    if (!transporter) return;

    await transporter.sendMail({ from: process.env.SMTP_FROM, to, subject, text });
  } catch (error) {
    console.error("Failed to send email", error?.message || error);
  }
};

const sendSubscriptionActivatedEmail = async (email) => {
  if (!email) return;
  await sendEmail({
    to: email,
    subject: "Your ICD Smart Search Subscription is Active ✅",
    text: "Your account is now active.\nYou can log in at:\nhttps://icd-10-cm.online",
  });
};

const sendPaymentFailedEmail = async (email) => {
  if (!email) return;
  await sendEmail({
    to: email,
    subject: "Payment failed for your ICD Smart Search subscription",
    text: "Your recent payment failed and your account has been disabled. Please update your payment method to regain access.",
  });
};

const sendSubscriptionCanceledEmail = async (email) => {
  if (!email) return;
  await sendEmail({
    to: email,
    subject: "Your ICD Smart Search subscription has been canceled",
    text: "We've received a cancellation for your subscription. Access has been disabled. If this was a mistake, you can subscribe again anytime.",
  });
};

const parseJsonBody = async (req) => {
  if (req.body !== undefined) return req.body;

  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  const rawBody = Buffer.concat(chunks).toString();
  try {
    req.body = rawBody ? JSON.parse(rawBody) : {};
  } catch (error) {
    console.error("Failed to parse request body", error);
    req.body = {};
  }
  return req.body;
};

const searchHandler = async (req, res) => {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const ip = getIp(req);
  if (!checkRateLimit(ip)) {
    return res.status(429).json({ error: "Too many requests" });
  }

  const q = (req.query?.q || "").toString();
  const verification = await verifySubscription(req, res);
  if (!verification.allowed) return;

  const email = verification.email;
  const subscription = verification.subscription;

  const terms = q
    .split(",")
    .map((term) => term.trim())
    .filter(Boolean);

  if (terms.length === 0) {
    return res.status(400).json({ error: "Missing query" });
  }

  const subscriptionStatus = subscription?.isActive ? "ACTIVE" : resolveSubscriptionState(email).status;

  const groupedResults = terms.map((term) => {
    const entries = Array.isArray(searchIcd(term)) ? searchIcd(term) : [];
    const seenCodes = new Set();
    const cleaned = [];

    entries.forEach((entry) => {
      if (!entry || typeof entry !== "object") return;

      const code = (entry.code ?? "").toString().trim();
      const description = (entry.description ?? "").toString().trim();
      const chapter = (entry.chapter ?? "").toString().trim();
      const normalizedCode = code.toLowerCase();

      if (!code || !description || seenCodes.has(normalizedCode)) return;

      seenCodes.add(normalizedCode);
      cleaned.push({ code, description, chapter });
    });

    return {
      term,
      results: cleaned,
      total: cleaned.length,
    };
  });

  logUsage({ email, userId: subscription?.user_id, ip });

  res.json({
    results: groupedResults,
    meta: {
      terms,
      subscriber: true,
      status: subscriptionStatus,
    },
  });
};

const stripeWebhookHandler = async (req, res) => {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).end("Method Not Allowed");
  }

  const sig = req.headers["stripe-signature"];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!sig || !webhookSecret) {
    console.error("[STRIPE EVENT] missing signature header");
    return res.status(400).end("Webhook signature missing");
  }

  let event;
  try {
    const buf = await bufferReadable(req);
    event = stripe.webhooks.constructEvent(buf, sig, webhookSecret);
  } catch (err) {
    console.error("Webhook signature verification failed", err.message);
    return res.status(400).end("Invalid signature");
  }

  if (hasProcessedEvent(event.id)) {
    return res.status(200).json({ received: true, duplicate: true });
  }

  const activateUserFromSession = async (session) => {
    const email = session.customer_details?.email || session.customer_email;
    const customerId = session.customer;
    const subscriptionId = session.subscription;
    const priceId = session?.metadata?.price_id || session?.line_items?.[0]?.price?.id || session?.metadata?.priceId;

    let currentPeriodEnd = null;
    let subscriptionStatus = "ACTIVE";

    if (subscriptionId) {
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      currentPeriodEnd = subscription?.current_period_end || null;
      subscriptionStatus = subscriptionStatusFromStripe(subscription) || "ACTIVE";
    }

    if (email || customerId) {
      const user = upsertUser({
        email,
        stripeCustomerId: customerId,
        subscriptionStatus,
        currentPeriodEnd,
        plan: subscriptionStatus === "ACTIVE" ? "paid" : null,
      });
      if (subscriptionId) {
        recordSubscription({
          userId: user.id,
          email: user.email,
          stripeCustomerId: customerId,
          stripeSubscriptionId: subscriptionId,
          status: subscriptionStatus,
          priceId,
          lastPaymentDate: currentPeriodEnd,
        });
        setSubscriptionStatus(
          user.email,
          subscriptionStatus,
          currentPeriodEnd,
          customerId,
          subscriptionId,
          currentPeriodEnd,
          subscriptionStatus === "ACTIVE" ? "paid" : null
        );
      }
      await sendSubscriptionActivatedEmail(email);
    }
  };

  const applySubscriptionStatus = ({
    email,
    customerId,
    subscriptionId,
    status,
    priceId,
    currentPeriodEnd,
    lastPaymentDate,
    plan,
  }) => {
    const user = upsertUser({
      email,
      stripeCustomerId: customerId,
      subscriptionStatus: status,
      currentPeriodEnd,
      lastPaymentDate,
      plan,
    });

    recordSubscription({
      userId: user.id,
      email: user.email,
      stripeCustomerId: customerId,
      stripeSubscriptionId: subscriptionId,
      status,
      priceId,
      lastPaymentDate,
    });

    setSubscriptionStatus(user.email, status, currentPeriodEnd, customerId, subscriptionId, lastPaymentDate, plan);
    return user;
  };

  const processEvent = async () => {
    const type = event.type;
    switch (type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        console.log(
          "[STRIPE EVENT]",
          type,
          session.customer,
          session.subscription,
          session.customer_details?.email || session.customer_email,
          "active"
        );
        await activateUserFromSession(session);
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object;
        const status = subscriptionStatusFromStripe(subscription);
        const customerId = subscription.customer;
        const priceId = subscription.items?.data?.[0]?.price?.id;
        const currentPeriodEnd = subscription.current_period_end;
        const email = subscription.customer_email;
        const normalizedStatus = status === "ACTIVE" ? "ACTIVE" : status === "PAST_DUE" ? "PAST_DUE" : "CANCELED";
        console.log("[STRIPE EVENT]", type, customerId, subscription.id, email, normalizedStatus);
        if (customerId || email) {
          const plan = normalizedStatus === "ACTIVE" ? "paid" : null;
          applySubscriptionStatus({
            email,
            customerId,
            subscriptionId: subscription.id,
            status: normalizedStatus,
            priceId,
            currentPeriodEnd,
            lastPaymentDate: subscription.current_period_end,
            plan,
          });
          if (normalizedStatus === "ACTIVE") {
            await sendSubscriptionActivatedEmail(email || undefined);
          } else if (normalizedStatus === "CANCELED") {
            await sendSubscriptionCanceledEmail(email || undefined);
          } else if (normalizedStatus === "PAST_DUE") {
            await sendPaymentFailedEmail(email || undefined);
          }
        }
        break;
      }
      case "customer.subscription.deleted": {
        const subscription = event.data.object;
        const customerId = subscription.customer;
        const email = subscription.customer_email;
        console.log("[STRIPE EVENT]", type, customerId, subscription.id, email, "canceled");
        if (customerId || email) {
          applySubscriptionStatus({
            email,
            customerId,
            subscriptionId: subscription.id,
            status: "CANCELED",
            currentPeriodEnd: subscription.current_period_end,
            lastPaymentDate: subscription.current_period_end,
            plan: null,
          });
          await sendSubscriptionCanceledEmail(email || undefined);
        }
        break;
      }
      case "invoice.paid": {
        const invoice = event.data.object;
        const customerId = invoice.customer;
        const email = invoice.customer_email;
        const subscriptionId = invoice.subscription;
        const priceId = invoice.lines?.data?.[0]?.price?.id;
        const paidAt = invoice.status_transitions?.paid_at || invoice.created;
        const currentPeriodEnd = invoice.lines?.data?.[0]?.period?.end || null;
        console.log("[STRIPE EVENT]", type, customerId, subscriptionId, email, "paid");
        if (customerId || email) {
          const user = applySubscriptionStatus({
            email,
            customerId,
            subscriptionId,
            status: "ACTIVE",
            priceId,
            currentPeriodEnd,
            lastPaymentDate: paidAt,
            plan: "paid",
          });
          recordPayment({
            invoiceId: invoice.id,
            customerId,
            amountPaid: invoice.amount_paid,
            currency: invoice.currency,
            status: "paid",
            paidAt,
          });
          await sendSubscriptionActivatedEmail(user?.email || email || undefined);
        }
        break;
      }
      case "invoice.payment_failed": {
        const invoice = event.data.object;
        const customerId = invoice.customer;
        const email = invoice.customer_email;
        const subscriptionId = invoice.subscription;
        const priceId = invoice.lines?.data?.[0]?.price?.id;
        const paidAt = invoice.status_transitions?.paid_at || invoice.created;
        const currentPeriodEnd = invoice.lines?.data?.[0]?.period?.end || null;
        console.log("[STRIPE EVENT]", type, customerId, subscriptionId, email, "failed");
        if (customerId || email) {
          applySubscriptionStatus({
            email,
            customerId,
            subscriptionId,
            status: "CANCELED",
            priceId,
            currentPeriodEnd,
            lastPaymentDate: paidAt,
            plan: null,
          });
          recordPayment({
            invoiceId: invoice.id,
            customerId,
            amountPaid: invoice.amount_paid,
            currency: invoice.currency,
            status: "failed",
            paidAt,
          });
          await sendPaymentFailedEmail(email || undefined);
        }
        break;
      }
      default:
        console.log("[STRIPE EVENT]", type, "ignored");
        break;
    }
  };

  try {
    await processEvent();
    recordWebhookEvent(event.id);
    res.status(200).json({ received: true });
  } catch (error) {
    console.error("Webhook processing failed", error);
    res.status(400).json({ received: false });
  }
};

const verifySession = async (sessionId) => {
  const session = await stripe.checkout.sessions.retrieve(sessionId, {
    expand: ["line_items"],
  });

  const email = session.customer_details?.email || session.customer_email;
  const customerId = session.customer;
  const subscriptionId = session.subscription;
  const priceId = session?.line_items?.data?.[0]?.price?.id;

  let currentPeriodEnd = null;
  let subscriptionStatus = "ACTIVE";

  if (subscriptionId) {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    currentPeriodEnd = subscription?.current_period_end || null;
    subscriptionStatus = subscriptionStatusFromStripe(subscription) || "ACTIVE";
  }

  if (email || customerId) {
    const user = upsertUser({
      email,
      stripeCustomerId: customerId,
      subscriptionStatus,
      currentPeriodEnd,
      plan: subscriptionStatus === "ACTIVE" ? "paid" : null,
    });

    if (subscriptionId) {
      recordSubscription({
        userId: user.id,
        email: user.email,
        stripeCustomerId: customerId,
        stripeSubscriptionId: subscriptionId,
        status: subscriptionStatus,
        priceId,
        lastPaymentDate: currentPeriodEnd,
      });
      setSubscriptionStatus(
        user.email,
        subscriptionStatus,
        currentPeriodEnd,
        customerId,
        subscriptionId,
        currentPeriodEnd,
        subscriptionStatus === "ACTIVE" ? "paid" : null
      );
    }
  }

  return { email, active: subscriptionStatus === "ACTIVE" };
};

const verifySessionHandler = async (req, res) => {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const sessionId = req.query?.session_id;
  if (!sessionId) {
    return res.status(400).json({ error: "Missing session_id" });
  }

  try {
    const result = await verifySession(sessionId.toString());
    res.status(200).json(result);
  } catch (error) {
    console.error("Failed to verify session", error);
    res.status(500).json({ error: "Unable to confirm session" });
  }
};

const successHandler = async (req, res) => {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).end("Method Not Allowed");
  }

  const sessionId = req.query?.session_id;
  if (!sessionId) {
    return res.status(400).json({ error: "Missing session_id" });
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId.toString(), { expand: ["subscription"] });
    const isPaid =
      session.payment_status === "paid" ||
      session.status === "complete" ||
      session.subscription?.status === "active";

    if (isPaid) {
      const details = await verifySession(sessionId.toString());
      const email = details?.email;
      const user = email ? getUserByEmail(email) : null;
      if (user?.email) {
        const issued = createSession({ userId: user.id, email: user.email });
        setSessionCookie(res, issued.id);
      }
      res.writeHead(302, { Location: "/dashboard" });
    } else {
      res.writeHead(302, { Location: "/pricing" });
    }
    res.end();
  } catch (error) {
    console.error("Failed to confirm success session", error);
    res.status(500).json({ error: "Unable to confirm session" });
  }
};

const registerHandler = async (req, res) => {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  await parseJsonBody(req);

  const email = (req.body?.email || "").toString().trim().toLowerCase();
  const password = (req.body?.password || "").toString();
  const requestedPrice = req.body?.priceId?.toString();

  if (requestedPrice && requestedPrice !== PRICE_ID) {
    return res.status(400).json({ error: "Invalid Stripe price" });
  }

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  if (password.length < 8) {
    return res.status(400).json({ error: "Password must be at least 8 characters" });
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    return res.status(500).json({ error: "Stripe is not configured" });
  }

  if (!process.env.STRIPE_SECRET_KEY.startsWith("sk_live_")) {
    return res
      .status(500)
      .json({
        error:
          "Live Stripe secret key is required for this price. Please set STRIPE_SECRET_KEY to your live mode key.",
      });
  }

  const passwordHash = bcrypt.hashSync(password, bcrypt.genSaltSync(12));

  const user = upsertUser({
    email,
    subscriptionStatus: "INACTIVE",
    plan: "pending",
    passwordHash,
  });

  const session = createSession({ userId: user.id, email: user.email });
  setSessionCookie(res, session.id);

  try {
    const origin = req.headers?.origin || appBaseUrl;
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer_email: email,
      metadata: {
        email,
        user_id: user?.id,
        price_id: PRICE_ID,
      },
      line_items: [
        {
          price: PRICE_ID,
          quantity: 1,
        },
      ],
      success_url: `${origin}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/pricing?email=${encodeURIComponent(email)}`,
    });

    res.status(200).json({ url: session.url });
  } catch (error) {
    const message = error?.message || "Unable to start checkout";
    console.error("Failed to create checkout session", message);
    res.status(500).json({ error: message });
  }
};

const loginHandler = async (req, res) => {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  await parseJsonBody(req);
  const email = (req.body?.email || "").toString().trim().toLowerCase();
  const password = (req.body?.password || "").toString();

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  const user = getUserByEmail(email);
  if (!user || !user.password_hash || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const session = createSession({ userId: user.id, email: user.email });
  setSessionCookie(res, session.id);

  const state = subscriptionState(email);
  const isActive = state.isActive || (user.subscription_status || "").toUpperCase() === "ACTIVE";

  if (!isActive) {
    return res.status(402).json({ error: "Subscription required", session_token: session.id });
  }

  res.status(200).json({ message: "Logged in", session_token: session.id });
};

const logoutHandler = async (req, res) => {
  const cookies = parseCookies(req);
  const token = cookies.session_token || req.headers["x-session-token"];
  if (token) {
    deleteSession(token.toString());
  }
  res.setHeader("Set-Cookie", "session_token=; Max-Age=0; Path=/; HttpOnly; SameSite=Lax");
  res.status(200).json({ message: "Logged out" });
};

const checkAccessHandler = async (req, res) => {
  if (req.method === "POST") {
    await parseJsonBody(req);
  }

  const emailFromQuery = extractEmailMiddleware(req);
  const email = emailFromQuery || (req.method === "POST" ? req.body?.email?.toString().toLowerCase() : null);

  if (!email) {
    return res.status(401).json({ active: false, status: "NONE", error: "Email required", redirect: "/#signup" });
  }

  const subscription = subscriptionState(email);
  const status = subscription.isActive ? "ACTIVE" : "INACTIVE";
  const response = { active: subscription.isActive, status, allowed: subscription.isActive, redirect: "/#signup" };

  if (!subscription.isActive) {
    return res.status(402).json(response);
  }

  res.status(200).json(response);
};

const usageHandler = async (req, res) => {
  await parseJsonBody(req);
  const verification = await verifySubscription(req, res);
  if (!verification.allowed) return;

  const email = extractEmailMiddleware(req);
  const usage =
    db
      .prepare("SELECT COUNT(*) as total FROM usage_logs WHERE user_email = ?")
      .get(email.toLowerCase())?.total || 0;

  res.json({ email, usage });
};

const userHandler = async (req, res) => {
  await parseJsonBody(req);
  const verification = await verifySubscription(req, res);
  if (!verification.allowed) return;

  const email = extractEmailMiddleware(req);
  const user = getUserByEmail(email);
  res.json({
    email,
    subscription_status: user?.subscription_status || "unknown",
    current_period_end: user?.current_period_end || null,
  });
};

const dashboardHandler = async (req, res) => {
  const { adminUser, adminPass } = getAdminCredentials();
  const { authorization = "" } = req.headers || {};
  const { username, password } = decodeBasicAuth(authorization);
  const isAdmin = Boolean(username) && username === adminUser && password === adminPass;

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
};

const adminHandler = async (req, res) => {
  const isAuthorized = validateAdminAuth(req, res);
  if (!isAuthorized) return;

  let metrics;
  try {
    metrics = await loadMetrics();
  } catch (error) {
    console.error("Failed to load admin metrics", error?.message || error);
    res.statusCode = 500;
    res.setHeader("Content-Type", "text/plain");
    res.end("Unable to load metrics. Check server logs for details.");
    return;
  }

  const {
    activeSubscribers,
    totalUsers,
    totalSearches,
    searchesToday,
    failedPayments,
    mrrCents,
    recentPayments,
    users,
    conversionRatio,
  } = metrics;

  const renderRow = (label, value) => `<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #eee;">
  <strong>${label}</strong><span>${value}</span>
</div>`;

  const paymentsHtml = recentPayments
    .map((p) => `<li>${p.invoice_id} — ${p.status} — ${(p.amount_paid || 0) / 100} ${p.currency || "usd"}</li>`)
    .join("");

  const usersHtml = users
    .map(
      (u) => `<li>${u.email} — ${u.subscription_status || "none"} ${u.current_period_end ? `(renews ${new Date(
        u.current_period_end * 1000
      ).toLocaleString()})` : ""}</li>`
    )
    .join("");

  const html = `<!doctype html>
  <html><head><title>Admin Dashboard</title><style>body{font-family:Arial, sans-serif;padding:24px;max-width:900px;margin:auto;}h1{margin-bottom:16px;}section{margin-bottom:24px;}ul{padding-left:20px;}</style></head>
  <body>
    <h1>Admin Dashboard</h1>
    <section>
      ${renderRow("Active subscribers", activeSubscribers)}
      ${renderRow("Total users", totalUsers)}
      ${renderRow("Total searches", totalSearches)}
      ${renderRow("Searches today", searchesToday)}
      ${renderRow("Conversion %", `${(conversionRatio * 100).toFixed(2)}%`)}
      ${renderRow("Failed payments", failedPayments)}
      ${renderRow("MRR", `$${(mrrCents / 100).toFixed(2)}`)}
    </section>
    <section>
      <h2>Recent payments</h2>
      <ul>${paymentsHtml}</ul>
    </section>
    <section>
      <h2>Users</h2>
      <ul>${usersHtml}</ul>
    </section>
  </body></html>`;

  res.setHeader("Content-Type", "text/html");
  res.send(html);
};

const adminStatsHandler = async (req, res) => {
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
};

const statusHandler = async (_req, res) => {
  res.status(200).json({ status: "ok" });
};

const handlers = {
  search: searchHandler,
  webhook: stripeWebhookHandler,
  admin: adminHandler,
  stats: adminStatsHandler,
  usage: usageHandler,
  verify: verifySessionHandler,
  success: successHandler,
  dashboard: dashboardHandler,
  user: userHandler,
  "check-access": checkAccessHandler,
  register: registerHandler,
  login: loginHandler,
  logout: logoutHandler,
  index: statusHandler,
};

export default async function handler(req, res) {
  const action = (req.query?.action || "index").toString();

  if (action !== "webhook" && req.method !== "GET") {
    await parseJsonBody(req);
  }

  const routeHandler = handlers[action];
  if (!routeHandler) {
    return res.status(404).json({ error: "Unknown action" });
  }

  return routeHandler(req, res);
}
