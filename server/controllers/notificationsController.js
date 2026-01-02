const NotificationService = require('../services/notificationService');

exports.getNotifications = async (req, res) => {
    try {
        const result = await NotificationService.getNotifications(req.user.id);
        if (!result.success) throw new Error(result.error);
        res.json({ success: true, data: result.data });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.markAsRead = async (req, res) => {
    try {
        const result = await NotificationService.markAsRead(req.params.id, req.user.id);
        if (!result.success) throw new Error(result.error);
        res.json({ success: true, data: result.data });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.markAllAsRead = async (req, res) => {
    try {
        const result = await NotificationService.markAllAsRead(req.user.id);
        if (!result.success) throw new Error(result.error);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.deleteNotification = async (req, res) => {
    try {
        const result = await NotificationService.deleteNotification(req.params.id, req.user.id);
        if (!result.success) throw new Error(result.error);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
