// POST /api/auth/login
const bcrypt = require('bcryptjs');
const redis  = require('../../lib/redis');
const { signToken, buildCookieHeader, setCommonHeaders } = require('../../lib/auth');
const { sanitizeUser } = require('../../lib/helpers');

// Hardcoded admin fallback (only used if Redis has no allUsers yet)
const ADMIN_FALLBACK = {
  id:       'admin-001',
  email:    'admin@riyazmath.az',
  password: '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4AYczaAvtW', // "admin123" hashed
  name:     'Admin',
  role:     'admin',
  userType: 'admin',
  premium:  true,
  balance:  0,
};

module.exports = async function handler(req, res) {
  setCommonHeaders(res);
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: 'Email və şifrə tələb olunur' });
  }

  const normalizedEmail = email.toLowerCase().trim();

  // ── Load users ────────────────────────────────────────────────────────────
  const raw  = await redis.get('allUsers');
  let users  = Array.isArray(raw) ? raw : (raw ? JSON.parse(raw) : []);

  // Keep the fallback admin available to /api/auth/me on later requests.
  const hasAdminFallback = users.some(u => u.email === ADMIN_FALLBACK.email);
  if (!hasAdminFallback) {
    users = [ADMIN_FALLBACK, ...users];
  }

  const user = users.find(u => u.email === normalizedEmail);
  if (!user) {
    return res.status(401).json({ error: 'Email və ya şifrə yanlışdır' });
  }

  // ── Check frozen ──────────────────────────────────────────────────────────
  if (user.frozen) {
    return res.status(403).json({ error: 'Hesabınız bloklanıb. Dəstək xidməti ilə əlaqə saxlayın.' });
  }

  // ── Verify password (supports both bcrypt hash and legacy plaintext) ───────
  let passwordOk = false;
  if (user.password && user.password.startsWith('$2')) {
    // bcrypt hash
    passwordOk = await bcrypt.compare(password, user.password);
  } else {
    // Legacy plaintext — compare then migrate to bcrypt
    passwordOk = (user.password === password);
    if (passwordOk) {
      // Migrate to hash in-place
      const hashed = await bcrypt.hash(password, 12);

    if (!hasAdminFallback) {
      await redis.set('allUsers', JSON.stringify(users), { ex: 86400 * 30 });
    }
      const idx = users.findIndex(u => u.email === normalizedEmail);
      if (idx !== -1) {
        users[idx].password = hashed;
        await redis.set('allUsers', JSON.stringify(users), { ex: 86400 * 30 });
      }
    }
  }

  if (!passwordOk) {
    return res.status(401).json({ error: 'Email və ya şifrə yanlışdır' });
  }

  // ── Issue JWT ─────────────────────────────────────────────────────────────
  const token = signToken({
    id:    user.id,
    email: user.email,
    role:  user.role,
    name:  user.name,
  });

  res.setHeader('Set-Cookie', buildCookieHeader(token));
  return res.status(200).json({ user: sanitizeUser(user) });
};
