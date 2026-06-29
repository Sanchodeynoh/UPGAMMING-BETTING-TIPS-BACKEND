// middleware/auth.js
// Minimal admin protection: the dashboard logs in with a password (set via
// the ADMIN_PASSWORD environment variable on Render). On success, the
// frontend is given that same password back as a "token" and must send it
// in the Authorization header for every protected request afterward.
//
// NOTE: This is intentionally simple for a personal project. It is NOT
// suitable for handling sensitive financial data or multiple admins. If
// this site starts handling real user accounts or payments, upgrade to
// proper hashed-password + session/JWT auth.

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "changeme123";

function requireAdmin(req, res, next) {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.replace("Bearer ", "").trim();

  if (token !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  next();
}

module.exports = { requireAdmin, ADMIN_PASSWORD };
                                 
