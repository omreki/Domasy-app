const UserService = require('../services/UserService');
const AuditLogService = require('../services/AuditLogService');
const StorageService = require('../services/StorageService');

// @desc    Get all users
// @route   GET /api/users
// @access  Private
exports.getUsers = async (req, res) => {
    try {
        const { role, status, search } = req.query;
        const users = await UserService.getAll({ role, status, search });

        // Add _id alias for compatibility
        const mappedUsers = users.map(u => ({ ...u, _id: u.id }));

        res.status(200).json({
            success: true,
            count: mappedUsers.length,
            data: { users: mappedUsers }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// @desc    Update user
// @route   PUT /api/users/:id
// @access  Private
exports.updateUser = async (req, res) => {
    try {
        const { role, status, department, name, email } = req.body;

        const existingUser = await UserService.findById(req.params.id);
        if (!existingUser) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        const updatedUser = await UserService.update(req.params.id, { role, status, department, name, email });

        await AuditLogService.create({
            user: req.user.id,
            action: 'User Updated',
            actionType: 'info',
            details: `User ${updatedUser.email} updated`,
            ipAddress: req.ip
        });

        res.status(200).json({
            success: true,
            data: { user: { ...updatedUser, _id: updatedUser.id } }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};
// @desc    Delete user
// @route   DELETE /api/users/:id
// @access  Private (Admin only)
exports.deleteUser = async (req, res) => {
    try {
        const user = await UserService.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        await UserService.delete(req.params.id);

        await AuditLogService.create({
            user: req.user.id,
            action: 'User Deleted',
            actionType: 'warning',
            details: `User ${user.email} was deleted`,
            ipAddress: req.ip
        });

        res.status(200).json({
            success: true,
            message: 'User deleted successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// @desc    Create/Invite user
// @route   POST /api/users
// @access  Private (Admin only)
exports.createUser = async (req, res) => {
    try {
        const { name, email, password, role, department } = req.body;

        const userExists = await UserService.findByEmail(email);
        if (userExists) {
            return res.status(400).json({ success: false, message: 'User already exists' });
        }

        const newUser = await UserService.create({
            name,
            email,
            password: password || 'Welcome123!', // Default password
            role,
            department,
            status: 'Active',
            invitedBy: req.user.id
        });

        await AuditLogService.create({
            user: req.user.id,
            action: 'User Created',
            actionType: 'success',
            details: `User ${email} created as ${role}`,
            ipAddress: req.ip
        });

        res.status(201).json({
            success: true,
            data: { user: { ...newUser, _id: newUser.id } }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// @desc    Update user profile
// @route   PUT /api/users/profile
// @access  Private
exports.updateProfile = async (req, res) => {
    try {
        const { name, department } = req.body;
        const userId = req.user.id;

        const updatedUser = await UserService.update(userId, { name, department });

        await AuditLogService.create({
            user: userId,
            action: 'User Updated',
            actionType: 'info',
            details: `Profile updated by user`,
            ipAddress: req.ip
        });

        res.status(200).json({
            success: true,
            data: {
                user: {
                    ...updatedUser,
                    _id: updatedUser.id
                }
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// @desc    Update user avatar
// @route   POST /api/users/avatar
// @access  Private
exports.updateAvatar = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'Please upload an image' });
        }

        const userId = req.user.id;
        const user = await UserService.findById(userId);

        // Upload new avatar
        const avatarUrl = await StorageService.uploadFile(req.file, 'avatars', 'user-avatars');

        // Delete old avatar if it exists and is from our storage
        if (user.avatar && user.avatar.includes('supabase')) {
            await StorageService.deleteFile(user.avatar, 'avatars');
        }

        // Update user profile
        const updatedUser = await UserService.update(userId, { avatar: avatarUrl });

        await AuditLogService.create({
            user: userId,
            action: 'User Updated',
            actionType: 'info',
            details: `Profile photo updated`,
            ipAddress: req.ip
        });

        res.status(200).json({
            success: true,
            data: {
                user: {
                    ...updatedUser,
                    _id: updatedUser.id
                }
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};
