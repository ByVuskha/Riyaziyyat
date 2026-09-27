// Shared helper utilities for API handlers

function allowMethods(req, res, methods) {
  if (!methods.includes(req.method)) {
    res.setHeader('Allow', methods.join(', '));
    res.status(405).json({ error: `Method ${req.method} not allowed` });
    return false;
  }
  return true;
}

function safeJson(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === 'object') return value;
  try { return JSON.parse(value); } catch { return null; }
}

function paginate(array, page = 1, limit = 20) {
  const start = (page - 1) * limit;
  return {
    data:  array.slice(start, start + limit),
    total: array.length,
    page:  Number(page),
    pages: Math.ceil(array.length / limit),
  };
}

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function getVisiblePassword(user) {
  if (!user || typeof user !== 'object') return undefined;
  const rawPassword = user.passwordPlain ?? user.passwordDisplay ?? user.password;
  if (rawPassword === undefined || rawPassword === null) return undefined;
  const passwordText = String(rawPassword).trim();
  if (!passwordText) return undefined;
  return passwordText;
}

function sanitizeUser(user, options = {}) {
  if (!user) return null;
  const { includePassword = false } = options;
  const { password, passwordPlain, passwordDisplay, sessionId, ...safe } = user;
  const visiblePassword = getVisiblePassword(user);
  if (includePassword && visiblePassword !== undefined) {
    return {
      ...safe,
      password: visiblePassword,
      ...(passwordPlain !== undefined ? { passwordPlain: String(passwordPlain) } : {}),
      ...(passwordDisplay !== undefined ? { passwordDisplay: String(passwordDisplay) } : {}),
    };
  }
  return safe;
}

module.exports = { allowMethods, safeJson, paginate, genId, sanitizeUser };