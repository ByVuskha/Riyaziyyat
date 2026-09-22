// GET /api/pdfs/:id/download
// Free PDFs: anyone can download
// Paid PDFs: only users with an approved pdfDownloadRequest
const redis  = require('../../_lib/redis');
const { getUserFromRequest, setCommonHeaders } = require('../../_lib/auth');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id } = req.query;
  const raw    = await redis.get('pdfs');
  const pdfs   = Array.isArray(raw) ? raw : (raw ? JSON.parse(raw) : []);
  const pdf    = pdfs.find(p => String(p.id) === String(id));

  if (!pdf) return res.status(404).json({ error: 'PDF tapılmadı' });
  if (!pdf.fileData) return res.status(404).json({ error: 'Fayl mövcud deyil' });

  const session = getUserFromRequest(req);

  // Paid PDFs: check approval
  if (pdf.type === 'paid') {
    if (!session) {
      return res.status(401).json({ error: 'Giriş tələb olunur' });
    }
    if (session.role !== 'admin') {
      const reqsRaw = await redis.get('pdfDownloadRequests');
      const reqs    = Array.isArray(reqsRaw) ? reqsRaw : (reqsRaw ? JSON.parse(reqsRaw) : []);
      const approved = reqs.find(r =>
        String(r.userId) === String(session.id) &&
        String(r.pdfId)  === String(id) &&
        r.status === 'approved'
      );
      if (!approved) {
        return res.status(403).json({ error: 'Bu PDF üçün ödənişiniz təsdiqlənməyib' });
      }
    }
  }

  // Increment download counter
  const pdfIdx = pdfs.findIndex(p => String(p.id) === String(id));
  if (pdfIdx !== -1) {
    pdfs[pdfIdx].downloads = (pdfs[pdfIdx].downloads || 0) + 1;
    await redis.set('pdfs', JSON.stringify(pdfs), { ex: 86400 * 90 });
  }

  // Stream as PDF download
  const base64 = pdf.fileData.replace(/^data:application\/pdf;base64,/, '');
  const buffer = Buffer.from(base64, 'base64');

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${pdf.fileName || 'document.pdf'}"`);
  res.setHeader('Content-Length', buffer.length);
  return res.send(buffer);
};
