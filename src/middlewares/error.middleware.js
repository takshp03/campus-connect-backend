const ApiError = require('../utils/ApiError');

// 404 for unmatched routes
const notFound = (req, _res, next) =>
  next(new ApiError(404, `Route not found: ${req.method} ${req.originalUrl}`));

// Central error handler
const errorHandler = (err, _req, res, _next) => {
  let error = err;

  if (err.code === 'ER_DUP_ENTRY') {
    error = new ApiError(409, 'Duplicate entry', [{ msg: err.sqlMessage }]);
  } else if (err instanceof multer.MulterError) {
    error = new ApiError(400, err.message);
  } else if (!(err instanceof ApiError)) {
    error = new ApiError(err.statusCode || 500, err.message || 'Server error');
  }

  if (process.env.NODE_ENV !== 'test') {
    console.error(`[${error.statusCode}] ${error.message}`, error.errors || '');
  }

  res.status(error.statusCode).json({
    success: false,
    message: error.message,
    errors: error.errors,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });
};

// multer import needs to be here for the reference above
const multer = require('multer');

module.exports = { notFound, errorHandler };