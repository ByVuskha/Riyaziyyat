// GET /api/stats — public site statistics
const redis = require('../../lib/redis');
const { setCommonHeaders } = require('../../lib/auth');

module.exports = async function handler(req, res) {
  setCommonHeaders(res);
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const [rawUsers, rawTests, rawNews, rawTeachers] = await Promise.all([
    redis.get('allUsers'),
    redis.get('tests'),
    redis.get('news'),
    redis.get('teachers'),
  ]);

  const parse = (v) => Array.isArray(v) ? v : (v ? JSON.parse(v) : []);

  const users    = parse(rawUsers);
  const tests    = parse(rawTests);
  const news     = parse(rawNews);
  const teachers = parse(rawTeachers);

  return res.status(200).json({
    users:   users.length,
    tests:   tests.length,
    news:    news.length,
    teachers: teachers.length,
    premium: users.filter(u => u.premium).length,
  });
};
