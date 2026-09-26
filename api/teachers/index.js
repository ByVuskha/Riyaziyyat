const redis = require('../../lib/redis');
const { setCommonHeaders } = require('../../lib/auth');
const { allowMethods, paginate } = require('../../lib/helpers');

module.exports = async function handler(req, res) {
  setCommonHeaders(res);
  if (!allowMethods(req, res, ['GET'])) return;

  const raw = await redis.get('allUsers');
  const users = Array.isArray(raw) ? raw : (raw ? JSON.parse(raw) : []);
  const query = String(req.query?.q || '').toLowerCase();
  const teachers = users
    .filter(user => user.role !== 'admin' && user.userType === 'teacher' && user.publicProfile !== false)
    .filter(user => !query || `${user.name || ''} ${user.teacherTitle || ''} ${user.subjects || ''}`.toLowerCase().includes(query))
    .map(user => ({
      id: user.id,
      name: user.name || 'Müəllim',
      title: user.teacherTitle || user.title || 'Riyaziyyat müəllimi',
      bio: user.bio || '',
      subjects: user.subjects || '',
      image: user.profilePicture || user.image || '',
      phone: user.phone || '',
      email: user.publicEmail === false ? '' : (user.email || ''),
      experience: user.experience || 0,
      students: user.students || 0,
      rating: user.rating || 5,
    }));

  const page = parseInt(req.query?.page, 10) || 1;
  const limit = Math.min(parseInt(req.query?.limit, 10) || 100, 100);
  return res.status(200).json(paginate(teachers, page, limit));
};