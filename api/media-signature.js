const crypto = require('crypto');
const { requireAdmin, setCommonHeaders } = require('../lib/auth');

module.exports = async function handler(req, res) {
  setCommonHeaders(res);
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const admin = requireAdmin(req, res);
  if (!admin) return;

  const { CLOUDINARY_CLOUD_NAME: cloudName, CLOUDINARY_API_KEY: apiKey, CLOUDINARY_API_SECRET: apiSecret } = process.env;
  if (!cloudName || !apiKey || !apiSecret) {
    return res.status(503).json({ error: 'Video saxlancı konfiqurasiya edilməyib. Cloudinary env açarlarını əlavə edin.' });
  }

  const timestamp = Math.floor(Date.now() / 1000);
  const folder = 'bizim-riyaziyyat/videos';
  const signature = crypto.createHash('sha1').update(`folder=${folder}&timestamp=${timestamp}${apiSecret}`).digest('hex');
  return res.status(200).json({ cloudName, apiKey, timestamp, folder, signature });
};