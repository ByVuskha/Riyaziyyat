// GET  /api/news   — list news (public)
// POST /api/news   — create news (admin)
const redis  = require('../_lib/redis');
const { requireAdmin, setCommonHeaders } = require('../_lib/auth');
const { allowMethods, genId, paginate } = require('../_lib/helpers');

module.exports = async function handler(req, res) {
  setCommonHeaders(res);
  if (!allowMethods(req, res, ['GET', 'POST'])) return;

  if (req.method === 'GET') {
    const raw   = await redis.get('news');
    const news  = Array.isArray(raw) ? raw : (raw ? JSON.parse(raw) : []);
    const page  = parseInt(req.query?.page)  || 1;
    const limit = parseInt(req.query?.limit) || 20;
    // Sort newest first
    const sorted = [...news].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return res.status(200).json(paginate(sorted, page, limit));
  }

  // POST — admin only
  const admin = requireAdmin(req, res);
  if (!admin) return;

  const { title, text, emoji, author, imageUrl } = req.body || {};
  if (!title || !text) {
    return res.status(400).json({ error: 'Başlıq və mətn tələb olunur' });
  }

  const raw  = await redis.get('news');
  const news = Array.isArray(raw) ? raw : (raw ? JSON.parse(raw) : []);

  const item = {
    id:        genId(),
    title:     title.trim(),
    text:      text.trim(),
    emoji:     emoji || '📰',
    author:    author || admin.name,
    imageUrl:  imageUrl || '',
    views:     0,
    createdAt: new Date().toISOString(),
    date:      new Date().toLocaleDateString('az-AZ'),
  };

  news.unshift(item);
  await redis.set('news', JSON.stringify(news), { ex: 86400 * 30 });
  return res.status(201).json(item);
};
