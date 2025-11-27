const { searchIcd } = require("../icd-search");
const { extractEmail } = require("../middleware/verifySubscription");
const { recordVisit, getVisit, logUsage, getUserByEmail, normalizeStatus } = require("../lib/db");

const MAX_FREE_SEARCHES = 10;
const rateLimitWindowMs = 60 * 1000;
const maxRequestsPerWindow = 30;
const rateLimiters = new Map();

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

const resolveSubscriptionState = (email) => {
  const user = email ? getUserByEmail(email) : null;
  const now = Math.floor(Date.now() / 1000);
  const status = normalizeStatus(user?.subscription_status);
  const active = Boolean(status === "ACTIVE" && (!user?.current_period_end || user.current_period_end > now));
  return { active, status: status || "NONE", user };
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

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const ip = getIp(req);
  if (!checkRateLimit(ip)) {
    return res.status(429).json({ error: "Too many requests" });
  }

  const q = (req.query?.q || "").toString();
  const email = extractEmail(req);

  const terms = q
    .split(",")
    .map((term) => term.trim())
    .filter(Boolean);

  if (terms.length === 0) {
    return res.status(400).json({ error: "Missing query" });
  }

  const cookies = parseCookies(req);
  let visitorId = cookies["visitor_id"];
  if (!visitorId) {
    visitorId = `v_${Date.now()}_${Math.random().toString(16).slice(2)}`;
    res.setHeader("Set-Cookie", `visitor_id=${visitorId}; Path=/; Max-Age=86400; HttpOnly; SameSite=Lax`);
  }

  let isSubscribed = false;
  let user;
  if (email) {
    const state = resolveSubscriptionState(email);
    if (state.active) {
      isSubscribed = true;
      user = state.user;
    }
  }

  const identifier = email || visitorId || ip;
  if (!isSubscribed) {
    const visit = getVisit(identifier);
    if (visit && visit.search_count >= MAX_FREE_SEARCHES) {
      return res
        .status(402)
        .json({ locked: true, redirect: "https://buy.stripe.com/00w4gycvoc0ObN95pMgnK01" });
    }
    recordVisit(identifier);
  }

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

  logUsage({ email, userId: user?.id, ip });

  res.json({
    results: groupedResults,
    meta: {
      terms,
      subscriber: isSubscribed,
      status: isSubscribed ? "ACTIVE" : resolveSubscriptionState(email).status,
    },
  });
}
