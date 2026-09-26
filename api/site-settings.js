const redis = require('../lib/redis');
const { requireAdmin, setCommonHeaders } = require('../lib/auth');

const COLOR_KEYS = ['primary', 'secondary', 'success', 'warning', 'danger', 'dark'];
const FONT_OPTIONS = [
  "'Inter', sans-serif",
  "'Roboto', sans-serif",
  "'Open Sans', sans-serif",
  "'Poppins', sans-serif",
  "'Montserrat', sans-serif",
];
const STRING_LIMITS = {
  logoShort: 3,
  name: 60,
  slogan: 100,
  metaDescription: 180,
  heroTitle: 100,
  heroSubtitle: 240,
  ctaButton1: 40,
  ctaButton2: 40,
  email: 120,
  phone: 40,
  instagram: 80,
  telegram: 80,
  copyright: 120,
  description: 240,
};

function cleanString(value, maxLength) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : undefined;
}

function sanitizeSettings(input) {
  const source = input && typeof input === 'object' ? input : {};
  const result = {};
  if (source.colors && typeof source.colors === 'object') {
    result.colors = {};
    for (const key of COLOR_KEYS) {
      const value = source.colors[key];
      if (typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value)) result.colors[key] = value;
    }
  }
  if (source.typography && typeof source.typography === 'object') {
    const typography = {};
    if (FONT_OPTIONS.includes(source.typography.fontFamily)) typography.fontFamily = source.typography.fontFamily;
    if (FONT_OPTIONS.includes(source.typography.headingFont)) typography.headingFont = source.typography.headingFont;
    const fontSize = Number(source.typography.fontSize);
    const lineHeight = Number(source.typography.lineHeight);
    if (fontSize >= 14 && fontSize <= 18) typography.fontSize = fontSize;
    if (lineHeight >= 1.4 && lineHeight <= 2) typography.lineHeight = lineHeight;
    result.typography = typography;
  }
  for (const section of ['branding', 'content', 'footer']) {
    if (!source[section] || typeof source[section] !== 'object') continue;
    result[section] = {};
    for (const [key, limit] of Object.entries(STRING_LIMITS)) {
      if (source[section][key] !== undefined) {
        result[section][key] = cleanString(source[section][key], limit);
      }
    }
  }
  return result;
}

module.exports = async function handler(req, res) {
  setCommonHeaders(res);
  if (req.method === 'GET') {
    const raw = await redis.get('siteSettings');
    let settings = raw;
    if (typeof raw === 'string') {
      try { settings = JSON.parse(raw); } catch { settings = {}; }
    }
    return res.status(200).json(settings && typeof settings === 'object' ? settings : {});
  }
  if (req.method !== 'PUT') {
    res.setHeader('Allow', 'GET, PUT');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const admin = requireAdmin(req, res);
  if (!admin) return;
  const settings = sanitizeSettings(req.body);
  await redis.set('siteSettings', JSON.stringify(settings), { ex: 86400 * 365 });
  return res.status(200).json({ ok: true, settings });
};
