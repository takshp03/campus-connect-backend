const router = require('express').Router();
const { body } = require('express-validator');
const auth = require('../middlewares/auth.middleware');
const { allow } = require('../middlewares/role.middleware');
const validate = require('../middlewares/validate.middleware');
const c = require('../controllers/admin.controller');

// All admin routes require auth + admin role
router.use(auth, allow('admin'));

router.get('/stats', c.stats);

router.get('/students', c.listStudents);
router.patch('/students/:id/toggle', c.toggleStudentActive);
router.patch('/students/:id/promote', c.promoteToAdmin);

router.get('/reports', c.listReports);
router.patch(
  '/reports/:id',
  validate([body('status').isIn(['pending', 'reviewed', 'dismissed'])]),
  c.updateReportStatus
);

module.exports = router;