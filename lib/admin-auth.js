function getAdminCredentials(res, { required = false } = {}) {
  const adminUser = process.env.ADMIN_USER || process.env.ADMIN_USERNAME;
  const adminPass = process.env.ADMIN_PASS || process.env.ADMIN_PASSWORD;

  if (required && (!adminUser || !adminPass) && res) {
    res.statusCode = 503;
    res.setHeader("Content-Type", "text/plain");
    res.end(
      "Admin credentials are not configured. Set ADMIN_USER (or ADMIN_USERNAME) and ADMIN_PASS (or ADMIN_PASSWORD) environment variables."
    );
    return { adminUser: undefined, adminPass: undefined };
  }

  return { adminUser, adminPass };
}

function decodeBasicAuth(header = "") {
  if (!header.startsWith("Basic ")) return { username: null, password: null };

  const base64 = header.slice("Basic ".length).trim();
  const decoded = Buffer.from(base64, "base64").toString("utf8");
  const separatorIndex = decoded.indexOf(":");

  if (separatorIndex === -1) {
    return { username: null, password: null };
  }

  return {
    username: decoded.slice(0, separatorIndex),
    password: decoded.slice(separatorIndex + 1),
  };
}

function validateAdminAuth(req, res, { challenge = true } = {}) {
  const { adminUser, adminPass } = getAdminCredentials(res, { required: true });
  if (!adminUser || !adminPass) return false;

  const { authorization = "" } = req.headers || {};
  const { username, password } = decodeBasicAuth(authorization);

  if (username !== adminUser || password !== adminPass) {
    if (challenge) {
      res.statusCode = 401;
      res.setHeader("WWW-Authenticate", 'Basic realm="Admin Area"');
      res.end(username === null ? "Authentication required" : "Invalid credentials");
    }
    return false;
  }

  return true;
}

module.exports = {
  decodeBasicAuth,
  getAdminCredentials,
  validateAdminAuth,
};
