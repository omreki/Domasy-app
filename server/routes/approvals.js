const express = require('express');
const router = express.Router();
const {
    getWorkflow,
    approveStage,
    rejectStage,
    requestChanges,
    getPendingApprovals,
    getApprovalHistory
} = require('../controllers/approvalsController');
const { protect, authorize } = require('../middleware/auth');

router.get('/pending', protect, authorize('Approver', 'Super Admin'), getPendingApprovals);
router.get('/document/:documentId', protect, getWorkflow);
router.get('/document/:documentId/history', protect, getApprovalHistory);

router.post('/:workflowId/approve', protect, authorize('Approver', 'Super Admin'), approveStage);
router.post('/:workflowId/reject', protect, authorize('Approver', 'Super Admin'), rejectStage);
router.post('/:workflowId/request-changes', protect, authorize('Approver', 'Super Admin'), requestChanges);

module.exports = router;
