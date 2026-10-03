const router = require('express').Router();
const { body } = require('express-validator');
const auth = require('../middlewares/auth.middleware');
const validate = require('../middlewares/validate.middleware');
const c = require('../controllers/chat.controller');

router.get('/conversations', auth, c.listConversations);
router.get('/conversations/:userId', auth, c.getConversation);

router.post(
  '/messages',
  auth,
  validate([
    body('receiver_id').isInt(),
    body('body').trim().notEmpty(),
  ]),
  c.sendMessage
);

module.exports = router;