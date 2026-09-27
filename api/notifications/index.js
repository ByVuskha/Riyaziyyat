const redis = require('../../lib/redis');
const { getUserFromRequest, requireAdmin, setCommonHeaders } = require('../../lib/auth');
const { allowMethods } = require('../../lib/helpers');

function parseList(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  try { return JSON.parse(value); } catch { return []; }
}

module.exports = async function handler(req, res) {
  setCommonHeaders(res);
  if (!allowMethods(req, res, ['GET', 'POST', 'PUT'])) return;

  if (req.method === 'PUT') {
    const session = getUserFromRequest(req);
    if (!session) return res.status(401).json({ error: 'Daxil olmalısınız' });

    const body = req.body || {};
    const notificationIds = Array.isArray(body.ids) ? body.ids : body.notificationId ? [body.notificationId] : [];
    const notifications = parseList(await redis.get('siteNotifications'));

    const updated = notifications.map(item => {
      if (!notificationIds.length || !notificationIds.includes(item.id)) return item;
      const readBy = Array.isArray(item.readBy) ? item.readBy : [];
      if (!readBy.includes(session.id)) readBy.push(session.id);
      return { ...item, readBy };
    });

    await redis.set('siteNotifications', JSON.stringify(updated.slice(0, 250)), { ex: 86400 * 30 });
    return res.status(200).json({ ok: true, data: updated });
  }

  if (req.method === 'GET') {
    const notifications = parseList(await redis.get('siteNotifications'));
    const qUserId = req.query?.userId || req.query?.targetUserId || null;
    const session = getUserFromRequest(req);
    const visible = notifications
      .filter(item => item && (item.audience === 'all' || !item.audience || !item.userId || String(item.userId) === String(qUserId || '')))
      .filter(item => {
        if (!qUserId) return true;
        if (!session) return item.audience === 'all' || String(item.userId) === String(qUserId);
        if (session.role === 'admin') return true;
        return item.audience === 'all' || String(item.userId) === String(session.id) || String(item.userId) === String(qUserId);
      })
      .map(item => ({
        ...item,
        isUnread: !Array.isArray(item.readBy) || !item.readBy.includes(session?.id || '')
      }))
      .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    return res.status(200).json({ data: visible });
  }

  const admin = requireAdmin(req, res);
  if (!admin) return;

  const body = req.body || {};
  const message = String(body.message || body.text || '').trim();
  const title = String(body.title || 'Yeni bildiriş').trim();

  if (!message) {
    return res.status(400).json({ error: 'Bildiriş mətni boş ola bilməz' });
  }

  const item = {
    id: body.id || `notif-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    title: title || 'Yeni bildiriş',
    message,
    type: body.type || 'info',
    audience: body.audience === 'user' ? 'user' : 'all',
    userId: body.userId || null,
    userName: body.userName || null,
    senderId: admin.id,
    senderName: admin.name,
    readBy: [],
    createdAt: new Date().toISOString(),
  };

  const notifications = parseList(await redis.get('siteNotifications'));
  notifications.unshift(item);
  await redis.set('siteNotifications', JSON.stringify(notifications.slice(0, 250)), { ex: 86400 * 30 });

  return res.status(200).json({ ok: true, data: item });
};
