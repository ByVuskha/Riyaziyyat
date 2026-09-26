// POST /api/auth/logout
const { clearCookieHeader, setCommonHeaders } = require('../../lib/auth');

module.exports = async function handler(req, res) {
  setCommonHeaders(res);
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  res.setHeader('Set-Cookie', clearCookieHeader());
  return res.status(200).json({ ok: true });
};
