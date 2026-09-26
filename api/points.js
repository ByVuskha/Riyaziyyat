const redis = require('../lib/redis');
const { getUserFromRequest, requireAuth, setCommonHeaders } = require('../lib/auth');
const { allowMethods } = require('../lib/helpers');

const POINTS = { perfect: 50, good: 30, pass: 15, fail: 5, dailyLogin: 2 };

function parseList(value) {
  return Array.isArray(value) ? value : (value ? JSON.parse(value) : []);
}

function emptyPoints(user) {
  return {
    userId: user.id,
    userName: user.name,
    total: 0,
    history: [],
    watchedVideos: [],
    completedTests: [],
    testScores: {},
    lastLoginDate: null,
  };
}

function addPoints(data, amount, reason) {
  data.total = (Number(data.total) || 0) + amount;
  data.history = Array.isArray(data.history) ? data.history : [];
  data.history.unshift({
    amount,
    reason,
    date: new Date().toLocaleDateString('az-AZ'),
    time: new Date().toLocaleTimeString('az-AZ'),
    timestamp: Date.now(),
  });
  data.history = data.history.slice(0, 50);
}

function makeLeaderboard(users, points) {
  return users
    .filter(user => user.role !== 'admin')
    .map(user => {
      const item = points[user.id] || {};
      return {
        userId: user.id,
        userName: user.name || 'İstifadəçi',
        userType: user.userType || 'student',
        premium: Boolean(user.premium),
        total: Number(item.total) || 0,
        watchedCount: (item.watchedVideos || []).length,
        testCount: (item.completedTests || []).length,
      };
    })
    .sort((a, b) => b.total - a.total);
}

function correctAnswerIndex(value) {
  if (Number.isInteger(value)) return value;
  return ['A', 'B', 'C', 'D', 'E'].indexOf(String(value || '').toUpperCase());
}

module.exports = async function handler(req, res) {
  setCommonHeaders(res);
  if (!allowMethods(req, res, ['GET', 'POST'])) return;

  if (req.method === 'GET' && req.query?.view === 'stats') {
    const [rawUsers, rawTests, rawNews, rawTeachers, rawVideos] = await Promise.all([
      redis.get('allUsers'), redis.get('tests'), redis.get('news'), redis.get('teachers'), redis.get('videos'),
    ]);
    const users = parseList(rawUsers);
    const tests = parseList(rawTests);
    const news = parseList(rawNews);
    const teachers = parseList(rawTeachers);
    const videos = parseList(rawVideos);
    const questions = tests.reduce((total, test) => total + (Array.isArray(test.questions) ? test.questions.length : Number(test.questionCount) || 0), 0);
    return res.status(200).json({
      users: users.length,
      tests: tests.length,
      news: news.length,
      teachers: teachers.length,
      videos: videos.filter(video => video.isActive !== false).length,
      questions,
      premium: users.filter(user => user.premium).length,
    });
  }

  const session = getUserFromRequest(req);
  const [rawPoints, rawUsers] = await Promise.all([redis.get('userPoints'), redis.get('allUsers')]);
  const points = rawPoints && typeof rawPoints === 'object' ? rawPoints : (rawPoints ? JSON.parse(rawPoints) : {});
  const users = parseList(rawUsers);
  const leaderboard = makeLeaderboard(users, points);

  if (req.method === 'GET') {
    if (req.query?.view === 'results') {
      const admin = requireAuth(req, res);
      if (!admin) return;
      if (admin.role !== 'admin') return res.status(403).json({ error: 'Admin icazəsi tələb olunur' });
      return res.status(200).json({ data: parseList(await redis.get('testResults')) });
    }
    if (!session) return res.status(200).json({ leaderboard });
    return res.status(200).json({ points: points[session.id] || emptyPoints(session), leaderboard });
  }

  const user = requireAuth(req, res);
  if (!user) return;
  const data = points[user.id] || emptyPoints(user);
  let earnedPoints = 0;
  let scoreResult = null;

  if (req.body?.type === 'daily-login') {
    if (user.role !== 'admin') {
      const today = new Date().toISOString().slice(0, 10);
      if (data.lastLoginDate !== today) {
        data.lastLoginDate = today;
        earnedPoints = POINTS.dailyLogin;
        addPoints(data, earnedPoints, 'Gündəlik giriş');
      }
    }
  } else if (req.body?.type === 'test') {
    const testId = String(req.body?.testId || '');
    const answers = req.body?.answers;
    if (!testId || !Array.isArray(answers)) return res.status(400).json({ error: 'Sınaq cavabları tələb olunur' });

    const tests = parseList(await redis.get('tests'));
    const test = tests.find(item => String(item.id) === testId);
    if (!test) return res.status(404).json({ error: 'Sınaq tapılmadı' });
    if (test.isPremium && user.role !== 'admin') {
      const latestUser = users.find(item => String(item.id) === String(user.id));
      const active = latestUser?.premium && (!latestUser.premiumExpiresAt || new Date(latestUser.premiumExpiresAt) > new Date());
      if (!active) return res.status(403).json({ error: 'Bu sınaq Premium üzvlər üçündür' });
    }

    const questions = Array.isArray(test.questions) ? test.questions : [];
    if (!questions.length || answers.length !== questions.length) {
      return res.status(400).json({ error: 'Sınaq cavablarının sayı uyğun deyil' });
    }

    const score = questions.reduce((total, question, index) => {
      const selected = answers[index];
      return total + (selected !== null && selected !== undefined && Number(selected) === correctAnswerIndex(question.correctAnswer) ? 1 : 0);
    }, 0);
    const ballScore = Math.round((score / questions.length) * 100);
    const completed = Array.isArray(data.completedTests) ? data.completedTests : [];
    const alreadyCompleted = completed.includes(testId);
    if (!alreadyCompleted && user.role !== 'admin') {
      earnedPoints = ballScore === 100 ? POINTS.perfect : ballScore >= 80 ? POINTS.good : ballScore >= 60 ? POINTS.pass : POINTS.fail;
      completed.push(testId);
      data.completedTests = completed;
      addPoints(data, earnedPoints, `"${test.title}" sınağı (${ballScore}%)`);
    }

    data.testScores = data.testScores && typeof data.testScores === 'object' ? data.testScores : {};
    const previous = data.testScores[testId];
    if (!previous || ballScore >= previous.ballScore) {
      data.testScores[testId] = {
        testId,
        testTitle: test.title,
        ballScore,
        rawScore: score,
        total: questions.length,
        date: new Date().toISOString().slice(0, 10),
        timestamp: Date.now(),
      };
    }

    test.attempts = (test.attempts || 0) + 1;
    test.uniqueUsers = Array.isArray(test.uniqueUsers) ? test.uniqueUsers : [];
    if (!test.uniqueUsers.includes(String(user.id))) test.uniqueUsers.push(String(user.id));
    await redis.set('tests', JSON.stringify(tests), { ex: 86400 * 30 });
    const rawResults = await redis.get('testResults');
    const results = parseList(rawResults);
    results.unshift({
      id: `${Date.now()}-${user.id}`,
      testId,
      testTitle: test.title,
      userId: user.id,
      userName: user.name,
      userEmail: user.email,
      score,
      total: questions.length,
      percentage: ballScore,
      ballScore,
      earnedPoints,
      date: new Date().toISOString(),
      timestamp: Date.now(),
    });
    await redis.set('testResults', JSON.stringify(results.slice(0, 5000)), { ex: 86400 * 90 });
    scoreResult = { score, total: questions.length, ballScore, alreadyCompleted };
  } else {
    return res.status(400).json({ error: 'Xal əməliyyatı dəstəklənmir' });
  }

  data.userId = user.id;
  data.userName = user.name;
  points[user.id] = data;
  await redis.set('userPoints', JSON.stringify(points), { ex: 86400 * 30 });

  const userIndex = users.findIndex(item => String(item.id) === String(user.id));
  if (userIndex >= 0) {
    users[userIndex].points = data.total;
    await redis.set('allUsers', JSON.stringify(users), { ex: 86400 * 30 });
  }

  return res.status(200).json({ points: data, leaderboard: makeLeaderboard(users, points), earnedPoints, ...scoreResult });
};
