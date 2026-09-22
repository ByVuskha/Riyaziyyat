// POST /api/auth/register
const bcrypt = require('bcryptjs');
const redis  = require('../_lib/redis');
const { signToken, buildCookieHeader, setCommonHeaders } = require('../_lib/auth');
const { genId, sanitizeUser } = require('../_lib/helpers');

module.exports = async function handler(req, res) {
  setCommonHeaders(res);
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { name, email, password, userType = 'student' } = req.body || {};

  // ── Validation ───────────────────────────────────────────────────────────
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Ad, email və şifrə tələb olunur' });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Email düzgün deyil' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Şifrə minimum 6 simvol olmalıdır' });
  }

  const normalizedEmail = email.toLowerCase().trim();

  // ── Check duplicate ──────────────────────────────────────────────────────
  const existing = await redis.get('allUsers');
  const users = Array.isArray(existing) ? existing : (existing ? JSON.parse(existing) : []);

  if (users.find(u => u.email === normalizedEmail)) {
    return res.status(409).json({ error: 'Bu email artıq qeydiyyatdadır' });
  }

  // ── Hash password ────────────────────────────────────────────────────────
  const hashedPassword = await bcrypt.hash(password, 12);

  // ── Create user ──────────────────────────────────────────────────────────
  const newUser = {
    id:           genId(),
    name:         name.trim(),
    email:        normalizedEmail,
    password:     hashedPassword,
    role:         'user',
    userType:     userType, // 'student' | 'teacher'
    premium:      false,
    balance:      0,
    demoTests:    3,
    canAddTests:  false,
    frozen:       false,
    emailVerified:true,
    registeredAt: new Date().toISOString(),
  };

  users.push(newUser);
  await redis.set('allUsers', JSON.stringify(users), { ex: 86400 * 30 });

  // If teacher, add to teachers list
  if (userType === 'teacher') {
    const teacherList = await redis.get('teachers');
    const teachers = Array.isArray(teacherList) ? teacherList : (teacherList ? JSON.parse(teacherList) : []);
    teachers.push({
      id:         newUser.id,
      userId:     newUser.id,
      name:       newUser.name,
      email:      normalizedEmail,
      title:      'Müəllim',
      subjects:   '',
      experience: 0,
      rating:     5.0,
      students:   0,
      createdAt:  newUser.registeredAt,
    });
    await redis.set('teachers', JSON.stringify(teachers), { ex: 86400 * 30 });
  }

  // ── Issue JWT ────────────────────────────────────────────────────────────
  const token = signToken({
    id:    newUser.id,
    email: newUser.email,
    role:  newUser.role,
    name:  newUser.name,
  });

  res.setHeader('Set-Cookie', buildCookieHeader(token));
  return res.status(201).json({ user: sanitizeUser(newUser) });
};
