// GET    /api/news/:id
// PUT    /api/news/:id   (admin)
// DELETE /api/news/:id   (admin)
// POST   /api/news/:id/view — increment view count (public)
const redis  = require('../_lib/redis');
const { requireAdmin, setCommonHeaders } = require('../_lib/auth');
const { allowMethods } = require('../_lib/helpers');

module.exports = async function handler(req, res) {
  setCommonHeaders(res);

  const { id } = req.query;

  // Handle view increment: POST /api/news/:id?action=view
  if (req.method === 'POST' && req.query?.action === 'view') {
    const raw  = await redis.get('news');
    const news = Array.isArray(raw) ? raw : (raw ? JSON.parse(raw) : []);
    const idx  = news.findIndex(n => String(n.id) === String(id));
    if (idx !== -1) {
      news[idx].views = (news[idx].views || 0) + 1;
      await redis.set('news', JSON.stringify(news), { ex: 86400 * 30 });
      return res.status(200).json({ views: news[idx].views });
    }
    return res.status(404).json({ error: 'Xəbər tapılmadı' });
  }

  if (!allowMethods(req, res, ['GET', 'PUT', 'DELETE'])) return;

  const raw  = await redis.get('news');
  const news = Array.isArray(raw) ? raw : (raw ? JSON.parse(raw) : []);
  const idx  = news.findIndex(n => String(n.id) === String(id));

  if (idx === -1) return res.status(404).json({ error: 'Xəbər tapılmadı' });

  if (req.method === 'GET') {
    return res.status(200).json(news[idx]);
  }

  const admin = requireAdmin(req, res);
  if (!admin) return;

  if (req.method === 'PUT') {
    news[idx] = { ...news[idx], ...req.body, id: news[idx].id, updatedAt: new Date().toISOString() };
    await redis.set('news', JSON.stringify(news), { ex: 86400 * 30 });
    return res.status(200).json(news[idx]);
  }

  if (req.method === 'DELETE') {
    news.splice(idx, 1);
    await redis.set('news', JSON.stringify(news), { ex: 86400 * 30 });
    return res.status(200).json({ ok: true });
  }
};
