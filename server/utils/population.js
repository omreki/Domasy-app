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
        // Normalize document IDs to strings
        const docIds = documents.map(doc => {
            const id = doc.id || doc._id;
            return id ? String(id).toLowerCase() : null;
        }).filter(id => id);

        if (docIds.length === 0) {
            return documents.map(d => ({ ...d, teamMembers: [] }));
        }

        // 1. Fetch all workflows for these documents
        const { data: workflows, error: wfError } = await supabase
            .from('approval_workflows')
            .select('document_id, stages')
            .in('document_id', docIds);

        if (wfError || !workflows) {
            console.error('[Population] Workflow fetch error or empty:', wfError);
            return documents.map(d => ({ ...d, teamMembers: [] }));
        }

        // Map workflows by serialized document_id
        const workflowsMap = {};
        const allUserIds = new Set();

        workflows.forEach(wf => {
            const key = String(wf.document_id).toLowerCase();
            workflowsMap[key] = wf;
            if (wf.stages && Array.isArray(wf.stages)) {
                wf.stages.forEach(s => {
                    let aid = s.assignee;
                    if (aid && typeof aid === 'object') aid = aid.id || aid._id;
                    if (aid) allUserIds.add(String(aid).toLowerCase().trim());
                });
            }
        });

        // 2. Fetch all involved users in a single query
        const teamUsersMap = {};
        const userIdsArray = Array.from(allUserIds);

        if (userIdsArray.length > 0) {
            const { data: users, error: uError } = await supabase
                .from('users')
                .select('id, name, email, avatar, role, department')
                .in('id', userIdsArray);

            if (!uError && users) {
                users.forEach(u => {
                    const key = String(u.id).toLowerCase().trim();
                    teamUsersMap[key] = { ...u, _id: u.id };
                });
            }
        }

        // 3. Re-map team members to each document
        return documents.map(doc => {
            const docId = String(doc.id || doc._id).toLowerCase();
            const wf = workflowsMap[docId];
            let teamMembers = [];

            if (wf && wf.stages) {
                const uniqueIds = [...new Set(wf.stages.map(s => {
                    let aid = s.assignee;
                    if (aid && typeof aid === 'object') aid = aid.id || aid._id;
                    return aid ? String(aid).toLowerCase().trim() : null;
                }).filter(id => id))];

                teamMembers = uniqueIds.map(uid => teamUsersMap[uid]).filter(u => u);
            }

            // Return a new object with teamMembers attached
            return { ...doc, teamMembers };
        });
    } catch (err) {
        console.error('[Population] Team population error:', err);
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
