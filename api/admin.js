const { metrics } = require("../lib/db");

function authorize(req) {
  const provided = req.headers["x-admin-password"] || req.query?.password;
  return process.env.ADMIN_PASSWORD && provided === process.env.ADMIN_PASSWORD;
}

const renderRow = (label, value) => `<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #eee;">
  <strong>${label}</strong><span>${value}</span>
</div>`;

export default function handler(req, res) {
  if (!authorize(req)) {
    res.setHeader("WWW-Authenticate", "Basic realm=admin");
    return res.status(401).send("Unauthorized");
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
      ${renderRow("New subscriptions today", newSubscriptionsToday)}
      ${renderRow("Searches today", searchesToday)}
      ${renderRow("Failed payments", failedPayments)}
      ${renderRow("MRR", `$${(mrrCents / 100).toFixed(2)}`)}
      ${renderRow("Conversion ratio", `${(conversionRatio * 100).toFixed(2)}%`)}
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
