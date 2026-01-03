const UserService = require('../services/UserService');
const ProjectService = require('../services/ProjectService');
const ApprovalWorkflowService = require('../services/ApprovalWorkflowService');
const supabase = require('../config/supabase');

/**
 * Populates team members from approval workflows for a list of documents
 */
const populateTeamMembers = async (documents) => {
    if (!documents || documents.length === 0) return [];

    try {
        // Fetch workflows for all documents concurrently
        const workflows = await Promise.all(
            documents.map(doc =>
                ApprovalWorkflowService.findByDocumentId(doc.id || doc._id)
                    .catch(err => {
                        console.error(`Error fetching workflow for doc ${doc.id}:`, err.message);
                        return null;
                    })
            )
        );

        const workflowUserIds = new Set();
        workflows.forEach(wf => {
            if (wf && wf.stages) {
                wf.stages.forEach(stage => {
                    const assignee = stage.assignee;
                    if (assignee) {
                        const id = (assignee && typeof assignee === 'object') ? (assignee.id || assignee._id) : assignee;
                        if (id) workflowUserIds.add(id);
                    }
                });
            }
        });

        const teamUsersMap = {};
        const userIdsArray = Array.from(workflowUserIds);

        if (userIdsArray.length > 0) {
            const { data: users, error } = await supabase
                .from('users')
                .select('id, name, email, avatar, role, department')
                .in('id', userIdsArray);

            if (!error && users) {
                users.forEach(user => {
                    teamUsersMap[user.id] = { ...user, _id: user.id };
                });
            }
        }

        return documents.map((doc, index) => {
            const wf = workflows[index];
            const docId = doc.id || doc._id;
            const uploaderId = doc.uploaded_by || doc.uploadedBy;

            // Handle uploaderId being either an ID string or a populated object
            const normalizedUploaderId = (uploaderId && typeof uploaderId === 'object') ? (uploaderId.id || uploaderId._id) : uploaderId;

            console.log(`[Population Debug] Processing doc: ${docId} | Uploader ID: ${normalizedUploaderId} | Workflow Stages: ${wf?.stages?.length || 0}`);

            let teamMembers = [];

            if (wf && wf.stages) {
                // Collect and uniqueify reviewer IDs, explicitly EXCLUDING the uploader
                const uniqueReviewerIds = [...new Set(wf.stages.map(s => {
                    const assignee = s.assignee;
                    return (assignee && typeof assignee === 'object') ? (assignee.id || assignee._id) : assignee;
                }).filter(id => id && String(id) !== String(normalizedUploaderId)))];

                console.log(`[Population Debug] Found ${uniqueReviewerIds.length} unique reviewers for doc ${docId}:`, uniqueReviewerIds);

                teamMembers = uniqueReviewerIds.map(uid => {
                    const user = teamUsersMap[uid];
                    if (!user) console.warn(`[Population Debug] Reviewer ID ${uid} not found in teamUsersMap!`);
                    return user;
                }).filter(u => u);

                if (teamMembers.length > 0) {
                    console.log(`[Population Debug] Successfully populated ${teamMembers.length} team members for doc ${docId}`);
                }
            } else {
                if (docId) console.log(`[Population Debug] No workflow found for doc ${docId}`);
            }
            return { ...doc, teamMembers };
        });
    } catch (err) {
        console.error('populateTeamMembers failed:', err);
        return documents.map(doc => ({ ...doc, teamMembers: [] }));
    }
};

/**
 * Populates uploader, current approver, project, and team members for documents
 */
const populateDocumentUsers = async (documents) => {
    if (!documents || documents.length === 0) return [];

    // Collect all potential user IDs
    const userIds = new Set();
    const projectIds = new Set();

    documents.forEach(doc => {
        const uid = doc.uploaded_by || doc.uploadedBy;
        const aid = doc.current_approver || doc.currentApprover;
        const pid = doc.project_id || doc.project;

        if (uid) userIds.add(uid);
        if (aid) userIds.add(aid);
        if (pid) projectIds.add(pid);
    });

    const usersMap = {};
    const projectsMap = {};

    // Fetch users in parallel
    if (userIds.size > 0) {
        const { data: users, error } = await supabase
            .from('users')
            .select('id, name, email, avatar, role, department')
            .in('id', Array.from(userIds));

        if (!error && users) {
            users.forEach(u => {
                usersMap[u.id] = { ...u, _id: u.id };
            });
        }
    }

    // Fetch projects in parallel
    if (projectIds.size > 0) {
        const { data: projects, error } = await supabase
            .from('projects')
            .select('id, name')
            .in('id', Array.from(projectIds));

        if (!error && projects) {
            projects.forEach(p => {
                projectsMap[p.id] = { ...p, _id: p.id };
            });
        }
    }

    // Attach objects and normalize
    const partialPopulated = documents.map(doc => {
        const d = {
            ...doc,
            _id: doc.id,
            createdAt: doc.created_at || doc.createdAt,
            updatedAt: doc.updated_at || doc.updatedAt
        };

        const uid = doc.uploaded_by || doc.uploadedBy;
        const aid = doc.current_approver || doc.currentApprover;
        const pid = doc.project_id || doc.project;

        if (uid && usersMap[uid]) d.uploadedBy = usersMap[uid];
        if (aid && usersMap[aid]) d.currentApprover = usersMap[aid];
        if (pid && projectsMap[pid]) d.project = projectsMap[pid];

        return d;
    });

    // Finally populate team members from workflows
    return await populateTeamMembers(partialPopulated);
};

module.exports = {
    populateDocumentUsers,
    populateTeamMembers
};
