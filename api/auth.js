const bcrypt = require('bcryptjs');
const redis = require('../lib/redis');
const {
  signToken,
  verifyToken,
  buildCookieHeader,
  clearCookieHeader,
  setCommonHeaders,
} = require('../lib/auth');
const { genId, sanitizeUser } = require('../lib/helpers');

const ADMIN_FALLBACK = {
  id: 'admin-001',
  email: 'admin@riyaziyyat.az',
  password: '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4AYczaAvtW',
  name: 'Admin',
  role: 'admin',
  userType: 'admin',
  premium: true,
  balance: 0,
};

function parseUsers(value) {
  return Array.isArray(value) ? value : (value ? JSON.parse(value) : []);
}

async function login(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'Email və şifrə tələb olunur' });
  if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
    return res.status(503).json({ error: 'JWT_SECRET Vercel-də konfiqurasiya edilməyib' });
  }

  const normalizedEmail = email.toLowerCase().trim();
  const raw = await redis.get('allUsers');
  let users = parseUsers(raw);
  const hasAdminFallback = users.some(user => user.email === ADMIN_FALLBACK.email);
  if (!hasAdminFallback) users = [ADMIN_FALLBACK, ...users];

  const user = users.find(item => item.email === normalizedEmail);
  if (!user) return res.status(401).json({ error: 'Email və ya şifrə yanlışdır' });
  if (user.frozen) return res.status(403).json({ error: 'Hesabınız bloklanıb. Dəstək xidməti ilə əlaqə saxlayın.' });

  let passwordOk = false;
  let passwordMigrated = false;
  if (user.password?.startsWith('$2')) {
    passwordOk = await bcrypt.compare(password, user.password);
  } else {
    passwordOk = user.password === password;
    if (passwordOk) {
      const index = users.findIndex(item => item.email === normalizedEmail);
      if (index >= 0) {
        users[index].password = await bcrypt.hash(password, 12);
        passwordMigrated = true;
      }
    }
  }
  if (!passwordOk) return res.status(401).json({ error: 'Email və ya şifrə yanlışdır' });
  if (!hasAdminFallback || passwordMigrated) {
    await redis.set('allUsers', JSON.stringify(users), { ex: 86400 * 30 });
  }

  const token = signToken({ id: user.id, email: user.email, role: user.role, name: user.name });
  res.setHeader('Set-Cookie', buildCookieHeader(token));
  return res.status(200).json({ user: sanitizeUser(user) });
}

async function register(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { name, email, password, userType = 'student' } = req.body || {};
  if (!name || !email || !password) return res.status(400).json({ error: 'Ad, email və şifrə tələb olunur' });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: 'Email düzgün deyil' });
  if (password.length < 6) return res.status(400).json({ error: 'Şifrə minimum 6 simvol olmalıdır' });
  if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
    return res.status(503).json({ error: 'JWT_SECRET Vercel-də konfiqurasiya edilməyib' });
  }

  const normalizedEmail = email.toLowerCase().trim();
  const users = parseUsers(await redis.get('allUsers'));
  if (users.some(user => user.email === normalizedEmail)) return res.status(409).json({ error: 'Bu email artıq qeydiyyatdadır' });

  const newUser = {
    id: genId(),
    name: name.trim(),
    email: normalizedEmail,
    password: await bcrypt.hash(password, 12),
    role: 'user',
    userType,
    premium: false,
    balance: 0,
    demoTests: 3,
    canAddTests: false,
    frozen: false,
    emailVerified: true,
    registeredAt: new Date().toISOString(),
  };
  users.push(newUser);
  await redis.set('allUsers', JSON.stringify(users), { ex: 86400 * 30 });

  if (userType === 'teacher') {
    const teachers = parseUsers(await redis.get('teachers'));
    teachers.push({
      id: newUser.id,
      userId: newUser.id,
      name: newUser.name,
      email: newUser.email,
      title: 'Müəllim',
      subjects: '',
      experience: 0,
      rating: 5,
      students: 0,
      createdAt: newUser.registeredAt,
    });
    await redis.set('teachers', JSON.stringify(teachers), { ex: 86400 * 30 });
  }

  const token = signToken({ id: newUser.id, email: newUser.email, role: newUser.role, name: newUser.name });
  res.setHeader('Set-Cookie', buildCookieHeader(token));
  return res.status(201).json({ user: sanitizeUser(newUser) });
}

async function me(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  const token = require('../lib/auth').getUserFromRequest(req);
  if (!token) return res.status(401).json({ error: 'Giriş tələb olunur' });
  const users = parseUsers(await redis.get('allUsers'));
  const user = users.find(item => String(item.id) === String(token.id) || item.email === token.email);
  if (!user) return res.status(404).json({ error: 'İstifadəçi tapılmadı' });
  return res.status(200).json({ user: sanitizeUser(user) });
}

function logout(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  res.setHeader('Set-Cookie', clearCookieHeader());
  return res.status(200).json({ ok: true });
}

module.exports = async function handler(req, res) {
  setCommonHeaders(res);
  const action = req.query?.action;
  if (action === 'login') return login(req, res);
  if (action === 'register') return register(req, res);
  if (action === 'me') return me(req, res);
  if (action === 'logout') return logout(req, res);
  return res.status(404).json({ error: 'Auth endpoint tapılmadı' });
};