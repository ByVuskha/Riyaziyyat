// Collection and ID-based test operations share one serverless function.
const redis  = require('../../lib/redis');
const { getUserFromRequest, requireAdmin, setCommonHeaders } = require('../../lib/auth');
const { allowMethods, genId, paginate } = require('../../lib/helpers');
const { validateQuestions, validateCurriculum } = require('../../lib/test-validation');

async function hasPremiumAccess(session) {
  if (!session) return false;
  if (session.role === 'admin') return true;
  const rawUsers = await redis.get('allUsers');
  const users = Array.isArray(rawUsers) ? rawUsers : (rawUsers ? JSON.parse(rawUsers) : []);
  const user = users.find(item => String(item.id) === String(session.id));
  return Boolean(user?.premium && (!user.premiumExpiresAt || new Date(user.premiumExpiresAt) > new Date()));
}

module.exports = async function handler(req, res) {
  setCommonHeaders(res);
  const { id } = req.query || {};

  if (id) {
    if (!allowMethods(req, res, ['GET', 'PUT', 'DELETE'])) return;
    const raw = await redis.get('tests');
    const tests = Array.isArray(raw) ? raw : (raw ? JSON.parse(raw) : []);
    const idx = tests.findIndex(test => String(test.id) === String(id));
    if (idx === -1) return res.status(404).json({ error: 'Sınaq tapılmadı' });

    if (req.method === 'GET') {
      const session = getUserFromRequest(req);
      const premiumActive = await hasPremiumAccess(session);
      if (tests[idx].isPremium && !premiumActive) {
        return res.status(403).json({ error: 'Bu sınaq Premium üzvlər üçündür' });
      }
      if (session?.role === 'admin') return res.status(200).json(tests[idx]);
      const { questions = [], ...test } = tests[idx];
      return res.status(200).json({
        ...test,
        questions: questions.map(({ correctAnswer, answerTolerance, explanation, explanationVideo, ...question }) => question),
      });
    }
    const admin = requireAdmin(req, res);
    if (!admin) return;

    if (req.method === 'PUT') {
      if (req.body?.questions) {
        const questionError = validateQuestions(req.body.questions);
        if (questionError) return res.status(400).json({ error: questionError });
      }
      if (req.body?.grade !== undefined || req.body?.topic !== undefined) {
        const curriculumError = validateCurriculum(req.body.grade ?? tests[idx].grade, req.body.topic ?? tests[idx].topic ?? tests[idx].category);
        if (curriculumError) return res.status(400).json({ error: curriculumError });
      }
      tests[idx] = { ...tests[idx], ...req.body, id: tests[idx].id, updatedAt: new Date().toISOString() };
      await redis.set('tests', JSON.stringify(tests), { ex: 86400 * 30 });
      return res.status(200).json(tests[idx]);
    }

    tests.splice(idx, 1);
    await redis.set('tests', JSON.stringify(tests), { ex: 86400 * 30 });
    return res.status(200).json({ ok: true });
  }

  if (!allowMethods(req, res, ['GET', 'POST'])) return;

  // ── GET — list tests ──────────────────────────────────────────────────────
  if (req.method === 'GET') {
    const raw   = await redis.get('tests');
    const tests = Array.isArray(raw) ? raw : (raw ? JSON.parse(raw) : []);

    const session = getUserFromRequest(req);
    const premiumActive = await hasPremiumAccess(session);
    const page    = parseInt(req.query?.page)  || 1;
    const limit   = parseInt(req.query?.limit) || 50;
    const cat     = req.query?.category || '';

    let filtered = tests;
    if (cat) filtered = filtered.filter(t => t.category === cat);
    const gradeFilter = String(req.query?.grade || '');
    const topicFilter = String(req.query?.topic || '');
    if (gradeFilter) filtered = filtered.filter(test => String(test.grade || '') === gradeFilter);
    if (topicFilter) filtered = filtered.filter(test => String(test.topic || '') === topicFilter);

    const safeTests = filtered.map(t => {
      return {
        id:          t.id,
        title:       t.title,
        emoji:       t.emoji || '📝',
        category:    t.category || 'Ümumi',
        grade:       t.grade || '',
        topic:       t.topic || '',
        difficulty:  t.difficulty || 'Orta',
        duration:    t.duration,
        isPremium:   t.isPremium || false,
        description: t.description || '',
        questionCount: (t.questions || []).length,
        attempts:    t.attempts || 0,
        uniqueUsers: (t.uniqueUsers || []).length,
        createdAt:   t.createdAt,
      };
    });

    return res.status(200).json(paginate(safeTests, page, limit));
  }

  // ── POST — create test (admin only) ──────────────────────────────────────
  const admin = requireAdmin(req, res);
  if (!admin) return;

  const { title, category, difficulty, duration, isPremium, description, questions, emoji } = req.body || {};
  const grade = String(req.body?.grade || '').trim();
  const topic = String(req.body?.topic || '').trim().slice(0, 100);
  if (!String(title || '').trim() || String(title).trim().length > 160) {
    return res.status(400).json({ error: 'Başlıq və ən azı 1 sual tələb olunur' });
  }
  const curriculumError = validateCurriculum(grade, topic);
  if (curriculumError) return res.status(400).json({ error: curriculumError });
  const questionError = validateQuestions(questions);
  if (questionError) return res.status(400).json({ error: questionError });

  const raw   = await redis.get('tests');
  const tests = Array.isArray(raw) ? raw : (raw ? JSON.parse(raw) : []);

  const newTest = {
    id:          genId(),
    title:       title.trim(),
    emoji:       emoji || '📝',
    category:    category || 'Ümumi',
    grade,
    topic,
    difficulty:  difficulty || 'Orta',
    duration:    Number(duration) || 30,
    isPremium:   Boolean(isPremium),
    description: description || '',
    questions:   questions,
    createdAt:   new Date().toISOString(),
    addedBy:     admin.name,
  };

  tests.unshift(newTest);
  await redis.set('tests', JSON.stringify(tests), { ex: 86400 * 30 });

  return res.status(201).json(newTest);
};
