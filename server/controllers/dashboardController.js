const DocumentService = require('../services/DocumentService');
const ProjectService = require('../services/ProjectService');
const UserService = require('../services/UserService');
const AuditLogService = require('../services/AuditLogService');
const ApprovalWorkflowService = require('../services/ApprovalWorkflowService');

// @desc    Get dashboard statistics
// @route   GET /api/dashboard/stats
// @access  Private
exports.getDashboardStats = async (req, res) => {
    console.log(`[Dashboard] Fetching stats for user: ${req.user.email} (${req.user.role})`);

    try {
        // Sequential fetch with individual error handling to prevent total failure
        let totalDocuments = 0, activeProjects = 0, activeUsers = 0, pendingApprovals = 0;
        let recentDocuments = [], recentActivity = [];

        try { totalDocuments = await DocumentService.count(); }
        catch (e) { console.error('[Dashboard] Doc count failed:', e.message); }

        try { activeProjects = await ProjectService.count({ status: 'Active' }); }
        catch (e) { console.error('[Dashboard] Project count failed:', e.message); }

        try { activeUsers = await UserService.count(); }
        catch (e) { console.error('[Dashboard] User count failed:', e.message); }

        try { recentDocuments = await DocumentService.getAll({}, { limit: 5 }); }
        catch (e) { console.error('[Dashboard] Doc fetch failed:', e.message); }

        try { recentActivity = await AuditLogService.getAll({}, { limit: 5 }); }
        catch (e) { console.error('[Dashboard] Activity fetch failed:', e.message); }

        // Pending approvals count
        try {
            if (req.user.role === 'Approver' || req.user.role === 'Super Admin') {
                const workflows = await ApprovalWorkflowService.getPendingForUser(req.user.id);
                pendingApprovals = workflows.length;
            }
        } catch (e) {
            console.error('[Dashboard] Approvals fetch failed:', e.message);
        }

        // Manually Populate Recent Documents User
        const populatedRecentDocuments = await Promise.all(recentDocuments.map(async doc => {
            let user = { name: 'Unknown' };
            try {
                if (doc.uploaded_by) {
                    const uid = typeof doc.uploaded_by === 'object' ? doc.uploaded_by.id : doc.uploaded_by;
                    if (uid) {
                        const u = await UserService.findById(uid);
                        if (u) user = { name: u.name, avatar: u.avatar };
                    }
                }
            } catch (e) {
                console.error(`[Dashboard] Failed to populate user for doc ${doc.id}:`, e.message);
            }
            return { ...doc, _id: doc.id, uploadedBy: user };
        }));

        // Manually Populate Recent Activity User
        const populatedRecentActivity = await Promise.all(recentActivity.map(async logItem => {
            let user = { name: 'Unknown' };
            try {
                if (logItem.user_id) {
                    const uid = typeof logItem.user_id === 'object' ? logItem.user_id.id : logItem.user_id;
                    if (uid) {
                        const u = await UserService.findById(uid);
                        if (u) user = { name: u.name, avatar: u.avatar, role: u.role };
                    }
                }
            } catch (e) {
                console.error(`[Dashboard] Failed to populate user for audit log ${logItem.id}:`, e.message);
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
        console.error('[Dashboard] Global failure:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to aggregate dashboard data: ' + error.message
        });
    }
};
