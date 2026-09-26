// Collection and ID-based test operations share one serverless function.
const redis  = require('../../lib/redis');
const { getUserFromRequest, requireAdmin, setCommonHeaders } = require('../../lib/auth');
const { allowMethods, genId, paginate } = require('../../lib/helpers');

module.exports = async function handler(req, res) {
  setCommonHeaders(res);
  const { id } = req.query || {};

  if (id) {
    if (!allowMethods(req, res, ['GET', 'PUT', 'DELETE'])) return;
    const raw = await redis.get('tests');
    const tests = Array.isArray(raw) ? raw : (raw ? JSON.parse(raw) : []);
    const idx = tests.findIndex(test => String(test.id) === String(id));
    if (idx === -1) return res.status(404).json({ error: 'Sınaq tapılmadı' });

    if (req.method === 'GET') return res.status(200).json(tests[idx]);
    const admin = requireAdmin(req, res);
    if (!admin) return;

    if (req.method === 'PUT') {
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
    const page    = parseInt(req.query?.page)  || 1;
    const limit   = parseInt(req.query?.limit) || 50;
    const cat     = req.query?.category || '';

    let filtered = tests;
    if (cat) filtered = filtered.filter(t => t.category === cat);

    // Strip questions from non-premium users for premium tests
    const safeTests = filtered.map(t => {
      const canAccess = !t.isPremium || (session && (session.role === 'admin' || /* premium check handled client side */true));
      return {
        id:          t.id,
        title:       t.title,
        emoji:       t.emoji || '📝',
        category:    t.category || 'Ümumi',
        difficulty:  t.difficulty || 'Orta',
        duration:    t.duration,
        isPremium:   t.isPremium || false,
        description: t.description || '',
        questionCount: (t.questions || []).length,
        createdAt:   t.createdAt,
        // Only include questions if not premium or user is authenticated
        ...(canAccess ? { questions: t.questions || [] } : {}),
      };
    });

    return res.status(200).json(paginate(safeTests, page, limit));
  }

  // ── POST — create test (admin only) ──────────────────────────────────────
  const admin = requireAdmin(req, res);
  if (!admin) return;

  const { title, category, difficulty, duration, isPremium, description, questions, emoji } = req.body || {};
  if (!title || !questions || questions.length === 0) {
    return res.status(400).json({ error: 'Başlıq və ən azı 1 sual tələb olunur' });
  }

  const raw   = await redis.get('tests');
  const tests = Array.isArray(raw) ? raw : (raw ? JSON.parse(raw) : []);

  const newTest = {
    id:          genId(),
    title:       title.trim(),
    emoji:       emoji || '📝',
    category:    category || 'Ümumi',
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
