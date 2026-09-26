// GET /api/stats — public site statistics
const redis = require('../../lib/redis');
const { setCommonHeaders } = require('../../lib/auth');

module.exports = async function handler(req, res) {
  setCommonHeaders(res);
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const [rawUsers, rawTests, rawNews, rawTeachers, rawVideos] = await Promise.all([
    redis.get('allUsers'),
    redis.get('tests'),
    redis.get('news'),
    redis.get('teachers'),
    redis.get('videos'),
  ]);

  const parse = (v) => Array.isArray(v) ? v : (v ? JSON.parse(v) : []);

  const users    = parse(rawUsers);
  const tests    = parse(rawTests);
  const news     = parse(rawNews);
  const teachers = parse(rawTeachers);
  const videos   = parse(rawVideos);
  const questions = tests.reduce((total, test) => total + (Array.isArray(test.questions) ? test.questions.length : Number(test.questionCount) || 0), 0);

  return res.status(200).json({
    users:   users.length,
    tests:   tests.length,
    news:    news.length,
    teachers: teachers.length,
    videos: videos.filter(video => video.isActive !== false).length,
    questions,
    premium: users.filter(u => u.premium).length,
  });
};
