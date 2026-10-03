const router = require('express').Router();
const { body } = require('express-validator');
const auth = require('../middlewares/auth.middleware');
const { allow } = require('../middlewares/role.middleware');
const validate = require('../middlewares/validate.middleware');
const c = require('../controllers/forum.controller');

router.get('/threads', auth, c.listThreads);
router.get('/threads/:id', auth, c.getThread);
router.post(
  '/threads',
  auth,
  validate([
    body('title').trim().notEmpty(),
    body('body').trim().notEmpty(),
  ]),
  c.createThread
);
router.delete('/threads/:id', auth, c.deleteThread);
router.patch('/threads/:id/lock', auth, allow('admin'), c.toggleLockThread);

router.post(
  '/threads/:id/replies',
  auth,
  validate([body('body').trim().notEmpty()]),
  c.addReply
);
router.delete('/replies/:id', auth, c.deleteReply);

module.exports = router;