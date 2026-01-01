const DocumentService = require('../services/DocumentService');
const ProjectService = require('../services/ProjectService');
const UserService = require('../services/UserService');
const AuditLogService = require('../services/AuditLogService');
const ApprovalWorkflowService = require('../services/ApprovalWorkflowService');

// @desc    Get dashboard statistics
// @route   GET /api/dashboard/stats
// @access  Private
exports.getDashboardStats = async (req, res) => {
    try {
        // Sequential fetch for dashboard stats to prevent hanging
        const totalDocuments = await DocumentService.count();
        const activeProjects = await ProjectService.count({ status: 'Active' });
        const activeUsers = await UserService.count({ status: 'Active' });
        const recentDocuments = await DocumentService.getAll({}, { limit: 5 });
        const recentActivity = await AuditLogService.getAll({}, { limit: 5 });

        // Pending approvals count
        let pendingApprovals = 0;
        if (req.user.role === 'Approver' || req.user.role === 'Super Admin') {
            const workflows = await ApprovalWorkflowService.getPendingForUser(req.user.id);
            pendingApprovals = workflows.length;
        }

        // Manually Populate Recent Documents User
        const populatedRecentDocuments = await Promise.all(recentDocuments.map(async doc => {
            let user = { name: 'Unknown' };
            if (doc.uploadedBy) {
                // If it's already an object (from some previous populate?), extract ID
                const uid = typeof doc.uploadedBy === 'object' ? doc.uploadedBy.id || doc.uploadedBy._id : doc.uploadedBy;
                if (uid) {
                    const u = await UserService.findById(uid);
                    if (u) user = { name: u.name, avatar: u.avatar };
                }
            }
            return { ...doc, _id: doc.id, uploadedBy: user };
        }));

        // Manually Populate Recent Activity User
        const populatedRecentActivity = await Promise.all(recentActivity.map(async logItem => {
            let user = { name: 'Unknown' };
            if (logItem.user) {
                const uid = typeof logItem.user === 'object' ? logItem.user.id : logItem.user;
                if (uid) {
                    const u = await UserService.findById(uid);
                    if (u) user = { name: u.name, avatar: u.avatar, role: u.role };
                }
            }
            return { ...logItem, _id: logItem.id, user };
        }));

        res.status(200).json({
            success: true,
            data: {
                stats: {
                    totalDocuments,
                    pendingApprovals,
                    activeProjects,
                    activeUsers
                },
                recentDocuments: populatedRecentDocuments,
                recentActivity: populatedRecentActivity
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};
