const router = require('express').Router();
const { body } = require('express-validator');
const auth = require('../middlewares/auth.middleware');
const validate = require('../middlewares/validate.middleware');
const { uploadImage } = require('../middlewares/upload.middleware');
const c = require('../controllers/marketplace.controller');

router.get('/', auth, c.list);
router.get('/:id', auth, c.getOne);

router.post(
  '/',
  auth,
  uploadImage.single('image'),
  validate([
    body('title').trim().notEmpty(),
    body('price').isFloat({ min: 0 }),
  ]),
  c.create
);

router.put('/:id', auth, c.update);
router.patch('/:id/sold', auth, c.markSold);
router.delete('/:id', auth, c.remove);

module.exports = router;