const router = require('express').Router();

router.use('/auth',         require('./auth.routes'));
router.use('/clubs',        require('./club.routes'));
router.use('/events',       require('./event.routes'));
router.use('/lost-found',   require('./lostFound.routes'));
router.use('/marketplace',  require('./marketplace.routes'));
router.use('/notes',        require('./notes.routes'));
router.use('/forum',        require('./forum.routes'));
router.use('/announcements',require('./announcement.routes'));
router.use('/chat',         require('./chat.routes'));
router.use('/admin',        require('./admin.routes'));
router.use('/reports',      require('./report.routes'));

module.exports = router;