// GET /api/users — list all users (admin only)
const redis  = require('../_lib/redis');
const { requireAdmin, setCommonHeaders } = require('../_lib/auth');
const { allowMethods, sanitizeUser, paginate } = require('../_lib/helpers');

module.exports = async function handler(req, res) {
  setCommonHeaders(res);
  if (!allowMethods(req, res, ['GET'])) return;

  const admin = requireAdmin(req, res);
  if (!admin) return;

  const raw   = await redis.get('allUsers');
  const users = Array.isArray(raw) ? raw : (raw ? JSON.parse(raw) : []);

  const page  = parseInt(req.query?.page)  || 1;
  const limit = parseInt(req.query?.limit) || 50;
  const q     = (req.query?.q || '').toLowerCase();

  let filtered = users;
  if (q) {
    filtered = users.filter(u =>
      u.name?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q)
    );
  }

  // Return users with password stripped
  const safe = filtered.map(sanitizeUser);
  return res.status(200).json(paginate(safe, page, limit));
};
