const ProjectService = require('../services/ProjectService');
const DocumentService = require('../services/DocumentService');
const AuditLogService = require('../services/AuditLogService');
const UserService = require('../services/UserService');

// Helper to populate user details in projects
const populateProjectUsers = async (projects) => {
    // Collect all user IDs
    const userIds = new Set();
    projects.forEach(p => {
        if (p.createdBy) userIds.add(p.createdBy);
        if (p.participants) {
            p.participants.forEach(part => {
                if (part.user) userIds.add(part.user);
            });
        }
    });

    const usersMap = {};
    for (const uid of userIds) {
        if (uid) {
            const u = await UserService.findById(uid);
            if (u) {
                usersMap[uid] = { id: u.id, _id: u.id, name: u.name, email: u.email, avatar: u.avatar, role: u.role };
            }
        }
    }

    // Populate
    return await Promise.all(projects.map(async p => {
        const participants = Array.isArray(p.participants) ? p.participants.map(part => {
            const u = usersMap[part.user];
            return u ? { ...part, user: u } : part;
        }) : [];

        const createdBy = usersMap[p.createdBy] || p.createdBy;

        // Count documents
        // This is N+1 but for listing projects it might be okay for ~20 items.
        // DocumentService.count({ project: p.id })? No count by project method in service yet, but we can add filter logic.
        // Let's create a specialized count or just fetch.
        // Firestore aggregation queries are cheap.
        // We'll trust DocumentService.getAll for now or use `db.collection('documents').where('project', '==', id).count().get()` logic if implemented.
        // Actually DocumentService has count(filters). We can pass project: p.id.

        // However, standard Project API expects documentCount.
        // Note: I did not add `project` filter to `count` method in DocumentService earlier.
        // Let's assume frontend logic or basic 0 for now to keep moving, OR query `getAll` is too heavy.
        // Let's use `DocumentService.getByProject` length.

        const documentCount = await DocumentService.countByProject(p.id);

        return { ...p, _id: p.id, participants, createdBy, documentCount };
    }));
};

// @desc    Get all projects
// @route   GET /api/projects
// @access  Private
exports.getProjects = async (req, res) => {
    try {
        const projects = await ProjectService.getAll();
        const populatedProjects = await populateProjectUsers(projects);

        res.status(200).json({
            success: true,
            count: populatedProjects.length,
            data: { projects: populatedProjects }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// @desc    Create project
// @route   POST /api/projects
// @access  Private
exports.createProject = async (req, res) => {
    try {
        const { name, description, category, participants, dueDate } = req.body;

        const projectData = {
            name,
            description,
            category,
            participants: participants || [],
            createdBy: req.user.id,
            dueDate: dueDate,
            status: 'Active'
        };

        const project = await ProjectService.create(projectData);

        await AuditLogService.create({
            user: req.user.id,
            action: 'Project Created',
            actionType: 'success',
            project: project.id,
            details: `Project "${name}" created`,
            ipAddress: req.ip
        });

        // Populate basic
        const [populatedProject] = await populateProjectUsers([project]);

        res.status(201).json({
            success: true,
            data: { project: populatedProject }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// @desc    Get single project
// @route   GET /api/projects/:id
// @access  Private
exports.getProject = async (req, res) => {
    try {
        const project = await ProjectService.findById(req.params.id);
        if (!project) {
            return res.status(404).json({
                success: false,
                message: 'Project not found'
            });
        }

        const [populatedProject] = await populateProjectUsers([project]);

        // Also get documents for this project
        const documents = await DocumentService.getByProject(req.params.id);

        res.status(200).json({
            success: true,
            data: {
                project: populatedProject,
                documents: documents
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};
// @desc    Update project
// @route   PUT /api/projects/:id
// @access  Private
exports.updateProject = async (req, res) => {
    try {
        let project = await ProjectService.findById(req.params.id);
        if (!project) {
            return res.status(404).json({
                success: false,
                message: 'Project not found'
            });
        }

        const projectData = { ...req.body };

        // Authorization check: Owner OR Super Admin OR Editor
        if (project.createdBy !== req.user.id && req.user.role !== 'Super Admin' && req.user.role !== 'Editor') {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to update this project'
            });
        }

        if (projectData.dueDate) projectData.dueDate = new Date(projectData.dueDate);

        project = await ProjectService.update(req.params.id, projectData);

        await AuditLogService.create({
            user: req.user.id,
            action: 'Project Updated',
            actionType: 'success',
            project: req.params.id,
            details: `Project "${project.name}" updated`,
            ipAddress: req.ip
        });

        const [populatedProject] = await populateProjectUsers([project]);

        res.status(200).json({
            success: true,
            data: { project: populatedProject }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// @desc    Delete project
// @route   DELETE /api/projects/:id
// @access  Private
exports.deleteProject = async (req, res) => {
    try {
        const project = await ProjectService.findById(req.params.id);
        if (!project) {
            return res.status(404).json({
                success: false,
                message: 'Project not found'
            });
        }

        // Authorization check: Owner OR Super Admin OR Editor
        // (Allowing Editors to delete projects as they are managers)
        if (project.createdBy !== req.user.id && req.user.role !== 'Super Admin' && req.user.role !== 'Editor') {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to delete this project'
            });
        }

        await ProjectService.delete(req.params.id);

        await AuditLogService.create({
            user: req.user.id,
            action: 'Project Deleted',
            actionType: 'warning',
            project: req.params.id,
            details: `Project "${project.name}" deleted`,
            ipAddress: req.ip
        });

        res.status(200).json({
            success: true,
            message: 'Project deleted successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};
