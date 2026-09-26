// GET  /api/teacher-tests        — list (admin: all, teacher: own)
// POST /api/teacher-tests        — submit test for review (teacher)
// PUT  /api/teacher-tests?action=approve|reject&id=  (admin)
const redis  = require('../../lib/redis');
const { requireAuth, getUserFromRequest, setCommonHeaders } = require('../../lib/auth');
const { allowMethods, genId } = require('../../lib/helpers');

module.exports = async function handler(req, res) {
  setCommonHeaders(res);
  if (!allowMethods(req, res, ['GET', 'POST', 'PUT'])) return;

  const session = requireAuth(req, res);
  if (!session) return;

  const raw   = await redis.get('teacherTests');
  const items = Array.isArray(raw) ? raw : (raw ? JSON.parse(raw) : []);

  if (req.method === 'GET') {
    const status = req.query?.status || '';
    let filtered = session.role === 'admin'
      ? items
      : items.filter(t => String(t.teacherId) === String(session.id));
    if (status) filtered = filtered.filter(t => t.status === status);
    return res.status(200).json(filtered);
  }

  if (req.method === 'POST') {
    const { title, emoji, difficulty, duration, isPremium, description, questions } = req.body || {};
    if (!title || !questions?.length) {
      return res.status(400).json({ error: 'Başlıq və suallar tələb olunur' });
    }
    const newItem = {
      id:           genId(),
      teacherId:    session.id,
      teacherName:  session.name,
      teacherEmail: session.email,
      title, emoji: emoji || '📝', difficulty: difficulty || 'Orta',
      duration: Number(duration) || 15,
      isPremium: Boolean(isPremium),
      description: description || '',
      questions,
      submittedAt: new Date().toISOString(),
      status: 'pending',
    };
    items.unshift(newItem);
    await redis.set('teacherTests', JSON.stringify(items), { ex: 86400 * 30 });
    return res.status(201).json(newItem);
  }

  if (req.method === 'PUT') {
    if (session.role !== 'admin') return res.status(403).json({ error: 'Admin icazəsi tələb olunur' });
    const { id, action, adminNote } = req.body || {};
    const idx = items.findIndex(t => String(t.id) === String(id));
    if (idx === -1) return res.status(404).json({ error: 'Tapılmadı' });

    items[idx].status = action === 'approve' ? 'approved' : 'rejected';
    items[idx][action === 'approve' ? 'approvedAt' : 'rejectedAt'] = new Date().toISOString();
    if (adminNote) items[idx].adminNote = adminNote;
    await redis.set('teacherTests', JSON.stringify(items), { ex: 86400 * 30 });

    // If approved, publish to main tests
    if (action === 'approve') {
      const tRaw   = await redis.get('tests');
      const tests  = Array.isArray(tRaw) ? tRaw : (tRaw ? JSON.parse(tRaw) : []);
      const t      = items[idx];
      tests.unshift({
        id:          genId(),
        title:       t.title, emoji: t.emoji, difficulty: t.difficulty,
        duration:    t.duration, isPremium: t.isPremium, description: t.description,
        questions:   t.questions,
        teacherId:   t.teacherId, teacherName: t.teacherName,
        source:      'teacher', createdAt: new Date().toISOString(),
      });
      await redis.set('tests', JSON.stringify(tests), { ex: 86400 * 30 });
    }

    return res.status(200).json(items[idx]);
  }
};
