const { validationResult } = require('express-validator');
const ApiError = require('../utils/ApiError');

const validate = (rules) => [
  ...rules,
  (req, _res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(
        new ApiError(
          422,
          'Validation failed',
          errors.array().map((e) => ({ field: e.path, msg: e.msg }))
        )
      );
    }
    next();
  },
];

module.exports = validate;