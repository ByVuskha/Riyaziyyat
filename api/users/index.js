// GET /api/users — list users; /api/users/:id — read, update, or delete one user
const bcrypt = require('bcryptjs');
const redis  = require('../../lib/redis');
const { getUserFromRequest, requireAdmin, setCommonHeaders } = require('../../lib/auth');
const { allowMethods, sanitizeUser, paginate } = require('../../lib/helpers');

module.exports = async function handler(req, res) {
  setCommonHeaders(res);

  const { id } = req.query || {};
  if (!id) {
    if (!allowMethods(req, res, ['GET'])) return;
    const admin = requireAdmin(req, res);
    if (!admin) return;

    const raw   = await redis.get('allUsers');
    const users = Array.isArray(raw) ? raw : (raw ? JSON.parse(raw) : []);

    const page  = parseInt(req.query?.page)  || 1;
    const limit = parseInt(req.query?.limit) || 50;
    const q     = (req.query?.q || '').toLowerCase();

    let filtered = users;
    if (q) {
      filtered = users.filter(u =>
        u.name?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q)
      );
    }

    return res.status(200).json(paginate(filtered.map(sanitizeUser), page, limit));
  }

  if (!allowMethods(req, res, ['GET', 'PUT', 'DELETE'])) return;

  const session = getUserFromRequest(req);
  if (!session) return res.status(401).json({ error: 'Giriş tələb olunur' });

  const raw   = await redis.get('allUsers');
  const users = Array.isArray(raw) ? raw : (raw ? JSON.parse(raw) : []);
  const idx   = users.findIndex(user => String(user.id) === String(id));
  if (idx === -1) return res.status(404).json({ error: 'İstifadəçi tapılmadı' });

  if (session.id !== users[idx].id && session.role !== 'admin') {
    return res.status(403).json({ error: 'İcazəniz yoxdur' });
  }

  if (req.method === 'GET') return res.status(200).json(sanitizeUser(users[idx]));

  if (req.method === 'PUT') {
    const { name, password, currentPassword, balance, role, premium, premiumExpiresAt,
      frozen, canAddTests, userType, phone, bio, profilePicture, testAccessRequested,
      testAccessRequestedAt, teacherTitle, subjects, experience, publicProfile, publicEmail } = req.body || {};

    if (session.role !== 'admin') {
      if (name) users[idx].name = name.trim();
      if (phone) users[idx].phone = phone;
      if (bio) users[idx].bio = bio;
      if (profilePicture) users[idx].profilePicture = profilePicture;
      if (users[idx].userType === 'teacher') {
        if (teacherTitle !== undefined) users[idx].teacherTitle = String(teacherTitle).slice(0, 120);
        if (subjects !== undefined) users[idx].subjects = String(subjects).slice(0, 300);
        if (experience !== undefined) users[idx].experience = Math.max(0, Number(experience) || 0);
        if (publicProfile !== undefined) users[idx].publicProfile = Boolean(publicProfile);
        if (publicEmail !== undefined) users[idx].publicEmail = Boolean(publicEmail);
      }
      if (testAccessRequested === true) {
        users[idx].testAccessRequested = true;
        users[idx].testAccessRequestedAt = testAccessRequestedAt || new Date().toISOString();
      }
      if (password) {
        if (password.length < 6) return res.status(400).json({ error: 'Yeni şifrə minimum 6 simvol olmalıdır' });
        if (!currentPassword || !await bcrypt.compare(currentPassword, users[idx].password)) {
          return res.status(400).json({ error: 'Köhnə şifrə yanlışdır' });
        }
        users[idx].password = await bcrypt.hash(password, 12);
      }
    } else {
      if (name) users[idx].name = name.trim();
      if (phone !== undefined) users[idx].phone = phone;
      if (bio !== undefined) users[idx].bio = bio;
      if (userType !== undefined) users[idx].userType = userType;
      if (balance !== undefined) users[idx].balance = Number(balance);
      if (role !== undefined) users[idx].role = role;
      if (premium !== undefined) users[idx].premium = Boolean(premium);
      if (premiumExpiresAt !== undefined) users[idx].premiumExpiresAt = premiumExpiresAt;
      if (frozen !== undefined) users[idx].frozen = Boolean(frozen);
      if (canAddTests !== undefined) users[idx].canAddTests = Boolean(canAddTests);
      if (testAccessRequested !== undefined) users[idx].testAccessRequested = Boolean(testAccessRequested);
      if (testAccessRequestedAt !== undefined) users[idx].testAccessRequestedAt = testAccessRequestedAt;
      if (password && password.length >= 6) users[idx].password = await bcrypt.hash(password, 12);
    }

    users[idx].updatedAt = new Date().toISOString();
    await redis.set('allUsers', JSON.stringify(users), { ex: 86400 * 30 });
    return res.status(200).json(sanitizeUser(users[idx]));
  }

  if (session.role !== 'admin') return res.status(403).json({ error: 'Admin icazəsi tələb olunur' });
  users.splice(idx, 1);
  await redis.set('allUsers', JSON.stringify(users), { ex: 86400 * 30 });
  return res.status(200).json({ ok: true });
};
