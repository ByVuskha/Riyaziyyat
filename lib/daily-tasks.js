const redis = require('./redis');

const DAILY_TASKS = {
  'watch-video': { title: 'Video izlə', reward: 15 },
  'solve-test': { title: 'Sınaq həll et', reward: 20 },
  'read-news': { title: 'Xəbər oxu', reward: 10 },
  login: { title: 'Giriş et', reward: 10 },
};

function parseObject(value) {
  if (value && typeof value === 'object') return value;
  return value ? JSON.parse(value) : {};
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

function applyDailyTask(data, taskId, options = {}) {
  const task = DAILY_TASKS[taskId];
  if (!task) throw new Error('Dəstəklənməyən gündəlik tapşırıq');

  const today = new Date().toISOString().slice(0, 10);
  const dailyTasks = data.dailyTasks && typeof data.dailyTasks === 'object' ? data.dailyTasks : {};
  const todayTasks = dailyTasks[today] && typeof dailyTasks[today] === 'object' ? dailyTasks[today] : {};
  if (todayTasks[taskId]) return { earnedPoints: 0, taskAlreadyCompleted: true };

  todayTasks[taskId] = {
    taskId,
    taskTitle: task.title,
    reward: task.reward,
    completedAt: new Date().toISOString(),
  };
  dailyTasks[today] = todayTasks;
  data.dailyTasks = dailyTasks;

  if (taskId === 'watch-video' && options.videoId) {
    const watchedVideos = Array.isArray(data.watchedVideos) ? data.watchedVideos : [];
    if (!watchedVideos.includes(String(options.videoId))) watchedVideos.push(String(options.videoId));
    data.watchedVideos = watchedVideos;
  }

  const earnedPoints = options.award === false ? 0 : task.reward;
  if (earnedPoints) addPoints(data, earnedPoints, `Gündəlik tapşırıq: ${task.title}`);
  return { earnedPoints, taskAlreadyCompleted: false };
}

async function awardDailyTask(user, taskId, options = {}) {
  if (!user || user.role === 'admin') return { earnedPoints: 0, taskAlreadyCompleted: false };

  const [rawPoints, rawUsers] = await Promise.all([
    redis.get('userPoints'),
    redis.get('allUsers'),
  ]);
  const points = parseObject(rawPoints);
  const users = Array.isArray(rawUsers) ? rawUsers : (rawUsers ? JSON.parse(rawUsers) : []);
  const data = points[user.id] || {
    userId: user.id,
    userName: user.name,
    total: 0,
    history: [],
    watchedVideos: [],
    completedTests: [],
    testScores: {},
    dailyTasks: {},
    lastLoginDate: null,
  };
  const result = applyDailyTask(data, taskId, options);

  if (!result.taskAlreadyCompleted) {
    data.userId = user.id;
    data.userName = user.name;
    points[user.id] = data;
    await redis.set('userPoints', JSON.stringify(points), { ex: 86400 * 30 });

    const userIndex = users.findIndex(item => String(item.id) === String(user.id));
    if (userIndex >= 0) {
      users[userIndex].points = data.total;
      await redis.set('allUsers', JSON.stringify(users));
    }
  }
  return { ...result, points: data };
}

module.exports = { DAILY_TASKS, applyDailyTask, awardDailyTask };
