const router = require('express').Router();
const { body } = require('express-validator');
const auth = require('../middlewares/auth.middleware');
const { allow } = require('../middlewares/role.middleware');
const validate = require('../middlewares/validate.middleware');
const c = require('../controllers/announcement.controller');

router.get('/', auth, c.list);

router.post(
  '/',
  auth,
  allow('admin'),
  validate([
    body('title').trim().notEmpty(),
    body('body').trim().notEmpty(),
    body('audience').optional().isIn(['all', 'department', 'club']),
  ]),
  c.create
);

router.delete('/:id', auth, allow('admin'), c.remove);

module.exports = router;