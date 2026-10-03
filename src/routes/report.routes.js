const router = require('express').Router();
const { body } = require('express-validator');
const auth = require('../middlewares/auth.middleware');
const validate = require('../middlewares/validate.middleware');
const c = require('../controllers/admin.controller');

router.post(
  '/',
  auth,
  validate([
    body('entity_type').isIn(['marketplace','forum_thread','forum_reply','lost_found','message']),
    body('entity_id').isInt(),
  ]),
  c.createReport
);

module.exports = router;