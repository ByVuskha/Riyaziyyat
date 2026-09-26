// GET  /api/premium  — list requests (admin) or own (user)
// POST /api/premium  — user submits premium request
// PUT  /api/premium  — admin approves/rejects
const redis  = require('../../lib/redis');
const { requireAuth, setCommonHeaders } = require('../../lib/auth');
const { allowMethods, genId } = require('../../lib/helpers');

const PACKAGES = {
  premium1:   { name: 'Premium 1', duration: 30,  price: 15 },
  premium6:   { name: 'Premium 6', duration: 180, price: 75 },
  premium12:  { name: 'Premium 12', duration: 365, price: 120 },
  monthly:    { name: 'Premium 1', duration: 30,  price: 15 },
  halfYearly: { name: 'Premium 6', duration: 180, price: 75 },
  yearly:     { name: 'Premium 12', duration: 365, price: 120 },
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
    const uRaw = await redis.get('allUsers');
    const users = Array.isArray(uRaw) ? uRaw : (uRaw ? JSON.parse(uRaw) : []);
    const userIndex = users.findIndex(user => String(user.id) === String(session.id));
    if (userIndex >= 0) {
      users[userIndex].premiumRequestedAt = newReq.requestedAt;
      users[userIndex].requestedPlan = packageType;
      await redis.set('allUsers', JSON.stringify(users), { ex: 86400 * 30 });
    }
    return res.status(201).json(newReq);
  }

  if (req.method === 'PUT') {
    if (session.role !== 'admin') return res.status(403).json({ error: 'Admin icazəsi tələb olunur' });
    const { id, action } = req.body || {};
    const idx = reqs.findIndex(r => String(r.id) === String(id));
    if (idx === -1) return res.status(404).json({ error: 'Müraciət tapılmadı' });

    reqs[idx].status = action === 'approve' ? 'approved' : 'rejected';
    await redis.set('premiumRequests', JSON.stringify(reqs), { ex: 86400 * 30 });

    const uRaw = await redis.get('allUsers');
    const users = Array.isArray(uRaw) ? uRaw : (uRaw ? JSON.parse(uRaw) : []);
    const uIdx = users.findIndex(u => String(u.id) === String(reqs[idx].userId));
    if (uIdx !== -1) {
      delete users[uIdx].premiumRequestedAt;
      delete users[uIdx].requestedPlan;
      if (action === 'approve') {
        const expires = new Date();
        expires.setDate(expires.getDate() + reqs[idx].duration);
        users[uIdx].premium           = true;
        users[uIdx].premiumActivatedAt = new Date().toISOString();
        users[uIdx].premiumExpiresAt   = expires.toISOString();
      }
      await redis.set('allUsers', JSON.stringify(users), { ex: 86400 * 30 });
    }
    return res.status(200).json(reqs[idx]);
  }
};
