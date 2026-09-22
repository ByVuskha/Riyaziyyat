// Auth helpers: JWT sign/verify + cookie parsing + middleware
const jwt = require('jsonwebtoken');

const JWT_SECRET  = process.env.JWT_SECRET || 'dev-secret-change-in-prod';
const COOKIE_NAME = 'br_session';
const MAX_AGE_SEC = 7 * 24 * 60 * 60; // 7 days

// ── Sign a JWT ────────────────────────────────────────────────────────────────
function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: MAX_AGE_SEC });
}

// ── Verify and return decoded payload, or null ────────────────────────────────
function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

// ── Build Set-Cookie header value ─────────────────────────────────────────────
function buildCookieHeader(token) {
  return `${COOKIE_NAME}=${token}; HttpOnly; Path=/; SameSite=Strict; Max-Age=${MAX_AGE_SEC}${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`;
}

function clearCookieHeader() {
  return `${COOKIE_NAME}=; HttpOnly; Path=/; SameSite=Strict; Max-Age=0`;
}

// ── Parse cookies from request header ────────────────────────────────────────
function parseCookies(req) {
  const raw = req.headers.cookie || '';
  return Object.fromEntries(
    raw.split(';').map(c => c.trim().split('=').map(s => decodeURIComponent(s.trim())))
  );
}

// ── Extract authenticated user from request (returns null if unauthenticated) ─
function getUserFromRequest(req) {
  const cookies = parseCookies(req);
  const token   = cookies[COOKIE_NAME];
  if (!token) return null;
  return verifyToken(token); // { id, email, role, name, iat, exp }
}

// ── Middleware: require any authenticated user ─────────────────────────────────
function requireAuth(req, res) {
  const user = getUserFromRequest(req);
  if (!user) {
    res.status(401).json({ error: 'Giriş tələb olunur' });
    return null;
  }
  return user;
}

// ── Middleware: require admin role ────────────────────────────────────────────
function requireAdmin(req, res) {
  const user = getUserFromRequest(req);
  if (!user) {
    res.status(401).json({ error: 'Giriş tələb olunur' });
    return null;
  }
  if (user.role !== 'admin') {
    res.status(403).json({ error: 'Admin icazəsi tələb olunur' });
    return null;
  }
  return user;
}

// ── CORS + JSON helper ────────────────────────────────────────────────────────
function setCommonHeaders(res) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('X-Content-Type-Options', 'nosniff');
}

module.exports = {
  signToken,
  verifyToken,
  buildCookieHeader,
  clearCookieHeader,
  parseCookies,
  getUserFromRequest,
  requireAuth,
  requireAdmin,
  setCommonHeaders,
};
