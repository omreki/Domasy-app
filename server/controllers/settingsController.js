const supabase = require('../config/supabase');
const StorageService = require('../services/StorageService');
const AuditLogService = require('../services/AuditLogService');

const TABLE = 'system_settings';

// @desc    Get system settings
// @route   GET /api/settings/:id
// @access  Public
exports.getSettings = async (req, res) => {
    try {
        const { id } = req.params;
        const { data, error } = await supabase
            .from(TABLE)
            .select('*')
            .eq('id', id)
            .single();

        if (error && error.code !== 'PGRST116') throw error;

        res.status(200).json({
            success: true,
            data: data ? data.settings : {}
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// @desc    Update system settings
// @route   PUT /api/settings/:id
// @access  Private (Admin only)
exports.updateSettings = async (req, res) => {
    try {
        const { id } = req.params;
        const settings = req.body;

        const { data: existing } = await supabase
            .from(TABLE)
            .select('*')
            .eq('id', id)
            .single();

        let result;
        if (existing) {
            const { data, error } = await supabase
                .from(TABLE)
                .update({
                    settings: { ...existing.settings, ...settings },
                    updated_at: new Date()
                })
                .eq('id', id)
                .select()
                .single();
            if (error) throw error;
            result = data;
        } else {
            const { data, error } = await supabase
                .from(TABLE)
                .insert({ id, settings })
                .select()
                .single();
            if (error) throw error;
            result = data;
        }

        await AuditLogService.create({
            user: req.user.id,
            action: 'Settings Updated',
            details: `System settings ${id} updated`,
            ipAddress: req.ip
        });

        res.status(200).json({
            success: true,
            data: result.settings
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// @desc    Upload brand asset (logo, icon)
// @route   POST /api/settings/upload/:type
// @access  Private (Admin only)
exports.uploadAsset = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'Please upload a file' });
        }

        const { type } = req.params; // 'logo', 'favicon', etc.
        const url = await StorageService.uploadFile(req.file, 'branding', 'assets');

        // Update branding settings automatically
        const { data: existing } = await supabase
            .from(TABLE)
            .select('*')
            .eq('id', 'branding')
            .single();

        const currentSettings = existing ? existing.settings : {};
        currentSettings[type] = url;

        if (existing) {
            await supabase
                .from(TABLE)
                .update({ settings: currentSettings, updated_at: new Date() })
                .eq('id', 'branding');
        } else {
            await supabase
                .from(TABLE)
                .insert({ id: 'branding', settings: currentSettings });
        }

        res.status(200).json({
            success: true,
            data: { url, settings: currentSettings }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};
