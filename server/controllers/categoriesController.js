const CategoryService = require('../services/CategoryService');
const AuditLogService = require('../services/AuditLogService');

// @desc    Get all categories
// @route   GET /api/categories
// @access  Private
exports.getCategories = async (req, res) => {
    try {
        let categories = await CategoryService.getAll();

        // If no categories exist, seed defaults
        if (categories.length === 0) {
            const defaults = ['Finance', 'HR', 'Legal', 'Operations', 'IT', 'Marketing'];
            for (const name of defaults) {
                await CategoryService.create(name);
            }
            categories = await CategoryService.getAll();
        }

        res.status(200).json({
            success: true,
            count: categories.length,
            data: { categories }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// @desc    Create category
// @route   POST /api/categories
// @access  Private
exports.createCategory = async (req, res) => {
    try {
        const { name } = req.body;

        const category = await CategoryService.create(name);

        await AuditLogService.create({
            user: req.user.id,
            action: 'Category Created',
            actionType: 'success',
            details: `Category "${name}" created`,
            ipAddress: req.ip
        });

        res.status(201).json({
            success: true,
            data: { category }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// @desc    Delete category
// @route   DELETE /api/categories/:id
// @access  Private
exports.deleteCategory = async (req, res) => {
    try {
        await CategoryService.delete(req.params.id);

        await AuditLogService.create({
            user: req.user.id,
            action: 'Category Deleted',
            actionType: 'warning',
            details: `Category deleted`, // We don't have the name unless we fetch first, but ID is enough for audit logic simplicity
            ipAddress: req.ip
        });

        res.status(200).json({
            success: true,
            message: 'Category deleted successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};
