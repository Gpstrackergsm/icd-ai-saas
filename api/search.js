const { searchIcd } = require("../icd-search");
const { extractEmail } = require("../middleware/verifySubscription");
const {
  logUsage,
  getUserByEmail,
  recordSearchUsage,
  incrementUserSearchCount,
  disableTrialForUser,
} = require("../lib/db");

const rateLimitWindowMs = 60 * 1000;
const maxRequestsPerWindow = 30;
const rateLimiters = new Map();

const getIp = (req) =>
  req.headers["x-forwarded-for"]?.toString().split(",")[0].trim() || req.connection?.remoteAddress || "unknown";

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
  const terms = q
    .split(",")
    .map((term) => term.trim())
    .filter(Boolean);

  if (terms.length === 0) {
    return res.status(400).json({ error: "Missing query" });
  }

  const email = extractEmail(req);
  if (!email) {
    return res.status(401).json({ error: "Authentication required" });
  }

  const user = getUserByEmail(email);
  if (!user) {
    return res.status(401).json({ error: "User session required" });
  }

  const subscriptionStatus = (user.subscription_status || "").toLowerCase();
  const isActive = subscriptionStatus === "active";
  const isTrial = Boolean(user.trial);
  const searchCount = user.search_count || 0;

  if (!isActive) {
    if (isTrial) {
      if (searchCount >= 10) {
        disableTrialForUser(email);
        return res.status(403).json({ message: "Trial limit reached. Please subscribe." });
      }
    } else {
      return res.status(403).json({ error: "Subscription required" });
    }
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

  if (isTrial) {
    incrementUserSearchCount(email);
  }

  recordSearchUsage(email);
  logUsage({ email, userId: user.id, ip });

  res.json({
    results: groupedResults,
    meta: {
      terms,
      subscriber: isActive,
      status: subscriptionStatus || (isTrial ? "trial" : "inactive"),
      search_count: isTrial ? searchCount + 1 : searchCount,
    },
  });
}
