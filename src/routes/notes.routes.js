const router = require('express').Router();
const { body } = require('express-validator');
const auth = require('../middlewares/auth.middleware');
const validate = require('../middlewares/validate.middleware');
const { uploadDoc } = require('../middlewares/upload.middleware');
const c = require('../controllers/notes.controller');

router.get('/', auth, c.list);
router.get('/:id', auth, c.getOne);

router.post(
  '/',
  auth,
  uploadDoc.single('file'),
  validate([body('title').trim().notEmpty()]),
  c.create
);

router.delete('/:id', auth, c.remove);

module.exports = router;