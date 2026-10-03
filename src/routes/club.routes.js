const router = require('express').Router();
const { body } = require('express-validator');
const auth = require('../middlewares/auth.middleware');
const { allow } = require('../middlewares/role.middleware');
const validate = require('../middlewares/validate.middleware');
const c = require('../controllers/club.controller');

router.get('/', auth, c.listClubs);
router.get('/:id', auth, c.getClub);
router.get('/:id/members', auth, c.listMembers);

router.post(
  '/',
  auth,
  allow('admin'),
  validate([body('name').trim().notEmpty()]),
  c.createClub
);

router.put('/:id', auth, allow('admin'), c.updateClub);
router.delete('/:id', auth, allow('admin'), c.deleteClub);

router.post('/:id/join', auth, c.joinClub);
router.delete('/:id/leave', auth, c.leaveClub);

module.exports = router;