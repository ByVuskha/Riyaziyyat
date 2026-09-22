// GET  /api/pdf-requests               — admin: all, user: own
// POST /api/pdf-requests               — user submits purchase request
// PUT  /api/pdf-requests?action=approve|reject&id=  — admin approves/rejects
const redis  = require('../_lib/redis');
const { requireAuth, setCommonHeaders } = require('../_lib/auth');
const { allowMethods, genId } = require('../_lib/helpers');

module.exports = async function handler(req, res) {
  setCommonHeaders(res);
  if (!allowMethods(req, res, ['GET', 'POST', 'PUT'])) return;

  const session = requireAuth(req, res);
  if (!session) return;

  const raw  = await redis.get('pdfDownloadRequests');
  const reqs = Array.isArray(raw) ? raw : (raw ? JSON.parse(raw) : []);

  if (req.method === 'GET') {
    const filtered = session.role === 'admin'
      ? reqs
      : reqs.filter(r => String(r.userId) === String(session.id));
    const status = req.query?.status || '';
    return res.status(200).json(status ? filtered.filter(r => r.status === status) : filtered);
  }

  if (req.method === 'POST') {
    const { pdfId, pdfTitle, amount } = req.body || {};
    if (!pdfId) return res.status(400).json({ error: 'PDF ID tələb olunur' });

    // Check balance
    const uRaw  = await redis.get('allUsers');
    const users = Array.isArray(uRaw) ? uRaw : (uRaw ? JSON.parse(uRaw) : []);
    const uIdx  = users.findIndex(u => String(u.id) === String(session.id));
    if (uIdx === -1) return res.status(404).json({ error: 'İstifadəçi tapılmadı' });
    if ((users[uIdx].balance || 0) < Number(amount)) {
      return res.status(400).json({ error: 'Balansınız kifayət etmir' });
    }

    // Deduct balance
    users[uIdx].balance = (users[uIdx].balance || 0) - Number(amount);
    await redis.set('allUsers', JSON.stringify(users), { ex: 86400 * 30 });

    const newReq = {
      id:          genId(),
      userId:      session.id,
      userName:    session.name,
      userEmail:   session.email,
      pdfId, pdfTitle,
      amount:      Number(amount),
      status:      'pending',
      requestedAt: new Date().toISOString(),
    };
    reqs.unshift(newReq);
    await redis.set('pdfDownloadRequests', JSON.stringify(reqs), { ex: 86400 * 30 });
    return res.status(201).json(newReq);
  }

  if (req.method === 'PUT') {
    if (session.role !== 'admin') return res.status(403).json({ error: 'Admin icazəsi tələb olunur' });
    const { id, action } = req.body || {};
    const idx = reqs.findIndex(r => String(r.id) === String(id));
    if (idx === -1) return res.status(404).json({ error: 'Müraciət tapılmadı' });

    reqs[idx].status = action === 'approve' ? 'approved' : 'rejected';
    reqs[idx][action === 'approve' ? 'approvedAt' : 'rejectedAt'] = new Date().toISOString();
    await redis.set('pdfDownloadRequests', JSON.stringify(reqs), { ex: 86400 * 30 });

    // If rejected, refund the balance
    if (action === 'reject') {
      const uRaw  = await redis.get('allUsers');
      const users = Array.isArray(uRaw) ? uRaw : (uRaw ? JSON.parse(uRaw) : []);
      const uIdx  = users.findIndex(u => String(u.id) === String(reqs[idx].userId));
      if (uIdx !== -1) {
        users[uIdx].balance = (users[uIdx].balance || 0) + (reqs[idx].amount || 0);
        await redis.set('allUsers', JSON.stringify(users), { ex: 86400 * 30 });
      }
    }

    return res.status(200).json(reqs[idx]);
  }
};
