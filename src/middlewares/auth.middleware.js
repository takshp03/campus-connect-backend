const { verifyToken } = require('../utils/jwt');
const ApiError = require('../utils/ApiError');
const pool = require('../config/db');

const auth = async (req, _res, next) => {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) throw new ApiError(401, 'Not authenticated');

    const decoded = verifyToken(token);
    const [rows] = await pool.query(
      'SELECT id, name, email, role, department, is_active FROM students WHERE id = ?',
      [decoded.id]
    );
    if (!rows.length) throw new ApiError(401, 'User no longer exists');
    if (!rows[0].is_active) throw new ApiError(403, 'Account disabled');

    req.user = rows[0];
    next();
  } catch (err) {
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError')
      return next(new ApiError(401, 'Invalid or expired token'));
    next(err);
  }
};

module.exports = auth;