const router = require('express').Router();
const { body } = require('express-validator');
const auth = require('../middlewares/auth.middleware');
const { allow } = require('../middlewares/role.middleware');
const validate = require('../middlewares/validate.middleware');
const c = require('../controllers/event.controller');

router.get('/', auth, c.listEvents);
router.get('/:id', auth, c.getEvent);

router.post(
  '/',
  auth,
  allow('admin'),
  validate([
    body('title').trim().notEmpty(),
    body('event_date').isISO8601().withMessage('event_date must be a valid date'),
  ]),
  c.createEvent
);

router.put('/:id', auth, allow('admin'), c.updateEvent);
router.delete('/:id', auth, allow('admin'), c.deleteEvent);

router.post('/:id/register', auth, c.registerForEvent);
router.delete('/:id/register', auth, c.cancelRegistration);
router.get('/:id/registrations', auth, allow('admin'), c.listRegistrations);

module.exports = router;