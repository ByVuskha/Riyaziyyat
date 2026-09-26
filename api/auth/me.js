// GET /api/auth/me — returns the current authenticated user from Redis
const redis = require('../../lib/redis');
const { getUserFromRequest, setCommonHeaders } = require('../../lib/auth');
const { sanitizeUser } = require('../../lib/helpers');

module.exports = async function handler(req, res) {
  setCommonHeaders(res);
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const session = getUserFromRequest(req);
  if (!session) {
    return res.status(401).json({ error: 'Giriş tələb olunur' });
  }

  // Fetch fresh user data from Redis
  const raw   = await redis.get('allUsers');
  const users = Array.isArray(raw) ? raw : (raw ? JSON.parse(raw) : []);
  const user  = users.find(u => u.id === session.id || u.email === session.email);

  if (!user) {
    return res.status(404).json({ error: 'İstifadəçi tapılmadı' });
  }

  return res.status(200).json({ user: sanitizeUser(user) });
};
