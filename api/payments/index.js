// GET  /api/payments  — list payments (admin) or own (user)
// POST /api/payments  — record a payment
const redis  = require('../../lib/redis');
const { requireAuth, setCommonHeaders } = require('../../lib/auth');
const { allowMethods, genId, paginate } = require('../../lib/helpers');

module.exports = async function handler(req, res) {
  setCommonHeaders(res);
  if (!allowMethods(req, res, ['GET', 'POST'])) return;

  const session = requireAuth(req, res);
  if (!session) return;

  const raw  = await redis.get('payments');
  const pays = Array.isArray(raw) ? raw : (raw ? JSON.parse(raw) : []);

  if (req.method === 'GET') {
    const filtered = session.role === 'admin'
      ? pays
      : pays.filter(p => String(p.userId) === String(session.id));
    const page  = parseInt(req.query?.page)  || 1;
    const limit = parseInt(req.query?.limit) || 50;
    return res.status(200).json(paginate(filtered, page, limit));
  }

  return res.status(503).json({ error: 'Təhlükəsiz kart provayderi qoşulmayıb. Ödəniş edilmədi və balans artırılmadı.' });
};
