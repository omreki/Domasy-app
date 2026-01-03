const ApprovalWorkflowService = require('../services/ApprovalWorkflowService');
const DocumentService = require('../services/DocumentService');
const AuditLogService = require('../services/AuditLogService');
const UserService = require('../services/UserService');
const NotificationService = require('../services/notificationService');
const EmailService = require('../services/emailService');

// Helper to populate workflow assignees
const populateWorkflowAssignees = async (workflow) => {
    if (!workflow || !workflow.stages) return workflow;

    const stages = await Promise.all(workflow.stages.map(async stage => {
        if (stage.assignee) {
            const user = await UserService.findById(stage.assignee);
            if (user) {
                return {
                    ...stage,
                    assignee: {
                        id: user.id,
                        _id: user.id, // Compatibility
                        name: user.name,
                        email: user.email,
                        avatar: user.avatar,
                        role: user.role,
                        department: user.department
                    }
                };
            }
        }
        return stage;
    }));

    // Populate document title/status
    let documentObj = workflow.document;
    if (typeof workflow.document === 'string') {
        const doc = await DocumentService.findById(workflow.document);
        if (doc) {
            documentObj = {
                id: doc.id,
                _id: doc.id,
                title: doc.title,
                status: doc.status,
                category: doc.category,
                uploadedBy: doc.uploadedBy,
                createdAt: doc.createdAt
            };
        }
    }

    return { ...workflow, stages, document: documentObj, _id: workflow.id };
};

// @desc    Get approval workflow for a document
// @route   GET /api/approvals/document/:documentId
// @access  Private
exports.getWorkflow = async (req, res) => {
    try {
        const workflowData = await ApprovalWorkflowService.findByDocumentId(req.params.documentId);

        if (!workflowData) {
            return res.status(404).json({
                success: false,
                message: 'Approval workflow not found'
            });
        }

        const workflow = await populateWorkflowAssignees(workflowData);

        res.status(200).json({
            success: true,
            data: { workflow }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// @desc    Approve document at current stage
// @route   POST /api/approvals/:workflowId/approve
// @access  Private
exports.approveStage = async (req, res) => {
    try {
        const { note } = req.body;
        const workflowData = await ApprovalWorkflowService.findById(req.params.workflowId);

        if (!workflowData) {
            return res.status(404).json({
                success: false,
                message: 'Approval workflow not found'
            });
        }

        // Logic to approve current stage
        const currentStageIdx = workflowData.current_stage_index ?? workflowData.currentStageIndex ?? 0;
        const currentStage = workflowData.stages[currentStageIdx];

        // Authorization check - Allow assignee, Super Admin, or Approver role
        // Handle assignee as either string ID or object with id property
        const assigneeId = typeof currentStage.assignee === 'object'
            ? (currentStage.assignee.id || currentStage.assignee._id)
            : currentStage.assignee;
        const isAssignee = assigneeId && String(assigneeId) === String(req.user.id);
        const isSuperAdmin = req.user.role === 'Super Admin';
        const isApproverRole = req.user.role === 'Approver';

        // Check if user is any pending reviewer in this workflow
        const isPendingReviewer = workflowData.stages.some(stage => {
            if (stage.status === 'current' || stage.status === 'pending') {
                const stageAssignee = typeof stage.assignee === 'object'
                    ? (stage.assignee.id || stage.assignee._id)
                    : stage.assignee;
                return stageAssignee && String(stageAssignee) === String(req.user.id);
            }
            return false;
        });

        if (!isAssignee && !isPendingReviewer && !isSuperAdmin && !isApproverRole) {
            return res.status(403).json({
                success: false,
                message: 'You are not authorized to approve this stage'
            });
        }

        // Update stage
        const stages = [...workflowData.stages];
        stages[currentStageIdx] = {
            ...stages[currentStageIdx],
            status: 'completed',
            action: 'Approved',
            note: note || 'Approved',
            actionDate: Date.now()
        };

        let overallStatus = workflowData.overall_status || workflowData.overallStatus;
        let nextStageIdx = currentStageIdx;
        let docStatus = 'In Review';
        let currentApprover = null;

        if (currentStageIdx < stages.length - 1) {
            nextStageIdx++;
            stages[nextStageIdx].status = 'current';
            currentApprover = stages[nextStageIdx].assignee;
        } else {
            overallStatus = 'Approved';
            docStatus = 'Approved';
        }

        // Save Workflow
        const updatedWorkflowData = await ApprovalWorkflowService.update(req.params.workflowId, {
            stages,
            currentStageIndex: nextStageIdx,
            overallStatus
        });

        // Update Document
        const documentId = workflowData.document_id || workflowData.document;
        const document = await DocumentService.findById(documentId);
        if (document) {
            await DocumentService.update(documentId, {
                status: docStatus,
                currentApprover: currentApprover
            });

            // Audit Log
            await AuditLogService.create({
                user: req.user.id,
                action: 'Approved',
                actionType: 'success',
                document: document.id,
                documentTitle: document.title,
                details: note || 'Review complete. Document approved.',
                ipAddress: req.ip
            });

            // Notifications
            // Notifications & Emails
            if (currentApprover) {
                // Notify next approver
                const approverId = typeof currentApprover === 'object' ? (currentApprover.id || currentApprover._id) : currentApprover;
                const approverUser = await UserService.findById(approverId);

                await NotificationService.createNotification(approverId, {
                    title: 'Document Pending Review',
                    message: `You have a new document "${document.title}" awaiting your approval.`,
                    type: 'info',
                    link: `document:${document.id}`
                });

                if (approverUser) {
                    await EmailService.sendApprovalRequestEmail(approverUser, document);
                }

                // Notify uploader of Stage Approval
                const uploaderId = typeof document.uploaded_by === 'object' ? (document.uploaded_by.id || document.uploaded_by._id) : (document.uploaded_by || document.uploadedBy);
                if (uploaderId) {
                    const uploader = await UserService.findById(uploaderId);
                    if (uploader) {
                        await EmailService.sendDocumentApprovedEmail(uploader, document, req.user, false);
                    }
                }

            } else if (docStatus === 'Approved') {
                // Notify uploader of Final Approval
                const uploaderId = typeof document.uploaded_by === 'object' ? (document.uploaded_by.id || document.uploaded_by._id) : (document.uploaded_by || document.uploadedBy);
                if (uploaderId) {
                    await NotificationService.createNotification(uploaderId, {
                        title: 'Document Approved',
                        message: `Your document "${document.title}" has been fully approved.`,
                        type: 'success',
                        link: `document:${document.id}`
                    });
                    // Email
                    const uploader = await UserService.findById(uploaderId);
                    if (uploader) {
                        await EmailService.sendDocumentApprovedEmail(uploader, document, req.user, true);
                    }
                }
            }
        }

        const workflow = await populateWorkflowAssignees(updatedWorkflowData);

        res.status(200).json({
            success: true,
            message: 'Document approved successfully',
            data: { workflow }
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

// @desc    Reject document at current stage
// @route   POST /api/approvals/:workflowId/reject
// @access  Private
exports.rejectStage = async (req, res) => {
    try {
        const { note } = req.body;
        if (!note) return res.status(400).json({ success: false, message: 'Reason required' });

        const workflowData = await ApprovalWorkflowService.findById(req.params.workflowId);
        if (!workflowData) return res.status(404).json({ success: false, message: 'Not found' });

        const currentStageIdx = workflowData.current_stage_index ?? workflowData.currentStageIndex ?? 0;
        const currentStage = workflowData.stages[currentStageIdx];

        // Authorization check - Allow assignee, Super Admin, or Approver role
        const assigneeId = typeof currentStage.assignee === 'object'
            ? (currentStage.assignee.id || currentStage.assignee._id)
            : currentStage.assignee;
        const isAssignee = assigneeId && String(assigneeId) === String(req.user.id);
        const isSuperAdmin = req.user.role === 'Super Admin';
        const isApproverRole = req.user.role === 'Approver';

        const isPendingReviewer = workflowData.stages.some(stage => {
            if (stage.status === 'current' || stage.status === 'pending') {
                const stageAssignee = typeof stage.assignee === 'object'
                    ? (stage.assignee.id || stage.assignee._id)
                    : stage.assignee;
                return stageAssignee && String(stageAssignee) === String(req.user.id);
            }
            return false;
        });

        if (!isAssignee && !isPendingReviewer && !isSuperAdmin && !isApproverRole) {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }

        const stages = [...workflowData.stages];
        stages[currentStageIdx] = {
            ...stages[currentStageIdx],
            status: 'rejected',
            action: 'Rejected',
            note: note,
            actionDate: Date.now()
        };

        const updatedWorkflowData = await ApprovalWorkflowService.update(req.params.workflowId, {
            stages,
            overallStatus: 'Rejected'
        });

        const documentId = workflowData.document_id || workflowData.document;
        const document = await DocumentService.findById(documentId);
        if (document) {
            await DocumentService.update(documentId, {
                status: 'Rejected',
                currentApprover: null
            });

            await AuditLogService.create({
                user: req.user.id,
                action: 'Rejected',
                actionType: 'error',
                document: document.id,
                documentTitle: document.title,
                details: note,
                ipAddress: req.ip
            });

            // Notification for uploader
            const uploaderId = typeof document.uploaded_by === 'object' ? (document.uploaded_by.id || document.uploaded_by._id) : (document.uploaded_by || document.uploadedBy);
            if (uploaderId) {
                await NotificationService.createNotification(uploaderId, {
                    title: 'Document Rejected',
                    message: `Your document "${document.title}" has been rejected. Reason: ${note}`,
                    type: 'error',
                    link: `document:${document.id}`
                });

                // Email
                const uploader = await UserService.findById(uploaderId);
                if (uploader) {
                    await EmailService.sendDocumentRejectedEmail(uploader, document, req.user, note);
                }
            }
        }

        const workflow = await populateWorkflowAssignees(updatedWorkflowData);

        res.status(200).json({
            success: true,
            message: 'Document rejected',
            data: { workflow }
        });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

// @desc    Request changes for document
// @route   POST /api/approvals/:workflowId/request-changes
// @access  Private
exports.requestChanges = async (req, res) => {
    try {
        const { note } = req.body;
        if (!note) return res.status(400).json({ success: false, message: 'Details required' });

        const workflowData = await ApprovalWorkflowService.findById(req.params.workflowId);
        if (!workflowData) return res.status(404).json({ success: false, message: 'Not found' });

        const currentStageIdx = workflowData.current_stage_index ?? workflowData.currentStageIndex ?? 0;
        const currentStage = workflowData.stages[currentStageIdx];

        // Authorization check - Allow assignee, Super Admin, or Approver role
        const assigneeId = typeof currentStage.assignee === 'object'
            ? (currentStage.assignee.id || currentStage.assignee._id)
            : currentStage.assignee;
        const isAssignee = assigneeId && String(assigneeId) === String(req.user.id);
        const isSuperAdmin = req.user.role === 'Super Admin';
        const isApproverRole = req.user.role === 'Approver';

        const isPendingReviewer = workflowData.stages.some(stage => {
            if (stage.status === 'current' || stage.status === 'pending') {
                const stageAssignee = typeof stage.assignee === 'object'
                    ? (stage.assignee.id || stage.assignee._id)
                    : stage.assignee;
                return stageAssignee && String(stageAssignee) === String(req.user.id);
            }
            return false;
        });

        if (!isAssignee && !isPendingReviewer && !isSuperAdmin && !isApproverRole) {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }

        const stages = [...workflowData.stages];
        stages[currentStageIdx] = {
            ...stages[currentStageIdx],
            action: 'Changes Requested',
            note: note,
            actionDate: Date.now()
        };

        // We usually don't move index, but we change overall status
        const updatedWorkflowData = await ApprovalWorkflowService.update(req.params.workflowId, {
            stages,
            overallStatus: 'Changes Requested'
        });

        const documentId = workflowData.document_id || workflowData.document;
        const document = await DocumentService.findById(documentId);
        if (document) {
            await DocumentService.update(documentId, { status: 'Changes Requested' });

            await AuditLogService.create({
                user: req.user.id,
                action: 'Changes Requested',
                actionType: 'warning',
                document: document.id,
                documentTitle: document.title,
                details: note,
                ipAddress: req.ip
            });

            // Notification for uploader
            const uploaderId = typeof document.uploaded_by === 'object' ? (document.uploaded_by.id || document.uploaded_by._id) : (document.uploaded_by || document.uploadedBy);
            if (uploaderId) {
                await NotificationService.createNotification(uploaderId, {
                    title: 'Changes Requested',
                    message: `Changes have been requested for your document "${document.title}". Note: ${note}`,
                    type: 'warning',
                    link: `document:${document.id}`
                });

                // Email
                const uploader = await UserService.findById(uploaderId);
                if (uploader) {
                    await EmailService.sendChangesRequestedEmail(uploader, document, req.user, note);
                }
            }
        }

        const workflow = await populateWorkflowAssignees(updatedWorkflowData);

        res.status(200).json({
            success: true,
            message: 'Changes requested',
            data: { workflow }
        });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

// @desc    Get all pending approvals for current user
// @route   GET /api/approvals/pending
// @access  Private
exports.getPendingApprovals = async (req, res) => {
    try {
        const pendingWorkflows = await ApprovalWorkflowService.getPendingForUser(req.user.id);

        const populatedWorkflows = await Promise.all(pendingWorkflows.map(populateWorkflowAssignees));

        res.status(200).json({
            success: true,
            count: populatedWorkflows.length,
            data: { workflows: populatedWorkflows }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get approval history for a document
// @route   GET /api/approvals/document/:documentId/history
// @access  Private
exports.getApprovalHistory = async (req, res) => {
    try {
        const workflowData = await ApprovalWorkflowService.findByDocumentId(req.params.documentId);
        if (!workflowData) return res.status(404).json({ success: false, message: 'Not found' });

        const workflow = await populateWorkflowAssignees(workflowData);

        const history = workflow.stages.filter(stage =>
            stage.status === 'completed' || stage.status === 'rejected'
        );

        res.status(200).json({
            success: true,
            data: { history }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
