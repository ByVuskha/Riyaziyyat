// GET    /api/tests/:id  — single test
// PUT    /api/tests/:id  — update (admin)
// DELETE /api/tests/:id  — delete (admin)
const redis  = require('../_lib/redis');
const { requireAdmin, setCommonHeaders } = require('../_lib/auth');
const { allowMethods } = require('../_lib/helpers');

module.exports = async function handler(req, res) {
  setCommonHeaders(res);
  if (!allowMethods(req, res, ['GET', 'PUT', 'DELETE'])) return;

  const { id } = req.query;
  const raw    = await redis.get('tests');
  const tests  = Array.isArray(raw) ? raw : (raw ? JSON.parse(raw) : []);
  const idx    = tests.findIndex(t => String(t.id) === String(id));

  if (idx === -1) return res.status(404).json({ error: 'Sınaq tapılmadı' });

  if (req.method === 'GET') {
    return res.status(200).json(tests[idx]);
  }

  // PUT / DELETE require admin
  const admin = requireAdmin(req, res);
  if (!admin) return;

  if (req.method === 'PUT') {
    const updates = req.body || {};
    tests[idx] = { ...tests[idx], ...updates, id: tests[idx].id, updatedAt: new Date().toISOString() };
    await redis.set('tests', JSON.stringify(tests), { ex: 86400 * 30 });
    return res.status(200).json(tests[idx]);
  }

  if (req.method === 'DELETE') {
    tests.splice(idx, 1);
    await redis.set('tests', JSON.stringify(tests), { ex: 86400 * 30 });
    return res.status(200).json({ ok: true });
  }
};
