const redis = require('../../lib/redis');
const { getUserFromRequest, requireAdmin, setCommonHeaders } = require('../../lib/auth');
const { allowMethods, genId, paginate } = require('../../lib/helpers');

async function canAccessPremium(session) {
  if (!session) return false;
  if (session.role === 'admin') return true;
  const users = parseList(await redis.get('allUsers'));
  const user = users.find(item => String(item.id) === String(session.id));
  return Boolean(user?.premium && (!user.premiumExpiresAt || new Date(user.premiumExpiresAt) > new Date()));
}

function parseList(raw) {
  return Array.isArray(raw) ? raw : (raw ? JSON.parse(raw) : []);
}

function publicVideo(video, access) {
  if (!video.isPremium || access) return video;
  const { youtubeUrl, videoUrl, ...locked } = video;
  return { ...locked, locked: true };
}

module.exports = async function handler(req, res) {
  setCommonHeaders(res);
  const { id, action } = req.query || {};
  const session = getUserFromRequest(req);
  const access = await canAccessPremium(session);

  if (id && req.method === 'POST' && action === 'view') {
    if (!allowMethods(req, res, ['POST'])) return;
    const videos = parseList(await redis.get('videos'));
    const index = videos.findIndex(video => String(video.id) === String(id));
    if (index < 0 || videos[index].isActive === false) return res.status(404).json({ error: 'Video tapılmadı' });
    if (videos[index].isPremium && !access) return res.status(403).json({ error: 'Bu video Premium üzvlər üçündür' });
    videos[index].views = (videos[index].views || 0) + 1;
    await redis.set('videos', JSON.stringify(videos), { ex: 86400 * 30 });
    return res.status(200).json({ views: videos[index].views });
  }

  if (id) {
    if (!allowMethods(req, res, ['GET', 'PUT', 'DELETE'])) return;
    const videos = parseList(await redis.get('videos'));
    const index = videos.findIndex(video => String(video.id) === String(id));
    if (index < 0 || (videos[index].isActive === false && session?.role !== 'admin')) {
      return res.status(404).json({ error: 'Video tapılmadı' });
    }

    if (req.method === 'GET') {
      if (videos[index].isPremium && !access) return res.status(403).json({ error: 'Bu video Premium üzvlər üçündür' });
      return res.status(200).json(videos[index]);
    }

    const admin = requireAdmin(req, res);
    if (!admin) return;
    if (req.method === 'PUT') {
      videos[index] = { ...videos[index], ...req.body, id: videos[index].id, updatedAt: new Date().toISOString() };
      await redis.set('videos', JSON.stringify(videos), { ex: 86400 * 30 });
      return res.status(200).json(videos[index]);
    }
    videos.splice(index, 1);
    await redis.set('videos', JSON.stringify(videos), { ex: 86400 * 30 });
    return res.status(200).json({ ok: true });
  }

  if (!allowMethods(req, res, ['GET', 'POST'])) return;
  if (req.method === 'GET') {
    const videos = parseList(await redis.get('videos'));
    const category = String(req.query?.category || '').toLowerCase();
    const teacherId = String(req.query?.teacherId || '');
    const query = String(req.query?.q || '').toLowerCase();
    let filtered = videos.filter(video => session?.role === 'admin' || video.isActive !== false);
    if (category && category !== 'all') filtered = filtered.filter(video => String(video.category || '').toLowerCase() === category);
    if (teacherId) filtered = filtered.filter(video => String(video.teacherId || '') === teacherId);
    if (query) filtered = filtered.filter(video => `${video.title || ''} ${video.description || ''} ${video.teacherName || ''}`.toLowerCase().includes(query));
    const page = parseInt(req.query?.page, 10) || 1;
    const limit = Math.min(parseInt(req.query?.limit, 10) || 50, 100);
    return res.status(200).json(paginate(filtered.map(video => publicVideo(video, access)), page, limit));
  }

  const admin = requireAdmin(req, res);
  if (!admin) return;
  const body = req.body || {};
  if (!body.title?.trim() || !body.category?.trim()) {
    return res.status(400).json({ error: 'Video başlığı və mövzusu tələb olunur' });
  }
  const sourceUrl = body.source === 'youtube' ? body.youtubeUrl : body.videoUrl;
  if (!sourceUrl || !/^https:\/\//i.test(sourceUrl)) {
    return res.status(400).json({ error: 'Etibarlı HTTPS video ünvanı tələb olunur' });
  }

  const video = {
    id: genId(),
    title: body.title.trim(),
    category: body.category.trim(),
    description: String(body.description || '').trim(),
    teacherId: body.teacherId || '',
    teacherName: String(body.teacherName || ''),
    source: body.source === 'youtube' ? 'youtube' : 'upload',
    youtubeUrl: body.source === 'youtube' ? sourceUrl : '',
    videoUrl: body.source === 'youtube' ? '' : sourceUrl,
    thumbnailUrl: String(body.thumbnailUrl || ''),
    duration: String(body.duration || '00:00'),
    isPremium: Boolean(body.isPremium),
    isActive: body.isActive !== false,
    views: 0,
    createdAt: new Date().toISOString(),
    addedBy: admin.name,
  };
  const videos = parseList(await redis.get('videos'));
  videos.unshift(video);
  await redis.set('videos', JSON.stringify(videos), { ex: 86400 * 30 });
  return res.status(201).json(video);
};