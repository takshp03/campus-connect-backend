const ApiError = require('../utils/ApiError');

// usage: allow('admin') or allow('admin','student')
const allow = (...roles) => (req, _res, next) => {
  if (!req.user) return next(new ApiError(401, 'Not authenticated'));
  if (!roles.includes(req.user.role))
    return next(new ApiError(403, 'Forbidden: insufficient role'));
  next();
};

module.exports = { allow };