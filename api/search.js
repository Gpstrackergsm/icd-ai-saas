const fs = require("fs");
const path = require("path");
const { searchIcd } = require("../icd-search");
const { extractEmail } = require("../middleware/verifySubscription");
const { logUsage, subscriptionState } = require("../lib/db");

const MAX_FREE_SEARCHES = 10;
const rateLimitWindowMs = 60 * 1000;
const maxRequestsPerWindow = 30;
const rateLimiters = new Map();

const dbPath = path.join(process.cwd(), "users.json");

const loadUsers = () => {
  if (!fs.existsSync(dbPath)) return {};
  try {
    return JSON.parse(fs.readFileSync(dbPath, "utf8"));
  } catch (err) {
    console.error("Failed to parse users database", err);
    return {};
  }
};

const saveUsers = (users) => {
  fs.writeFileSync(dbPath, JSON.stringify(users, null, 2));
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

  const users = loadUsers();
  const user = users[ip] || { searches: 0, subscription: "free" };
  users[ip] = user;

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
  let subscription;
  if (email) {
    const state = resolveSubscriptionState(email);
    if (state.active) {
      isSubscribed = true;
      subscription = state.record;
    }
  }

  user.subscription = isSubscribed ? "active" : user.subscription || "free";

  if (!isSubscribed && user.searches >= MAX_FREE_SEARCHES) {
    console.log(`Search limit reached for IP ${ip}`);
    saveUsers(users);
    return res.status(403).json({ message: "Please subscribe to continue" });
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

  if (!isSubscribed) {
    user.searches += 1;
  }

  saveUsers(users);

  logUsage({ email, userId: subscription?.user_id, ip });

  res.json({
    results: groupedResults,
    meta: {
      terms,
      subscriber: isSubscribed,
      status: isSubscribed ? "ACTIVE" : resolveSubscriptionState(email).status,
    },
  });
}
