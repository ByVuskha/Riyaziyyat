// GET    /api/pdfs/:id  — full PDF metadata (no fileData)
// DELETE /api/pdfs/:id  — delete (admin only)
const redis  = require('../_lib/redis');
const { requireAdmin, setCommonHeaders } = require('../_lib/auth');
const { allowMethods } = require('../_lib/helpers');

module.exports = async function handler(req, res) {
  setCommonHeaders(res);
  if (!allowMethods(req, res, ['GET', 'DELETE'])) return;

  const { id } = req.query;
  const raw    = await redis.get('pdfs');
  const pdfs   = Array.isArray(raw) ? raw : (raw ? JSON.parse(raw) : []);
  const idx    = pdfs.findIndex(p => String(p.id) === String(id));

  if (idx === -1) return res.status(404).json({ error: 'PDF tapılmadı' });

  if (req.method === 'GET') {
    // Strip fileData — client should use /download endpoint for the actual file
    const { fileData, ...meta } = pdfs[idx];
    return res.status(200).json(meta);
  }

  // DELETE — admin only
  const admin = requireAdmin(req, res);
  if (!admin) return;

  pdfs.splice(idx, 1);
  await redis.set('pdfs', JSON.stringify(pdfs), { ex: 86400 * 90 });
  return res.status(200).json({ ok: true });
};
