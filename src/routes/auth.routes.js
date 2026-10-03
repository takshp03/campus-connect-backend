const router = require('express').Router();
const { body } = require('express-validator');
const auth = require('../middlewares/auth.middleware');
const validate = require('../middlewares/validate.middleware');
const c = require('../controllers/auth.controller');

router.post(
  '/register',
  validate([
    body('name').trim().notEmpty().withMessage('Name required'),
    body('email').isEmail().withMessage('Valid email required').normalizeEmail(),
    body('password').isLength({ min: 6 }).withMessage('Password min 6 chars'),
    body('year').optional().isInt({ min: 1, max: 5 }),
  ]),
  c.register
);

router.post(
  '/login',
  validate([
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty(),
  ]),
  c.login
);

router.get('/me', auth, c.me);
router.put('/me', auth, c.updateMe);

router.put(
  '/change-password',
  auth,
  validate([
    body('currentPassword').notEmpty(),
    body('newPassword').isLength({ min: 6 }),
  ]),
  c.changePassword
);

module.exports = router;