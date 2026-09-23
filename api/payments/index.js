// GET  /api/payments  — list payments (admin) or own (user)
// POST /api/payments  — record a payment
const redis  = require('../_lib/redis');
const { requireAuth, setCommonHeaders } = require('../_lib/auth');
const { allowMethods, genId, paginate } = require('../_lib/helpers');

module.exports = async function handler(req, res) {
  setCommonHeaders(res);
  if (!allowMethods(req, res, ['GET', 'POST'])) return;

  const session = requireAuth(req, res);
  if (!session) return;

  const raw  = await redis.get('payments');
  const pays = Array.isArray(raw) ? raw : (raw ? JSON.parse(raw) : []);

  if (req.method === 'GET') {
    const filtered = session.role === 'admin'
      ? pays
      : pays.filter(p => String(p.userId) === String(session.id));
    const page  = parseInt(req.query?.page)  || 1;
    const limit = parseInt(req.query?.limit) || 50;
    return res.status(200).json(paginate(filtered, page, limit));
  }

  // POST — record a new payment + update user balance
  const { amount, method = 'Kart', plan = 'custom' } = req.body || {};
  if (!amount || Number(amount) < 5) {
    return res.status(400).json({ error: 'Minimum ödəniş 5 ₼-dir' });
  }

  // Update user balance in allUsers
  const uRaw  = await redis.get('allUsers');
  const users = Array.isArray(uRaw) ? uRaw : (uRaw ? JSON.parse(uRaw) : []);
  const uIdx  = users.findIndex(u => String(u.id) === String(session.id));
  let newBalance = 0;
  if (uIdx !== -1) {
    users[uIdx].balance = (users[uIdx].balance || 0) + Number(amount);
    newBalance = users[uIdx].balance;
    await redis.set('allUsers', JSON.stringify(users), { ex: 86400 * 30 });
  }

  // Record payment
  const payment = {
    id:        genId(),
    userId:    session.id,
    user:      session.name,
    userEmail: session.email,
    amount:    Number(amount),
    method,
    plan,
    status:    'completed',
    date:      new Date().toLocaleDateString('az-AZ'),
    time:      new Date().toLocaleTimeString('az-AZ'),
    createdAt: new Date().toISOString(),
  };
  pays.unshift(payment);
  await redis.set('payments', JSON.stringify(pays), { ex: 86400 * 90 });

  return res.status(201).json({ payment, newBalance });
};
