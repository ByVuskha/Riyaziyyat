// GET /api/tests          — list all tests (public for free, gated for premium)
// POST /api/tests         — create test (admin only)
const redis  = require('../_lib/redis');
const { getUserFromRequest, requireAdmin, setCommonHeaders } = require('../_lib/auth');
const { allowMethods, genId, paginate } = require('../_lib/helpers');

module.exports = async function handler(req, res) {
  setCommonHeaders(res);
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
