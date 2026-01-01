const jwt = require('jsonwebtoken');
const UserService = require('../services/UserService');
const AuditLogService = require('../services/AuditLogService');

// Protect routes - verify JWT token
exports.protect = async (req, res, next) => {
    let token;

    // Check for token in headers
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    }

    // Make sure token exists
    if (!token) {
        return res.status(401).json({
            success: false,
            message: 'Not authorized to access this route'
        });
    }

    try {
        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Get user from token
        // decoded.id comes from generateToken
        req.user = await UserService.findById(decoded.id);

        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'User not found'
            });
        }

        // Check if user is active
        if (req.user.status !== 'Active') {
            return res.status(403).json({
                success: false,
                message: 'Your account is not active. Please contact administrator.'
            });
        }

        // Attach user ID directly for convenience like Mongoose did with _id
        req.user._id = req.user.id;

        next();
    } catch (error) {
        console.error('Auth middleware error:', error);
        return res.status(401).json({
            success: false,
            message: 'Not authorized to access this route'
        });
    }
};

// Grant access to specific roles
exports.authorize = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: `User role '${req.user.role}' is not authorized to access this route`
            });
        }
        next();
    };
};

// Audit middleware - log all actions
exports.auditLog = (action, actionType = 'info') => {
    return async (req, res, next) => {
        // Store original send function
        const originalSend = res.send;

        // Override send function
        res.send = function (data) {
            // Only log successful operations
            if (res.statusCode >= 200 && res.statusCode < 300) {
                const logData = {
                    user: req.user ? req.user.id : null,
                    action,
                    actionType,
                    ipAddress: req.ip || req.connection.remoteAddress,
                    userAgent: req.headers['user-agent'],
                    automated: false
                };

                // Add document info if available
                if (req.document) {
                    logData.document = req.document.id;
                    logData.documentTitle = req.document.title;
                }

                // Add project info if available
                if (req.project) {
                    logData.project = req.project.id;
                }

                // Add details from request body or params
                if (req.body && req.body.note) {
                    logData.details = req.body.note;
                }

                // Create audit log asynchronously
                AuditLogService.create(logData).catch(err => {
                    console.error('Audit log error:', err);
                });
            }

            // Call original send
            originalSend.call(this, data);
        };

        next();
    };
};

// Generate JWT token
exports.generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRE
    });
};
