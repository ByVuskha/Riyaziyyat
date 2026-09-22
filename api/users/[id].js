// GET    /api/users/:id  — own profile (auth required) or any (admin)
// PUT    /api/users/:id  — update (own or admin)
// DELETE /api/users/:id  — delete (admin only)
const bcrypt = require('bcryptjs');
const redis  = require('../_lib/redis');
const { getUserFromRequest, requireAdmin, setCommonHeaders } = require('../_lib/auth');
const { allowMethods, sanitizeUser } = require('../_lib/helpers');

module.exports = async function handler(req, res) {
  setCommonHeaders(res);
  if (!allowMethods(req, res, ['GET', 'PUT', 'DELETE'])) return;

  const session = getUserFromRequest(req);
  if (!session) return res.status(401).json({ error: 'Giriş tələb olunur' });

  const { id } = req.query;
  const raw    = await redis.get('allUsers');
  const users  = Array.isArray(raw) ? raw : (raw ? JSON.parse(raw) : []);
  const idx    = users.findIndex(u => String(u.id) === String(id));

  if (idx === -1) return res.status(404).json({ error: 'İstifadəçi tapılmadı' });

  // Authorization: can only access own data unless admin
  if (session.id !== users[idx].id && session.role !== 'admin') {
    return res.status(403).json({ error: 'İcazəniz yoxdur' });
  }

  if (req.method === 'GET') {
    return res.status(200).json(sanitizeUser(users[idx]));
  }

  if (req.method === 'PUT') {
    const { name, password, balance, role, premium, premiumExpiresAt,
            frozen, canAddTests, userType, phone, bio, profilePicture } = req.body || {};

    // Regular users can only update own name/password/bio/picture
    if (session.role !== 'admin') {
      if (name)    users[idx].name    = name.trim();
      if (phone)   users[idx].phone   = phone;
      if (bio)     users[idx].bio     = bio;
      if (profilePicture) users[idx].profilePicture = profilePicture;
      if (password && password.length >= 6) {
        users[idx].password = await bcrypt.hash(password, 12);
      }
    } else {
      // Admin can update everything
      if (name)    users[idx].name    = name.trim();
      if (phone !== undefined) users[idx].phone = phone;
      if (bio   !== undefined) users[idx].bio   = bio;
      if (userType !== undefined) users[idx].userType = userType;
      if (balance !== undefined) users[idx].balance = Number(balance);
      if (role    !== undefined) users[idx].role    = role;
      if (premium !== undefined) users[idx].premium = Boolean(premium);
      if (premiumExpiresAt !== undefined) users[idx].premiumExpiresAt = premiumExpiresAt;
      if (frozen  !== undefined) users[idx].frozen  = Boolean(frozen);
      if (canAddTests !== undefined) users[idx].canAddTests = Boolean(canAddTests);
      if (password && password.length >= 6) {
        users[idx].password = await bcrypt.hash(password, 12);
      }
    }
    users[idx].updatedAt = new Date().toISOString();
    await redis.set('allUsers', JSON.stringify(users), { ex: 86400 * 30 });
    return res.status(200).json(sanitizeUser(users[idx]));
  }

  if (req.method === 'DELETE') {
    if (session.role !== 'admin') return res.status(403).json({ error: 'Admin icazəsi tələb olunur' });
    users.splice(idx, 1);
    await redis.set('allUsers', JSON.stringify(users), { ex: 86400 * 30 });
    return res.status(200).json({ ok: true });
  }
};
