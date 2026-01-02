const UserService = require('../services/UserService');
const AuditLogService = require('../services/AuditLogService');
const supabase = require('../config/supabase'); // Import supabase client

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res) => {
    try {
        const { name, email, password, role, department } = req.body;

        // Check if user exists (in public.users)
        // UserService.findByEmail uses Supabase now
        const userExists = await UserService.findByEmail(email);
        if (userExists) {
            return res.status(400).json({
                success: false,
                message: 'User already exists with this email'
            });
        }

        // Create user
        // This creates Auth User + Public Profile
        const user = await UserService.create({
            name,
            email,
            password,
            role: 'Viewer', // Force Viewer for public registration
            department: department || 'General',
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
        console.error('Register Error:', error);
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

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Please provide email and password'
            });
        }

        // Login with Supabase Auth
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });

        if (error) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        const authUser = data.user;
        const session = data.session;

        // Fetch full profile from public.users to check status/role
        const user = await UserService.findById(authUser.id);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User profile not found'
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

        res.status(200).json({
            success: true,
            message: 'Login successful',
            data: {
                token: session.access_token, // Supabase JWT
                user: {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    status: user.status,
                    avatar: user.avatar,
                    department: user.department,
                    lastLogin: user.last_login
                }
            }
        });
    } catch (error) {
        console.error('Login Error:', error);
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
        const user = req.user; // Set by middleware

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
                    lastLogin: user.last_login
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
        // Sign out from Supabase (backend side doesn't do much for stateless JWT, 
        // but can revoke refresh token if we had one)
        // supabase.auth.admin.signOut(token) is not exactly how it works.
        // Frontend handles destroying local token.
        // We just log it.

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

        // Supabase Admin Update
        // Note: verifying current password is hard with Admin API without signing in.
        // But the user is logged in (req.user). 
        // Ideally, user should use supabase client on frontend to change password.

        // Here, allowing simple override for now since we are admin/user themselves
        // SECURITY NOTE: This skips old password verification unless we re-login first.
        // To verify old password, we could try to signIn with email + oldPassword.

        const { error: signInError } = await supabase.auth.signInWithPassword({
            email: req.user.email,
            password: currentPassword
        });

        if (signInError) {
            return res.status(401).json({
                success: false,
                message: 'Current password is incorrect'
            });
        }

        const { error } = await supabase.auth.admin.updateUserById(
            req.user.id,
            { password: newPassword }
        );

        if (error) throw error;

        await AuditLogService.create({
            user: req.user.id,
            action: 'User Updated',
            actionType: 'success',
            details: 'Password updated successfully',
            ipAddress: req.ip
        });

        res.status(200).json({
            success: true,
            message: 'Password updated successfully'
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
                user: updatedUser
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};
