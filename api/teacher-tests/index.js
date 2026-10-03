// GET  /api/teacher-tests        — list (admin: all, teacher: own)
// POST /api/teacher-tests        — submit test for review (teacher)
// PUT  /api/teacher-tests?action=approve|reject&id=  (admin)
const redis  = require('../../lib/redis');
const { requireAuth, getUserFromRequest, setCommonHeaders } = require('../../lib/auth');
const { allowMethods, genId } = require('../../lib/helpers');
const { validateQuestions, validateCurriculum } = require('../../lib/test-validation');

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
    const grade = String(req.body?.grade || '').trim();
    const topic = String(req.body?.topic || '').trim().slice(0, 100);
    if (session.role !== 'admin') {
      const rawUsers = await redis.get('allUsers');
      const users = Array.isArray(rawUsers) ? rawUsers : (rawUsers ? JSON.parse(rawUsers) : []);
      const teacher = users.find(user => String(user.id) === String(session.id));
      if (!teacher || teacher.userType !== 'teacher' || teacher.canAddTests !== true) {
        return res.status(403).json({ error: 'Admin tərəfindən verilən sınaq əlavəetmə icazəsi tələb olunur' });
      }
    }
    if (!String(title || '').trim() || String(title).trim().length > 160) {
      return res.status(400).json({ error: 'Sınağın adı tələb olunur (ən çox 160 simvol)' });
    }
    const curriculumError = validateCurriculum(grade, topic);
    if (curriculumError) return res.status(400).json({ error: curriculumError });
    const questionError = validateQuestions(questions);
    if (questionError) return res.status(400).json({ error: questionError });
    const newItem = {
      id:           genId(),
      teacherId:    session.id,
      teacherName:  session.name,
      teacherEmail: session.email,
      title, emoji: emoji || '📝', difficulty: difficulty || 'Orta',
      duration: Number(duration) || 15,
      isPremium: Boolean(isPremium),
      description: description || '',
      grade,
      topic,
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
    if (!['approve', 'reject'].includes(action)) return res.status(400).json({ error: 'Təsdiq və ya rədd əməliyyatı seçilməlidir' });
    const idx = items.findIndex(t => String(t.id) === String(id));
    if (idx === -1) return res.status(404).json({ error: 'Tapılmadı' });
    if (items[idx].status !== 'pending') return res.status(409).json({ error: 'Bu sınaq artıq nəzərdən keçirilib' });

    items[idx].status = action === 'approve' ? 'approved' : 'rejected';
    items[idx][action === 'approve' ? 'approvedAt' : 'rejectedAt'] = new Date().toISOString();
    if (adminNote) items[idx].adminNote = adminNote;
    await redis.set('teacherTests', JSON.stringify(items), { ex: 86400 * 30 });

    // If approved, publish to main tests
    if (action === 'approve') {
      const tRaw   = await redis.get('tests');
      const tests  = Array.isArray(tRaw) ? tRaw : (tRaw ? JSON.parse(tRaw) : []);
      const t      = items[idx];
      const questionError = validateQuestions(t.questions);
      const curriculumError = validateCurriculum(t.grade, t.topic);
      if (questionError || curriculumError) {
        items[idx].status = 'pending';
        delete items[idx].approvedAt;
        await redis.set('teacherTests', JSON.stringify(items), { ex: 86400 * 30 });
        return res.status(400).json({ error: questionError || curriculumError });
      }
      tests.unshift({
        id:          genId(),
        title:       t.title, emoji: t.emoji, difficulty: t.difficulty,
        duration:    t.duration, isPremium: t.isPremium, description: t.description,
        grade: t.grade, topic: t.topic, category: t.topic,
        questions:   t.questions,
        teacherId:   t.teacherId, teacherName: t.teacherName,
        source:      'teacher', createdAt: new Date().toISOString(),
      });
      await redis.set('tests', JSON.stringify(tests), { ex: 86400 * 30 });
    }

    return res.status(200).json(items[idx]);
  }
};
