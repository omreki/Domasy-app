const UserService = require('../services/UserService');
const AuditLogService = require('../services/AuditLogService');
const { generateToken } = require('../middleware/auth');

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res) => {
    try {
        const { name, email, password, role, department } = req.body;

        // Check if user exists
        const userExists = await UserService.findByEmail(email);
        if (userExists) {
            return res.status(400).json({
                success: false,
                message: 'User already exists with this email'
            });
        }

        // Create user
        const user = await UserService.create({
            name,
            email,
            password,
            role: role || 'Viewer',
            department,
            status: 'Pending' // Admin needs to activate
        });

        // Create audit log
        await AuditLogService.create({
            user: user.id,
            action: 'User Created',
            actionType: 'success',
            details: `New user registered: ${email}`,
            ipAddress: req.ip
        });

        res.status(201).json({
            success: true,
            message: 'User registered successfully. Please wait for admin approval.',
            data: {
                user: {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    status: user.status
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

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validate email & password
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Please provide email and password'
            });
        }

        // Check for user
        const user = await UserService.findByEmail(email);
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        // Check if password matches
        const isMatch = await UserService.comparePassword(password, user.password);
        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        // Check if user is active
        if (user.status !== 'Active') {
            return res.status(403).json({
                success: false,
                message: 'Your account is not active. Please contact administrator.'
            });
        }

        // Update last login
        await UserService.updateLastLogin(user.id);

        // Create audit log
        await AuditLogService.create({
            user: user.id,
            action: 'Login',
            actionType: 'success',
            details: 'User logged in successfully',
            ipAddress: req.ip,
            userAgent: req.headers['user-agent']
        });

        // Generate token
        const token = generateToken(user.id);

        res.status(200).json({
            success: true,
            message: 'Login successful',
            data: {
                token,
                user: {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    status: user.status,
                    avatar: user.avatar,
                    department: user.department,
                    lastLogin: user.lastLogin
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

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res) => {
    try {
        // req.user is set in protect middleware, populated via UserService
        const user = req.user;

        res.status(200).json({
            success: true,
            data: {
                user: {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    status: user.status,
                    avatar: user.avatar,
                    department: user.department,
                    lastLogin: user.lastLogin
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

// @desc    Logout user
// @route   POST /api/auth/logout
// @access  Private
exports.logout = async (req, res) => {
    try {
        // Create audit log
        await AuditLogService.create({
            user: req.user.id,
            action: 'Logout',
            actionType: 'info',
            details: 'User logged out',
            ipAddress: req.ip
        });

        res.status(200).json({
            success: true,
            message: 'Logout successful'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// @desc    Update password
// @route   PUT /api/auth/updatepassword
// @access  Private
exports.updatePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        // Need to re-fetch to get password hash if not available on req.user
        // But in findByEmail/Id we usually return the full obj including password field from db 
        // (UserService.findById returns data(), password is there)
        // Let's ensure protect mw returns user obj. 
        // NOTE: In the UserService.create implementation, we stripe password. 
        // In findById, we return raw data. Assuming doc data contains hashed password.

        const user = await UserService.findById(req.user.id);

        // Check current password
        const isMatch = await UserService.comparePassword(currentPassword, user.password);
        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: 'Current password is incorrect'
            });
        }

        // Hash new password manually since we are not using mongoose hooks
        const bcrypt = require('bcryptjs');
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        await UserService.update(user.id, { password: hashedPassword });

        // Create audit log
        await AuditLogService.create({
            user: user.id,
            action: 'User Updated',
            actionType: 'success',
            details: 'Password updated successfully',
            ipAddress: req.ip
        });

        const token = generateToken(user.id);

        res.status(200).json({
            success: true,
            message: 'Password updated successfully',
            data: { token }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
exports.updateProfile = async (req, res) => {
    try {
        const { name, department } = req.body;

        const updatedUser = await UserService.update(req.user.id, { name, department });

        await AuditLogService.create({
            user: req.user.id,
            action: 'User Updated',
            actionType: 'success',
            details: 'Profile details updated',
            ipAddress: req.ip
        });

        res.status(200).json({
            success: true,
            message: 'Profile updated successfully',
            data: {
                user: {
                    id: updatedUser.id,
                    name: updatedUser.name,
                    email: updatedUser.email,
                    role: updatedUser.role,
                    status: updatedUser.status,
                    avatar: updatedUser.avatar,
                    department: updatedUser.department,
                    lastLogin: updatedUser.lastLogin
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
