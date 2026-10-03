// Collection and ID-based news operations share one serverless function.
const redis  = require('../../lib/redis');
const { getUserFromRequest, requireAuth, requireAdmin, setCommonHeaders } = require('../../lib/auth');
const { allowMethods, genId, paginate } = require('../../lib/helpers');
const { awardDailyTask } = require('../../lib/daily-tasks');

module.exports = async function handler(req, res) {
  setCommonHeaders(res);
  const { id, action } = req.query || {};

  if (id) {
    if (req.method === 'POST' && action === 'view') {
      if (!allowMethods(req, res, ['POST'])) return;
      const raw = await redis.get('news');
      const news = Array.isArray(raw) ? raw : (raw ? JSON.parse(raw) : []);
      const idx = news.findIndex(item => String(item.id) === String(id));
      if (idx === -1) return res.status(404).json({ error: 'Xəbər tapılmadı' });
      news[idx].views = (news[idx].views || 0) + 1;
      await redis.set('news', JSON.stringify(news), { ex: 86400 * 30 });
      const user = getUserFromRequest(req);
      if (user) await redis.set(`newsRead:${user.id}:${id}`, JSON.stringify({ startedAt: Date.now() }), { ex: 3600 });
      return res.status(200).json({ views: news[idx].views });
    }

    if (req.method === 'POST' && action === 'complete-read') {
      if (!allowMethods(req, res, ['POST'])) return;
      const user = requireAuth(req, res);
      if (!user) return;
      const rawRead = await redis.get(`newsRead:${user.id}:${id}`);
      const readSession = rawRead && typeof rawRead === 'object' ? rawRead : (rawRead ? JSON.parse(rawRead) : null);
      if (!readSession?.startedAt || Date.now() - Number(readSession.startedAt) < 20_000) {
        return res.status(400).json({ error: 'Xəbəri oxumaq üçün ən azı 20 saniyə səhifədə qalın' });
      }
      await redis.del(`newsRead:${user.id}:${id}`);
      const taskResult = await awardDailyTask(user, 'read-news');
      return res.status(200).json({ completed: true, ...taskResult });
    }

    if (!allowMethods(req, res, ['GET', 'PUT', 'DELETE'])) return;
    const raw = await redis.get('news');
    const news = Array.isArray(raw) ? raw : (raw ? JSON.parse(raw) : []);
    const idx = news.findIndex(item => String(item.id) === String(id));
    if (idx === -1) return res.status(404).json({ error: 'Xəbər tapılmadı' });
    if (req.method === 'GET') return res.status(200).json(news[idx]);

    const admin = requireAdmin(req, res);
    if (!admin) return;
    if (req.method === 'PUT') {
      news[idx] = { ...news[idx], ...req.body, id: news[idx].id, updatedAt: new Date().toISOString() };
      await redis.set('news', JSON.stringify(news), { ex: 86400 * 30 });
      return res.status(200).json(news[idx]);
    }

    news.splice(idx, 1);
    await redis.set('news', JSON.stringify(news), { ex: 86400 * 30 });
    return res.status(200).json({ ok: true });
  }

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
