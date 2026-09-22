// GET  /api/pdfs   — list PDFs (public metadata, no fileData)
// POST /api/pdfs   — upload PDF (admin only)
const redis  = require('../_lib/redis');
const { requireAdmin, getUserFromRequest, setCommonHeaders } = require('../_lib/auth');
const { allowMethods, genId, paginate } = require('../_lib/helpers');

module.exports = async function handler(req, res) {
  setCommonHeaders(res);
  if (!allowMethods(req, res, ['GET', 'POST'])) return;

  if (req.method === 'GET') {
    const raw  = await redis.get('pdfs');
    const pdfs = Array.isArray(raw) ? raw : (raw ? JSON.parse(raw) : []);

    const cat  = req.query?.category || '';
    const type = req.query?.type || '';
    const page = parseInt(req.query?.page)  || 1;
    const lim  = parseInt(req.query?.limit) || 50;

    let filtered = pdfs;
    if (cat)  filtered = filtered.filter(p => p.category === cat);
    if (type) filtered = filtered.filter(p => p.type     === type);

    // Strip base64 fileData from listing — only include in download endpoint
    const safe = filtered.map(({ fileData, ...meta }) => meta);
    return res.status(200).json(paginate(safe, page, lim));
  }

  // POST — admin only
  const admin = requireAdmin(req, res);
  if (!admin) return;

  const { title, category, type, price, pages, description, fileName, fileSizeLabel, fileData } = req.body || {};
  if (!title || !fileData) {
    return res.status(400).json({ error: 'Başlıq və fayl tələb olunur' });
  }

  const raw  = await redis.get('pdfs');
  const pdfs = Array.isArray(raw) ? raw : (raw ? JSON.parse(raw) : []);

  const newPdf = {
    id:           genId(),
    title:        title.trim(),
    category:     category || 'Digər',
    type:         type === 'paid' ? 'paid' : 'free',
    price:        type === 'paid' ? Number(price) || 0 : 0,
    pages:        Number(pages) || null,
    description:  description || '',
    fileName:     fileName || 'document.pdf',
    fileSizeLabel: fileSizeLabel || '',
    fileData:     fileData,   // base64 data URL
    downloads:    0,
    addedBy:      admin.name,
    createdAt:    new Date().toISOString(),
  };

  pdfs.unshift(newPdf);
  await redis.set('pdfs', JSON.stringify(pdfs), { ex: 86400 * 90 });
  const { fileData: _, ...meta } = newPdf;
  return res.status(201).json(meta);
};
