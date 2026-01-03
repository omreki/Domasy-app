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
        const docIds = documents.map(doc => doc.id || doc._id).filter(id => id);
        if (docIds.length === 0) return documents.map(d => ({ ...d, teamMembers: [] }));

        // 1. Fetch all workflows for these documents in a single query
        const { data: workflows, error: wfError } = await supabase
            .from('approval_workflows')
            .select('*')
            .in('document_id', docIds);

        if (wfError) {
            console.error('[Population] Workflow fetch error:', wfError);
            return documents.map(d => ({ ...d, teamMembers: [] }));
        }

        const workflowsByDocId = {};
        const allUserIds = new Set();

        workflows.forEach(wf => {
            workflowsByDocId[wf.document_id] = wf;
            if (wf.stages && Array.isArray(wf.stages)) {
                wf.stages.forEach(stage => {
                    const assigneeId = (stage.assignee && typeof stage.assignee === 'object')
                        ? (stage.assignee.id || stage.assignee._id)
                        : stage.assignee;
                    if (assigneeId) allUserIds.add(String(assigneeId));
                });
            }
        });

        // 2. Fetch all unique users involved in these workflows
        const teamUsersMap = {};
        const userIdsArray = Array.from(allUserIds);
        if (userIdsArray.length > 0) {
            const { data: users, error: uError } = await supabase
                .from('users')
                .select('id, name, email, avatar, role, department')
                .in('id', userIdsArray);

            if (!uError && users) {
                users.forEach(u => {
                    teamUsersMap[String(u.id)] = { ...u, _id: u.id };
                });
            }
        }

        // 3. Map team members back to each document
        return documents.map(doc => {
            const docId = doc.id || doc._id;
            const wf = workflowsByDocId[docId];
            let teamMembers = [];

            if (wf && wf.stages) {
                // Collect unique assignee IDs for this specific workflow
                const uniqueIds = [...new Set(wf.stages.map(s => {
                    const assignee = s.assignee;
                    return (assignee && typeof assignee === 'object') ? (assignee.id || assignee._id) : assignee;
                }))].filter(id => id);

                // Map IDs to full user objects
                teamMembers = uniqueIds.map(uid => teamUsersMap[String(uid)]).filter(u => u);

                console.log(`[Population] Doc ${docId}: Populated ${teamMembers.length} team members from ${uniqueIds.length} unique stage IDs.`);
            } else {
                console.log(`[Population] Doc ${docId}: No workflow or stages found.`);
            }

            return { ...doc, teamMembers };
        });
    } catch (err) {
        console.error('[Population] Global population failure:', err);
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
