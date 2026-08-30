import jwt from 'jsonwebtoken';

const getJwtSecret = () => {
  if (process.env.JWT_SECRET) return process.env.JWT_SECRET;

  console.warn('JWT_SECRET is missing in .env; using development fallback secret.');
  return 'sgfi-development-admin-secret';
};

export const signAdminToken = (user) => {
  return jwt.sign(
    {
      id: String(user._id || user.id),
      username: user.username,
      role: 'admin',
    },
    getJwtSecret(),
    { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
  );
};

export const requireAdminAuth = (req, res, next) => {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';

  if (!token) {
    return res.status(401).json({ success: false, message: 'Admin login is required.' });
  }

  try {
    const decoded = jwt.verify(token, getJwtSecret());
    req.user = decoded;
    return next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Invalid or expired admin session.' });
  }
};
