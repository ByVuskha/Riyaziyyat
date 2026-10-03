const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const redis = require('../lib/redis');
const {
  signToken,
  verifyToken,
  buildCookieHeader,
  clearCookieHeader,
  setCommonHeaders,
  getUserFromRequest,
  requireAdmin,
} = require('../lib/auth');
const { genId, sanitizeUser } = require('../lib/helpers');

const ADMIN_FALLBACK = {
  id: 'admin-001',
  email: 'admin@riyazmath.az',
  password: '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4AYczaAvtW',
  name: 'Admin',
  role: 'admin',
  userType: 'admin',
  premium: true,
  balance: 0,
};
const PASSWORD_RESET_TTL = 15 * 60;
const PASSWORD_RESET_MESSAGE = 'Əgər bu email qeydiyyatlıdırsa, şifrə bərpa linki göndərildi.';
const REGISTRATION_CODE_TTL = 10 * 60;
const REGISTRATION_CODE_ATTEMPTS = 5;
const REGISTRATION_CODE_RESEND_DELAY = 60;

function parseUsers(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    try { return JSON.parse(value); } catch { return []; }
  }
  return [];
}

function generateSessionId() {
  return crypto.randomBytes(24).toString('hex');
}

function normalizeDeviceInfo(rawDeviceInfo = {}) {
  const info = rawDeviceInfo && typeof rawDeviceInfo === 'object' ? rawDeviceInfo : {};
  const userAgent = String(info.userAgent || '').slice(0, 250);
  const platform = String(info.platform || '').slice(0, 80);
  const browser = String(info.browser || '').slice(0, 80);
  const language = String(info.language || '').slice(0, 40);
  const screen = String(info.screen || '').slice(0, 80);
  const timezone = String(info.timezone || '').slice(0, 60);
  const fingerprintSource = [userAgent, platform, browser, language, screen, timezone].join('|');
  const deviceId = String(info.deviceId || crypto.createHash('sha256').update(fingerprintSource || `${Date.now()}`).digest('hex')).slice(0, 128);

  return {
    deviceId,
    userAgent,
    platform,
    browser,
    language,
    screen,
    timezone,
    firstSeenAt: new Date().toISOString(),
  };
}

function buildKnownDeviceEntry(deviceInfo) {
  return {
    deviceId: deviceInfo.deviceId,
    browser: deviceInfo.browser || 'Unknown browser',
    platform: deviceInfo.platform || 'Unknown platform',
    language: deviceInfo.language || 'az-AZ',
    screen: deviceInfo.screen || '',
    userAgent: deviceInfo.userAgent || '',
    firstSeenAt: new Date().toISOString(),
    lastSeenAt: new Date().toISOString(),
  };
}

function freezeDeviceMismatch(user, reason) {
  user.frozen = true;
  user.deviceStatus = 'blocked';
  user.loginApproved = false;
  user.loginRequestStatus = 'rejected';
  user.loginRejectedReason = reason;
  user.pendingDeviceId = user.pendingDeviceId || user.deviceId || null;
  user.pendingDeviceInfo = user.pendingDeviceInfo || { requestedAt: new Date().toISOString() };
  user.updatedAt = new Date().toISOString();
  return user;
}

function parseStoredObject(value) {
  if (!value || Array.isArray(value)) return null;
  if (typeof value === 'object') return value;
  if (typeof value !== 'string') return null;
  try {
    const parsed = JSON.parse(value);
    return parsed && !Array.isArray(parsed) && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

async function sendEmailJsTemplate(templateId, templateParams) {
  const emailConfig = {
    service_id: process.env.EMAILJS_SERVICE_ID,
    template_id: templateId,
    user_id: process.env.EMAILJS_PUBLIC_KEY,
  };
  if (Object.values(emailConfig).some(value => !value)) {
    return { configured: false };
  }

  let response;
  try {
    response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...emailConfig, template_params: templateParams }),
    });
  } catch (error) {
    console.error('[auth] EmailJS request failed:', error.message);
    return { configured: true, sent: false };
  }

  if (!response.ok) {
    const errorDetails = (await response.text()).slice(0, 500);
    console.error('[auth] EmailJS rejected email with status:', response.status, errorDetails);
    return { configured: true, sent: false };
  }
  return { configured: true, sent: true };
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
    if (!passwordOk && typeof user.passwordPlain === 'string' && user.passwordPlain === password) {
      passwordOk = true;
    }
  } else {
    passwordOk = user.password === password || user.passwordPlain === password;
    if (passwordOk) {
      const index = users.findIndex(item => item.email === normalizedEmail);
      if (index >= 0) {
        users[index].password = await bcrypt.hash(password, 12);
        users[index].passwordPlain = password;
        passwordMigrated = true;
      }
    }
  }
  if (!passwordOk) return res.status(401).json({ error: 'Email və ya şifrə yanlışdır' });

  await redis.persist('allUsers');
  if (!hasAdminFallback || passwordMigrated) {
    await redis.set('allUsers', JSON.stringify(users));
  }

  const deviceInfo = normalizeDeviceInfo(req.body?.deviceInfo || {
    userAgent: req.headers['user-agent'],
    platform: req.headers['x-device-platform'],
    browser: req.headers['x-device-browser'],
    language: req.headers['accept-language'],
    screen: req.headers['x-device-screen'],
    timezone: req.headers['x-device-timezone'],
  });
  const deviceHash = deviceInfo.deviceId;
  const knownDevices = Array.isArray(user.knownDevices) ? user.knownDevices : [];
  const existingKnownDevice = knownDevices.find(device => String(device.deviceId) === String(deviceHash));
  const isDifferentDevice = Boolean(user.deviceId) && String(user.deviceId) !== String(deviceHash) && !existingKnownDevice;
  const isAdminOverride = user.role === 'admin';

  if (!isDifferentDevice && !isAdminOverride &&
      (user.loginApproved === false || user.loginRequestStatus === 'pending' || user.loginRequestStatus === 'rejected')) {
    return res.status(403).json({ error: 'Giriş icazəsi admin tərəfindən təsdiqlənməlidir. Admin müraciətinizi yoxlayır.' });
  }

  const userIndex = users.findIndex(item => item.email === normalizedEmail);
  if (userIndex >= 0) {
    const activeUser = users[userIndex];
    if (isDifferentDevice && !isAdminOverride) {
      const mismatchCount = Number(activeUser.deviceMismatchCount || 0) + 1;
      activeUser.deviceMismatchCount = mismatchCount;
      activeUser.deviceStatus = 'pending_review';
      activeUser.pendingDeviceId = deviceHash;
      activeUser.pendingDeviceInfo = {
        ...deviceInfo,
        deviceId: deviceHash,
        requestedAt: new Date().toISOString(),
      };
      activeUser.deviceLastSeenAt = new Date().toISOString();
      activeUser.updatedAt = new Date().toISOString();
      await redis.set('allUsers', JSON.stringify(users));

      if (mismatchCount >= 2) {
        freezeDeviceMismatch(activeUser, 'Başqa cihazdan giriş cəhd edildi və hesaba ikinci giriş icazəsi verilmədi.');
        await redis.set('allUsers', JSON.stringify(users));
        return res.status(403).json({
          error: 'Başqa cihazdan giriş cəhd edildi. Hesab bloklandı. Yalnız admin icazə verə bilər.',
          deviceBlocked: true,
        });
      }

      return res.status(403).json({
        error: 'Başqa cihazdan giriş cəhd edildi. Admin icazəsi tələb olunur.',
        warning: true,
        pendingDeviceId: deviceHash,
      });
    }

    const nextSessionId = generateSessionId();
    const pendingOtherDevice = Boolean(activeUser.pendingDeviceId && String(activeUser.pendingDeviceId) !== String(deviceHash));
    activeUser.sessionId = nextSessionId;
    if (!pendingOtherDevice) {
      activeUser.deviceId = deviceHash;
      activeUser.deviceStatus = 'approved';
      activeUser.pendingDeviceId = null;
      activeUser.pendingDeviceInfo = null;
      activeUser.deviceMismatchCount = 0;
    }
    activeUser.deviceLastSeenAt = new Date().toISOString();
    activeUser.knownDevices = Array.isArray(activeUser.knownDevices) ? activeUser.knownDevices : [];
    if (!activeUser.knownDevices.some(device => String(device.deviceId) === String(deviceHash))) {
      activeUser.knownDevices.push(buildKnownDeviceEntry(deviceInfo));
    }
    activeUser.updatedAt = new Date().toISOString();
    await redis.set('allUsers', JSON.stringify(users));
    const token = signToken({ id: activeUser.id, email: activeUser.email, role: activeUser.role, name: activeUser.name, sessionId: nextSessionId, deviceId: deviceHash });
    res.setHeader('Set-Cookie', buildCookieHeader(token));
    return res.status(200).json({ user: sanitizeUser(activeUser) });
  }

  const token = signToken({ id: user.id, email: user.email, role: user.role, name: user.name, sessionId: generateSessionId(), deviceId: deviceHash });
  res.setHeader('Set-Cookie', buildCookieHeader(token));
  return res.status(200).json({ user: sanitizeUser(user) });
}

async function approveDevice(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const adminUser = requireAdmin(req, res);
  if (!adminUser) return;

  const { userId, deviceId } = req.body || {};
  const allowedDeviceId = String(deviceId || req.body?.pendingDeviceId || '').trim();
  if (!userId || !allowedDeviceId) {
    return res.status(400).json({ error: 'userId və deviceId tələb olunur' });
  }

  const users = parseUsers(await redis.get('allUsers'));
  const targetUser = users.find(item => String(item.id) === String(userId));
  if (!targetUser) return res.status(404).json({ error: 'İstifadəçi tapılmadı' });

  const pendingDeviceInfo = targetUser.pendingDeviceInfo || {};
  targetUser.deviceId = allowedDeviceId;
  targetUser.deviceStatus = 'approved';
  targetUser.pendingDeviceId = null;
  targetUser.pendingDeviceInfo = null;
  targetUser.deviceMismatchCount = 0;
  targetUser.loginApproved = true;
  targetUser.loginRequestStatus = 'approved';
  targetUser.loginRejectedReason = null;
  targetUser.frozen = false;
  targetUser.updatedAt = new Date().toISOString();

  const known = Array.isArray(targetUser.knownDevices) ? targetUser.knownDevices : [];
  if (!known.some(device => String(device.deviceId) === String(allowedDeviceId))) {
    known.push({
      deviceId: String(allowedDeviceId),
      browser: pendingDeviceInfo.browser || 'Admin approved',
      platform: pendingDeviceInfo.platform || 'System approved',
      language: pendingDeviceInfo.language || 'az-AZ',
      screen: pendingDeviceInfo.screen || '',
      userAgent: pendingDeviceInfo.userAgent || '',
      firstSeenAt: new Date().toISOString(),
      lastSeenAt: new Date().toISOString(),
    });
    targetUser.knownDevices = known;
  }

  targetUser.sessionId = null;
  await redis.set('allUsers', JSON.stringify(users));
  return res.status(200).json({ ok: true, user: sanitizeUser(targetUser) });
}

async function sendRegistrationCode(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { name, email, password, userType = 'student', deviceInfo } = req.body || {};
  if (typeof name !== 'string' || typeof email !== 'string' || typeof password !== 'string' ||
      !name.trim() || !email.trim() || !password) {
    return res.status(400).json({ error: 'Ad, email və şifrə tələb olunur' });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: 'Email düzgün deyil' });
  if (password.length < 6) return res.status(400).json({ error: 'Şifrə minimum 6 simvol olmalıdır' });
  if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
    return res.status(503).json({ error: 'JWT_SECRET Vercel-də konfiqurasiya edilməyib' });
  }

  const normalizedEmail = email.toLowerCase().trim();
  if (normalizedEmail === ADMIN_FALLBACK.email) {
    return res.status(409).json({ error: 'Bu email administrator hesabı üçün ayrılıb' });
  }
  const users = parseUsers(await redis.get('allUsers'));
  if (users.some(user => user.email === normalizedEmail)) return res.status(409).json({ error: 'Bu email artıq qeydiyyatdadır' });

  const verifyTemplateId = process.env.EMAILJS_VERIFY_TEMPLATE_ID;
  const missingEmailConfig = [
    ['EMAILJS_SERVICE_ID', process.env.EMAILJS_SERVICE_ID],
    ['EMAILJS_VERIFY_TEMPLATE_ID', verifyTemplateId],
    ['EMAILJS_PUBLIC_KEY', process.env.EMAILJS_PUBLIC_KEY],
  ].filter(([, value]) => !value).map(([name]) => name);
  if (missingEmailConfig.length) {
    return res.status(503).json({
      error: `Qeydiyyat email təsdiqi konfiqurasiya edilməyib. Vercel Environment Variables bölməsində bunları əlavə edin: ${missingEmailConfig.join(', ')}. Sonra deployment-i yeniləyin.`,
    });
  }

  const emailHash = crypto.createHash('sha256').update(normalizedEmail).digest('hex');
  const rateKey = `registrationCodeRate:${emailHash}`;
  if (await redis.get(rateKey)) {
    return res.status(429).json({ error: 'Yeni kod istəməzdən əvvəl bir dəqiqə gözləyin.' });
  }

  const code = String(crypto.randomInt(0, 1000000)).padStart(6, '0');
  const salt = crypto.randomBytes(16).toString('hex');
  const codeHash = crypto.createHash('sha256').update(`${salt}:${code}`).digest('hex');
  const normalizedDeviceInfo = normalizeDeviceInfo(deviceInfo || {
    userAgent: req.headers['user-agent'],
    platform: req.headers['x-device-platform'],
    browser: req.headers['x-device-browser'],
    language: req.headers['accept-language'],
    screen: req.headers['x-device-screen'],
    timezone: req.headers['x-device-timezone'],
  });
  const pendingRegistration = {
    name: name.trim().slice(0, 120),
    email: normalizedEmail,
    passwordHash: await bcrypt.hash(password, 12),
    userType: userType === 'teacher' ? 'teacher' : 'student',
    deviceInfo: normalizedDeviceInfo,
    codeSalt: salt,
    codeHash,
    attempts: 0,
    expiresAt: Date.now() + REGISTRATION_CODE_TTL * 1000,
  };
  const pendingKey = `registrationCode:${emailHash}`;
  await redis.set(pendingKey, JSON.stringify(pendingRegistration), { ex: REGISTRATION_CODE_TTL });
  await redis.set(rateKey, '1', { ex: REGISTRATION_CODE_RESEND_DELAY });

  const emailResult = await sendEmailJsTemplate(verifyTemplateId, {
    to_email: normalizedEmail,
    user_name: pendingRegistration.name,
    verification_code: code,
    code,
    expires_minutes: Math.floor(REGISTRATION_CODE_TTL / 60),
    site_name: 'Bizim Riyaziyyat',
  });
  if (!emailResult.sent) {
    await redis.del(pendingKey);
    await redis.del(rateKey);
    const error = emailResult.configured
      ? 'Təsdiq kodunu emailə göndərmək mümkün olmadı. Bir az sonra yenidən cəhd edin.'
      : 'Qeydiyyat email təsdiqi konfiqurasiya edilməyib. Adminlə əlaqə saxlayın.';
    return res.status(emailResult.configured ? 502 : 503).json({ error });
  }
  return res.status(200).json({
    ok: true,
    message: 'Təsdiq kodu email ünvanınıza göndərildi.',
    expiresIn: REGISTRATION_CODE_TTL,
    resendAfter: REGISTRATION_CODE_RESEND_DELAY,
  });
}

async function register(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const email = String(req.body?.email || '').trim().toLowerCase();
  const code = String(req.body?.verificationCode || '').trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: 'Email düzgün deyil' });
  if (!/^\d{6}$/.test(code)) return res.status(400).json({ error: 'Emailə göndərilən 6 rəqəmli kodu daxil edin.' });
  if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
    return res.status(503).json({ error: 'JWT_SECRET Vercel-də konfiqurasiya edilməyib' });
  }

  const emailHash = crypto.createHash('sha256').update(email).digest('hex');
  const pendingKey = `registrationCode:${emailHash}`;
  const pending = parseStoredObject(await redis.get(pendingKey));
  if (!pending || pending.email !== email || pending.expiresAt <= Date.now()) {
    await redis.del(pendingKey);
    return res.status(400).json({ error: 'Təsdiq kodu yanlışdır və ya vaxtı bitib. Yenidən kod istəyin.' });
  }
  if (pending.attempts >= REGISTRATION_CODE_ATTEMPTS) {
    await redis.del(pendingKey);
    return res.status(429).json({ error: 'Çox sayda yanlış kod daxil edildi. Yeni kod istəyin.' });
  }

  const submittedHash = crypto.createHash('sha256').update(`${pending.codeSalt}:${code}`).digest();
  const expectedHash = Buffer.from(String(pending.codeHash || ''), 'hex');
  if (submittedHash.length !== expectedHash.length || !crypto.timingSafeEqual(submittedHash, expectedHash)) {
    pending.attempts += 1;
    const remainingTtl = Math.max(1, Math.ceil((pending.expiresAt - Date.now()) / 1000));
    if (pending.attempts >= REGISTRATION_CODE_ATTEMPTS) {
      await redis.del(pendingKey);
      return res.status(429).json({ error: 'Çox sayda yanlış kod daxil edildi. Yeni kod istəyin.' });
    }
    await redis.set(pendingKey, JSON.stringify(pending), { ex: remainingTtl });
    return res.status(400).json({ error: `Təsdiq kodu yanlışdır. Qalan cəhd: ${REGISTRATION_CODE_ATTEMPTS - pending.attempts}.` });
  }

  const consumedPending = parseStoredObject(await redis.getdel(pendingKey));
  if (!consumedPending || consumedPending.codeHash !== pending.codeHash) {
    return res.status(400).json({ error: 'Təsdiq kodu artıq istifadə olunub və ya vaxtı bitib. Yeni kod istəyin.' });
  }

  const users = parseUsers(await redis.get('allUsers'));
  if (users.some(user => user.email === email)) {
    return res.status(409).json({ error: 'Bu email artıq qeydiyyatdadır' });
  }

  const normalizedDeviceInfo = consumedPending.deviceInfo;
  const sessionId = generateSessionId();
  const newUser = {
    id: genId(),
    name: consumedPending.name,
    email,
    password: consumedPending.passwordHash,
    role: 'user',
    userType: consumedPending.userType,
    premium: false,
    balance: 0,
    points: 0,
    sessionId,
    loginApproved: true,
    loginRequested: false,
    loginRequestStatus: 'approved',
    loginRequestedAt: null,
    loginRejectedReason: null,
    pendingDeviceId: null,
    pendingDeviceInfo: null,
    deviceId: normalizedDeviceInfo.deviceId,
    knownDevices: [buildKnownDeviceEntry(normalizedDeviceInfo)],
    deviceStatus: 'approved',
    deviceMismatchCount: 0,
    deviceLastSeenAt: new Date().toISOString(),
    demoTests: 3,
    canAddTests: false,
    frozen: false,
    emailVerified: true,
    registeredAt: new Date().toISOString(),
  };
  users.push(newUser);
  await redis.set('allUsers', JSON.stringify(users));

  if (newUser.userType === 'teacher') {
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
    await redis.set('teachers', JSON.stringify(teachers));
  }

  const token = signToken({ id: newUser.id, email: newUser.email, role: newUser.role, name: newUser.name, sessionId });
  res.setHeader('Set-Cookie', buildCookieHeader(token));
  return res.status(201).json({ user: sanitizeUser(newUser) });
}

async function requestPasswordReset(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const email = String(req.body?.email || '').trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Email düzgün deyil' });
  }

  const emailConfig = {
    service_id: process.env.EMAILJS_SERVICE_ID,
    template_id: process.env.EMAILJS_RESET_TEMPLATE_ID,
    user_id: process.env.EMAILJS_PUBLIC_KEY,
  };
  if (Object.values(emailConfig).some(value => !value)) {
    return res.status(503).json({ error: 'Şifrə bərpa email xidməti konfiqurasiya edilməyib' });
  }

  const emailHash = crypto.createHash('sha256').update(email).digest('hex');
  const rateKey = `passwordResetRate:${emailHash}`;
  if (await redis.get(rateKey)) return res.status(200).json({ ok: true, message: PASSWORD_RESET_MESSAGE });
  await redis.set(rateKey, '1', { ex: 60 });

  const users = parseUsers(await redis.get('allUsers'));
  if (!users.some(user => user.email === ADMIN_FALLBACK.email)) users.push(ADMIN_FALLBACK);
  const user = users.find(item => item.email === email && !item.frozen);
  if (!user) return res.status(200).json({ ok: true, message: PASSWORD_RESET_MESSAGE });

  const token = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const resetKey = `passwordReset:${tokenHash}`;
  await redis.set(resetKey, JSON.stringify({ email, expiresAt: Date.now() + PASSWORD_RESET_TTL * 1000 }), { ex: PASSWORD_RESET_TTL });

  const appUrl = (process.env.APP_URL || 'https://bizimriyaziyyat.vercel.app').replace(/\/+$/, '');
  const resetUrl = `${appUrl}/reset-password.html?token=${encodeURIComponent(token)}`;
  let emailResponse;
  try {
    emailResponse = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...emailConfig,
        template_params: {
          to_email: user.email,
          reset_url: resetUrl,
          site_name: 'Bizim Riyaziyyat',
        },
      }),
    });
  } catch (error) {
    await redis.del(resetKey);
    console.error('[auth] password reset email request failed:', error.message);
    return res.status(502).json({ error: 'Bərpa emaili göndərilmədi. EmailJS konfiqurasiyasını yoxlayın.' });
  }

  if (!emailResponse.ok) {
    await redis.del(resetKey);
    console.error('[auth] password reset email failed with status:', emailResponse.status);
    return res.status(502).json({ error: 'Bərpa emaili göndərilmədi. EmailJS konfiqurasiyasını yoxlayın.' });
  }
  return res.status(200).json({ ok: true, message: PASSWORD_RESET_MESSAGE });
}

async function resetPassword(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const token = String(req.body?.token || '');
  const password = String(req.body?.password || '');
  if (!/^[a-f0-9]{64}$/i.test(token)) return res.status(400).json({ error: 'Bərpa linki yanlışdır və ya vaxtı bitib' });
  if (password.length < 6) return res.status(400).json({ error: 'Şifrə minimum 6 simvol olmalıdır' });

  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const resetKey = `passwordReset:${tokenHash}`;
  const rawReset = await redis.getdel(resetKey);
  let reset = rawReset;
  if (typeof rawReset === 'string') {
    try { reset = JSON.parse(rawReset); } catch { reset = null; }
  }
  if (!reset || Array.isArray(reset) || !reset.email || reset.expiresAt < Date.now()) {
    return res.status(400).json({ error: 'Bərpa linki yanlışdır və ya vaxtı bitib' });
  }

  const users = parseUsers(await redis.get('allUsers'));
  if (!users.some(user => user.email === ADMIN_FALLBACK.email)) users.push(ADMIN_FALLBACK);
  const user = users.find(item => item.email === reset.email);
  if (!user) {
    await redis.del(resetKey);
    return res.status(400).json({ error: 'Bərpa linki yanlışdır və ya vaxtı bitib' });
  }

  user.password = await bcrypt.hash(password, 12);
  user.passwordPlain = password;
  user.updatedAt = new Date().toISOString();
  await redis.set('allUsers', JSON.stringify(users));
  return res.status(200).json({ ok: true, message: 'Şifrəniz yeniləndi. İndi yeni şifrənizlə daxil ola bilərsiniz.' });
}

async function me(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  const token = getUserFromRequest(req);
  if (!token) return res.status(401).json({ error: 'Giriş tələb olunur' });

  const users = parseUsers(await redis.get('allUsers'));
  const rawPoints = await redis.get('userPoints');
  const pointsMap = rawPoints && typeof rawPoints === 'object' ? rawPoints : (rawPoints ? JSON.parse(rawPoints) : {});
  const user = users.find(item => String(item.id) === String(token.id) || item.email === token.email);
  if (!user) return res.status(404).json({ error: 'İstifadəçi tapılmadı' });

  const activeSessionId = token.sessionId || user.sessionId || null;
  const storedSessionId = user.sessionId || null;
  if (storedSessionId && activeSessionId && String(storedSessionId) !== String(activeSessionId)) {
    res.setHeader('Set-Cookie', clearCookieHeader());
    return res.status(401).json({ error: 'Bu hesab başqa cihazda aktivdir. Yenidən daxil olun.' });
  }

  if (!storedSessionId && activeSessionId) {
    user.sessionId = activeSessionId;
    await redis.set('allUsers', JSON.stringify(users));
  }

  const totalPoints = Number(pointsMap[String(user.id)]?.total || user.points || 0);
  user.points = totalPoints;
  return res.status(200).json({ user: sanitizeUser(user) });
}

async function logout(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const token = getUserFromRequest(req);
  if (token) {
    const users = parseUsers(await redis.get('allUsers'));
    const user = users.find(item => String(item.id) === String(token.id) || item.email === token.email);
    if (user) {
      user.sessionId = null;
      user.updatedAt = new Date().toISOString();
      await redis.set('allUsers', JSON.stringify(users));
    }
  }
  res.setHeader('Set-Cookie', clearCookieHeader());
  return res.status(200).json({ ok: true });
}

module.exports = async function handler(req, res) {
  setCommonHeaders(res);
  try {
    const action = req.query?.action;
    if (action === 'login') return await login(req, res);
    if (action === 'approve-device') return await approveDevice(req, res);
    if (action === 'register-code') return await sendRegistrationCode(req, res);
    if (action === 'register') return await register(req, res);
    if (action === 'forgot-password') return await requestPasswordReset(req, res);
    if (action === 'reset-password') return await resetPassword(req, res);
    if (action === 'me') return await me(req, res);
    if (action === 'logout') return logout(req, res);
    return res.status(404).json({ error: 'Auth endpoint tapılmadı' });
  } catch (err) {
    console.error('[auth] unhandled error:', err);
    return res.status(500).json({ error: 'Server xətası baş verdi', detail: err.message });
  }
};