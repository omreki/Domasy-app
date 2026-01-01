const DocumentService = require('../services/DocumentService');
const ApprovalWorkflowService = require('../services/ApprovalWorkflowService');
const AuditLogService = require('../services/AuditLogService');
const UserService = require('../services/UserService');
const ProjectService = require('../services/ProjectService');
const path = require('path');
const fs = require('fs');

let puppeteer;
try {
    puppeteer = require('puppeteer');
} catch (e) {
    console.warn('Puppeteer not installed, PDF thumbnails will not be generated.');
}

const generateThumbnail = async (file) => {
    if (!puppeteer || !file || file.mimetype !== 'application/pdf') return null;

    try {
        const browser = await puppeteer.launch({
            headless: 'new',
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        const page = await browser.newPage();

        // Construct file URL or absolute path
        const filePath = path.resolve(file.path);
        await page.goto(`file://${filePath}`);

        const thumbsDir = path.join(path.dirname(file.path), 'thumbnails');
        if (!fs.existsSync(thumbsDir)) {
            fs.mkdirSync(thumbsDir, { recursive: true });
        }

        const thumbName = `${file.filename}-thumb.png`;
        const thumbPath = path.join(thumbsDir, thumbName);

        await page.setViewport({ width: 800, height: 1100 });
        await page.screenshot({ path: thumbPath, type: 'png' });

        await browser.close();

        return `/uploads/thumbnails/${thumbName}`;
    } catch (error) {
        console.error('Thumbnail generation failed:', error);
        return null; // Fail gracefully
    }
};

// Helper to manual populate user details
const populateUsers = async (documents) => {
    // Collect unique user IDs
    const userIds = new Set();
    documents.forEach(doc => {
        if (doc.uploadedBy) userIds.add(doc.uploadedBy);
        if (doc.currentApprover) userIds.add(doc.currentApprover);
    });

    const usersMap = {};
    for (const uid of userIds) {
        if (uid) {
            const user = await UserService.findById(uid);
            if (user) {
                // Return safe user object
                usersMap[uid] = {
                    id: user.id, // _id for Mongoose compatibility if frontend expects it
                    _id: user.id,
                    name: user.name,
                    email: user.email,
                    avatar: user.avatar,
                    role: user.role
                };
            }
        }
    }

    // Collect project IDs
    const projectIds = new Set();
    documents.forEach(doc => {
        if (doc.project) projectIds.add(doc.project);
    });

    const projectsMap = {};
    for (const pid of projectIds) {
        if (pid) {
            const project = await ProjectService.findById(pid);
            if (project) {
                projectsMap[pid] = { id: project.id, _id: project.id, name: project.name };
            }
        }
    }

    // Attach objects
    return documents.map(doc => {
        const d = { ...doc, _id: doc.id }; // Add _id alias
        if (doc.uploadedBy && usersMap[doc.uploadedBy]) d.uploadedBy = usersMap[doc.uploadedBy];
        if (doc.currentApprover && usersMap[doc.currentApprover]) d.currentApprover = usersMap[doc.currentApprover];
        if (doc.project && projectsMap[doc.project]) d.project = projectsMap[doc.project];
        return d;
    });
};

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
        if (req.user.role === 'Viewer') {
            filteredDocs = documents.filter(d => d.status === 'Approved' || d.uploadedBy === req.user.id);
        } else if (req.user.role === 'Editor') {
            filteredDocs = documents.filter(d => d.status === 'Approved' || d.uploadedBy === req.user.id);
        }

        const populatedDocs = await populateUsers(filteredDocs);

        // Populate Team Members from Workflow (Reviewers/Assignees)
        const workflows = await Promise.all(populatedDocs.map(doc => ApprovalWorkflowService.findByDocumentId(doc.id)));

        // Collect all potential user IDs from workflows
        const workflowUserIds = new Set();
        workflows.forEach(wf => {
            if (wf && wf.stages) {
                wf.stages.forEach(stage => {
                    if (stage.assignee) workflowUserIds.add(stage.assignee);
                });
            }
        });

        // Fetch user details for these IDs
        const teamUsersMap = {};
        for (const uid of workflowUserIds) {
            const user = await UserService.findById(uid);
            if (user) {
                teamUsersMap[uid] = {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    avatar: user.avatar,
                    role: user.role
                };
            }
        }

        // Attach teamMembers to documents
        const finalDocs = populatedDocs.map((doc, index) => {
            const wf = workflows[index];
            let teamMembers = [];
            if (wf && wf.stages) {
                // Get unique assignees
                const uniqueIds = [...new Set(wf.stages.map(s => s.assignee).filter(id => id))];
                teamMembers = uniqueIds.map(uid => teamUsersMap[uid]).filter(u => u);
            }
            return { ...doc, teamMembers };
        });

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
        const [populatedDoc] = await populateUsers([document]);

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

        const { title, description, category, approvalStage, project, currentApprover, reviewers } = req.body;

        // Parse reviewers if provided as JSON string
        let reviewerIds = [];
        if (reviewers) {
            try {
                reviewerIds = JSON.parse(reviewers);
            } catch (e) {
                // If not JSON, treat as single ID or ignore
                if (typeof reviewers === 'string' && reviewers.trim()) {
                    reviewerIds = [reviewers];
                }
            }
        }

        // Generate thumbnail for PDF
        let thumbnail = null;
        if (req.file.mimetype === 'application/pdf') {
            thumbnail = await generateThumbnail(req.file);
        }

        const docData = {
            title,
            description,
            category,
            approvalStage: approvalStage || 'Manager Review',
            project,
            currentApprover: reviewerIds.length > 0 ? reviewerIds[0] : currentApprover,
            uploadedBy: req.user.id,
            status: reviewerIds.length > 0 ? 'In Review' : 'Uploaded',
            thumbnail
        };

        const document = await DocumentService.create(docData, req.file);

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

        await ApprovalWorkflowService.create({
            document: document.id,
            stages: workflowStages,
            currentStageIndex: reviewerIds.length > 0 ? 1 : 1, // Start at first review stage
            overallStatus: 'In Progress'
        });

        await AuditLogService.create({
            user: req.user.id,
            action: 'Uploaded',
            actionType: 'success',
            document: document.id,
            documentTitle: document.title,
            details: `New document uploaded${reviewerIds.length > 0 ? ` with ${reviewerIds.length} reviewer(s)` : ''}`,
            ipAddress: req.ip
        });

        res.status(201).json({
            success: true,
            message: 'Document uploaded successfully',
            data: { document: { ...document, _id: document.id } }
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
        if (document.uploadedBy !== req.user.id && req.user.role !== 'Super Admin') {
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

        // Populate basic helper
        const [params] = await populateUsers([updatedDoc]);

        res.status(200).json({
            success: true,
            message: 'Document updated successfully',
            data: { document: params }
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

        if (document.uploadedBy !== req.user.id && req.user.role !== 'Super Admin') {
            return res.status(403).json({
                success: false,
                message: 'Not authorized'
            });
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
        const populated = await populateUsers(documents);

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
        const populated = await populateUsers(documents);

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

        // Prepare new file data
        const baseUrl = process.env.API_URL || 'http://localhost:5000';
        const fileUrl = `/uploads/${req.file.filename}`;

        const fileData = {
            filename: req.file.filename,
            originalName: req.file.originalname,
            mimetype: req.file.mimetype,
            size: req.file.size,
            path: req.file.path,
            url: `${baseUrl}${fileUrl}`
        };

        // Update Document
        const newVersion = (document.version || 1) + 1;

        // Generate thumbnail for PDF
        let thumbnail = null;
        if (req.file.mimetype === 'application/pdf') {
            thumbnail = await generateThumbnail(req.file);
        }

        const updateData = {
            file: fileData,
            status: 'In Review',
            version: newVersion,
            thumbnail: thumbnail || document.thumbnail // Keep old thumbnail if new one is null (e.g. non-pdf revision) or update if new one generated
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
            const updatedStages = workflowData.stages.map(stage => {
                if (stage.status === 'rejected' || stage.status === 'changes_requested') {
                    // Reset to pending
                    return { ...stage, status: 'pending', actionDate: null, note: null };
                }
                return stage;
            });

            // Append history
            updatedStages.push(newHistoryStage);

            // Set current
            let foundCurrent = false;
            let currentStageIndex = 0;
            const finalStages = updatedStages.map((stage, idx) => {
                // Skip completed/history ones
                if (stage.status === 'pending' && !foundCurrent && stage.assignee !== req.user.id) {
                    foundCurrent = true;
                    currentStageIndex = idx;
                    return { ...stage, status: 'current' };
                }
                return stage;
            });

            // If we didn't find a pending reviewer (e.g. all were completed except the rejected one which we reset), 
            // the reset logic should have handled it.

            await ApprovalWorkflowService.update(workflowData.id, {
                stages: finalStages,
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
