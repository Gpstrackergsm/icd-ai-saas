const { metrics } = require("../lib/db");

function authorize(req) {
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

const renderRow = (label, value) => `<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #eee;">
  <strong>${label}</strong><span>${value}</span>
</div>`;

export default function handler(req, res) {
  if (!authorize(req)) {
    res.setHeader("WWW-Authenticate", 'Basic realm="Admin Area"');
    return res.status(401).send("Unauthorized");
  }

  const activeSubscribers = metrics.activeSubscribers();
  const totalUsers = metrics.totalUsers();
  const totalSearches = metrics.totalSearches();
  const searchesToday = metrics.dailySearches();
  const trials = metrics.trials();
  const conversionRatio = metrics.conversionRate();
  const failedPayments = metrics.failedPayments();
  const mrrCents = metrics.mrr();
  const recentPayments = metrics.recentPayments();
  const users = metrics.users();

  const paymentsHtml = recentPayments
    .map(
      (p) => `<li>${p.invoice_id} — ${p.status} — ${(p.amount_paid || 0) / 100} ${p.currency || "usd"}</li>`
    )
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
      ${renderRow("Trial users", trials)}
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
}
