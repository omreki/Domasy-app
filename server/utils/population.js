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
                    if (stage.assignee) workflowUserIds.add(stage.assignee);
                });
            }
        });

        const teamUsersMap = {};
        const userIdsArray = Array.from(workflowUserIds);

        if (userIdsArray.length > 0) {
            const { data: users, error } = await supabase
                .from('users')
                .select('id, name, email, avatar, role')
                .in('id', userIdsArray);

            if (!error && users) {
                users.forEach(user => {
                    teamUsersMap[user.id] = user;
                });
            }
        }

        return documents.map((doc, index) => {
            const wf = workflows[index];
            let teamMembers = [];
            if (wf && wf.stages) {
                const uniqueIds = [...new Set(wf.stages.map(s => s.assignee).filter(id => id))];
                teamMembers = uniqueIds.map(uid => teamUsersMap[uid]).filter(u => u);
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
