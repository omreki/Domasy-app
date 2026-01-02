const AuditLogService = require('../services/AuditLogService');
const UserService = require('../services/UserService');

// Helper to populate audit logs
const populateAuditLogs = async (logs) => {
    const userIds = new Set();
    logs.forEach(log => {
        const uid = log.user_id || log.user;
        if (uid) userIds.add(uid);
    });

    const usersMap = {};
    for (const uid of userIds) {
        if (uid) {
            const u = await UserService.findById(uid);
            if (u) {
                usersMap[uid] = {
                    id: u.id,
                    _id: u.id,
                    name: u.name,
                    email: u.email,
                    avatar: u.avatar,
                    role: u.role,
                    department: u.department
                };
            }
        }
    }

    return logs.map(log => {
        const uid = log.user_id || log.user;
        const user = usersMap[uid] || { name: 'Unknown', email: 'unknown' };

        const docId = log.document_id || log.document;
        const document = docId ? { _id: docId, id: docId, title: log.document_title || log.documentTitle || 'Untitled' } : null;

        return {
            ...log,
            _id: log.id,
            user,
            document
        };
    });
};

// @desc    Get all audit logs
// @route   GET /api/audit
// @access  Private
exports.getAuditLogs = async (req, res) => {
    try {
        const { user, action, startDate, endDate, page = 1, limit = 50 } = req.query;

        const filters = { user, action, startDate, endDate };
        const logs = await AuditLogService.getAll(filters, { page, limit });
        const count = await AuditLogService.count(filters);

        const populatedLogs = await populateAuditLogs(logs);

        res.status(200).json({
            success: true,
            count: populatedLogs.length,
            total: count,
            totalPages: Math.ceil(count / limit),
            currentPage: page,
            data: { logs: populatedLogs }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};
