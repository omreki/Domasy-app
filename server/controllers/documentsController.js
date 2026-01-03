const DocumentService = require('../services/DocumentService');
const ApprovalWorkflowService = require('../services/ApprovalWorkflowService');
const AuditLogService = require('../services/AuditLogService');
const UserService = require('../services/UserService');
const ProjectService = require('../services/ProjectService');
const EmailService = require('../services/emailService');
const path = require('path');
const fs = require('fs');
const supabase = require('../config/supabase');
const { generateThumbnail } = require('../utils/thumbnailGenerator');


const { populateDocumentUsers } = require('../utils/population');

// @desc    Get all documents
// @route   GET /api/documents
// @access  Private
exports.getDocuments = async (req, res) => {
    try {
        const { category, status, search, page = 1, limit = 20 } = req.query;

        // Build filters
        let filters = {};
        if (category) filters.category = category;
        if (status) filters.status = status;
        if (search) filters.search = search;

        // Role-based filtering handled in logic logic or Service?
        // Service has basic filters. Let's add role logic here.
        if (req.user.role === 'Viewer') {
            // Viewers: Approved OR uploadedBy me. 
            // Firestore OR queries are limited.
            // For now, let's fetch matching base filters and then filter in memory for role access.
            // This is not efficient for scaling but okay for demo.
        } else if (req.user.role === 'Editor') {
            // Editors: uploadedBy me OR Approved
        }

        const documents = await DocumentService.getAll(filters, { page, limit });
        const total = await DocumentService.count(filters);

        // Apply In-Memory Role Filtering if needed
        let filteredDocs = documents;
        if (req.user.role === 'Viewer' || req.user.role === 'Editor') {
            filteredDocs = documents.filter(d => {
                const isApproved = d.status === 'Approved';
                const isUploader = (d.uploaded_by && d.uploaded_by.toString() === req.user.id.toString()) ||
                    (d.uploadedBy && d.uploadedBy.toString() === req.user.id.toString());
                return isApproved || isUploader;
            });
        }

        const finalDocs = await populateDocumentUsers(filteredDocs);

        res.status(200).json({
            success: true,
            count: finalDocs.length,
            total: total, // Approximate total based on query
            totalPages: Math.ceil(total / limit),
            currentPage: page,
            data: { documents: finalDocs }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// @desc    Get single document
// @route   GET /api/documents/:id
// @access  Private
exports.getDocument = async (req, res) => {
    try {
        const document = await DocumentService.findById(req.params.id);

        if (!document) {
            return res.status(404).json({
                success: false,
                message: 'Document not found'
            });
        }

        // Manual populate
        const [populatedDoc] = await populateDocumentUsers([document]);

        if (populatedDoc.uploadedBy && typeof populatedDoc.uploadedBy === 'string') {
            // If manual populate failed / wasn't objectified yet for some reason
        }

        // Get approval workflow
        const workflowData = await ApprovalWorkflowService.findByDocumentId(document.id);
        let workflow = null;
        if (workflowData) {
            // Populate assignees in workflow stages
            const stages = await Promise.all(workflowData.stages.map(async stage => {
                if (stage.assignee) {
                    const u = await UserService.findById(stage.assignee);
                    if (u) {
                        const userObj = { id: u.id, _id: u.id, name: u.name, email: u.email, avatar: u.avatar, role: u.role, department: u.department };
                        return { ...stage, assignee: userObj };
                    }
                }
                return stage;
            }));
            workflow = { ...workflowData, stages, _id: workflowData.id };
        }

        res.status(200).json({
            success: true,
            data: {
                document: populatedDoc,
                workflow
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// @desc    Upload document
// @route   POST /api/documents
// @access  Private
exports.uploadDocument = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'Please upload a file'
            });
        }

        const { title, description, category, tags, approvalStage, project, currentApprover, reviewers } = req.body;

        // Use tags as category if category is missing (from frontend mismatch)
        const finalCategory = category || tags || 'General';
        const finalTags = Array.isArray(tags) ? tags : (tags ? [tags] : [finalCategory]);

        console.log('[Upload] Full req.body:', JSON.stringify(req.body));

        // Parse reviewers if provided as JSON string or array
        let rawReviewers = reviewers || req.body['reviewers[]'] || req.body.reviewer;
        let reviewerIds = [];
        console.log('[Upload] Received reviewers field:', typeof rawReviewers, rawReviewers);

        if (rawReviewers) {
            if (Array.isArray(rawReviewers)) {
                reviewerIds = rawReviewers;
            } else if (typeof rawReviewers === 'string') {
                try {
                    reviewerIds = JSON.parse(rawReviewers);
                } catch (e) {
                    if (rawReviewers.trim()) {
                        reviewerIds = [rawReviewers];
                    }
                }
            }
        }

        // Final cleanup: Ensure all elements are strings and not empty
        reviewerIds = (Array.isArray(reviewerIds) ? reviewerIds : [reviewerIds])
            .map(id => (id !== null && id !== undefined) ? String(id) : '')
            .filter(id => id.trim() !== '' && id !== 'undefined' && id !== 'null');

        console.log('[Upload] Final parsed reviewerIds:', reviewerIds);

        // Generate thumbnail for PDF
        let thumbnail = null;
        if (req.file && req.file.mimetype === 'application/pdf') {
            thumbnail = await generateThumbnail(req.file);
        }

        // Default title to filename if missing or generic 'New Upload'
        let finalTitle = title;
        if (!finalTitle || finalTitle.trim() === '' || finalTitle.toLowerCase() === 'new upload') {
            finalTitle = req.file ? req.file.originalname : 'Untitled Document';
        }

        const docData = {
            title: finalTitle,
            description,
            category: finalCategory,
            approvalStage: approvalStage || 'Manager Review',
            project,
            currentApprover: reviewerIds.length > 0 ? reviewerIds[0] : currentApprover,
            uploadedBy: req.user.id,
            status: reviewerIds.length > 0 ? 'In Review' : 'Uploaded',
            tags: finalTags,
            thumbnail
        };

        console.log(`[Upload] Document data prepared. Status: ${docData.status}, Reviewers count: ${reviewerIds.length}`);

        const document = await DocumentService.create(docData, req.file);
        console.log('[Upload] Document created with ID:', document.id);

        // Create approval workflow with reviewer stages
        const workflowStages = [
            {
                name: 'Draft Submission',
                assignee: req.user.id,
                department: req.user.department || 'Submitter',
                status: 'completed',
                action: 'Approved',
                note: `${req.user.name} submitted version 1.0`,
                actionDate: Date.now(),
                order: 1
            }
        ];

        // Add stages for each reviewer
        if (reviewerIds.length > 0) {
            for (let i = 0; i < reviewerIds.length; i++) {
                const reviewerId = reviewerIds[i];
                const reviewer = await UserService.findById(reviewerId);

                workflowStages.push({
                    name: reviewer ? `${reviewer.name} Review` : `Review Stage ${i + 1}`,
                    assignee: reviewerId,
                    department: reviewer?.department || 'Review',
                    status: i === 0 ? 'current' : 'pending',
                    order: i + 2
                });
            }
        } else {
            // Default single stage if no reviewers specified
            workflowStages.push({
                name: approvalStage || 'Manager Review',
                assignee: currentApprover || req.user.id,
                department: 'Management',
                status: 'current',
                order: 2
            });
        }

        console.log('[Upload] Creating workflow with stages count:', workflowStages.length, 'for doc:', document.id);

        const workflow = await ApprovalWorkflowService.create({
            document: document.id,
            stages: workflowStages,
            currentStageIndex: 1, // Start at first review stage
            overallStatus: 'In Progress'
        });

        console.log('[Upload] Workflow created with ID:', workflow.id);

        await AuditLogService.create({
            user: req.user.id,
            action: 'Uploaded',
            actionType: 'success',
            document: document.id,
            documentTitle: document.title,
            details: `New document uploaded${reviewerIds.length > 0 ? ` with ${reviewerIds.length} reviewer(s)` : ''}`,
            ipAddress: req.ip
        });

        // Populate with safety check for newly created workflows
        let [populatedDoc] = await populateDocumentUsers([document]);

        // Safety Fallback: If workflow wasn't picked up by populateDocumentUsers (race condition),
        // manually attach team members for the response
        if (populatedDoc && (!populatedDoc.teamMembers || populatedDoc.teamMembers.length === 0) && reviewerIds.length > 0) {
            console.log(`[Upload] Population fallback triggered for doc ${document.id}`);
            const { data: teamUsers, error: teamError } = await supabase
                .from('users')
                .select('id, name, email, avatar, role')
                .in('id', reviewerIds);

            if (!teamError && teamUsers) {
                populatedDoc.teamMembers = teamUsers;
                console.log(`[Upload] Manually attached ${teamUsers.length} team members`);
            }
        }

        // --- EMAIL NOTIFICATIONS for UPLOAD ---
        setImmediate(async () => {
            try {
                // 1. Fetch full user objects for reviewers if we only have IDs so far
                // populatedDoc.teamMembers might handle it, but let's be safe
                let recipients = [];
                if (reviewerIds.length > 0) {
                    // We can try to reuse populatedDoc.teamMembers if available
                    if (populatedDoc && populatedDoc.teamMembers) {
                        recipients = populatedDoc.teamMembers;
                    } else {
                        // Fetch manual
                        const { data } = await supabase.from('users').select('*').in('id', reviewerIds);
                        recipients = data || [];
                    }
                }

                // 2. Notify all tagged team members that they are part of this document
                if (recipients.length > 0) {
                    await EmailService.sendDocumentUploadedEmail(recipients, document, req.user);
                }

                // 3. Notify the specific Current Approver that action is needed
                // The first reviewer is the current approver
                if (reviewerIds.length > 0) {
                    const firstReviewerId = reviewerIds[0];
                    const firstReviewer = recipients.find(r => r.id === firstReviewerId || r._id === firstReviewerId)
                        || await UserService.findById(firstReviewerId);

                    if (firstReviewer) {
                        await EmailService.sendApprovalRequestEmail(firstReviewer, document);
                    }
                }
            } catch (emailErr) {
                console.error('[Upload] Email notification failed:', emailErr);
            }
        });
        // --------------------------------------

        console.log(`[Documents] Document ${document.id} upload complete. Team: ${populatedDoc.teamMembers?.length || 0}`);

        res.status(201).json({
            success: true,
            message: 'Document uploaded successfully',
            data: {
                document: populatedDoc
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// @desc    Update document
// @route   PUT /api/documents/:id
// @access  Private
exports.updateDocument = async (req, res) => {
    try {
        const document = await DocumentService.findById(req.params.id);

        if (!document) {
            return res.status(404).json({
                success: false,
                message: 'Document not found'
            });
        }

        // Check ownership
        if (document.uploadedBy !== req.user.id && req.user.role !== 'Super Admin' && req.user.role !== 'Editor') {
            return res.status(403).json({
                success: false,
                message: 'Not authorized'
            });
        }

        const { title, description, category, project, reviewers } = req.body;
        const updatedDoc = await DocumentService.update(req.params.id, { title, description, category, project });

        // Update Reviewers / Workflow if provided
        if (reviewers) {
            let newReviewerIds = [];
            try {
                newReviewerIds = JSON.parse(reviewers);
            } catch (e) {
                if (Array.isArray(reviewers)) newReviewerIds = reviewers;
                else if (typeof reviewers === 'string') newReviewerIds = [reviewers];
            }

            // Normalize to strings
            newReviewerIds = newReviewerIds.map(id => String(id)).filter(id => id && id !== 'undefined');

            const workflowData = await ApprovalWorkflowService.findByDocumentId(req.params.id);
            if (workflowData) {
                // 1. Keep completed/history stages
                const historyStages = workflowData.stages.filter(s => s.status === 'completed' || s.status === 'rejected' || s.status === 'changes_requested');

                // 2. Build new stages for the new list
                // We need to determine if any of the new reviewers matches the *current* active stage to preserve continuity if possible?
                // Simpler approach: Rebuild all future stages.
                // If we have history, the next one becomes 'current'.

                const newStages = [];

                // Add new reviewer stages
                for (let i = 0; i < newReviewerIds.length; i++) {
                    const rId = newReviewerIds[i];
                    const user = await UserService.findById(rId);

                    // Check if this user was already the "current" one in the old workflow to preserve state? 
                    // No, "Edit" usually implies overriding the plan.
                    // We will set the first of the new list to 'current' if we don't have an active rejection/change_req in history.

                    newStages.push({
                        name: user ? `${user.name} Review` : `Review Stage`,
                        assignee: rId,
                        department: user?.department || 'Review',
                        status: 'pending',
                        order: historyStages.length + i + 1 // maintain order sequence
                    });
                }

                // 3. Determine 'current' stage
                // If the last history stage was "rejected" or "changes_requested", the process is arguably halted or back to uploader.
                // But usually "Edit Reviewers" happens when stuck.
                // We'll reset the first new stage to 'current' unless the workflow is officially 'Approved'.

                if (newStages.length > 0) {
                    newStages[0].status = 'current';
                }

                // Combine
                const finalStages = [...historyStages, ...newStages];

                // Update Workflow
                await ApprovalWorkflowService.update(workflowData.id, {
                    stages: finalStages,
                    currentStageIndex: historyStages.length, // Point to the first new stage
                    overallStatus: historyStages.some(s => s.status === 'rejected') ? 'Rejected' : 'In Progress' // Reset to In Progress if it was pending
                });
            }
        }

        await AuditLogService.create({
            user: req.user.id,
            action: 'Updated',
            actionType: 'info',
            document: req.params.id,
            documentTitle: updatedDoc.title,
            details: 'Document details and reviewers updated',
            ipAddress: req.ip
        });

        // --- EMAIL NOTIFICATION for UPDATE ---
        setImmediate(async () => {
            try {
                // Determine recipients: all reviewers in the workflow
                // We'll fetch the latest workflow again to be sure
                const wf = await ApprovalWorkflowService.findByDocumentId(req.params.id);
                if (wf && wf.stages) {
                    const assigneeIds = wf.stages
                        .map(s => typeof s.assignee === 'object' ? s.assignee.id : s.assignee)
                        .filter(id => id && id !== req.user.id);

                    if (assigneeIds.length > 0) {
                        // Unique IDs
                        const uniqueIds = [...new Set(assigneeIds)];
                        const { data: recipients } = await supabase.from('users').select('*').in('id', uniqueIds);

                        if (recipients && recipients.length > 0) {
                            await EmailService.sendDocumentUpdatedEmail(recipients, updatedDoc, req.user);
                        }
                    }
                }
            } catch (err) {
                console.error('[Update] Email notification error:', err);
            }
        });
        // -------------------------------------

        // Populate basic helper
        const [populatedDoc] = await populateDocumentUsers([updatedDoc]);

        res.status(200).json({
            success: true,
            message: 'Document updated successfully',
            data: { document: populatedDoc }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// @desc    Delete document
// @route   DELETE /api/documents/:id
// @access  Private
exports.deleteDocument = async (req, res) => {
    try {
        const document = await DocumentService.findById(req.params.id);

        if (!document) {
            return res.status(404).json({
                success: false,
                message: 'Document not found'
            });
        }

        if (document.uploadedBy !== req.user.id && req.user.role !== 'Super Admin' && req.user.role !== 'Editor') {
            return res.status(403).json({
                success: false,
                message: 'Not authorized'
            });
        }

        // Retrieve recipients (team members) before deletion
        let recipients = [];
        try {
            const [populated] = await populateDocumentUsers([document]);
            if (populated && populated.teamMembers) {
                recipients = populated.teamMembers;
            }
        } catch (e) {
            console.error('[Delete] Failed to load recipients:', e);
        }

        await DocumentService.delete(req.params.id);
        await ApprovalWorkflowService.deleteByDocumentId(req.params.id);

        await AuditLogService.create({
            user: req.user.id,
            action: 'Deleted',
            actionType: 'warning',
            documentTitle: document.title,
            details: `Document "${document.title}" was deleted`,
            ipAddress: req.ip
        });

        // Email Notification
        setImmediate(async () => {
            if (recipients.length > 0) {
                await EmailService.sendDocumentDeletedEmail(recipients, document, req.user);
            }
        });

        res.status(200).json({
            success: true,
            message: 'Document deleted successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// @desc    Download document
// @route   GET /api/documents/:id/download
// @access  Private
exports.downloadDocument = async (req, res) => {
    try {
        const document = await DocumentService.findById(req.params.id);

        if (!document) {
            return res.status(404).json({
                success: false,
                message: 'Document not found'
            });
        }

        if (!document.file || !document.file.path) {
            return res.status(404).json({
                success: false,
                message: 'File not found on server'
            });
        }

        const url = await DocumentService.getDownloadUrl(document.file.path);

        await AuditLogService.create({
            user: req.user.id,
            action: 'Downloaded',
            actionType: 'info',
            document: document.id,
            documentTitle: document.title,
            details: `Document downloaded by ${req.user.name}`,
            ipAddress: req.ip
        });

        // Redirect to signed URL
        res.redirect(url);
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// @desc    Get my documents
// @route   GET /api/documents/my/uploads
// @access  Private
exports.getMyDocuments = async (req, res) => {
    try {
        const documents = await DocumentService.getAll({ uploadedBy: req.user.id });
        const populated = await populateDocumentUsers(documents);

        res.status(200).json({
            success: true,
            count: populated.length,
            data: { documents: populated }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// @desc    Get documents pending my approval
// @route   GET /api/documents/pending/approval
// @access  Private
exports.getPendingApprovals = async (req, res) => {
    try {
        const documents = await DocumentService.getAll({
            currentApprover: req.user.id,
            status: 'In Review'
            // Note: getAll with filters in Service uses AND.
            // If we need status in ['Uploaded', 'In Review'], we might need custom logic.
            // Assuming 'In Review' is main one. 'Uploaded' docs don't usually have approver yet unless auto assigned.
        });

        // Filter further if needed
        const populated = await populateDocumentUsers(documents);

        res.status(200).json({
            success: true,
            count: populated.length,
            data: { documents: populated }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// @desc    Upload revised version of a document
// @route   POST /api/documents/:id/revision
// @access  Private
exports.uploadRevision = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'Please upload a file'
            });
        }

        const document = await DocumentService.findById(req.params.id);

        if (!document) {
            return res.status(404).json({
                success: false,
                message: 'Document not found'
            });
        }

        // Check ownership (or admin)
        if (document.uploadedBy !== req.user.id && req.user.role !== 'Super Admin') {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to upload revisions for this document'
            });
        }

        const { note } = req.body;

        // Generate thumbnail for PDF
        let thumbnail = null;
        if (req.file.mimetype === 'application/pdf') {
            thumbnail = await generateThumbnail(req.file);
        }

        // Upload to Supabase Storage
        const fileData = await DocumentService.uploadFileToStorage(req.file);

        // Update Document
        const newVersion = (document.version || 1) + 1;

        // Preserve History in Metadata
        const historyEntry = {
            version: document.version || 1,
            file_url: document.file_url,
            file_path: document.file_path,
            file_name: document.file_name,
            file_original_name: document.file_original_name,
            file_mimetype: document.file_mimetype,
            file_size: document.file_size,
            created_at: document.updated_at || document.created_at, // The time this version was valid until
            uploaded_by: document.uploaded_by
        };

        const existingMetadata = document.metadata || {};
        const history = existingMetadata.history || [];
        history.push(historyEntry);

        const updateData = {
            ...fileData, // Spread Supabase fields (file_url, file_path, etc.)
            status: 'In Review',
            version: newVersion,
            thumbnail: thumbnail || document.thumbnail,
            metadata: {
                ...existingMetadata,
                history: history
            }
        };

        const updatedDoc = await DocumentService.update(req.params.id, updateData);

        // Update Workflow
        const workflowData = await ApprovalWorkflowService.findByDocumentId(document.id);
        if (workflowData) {
            // HISTORY: Add stage to track revision
            const newHistoryStage = {
                name: `Revision v${newVersion} Uploaded`,
                assignee: req.user.id,
                department: req.user.department || 'Uploader',
                status: 'completed',
                action: 'Revision Uploaded',
                note: note || `Uploaded version ${newVersion}`,
                actionDate: Date.now(),
                order: (workflowData.stages.length + 1) // Append
            };

            // Reset statuses
            // Reset statuses: Any stage that was rejected, changes requested, or current becomes pending
            // except the initial upload stage which stays completed.
            const updatedStages = workflowData.stages.map((stage, idx) => {
                // If it's a review stage (not the first submitter stage)
                if (idx > 0 && (stage.status === 'rejected' || stage.status === 'Rejected' ||
                    stage.status === 'changes_requested' || stage.status === 'Changes Requested' ||
                    stage.status === 'current')) {
                    return {
                        ...stage,
                        status: 'pending',
                        action: null,
                        actionDate: null,
                        note: null
                    };
                }
                return stage;
            });

            // Append the revision upload as a completed history stage
            updatedStages.push(newHistoryStage);

            // Set the first available review stage (index 1) to "current"
            let currentStageIndex = 0;
            if (updatedStages.length > 1) {
                // Find first non-completed stage starting from index 1
                for (let i = 1; i < updatedStages.length; i++) {
                    if (updatedStages[i].status === 'pending') {
                        updatedStages[i].status = 'current';
                        currentStageIndex = i;
                        break;
                    }
                }
            }

            // Sync document's current approver
            const currentApprover = updatedStages[currentStageIndex]?.assignee;
            const assigneeId = typeof currentApprover === 'object' ? (currentApprover.id || currentApprover._id) : currentApprover;

            await DocumentService.update(req.params.id, {
                currentApprover: assigneeId
            });

            await ApprovalWorkflowService.update(workflowData.id, {
                stages: updatedStages,
                overallStatus: 'In Progress',
                currentStageIndex: currentStageIndex
            });
        }

        // Audit Log
        await AuditLogService.create({
            user: req.user.id,
            action: 'Updated',
            actionType: 'info',
            document: req.params.id,
            documentTitle: document.title,
            details: `Uploaded revision v${newVersion}`,
            ipAddress: req.ip
        });

        // --- EMAIL NOTIFICATION for REVISION ---
        setImmediate(async () => {
            try {
                // Notify all workflow participants about new revision
                const { stages } = await ApprovalWorkflowService.findByDocumentId(req.params.id);
                if (stages) {
                    const assigneeIds = stages
                        .map(s => typeof s.assignee === 'object' ? s.assignee.id : s.assignee)
                        .filter(id => id && id !== req.user.id); // Exclude uploader (self) if in list

                    const uniqueIds = [...new Set(assigneeIds)];

                    if (uniqueIds.length > 0) {
                        const { data: recipients } = await supabase.from('users').select('*').in('id', uniqueIds);
                        if (recipients) {
                            await EmailService.sendRevisionUploadedEmail(recipients, updatedDoc, req.user, newVersion);
                        }

                        // Also notify the *current* approver specifically for Action
                        // We recalculated currentStageIndex logic above.
                        // Let's grab the current stage assignee from our local logic or simple re-fetch
                        // The logic said: find first 'pending' stage

                        // We can find the current approver from updatedDoc.currentApprover
                        if (updatedDoc.currentApprover) {
                            const approverId = typeof updatedDoc.currentApprover === 'object' ? updatedDoc.currentApprover.id : updatedDoc.currentApprover;
                            const currentApproverUser = recipients.find(u => u.id === approverId) || await UserService.findById(approverId);

                            if (currentApproverUser) {
                                await EmailService.sendApprovalRequestEmail(currentApproverUser, updatedDoc);
                            }
                        }
                    }
                }
            } catch (err) {
                console.error('[Revision] Email notification error:', err);
            }
        });
        // ---------------------------------------

        res.status(200).json({
            success: true,
            message: 'Revision uploaded successfully',
            data: { document: updatedDoc }
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};
