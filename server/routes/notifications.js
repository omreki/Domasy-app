const express = require('express');
const router = express.Router();
const notificationsController = require('../controllers/notificationsController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.get('/', notificationsController.getNotifications);
router.put('/:id/read', notificationsController.markAsRead);
router.post('/mark-all-read', notificationsController.markAllAsRead);
router.delete('/:id', notificationsController.deleteNotification);

module.exports = router;
