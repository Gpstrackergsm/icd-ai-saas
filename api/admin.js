const { loadMetrics } = require("../lib/metrics");

const renderRow = (label, value) => `<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #eee;">
  <strong>${label}</strong><span>${value}</span>
</div>`;

export default async function handler(req, res) {
  const adminUser = process.env.ADMIN_USER;
  const adminPass = process.env.ADMIN_PASS;
  if (!adminUser || !adminPass) {
    res.statusCode = 503;
    res.setHeader("Content-Type", "text/plain");
    res.end("Admin credentials are not configured. Set ADMIN_USER and ADMIN_PASS environment variables.");
    return;
  }

  const auth = req.headers.authorization;

  if (!auth || !auth.startsWith("Basic ")) {
    res.statusCode = 401;
    res.setHeader("WWW-Authenticate", 'Basic realm="Admin Area"');
    res.end("Authentication required");
    return;
  }

  const base64 = auth.split(" ")[1];
  const decoded = Buffer.from(base64, "base64").toString();
  const [username, password] = decoded.split(":");

  if (!password || password !== adminPass || username !== adminUser) {
    res.statusCode = 401;
    res.setHeader("WWW-Authenticate", 'Basic realm="Admin Area"');
    res.end("Invalid credentials");
    return;
  }

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
