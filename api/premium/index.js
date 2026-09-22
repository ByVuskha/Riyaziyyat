// GET  /api/premium  — list requests (admin) or own (user)
// POST /api/premium  — user submits premium request
// PUT  /api/premium  — admin approves/rejects
const redis  = require('../_lib/redis');
const { requireAuth, setCommonHeaders } = require('../_lib/auth');
const { allowMethods, genId } = require('../_lib/helpers');

const PACKAGES = {
  monthly:    { name: '1 Aylıq Premium',  duration: 30,  price: 10 },
  halfYearly: { name: '6 Aylıq Premium',  duration: 180, price: 50 },
  yearly:     { name: '1 İllik Premium',  duration: 365, price: 100 },
};

module.exports = async function handler(req, res) {
  setCommonHeaders(res);
  if (!allowMethods(req, res, ['GET', 'POST', 'PUT'])) return;

  const session = requireAuth(req, res);
  if (!session) return;

  const raw  = await redis.get('premiumRequests');
  const reqs = Array.isArray(raw) ? raw : (raw ? JSON.parse(raw) : []);

  if (req.method === 'GET') {
    const filtered = session.role === 'admin'
      ? reqs
      : reqs.filter(r => String(r.userId) === String(session.id));
    return res.status(200).json(filtered);
  }

  if (req.method === 'POST') {
    const { packageType } = req.body || {};
    const pkg = PACKAGES[packageType];
    if (!pkg) return res.status(400).json({ error: 'Yanlış paket' });

    const existing = reqs.find(r => String(r.userId) === String(session.id) && r.status === 'pending');
    if (existing) return res.status(409).json({ error: 'Artıq gözləyən müraciətiniz var' });

    const newReq = {
      id:           genId(),
      userId:       session.id,
      userName:     session.name,
      userEmail:    session.email,
      packageType,
      packageName:  pkg.name,
      duration:     pkg.duration,
      price:        pkg.price,
      status:       'pending',
      requestedAt:  new Date().toISOString(),
    };
    reqs.unshift(newReq);
    await redis.set('premiumRequests', JSON.stringify(reqs), { ex: 86400 * 30 });
    return res.status(201).json(newReq);
  }

  if (req.method === 'PUT') {
    if (session.role !== 'admin') return res.status(403).json({ error: 'Admin icazəsi tələb olunur' });
    const { id, action } = req.body || {};
    const idx = reqs.findIndex(r => String(r.id) === String(id));
    if (idx === -1) return res.status(404).json({ error: 'Müraciət tapılmadı' });

    reqs[idx].status = action === 'approve' ? 'approved' : 'rejected';
    await redis.set('premiumRequests', JSON.stringify(reqs), { ex: 86400 * 30 });

    if (action === 'approve') {
      const uRaw  = await redis.get('allUsers');
      const users = Array.isArray(uRaw) ? uRaw : (uRaw ? JSON.parse(uRaw) : []);
      const uIdx  = users.findIndex(u => String(u.id) === String(reqs[idx].userId));
      if (uIdx !== -1) {
        const expires = new Date();
        expires.setDate(expires.getDate() + reqs[idx].duration);
        users[uIdx].premium           = true;
        users[uIdx].premiumActivatedAt = new Date().toISOString();
        users[uIdx].premiumExpiresAt   = expires.toISOString();
        await redis.set('allUsers', JSON.stringify(users), { ex: 86400 * 30 });
      }
    }
    return res.status(200).json(reqs[idx]);
  }
};
